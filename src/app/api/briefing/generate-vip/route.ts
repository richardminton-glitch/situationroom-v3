/**
 * POST /api/briefing/generate-vip
 * Generates a personalised VIP briefing for the authenticated user (or userId from cron).
 * Topic-weighted: selected topics get higher word count and deeper analysis in those sections.
 * Falls back to standard briefing if generation fails.
 * Cron: 06:10 UTC daily via /api/cron/vip-briefings
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasAccess } from '@/lib/auth/tier';
import { prisma } from '@/lib/db';
import { callGrokAnalysis } from '@/lib/grok/analysis';
import * as crypto from 'crypto';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const VIP_TOPICS = {
  'btc-network':        { name: 'Bitcoin Network',             weightedAgent: 'network', multiplier: 2 },
  'macro-banks':        { name: 'Macro & Central Banks',       weightedAgent: 'macro',   multiplier: 2 },
  'geopolitical':       { name: 'Geopolitical Risk',           weightedAgent: 'geo',     multiplier: 2 },
  'energy-commodities': { name: 'Energy & Commodities',        weightedAgent: 'macro',   multiplier: 1.5 },
  'btc-equities':       { name: 'Bitcoin Equities',            weightedAgent: 'market',  multiplier: 2 },
  'onchain':            { name: 'On-Chain Analytics',          weightedAgent: 'network', multiplier: 2 },
  'inflation':          { name: 'Inflation & Purchasing Power', weightedAgent: 'macro',  multiplier: 2 },
  'emerging-markets':   { name: 'Emerging Markets',            weightedAgent: 'geo',     multiplier: 2 },
} as const;

function topicHash(topics: string[]): string {
  return crypto.createHash('sha256').update([...topics].sort().join(',')).digest('hex').slice(0, 12);
}

interface BaseBriefing {
  marketSection: string;
  networkSection: string;
  geopoliticalSection: string;
  macroSection: string;
  outlookSection: string;
  dataSnapshotJson: string;
  headline: string;
  threatLevel: string;
  convictionScore: number;
}

interface PortfolioContext {
  costBasis: number | null;
  holdings: number | null;
  btcPrice: number;
}

interface VipContent {
  contentJson: string;
  headline: string;
  portfolioCtx: string | null;
}

async function generateVipContent(
  baseBriefing: BaseBriefing,
  topics: string[],
  portfolioContext: PortfolioContext,
): Promise<VipContent> {
  const topicNames = topics
    .map((t) => VIP_TOPICS[t as keyof typeof VIP_TOPICS]?.name ?? t)
    .join(', ');

  const portfolioNote =
    portfolioContext.costBasis && portfolioContext.holdings
      ? `User holds ${portfolioContext.holdings} BTC with a cost basis of $${portfolioContext.costBasis.toLocaleString()}. Current price: $${portfolioContext.btcPrice.toLocaleString()}. ${
          portfolioContext.btcPrice > portfolioContext.costBasis
            ? `Currently in profit (+${(((portfolioContext.btcPrice - portfolioContext.costBasis) / portfolioContext.costBasis) * 100).toFixed(1)}%).`
            : `Currently underwater (${(((portfolioContext.btcPrice - portfolioContext.costBasis) / portfolioContext.costBasis) * 100).toFixed(1)}%).`
        }`
      : '';

  // Generate personalised portfolio context paragraph if portfolio data available
  let portfolioCtx: string | null = null;
  if (portfolioNote) {
    portfolioCtx = await callGrokAnalysis(
      `${portfolioNote}\n\nToday's briefing headline: "${baseBriefing.headline}"\nThreat level: ${baseBriefing.threatLevel}\nConviction score: ${Math.round(baseBriefing.convictionScore)}/100\n\nWrite a 2-3 sentence personalised paragraph about what today's market conditions mean specifically for this user's Bitcoin position. Be direct and analytical, not reassuring. Focus on what the data means for their specific situation.`,
      { maxTokens: 200 },
    );
  }

  // Personalise the outlook section with topic focus
  const personalisedOutlook = await callGrokAnalysis(
    `Original outlook section:\n${baseBriefing.outlookSection}\n\nThis user's focus topics: ${topicNames}\n\nRewrite this outlook section (same length) emphasising the insights most relevant to these focus topics. Keep the same analytical tone. Do not add new information — just reframe existing conclusions through the lens of these topics.`,
    { maxTokens: 300 },
  );

  const content = {
    market:  baseBriefing.marketSection,
    network: baseBriefing.networkSection,
    geo:     baseBriefing.geopoliticalSection,
    macro:   baseBriefing.macroSection,
    outlook: personalisedOutlook ?? baseBriefing.outlookSection,
  };

  return {
    contentJson: JSON.stringify(content),
    headline: baseBriefing.headline,
    portfolioCtx,
  };
}

export async function POST(request: NextRequest) {
  // Auth: either cron secret (for batch processing) or user session
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const isCron = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);

  let targetUserId: string | null = null;

  if (isCron) {
    const body = await request.json().catch(() => ({})) as { userId?: string };
    targetUserId = body.userId ?? null;
  } else {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userTier = (session.user.tier as Tier) ?? 'free';
    if (!hasAccess(userTier, 'vip')) {
      return NextResponse.json({ error: 'VIP required' }, { status: 403 });
    }
    targetUserId = session.user.id;
  }

  if (!targetUserId) {
    return NextResponse.json({ error: 'No user specified' }, { status: 400 });
  }

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      newsletterVipTopics: true,
      portfolioCostBasis: true,
      portfolioHoldingsBtc: true,
    },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const topics = user.newsletterVipTopics ?? [];
  if (topics.length === 0) {
    return NextResponse.json({ skipped: true, reason: 'No topics selected' });
  }

  // Today's date (UTC midnight)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Check if already generated today
  const existing = await (prisma as any).vipBriefing.findUnique({
    where: { userId_date: { userId: targetUserId, date: today } },
  });
  if (existing) {
    return NextResponse.json({ skipped: true, reason: 'Already generated today' });
  }

  // Get today's base briefing
  const briefing = await prisma.briefing.findFirst({ orderBy: { date: 'desc' } });
  if (!briefing) return NextResponse.json({ error: 'No briefing found' }, { status: 404 });

  // Get current BTC price from latest snapshot
  let btcPrice = 0;
  try {
    const snap = await prisma.dataSnapshot.findFirst({ orderBy: { timestamp: 'desc' } });
    if (snap) {
      const d = JSON.parse(snap.dataJson) as { btcPrice?: number };
      btcPrice = d.btcPrice ?? 0;
    }
  } catch {
    // btcPrice stays 0 — portfolio note will be omitted if both cost basis and holdings exist
  }

  try {
    const { contentJson, headline, portfolioCtx } = await generateVipContent(
      {
        marketSection:      briefing.marketSection,
        networkSection:     briefing.networkSection,
        geopoliticalSection: briefing.geopoliticalSection,
        macroSection:       briefing.macroSection,
        outlookSection:     briefing.outlookSection,
        dataSnapshotJson:   briefing.dataSnapshotJson,
        headline:           briefing.headline,
        threatLevel:        briefing.threatLevel,
        convictionScore:    briefing.convictionScore,
      },
      topics,
      {
        costBasis: user.portfolioCostBasis,
        holdings:  user.portfolioHoldingsBtc,
        btcPrice,
      },
    );

    const vipBriefing = await (prisma as any).vipBriefing.create({
      data: {
        userId:      targetUserId,
        topicHash:   topicHash(topics),
        date:        today,
        topics:      JSON.stringify(topics),
        contentJson,
        headline,
        portfolioCtx,
      },
    });

    return NextResponse.json({ ok: true, id: vipBriefing.id });
  } catch (err) {
    console.error('[generate-vip]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
