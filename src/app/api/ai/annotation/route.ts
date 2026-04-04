import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasAccess } from '@/lib/auth/tier';
import { checkAiRateLimit, incrementAiUsage } from '@/lib/auth/rate-limit';
import { prisma } from '@/lib/db';
import { callGrokAnalysis } from '@/lib/grok/analysis';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const PANEL_PROMPTS: Record<string, (value: string) => string> = {
  'inflation-chart':  (v) => `Current CPI data: ${v}. Write a 2-sentence sharp take connecting this to Bitcoin's fixed supply (21 million cap, ~1.7% current issuance declining to 0.8% post-halving). Be specific with numbers. No hashtags.`,
  'm2-chart':         (v) => `M2 money supply indexed value: ${v} (100 = base year). Write 2 sentences on what monetary expansion means for holders of fixed-supply assets like Bitcoin. Use the word "issuance" not "printing". Be direct.`,
  'cb-rates-chart':   (v) => `Central bank rates: ${v}. Write 2 sentences on why the risk-free rate exists and what it means that Bitcoin has no counterparty risk and no inflation. Be sharp, not preachy.`,
  'cb-asset-chart':   (v) => `Central bank balance sheet: ${v}. Write 2 sentences on counterparty risk and sovereign ownership in the context of Bitcoin self-custody. Be direct and factual.`,
  'hash-ribbon':      (v) => `Hash ribbon signal: ${v}. Write 2 sentences on how miner economics crystallise energy expenditure into monetary units on a predictable schedule. Connect to Bitcoin's physical cost floor.`,
  'puell-multiple':   (v) => `Puell Multiple: ${v}. Write 2 sentences explaining what miner revenue cycles mean for the long-term value proposition of proof-of-work. Be analytical.`,
  'network-signals':  (v) => `SOPR reading: ${v}. Write 2 sentences on what aggregate profit/loss behaviour of holders reveals about market cycle psychology. Be specific.`,
  'onchain-sentiment':(v) => `MVRV ratio: ${v}. Write 2 sentences on what unrealised profit ratios reveal about where we are in the Bitcoin market cycle. Be direct.`,
};

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userTier = (session.user.tier as Tier) ?? 'free';
  if (!hasAccess(userTier, 'members')) return NextResponse.json({ error: 'Members tier required' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const panelId  = searchParams.get('panel') ?? '';
  const valueKey = searchParams.get('value') ?? '';

  if (!PANEL_PROMPTS[panelId]) return NextResponse.json({ error: 'Panel not supported' }, { status: 400 });

  // Cache check
  const cached = await (prisma as any).signalAnnotation.findUnique({
    where: { panelId_valueKey: { panelId, valueKey } },
  });
  if (cached && cached.expiresAt > new Date()) {
    return NextResponse.json({ annotation: cached.annotation, panelId, cached: true });
  }

  // Rate limit check (only for non-cached responses)
  const rateCheck = await checkAiRateLimit(session.user.id, userTier, session.user.email);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Daily AI limit reached', resetAt: rateCheck.resetAt }, { status: 429 });
  }

  // Generate via Grok
  const prompt = PANEL_PROMPTS[panelId](valueKey);
  const annotation = await callGrokAnalysis(prompt, {
    system: 'You are a sharp Bitcoin market analyst. Write concise, specific, data-driven annotations. Never be preachy or evangelistic. Connect numbers to principles.',
    maxTokens: 150,
  });

  if (!annotation) {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }

  await incrementAiUsage(session.user.id);

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await (prisma as any).signalAnnotation.upsert({
    where: { panelId_valueKey: { panelId, valueKey } },
    create: { panelId, valueKey, annotation, expiresAt },
    update: { annotation, expiresAt, generatedAt: new Date() },
  });

  return NextResponse.json({ annotation, panelId, cached: false });
}
