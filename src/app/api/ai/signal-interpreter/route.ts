import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasAccess } from '@/lib/auth/tier';
import { prisma } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

const PANEL_ID = 'signal-interpreter';
const TTL_HOURS = 12;

interface Signal {
  panel: string;
  metric: string;
  value: string;
  signal: 'bullish' | 'bearish' | 'neutral';
}

let _client: Anthropic | null = null;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildPrompt(signals: Signal[]): string {
  const formatted = signals
    .map((s) => `${s.panel}: ${s.metric} = ${s.value} (${s.signal})`)
    .join('\n');

  return `You are a seasoned Bitcoin on-chain analyst. Below are the current readings of multiple Bitcoin on-chain and macro signals.

${formatted}

Provide a 3–4 paragraph synthesised interpretation:
1. What the confluence of these signals suggests about Bitcoin's current macro regime
2. Historical precedents where similar signal combinations occurred and what happened
3. Key risks and what would invalidate the current thesis
4. A direct, actionable bottom line

Write in a clipped, intelligence-briefing style — precise, no hedging waffle. 150–200 words total.`;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userTier = (session.user.tier as Tier) ?? 'free';
  if (!hasAccess(userTier, 'vip')) {
    return NextResponse.json({ error: 'VIP tier required' }, { status: 403 });
  }

  let body: { signals?: Signal[]; autoDetect?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  let signals: Signal[] = body.signals ?? [];

  // autoDetect: derive signals from latest briefing data snapshot
  if (body.autoDetect || signals.length === 0) {
    try {
      const briefing = await prisma.briefing.findFirst({ orderBy: { date: 'desc' } });
      if (briefing) {
        const ds = JSON.parse(briefing.dataSnapshotJson || '{}');
        type SigVal = Signal['signal'];
        const bull: SigVal = 'bullish', bear: SigVal = 'bearish', neut: SigVal = 'neutral';
        signals = ([
          { panel: 'Market',   metric: 'BTC Price',    value: ds.btcPrice    ? `$${Number(ds.btcPrice).toLocaleString()}` : '—', signal: (ds.btc24hPct ?? 0) >= 0 ? bull : bear },
          { panel: 'Sentiment',metric: 'Fear & Greed', value: String(ds.fearGreed ?? '—'), signal: (ds.fearGreed ?? 50) > 60 ? bull : (ds.fearGreed ?? 50) < 30 ? bear : neut },
          { panel: 'Network',  metric: 'Hashrate',     value: ds.hashrateEH  ? `${Number(ds.hashrateEH).toFixed(1)} EH/s` : '—', signal: neut },
          { panel: 'On-Chain', metric: 'MVRV',         value: ds.mvrv        ? Number(ds.mvrv).toFixed(2) : '—', signal: (ds.mvrv ?? 1) > 3.5 ? bear : (ds.mvrv ?? 1) < 1 ? bull : neut },
          { panel: 'Macro',    metric: 'VIX',          value: ds.vix         ? Number(ds.vix).toFixed(2) : '—', signal: (ds.vix ?? 20) > 30 ? bear : neut },
          { panel: 'Macro',    metric: 'DXY',          value: ds.dxy         ? Number(ds.dxy).toFixed(2) : '—', signal: (ds.dxy ?? 100) > 105 ? bear : neut },
          { panel: 'Briefing', metric: 'Conviction',   value: `${Math.round(briefing.convictionScore)}/100`, signal: briefing.convictionScore >= 65 ? bull : briefing.convictionScore <= 35 ? bear : neut },
          { panel: 'Briefing', metric: 'Threat Level', value: briefing.threatLevel, signal: briefing.threatLevel === 'LOW' ? bull : briefing.threatLevel === 'CRITICAL' ? bear : neut },
        ] as Signal[]).filter((s) => s.value !== '—');
      }
    } catch {
      // fall through with empty signals
    }
    if (signals.length === 0) {
      return NextResponse.json({ error: 'No signal data available' }, { status: 503 });
    }
  }

  const valueKey = todayKey();
  const force = request.nextUrl.searchParams.get('force') === 'true';

  // Cache check — TTL 12 hours (skipped if force=true)
  const cached = !force && await (prisma as any).signalAnnotation.findUnique({
    where: { panelId_valueKey: { panelId: PANEL_ID, valueKey } },
  });
  if (cached && (cached as { expiresAt: Date }).expiresAt > new Date()) {
    return NextResponse.json({
      interpretation: cached.annotation,
      cachedAt: cached.generatedAt.toISOString(),
    });
  }

  // Generate via Claude
  const prompt = buildPrompt(signals);
  let text: string;
  try {
    const client = getClient();
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });
    text = (msg.content[0] as { type: 'text'; text: string }).text.trim();
  } catch (err) {
    console.error('[signal-interpreter] Anthropic error:', err);
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }

  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);
  const generatedAt = new Date();

  await (prisma as any).signalAnnotation.upsert({
    where: { panelId_valueKey: { panelId: PANEL_ID, valueKey } },
    create: { panelId: PANEL_ID, valueKey, annotation: text, expiresAt },
    update: { annotation: text, expiresAt, generatedAt },
  });

  return NextResponse.json({
    interpretation: text,
    cachedAt: generatedAt.toISOString(),
  });
}
