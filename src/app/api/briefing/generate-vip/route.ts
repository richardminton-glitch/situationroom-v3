/**
 * POST /api/briefing/generate-vip
 * Generates a personalised VIP briefing for the authenticated user (or userId from cron).
 * Topic-weighted: selected topics get higher word count and deeper analysis in those sections.
 * Falls back to standard briefing if generation fails.
 * Cron: 06:10 UTC daily via /api/cron/vip-briefings
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasAccess, isAdmin } from '@/lib/auth/tier';
import { prisma } from '@/lib/db';
import { callGrokAnalysisJSON } from '@/lib/grok/analysis';
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

interface VipContent {
  contentJson: string;
  headline: string;
}

async function generateVipContent(
  baseBriefing: BaseBriefing,
  topics: string[],
): Promise<VipContent> {
  const topicEntries = topics
    .map((t) => VIP_TOPICS[t as keyof typeof VIP_TOPICS])
    .filter(Boolean);
  const topicNames = topicEntries.map((t) => t.name).join(', ');

  // ── Adapt all 5 sections via single Grok call ──
  // This produces a coherent, topic-weighted version of the entire briefing
  const adaptPrompt = `You are the intelligence editor for a Bitcoin & macro analysis platform called "The Situation Room".

A VIP subscriber has selected these focus topics: ${topicNames}

Your job is to adapt each section of today's standard briefing to emphasise insights most relevant to their chosen topics. The adapted version should:
- Expand detail on paragraphs/data points related to the user's topics
- Keep other content but at reduced emphasis (shorter, summarised)
- Never invent new data or facts — only reframe and reweight what exists
- Maintain the same analytical, direct tone throughout
- Each section should be roughly the same total length as the original

Here is today's standard briefing:

=== MARKET SECTION ===
${baseBriefing.marketSection}

=== NETWORK SECTION ===
${baseBriefing.networkSection}

=== GEOPOLITICAL SECTION ===
${baseBriefing.geopoliticalSection}

=== MACRO SECTION ===
${baseBriefing.macroSection}

=== OUTLOOK SECTION ===
${baseBriefing.outlookSection}

Return a JSON object with exactly 5 keys: "market", "network", "geo", "macro", "outlook".
Each value should be the adapted section text (plain text, not markdown).`;

  const adapted = await callGrokAnalysisJSON<{
    market: string;
    network: string;
    geo: string;
    macro: string;
    outlook: string;
  }>(adaptPrompt, {
    system: 'You adapt intelligence briefings for individual subscribers by reweighting content toward their focus topics. Output valid JSON only.',
    maxTokens: 3000,
    timeoutMs: 60_000,
  });

  // Fall back to base sections if Grok call fails
  const content = {
    market:  adapted?.market  ?? baseBriefing.marketSection,
    network: adapted?.network ?? baseBriefing.networkSection,
    geo:     adapted?.geo     ?? baseBriefing.geopoliticalSection,
    macro:   adapted?.macro   ?? baseBriefing.macroSection,
    outlook: adapted?.outlook ?? baseBriefing.outlookSection,
  };

  return {
    contentJson: JSON.stringify(content),
    headline: baseBriefing.headline,
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
    if (!isAdmin(session.user.email) && !hasAccess(userTier, 'vip')) {
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

  try {
    const { contentJson, headline } = await generateVipContent(
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
    );

    const vipBriefing = await (prisma as any).vipBriefing.create({
      data: {
        userId:      targetUserId,
        topicHash:   topicHash(topics),
        date:        today,
        topics:      JSON.stringify(topics),
        contentJson,
        headline,
      },
    });

    return NextResponse.json({ ok: true, id: vipBriefing.id });
  } catch (err) {
    console.error('[generate-vip]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
