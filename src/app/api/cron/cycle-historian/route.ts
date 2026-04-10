/**
 * GET /api/cron/cycle-historian
 *
 * Weekly cron — generates the Cycle Position historical analogues analysis
 * via Grok and stores it in the signalAnnotation table.
 *
 * Schedule: 0 1 * * 0  (Sunday 01:00 UTC)
 * Model: grok-3-mini-fast
 * Retention: 90 days per entry (≈ 13 weekly snapshots visible at any time)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma }                    from '@/lib/db';

export const dynamic    = 'force-dynamic';
export const maxDuration = 60;

const GROK_URL  = 'https://api.x.ai/v1/chat/completions';
const PANEL_ID  = 'cycle-historian';
const KEEP_DAYS = 90;

const BASE =
  process.env.NEXT_PUBLIC_BASE_URL ||
  `http://localhost:${process.env.PORT || 3000}`;

// ── ISO week key (e.g. "2026-W15") ───────────────────────────────────────────

function isoWeek(): string {
  const now = new Date();
  // ISO 8601: week starts on Monday; week 1 = week containing first Thursday
  const jan4 = new Date(Date.UTC(now.getUTCFullYear(), 0, 4));
  const startOfWeek1 = new Date(jan4.getTime() - (jan4.getUTCDay() || 7) * 86_400_000 + 86_400_000);
  const weekNum = Math.ceil(((now.getTime() - startOfWeek1.getTime()) / 86_400_000 + 1) / 7);
  return `${now.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// ── Grok call ────────────────────────────────────────────────────────────────

async function callGrok(prompt: string): Promise<string | null> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) { console.error('[CycleHistorian] GROK_API_KEY not set'); return null; }

  try {
    const res = await fetch(GROK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model:      'grok-3-mini-fast',
        messages: [
          {
            role:    'system',
            content: 'You are a Bitcoin cycle historian with deep knowledge of every market cycle from 2011 to present. When asked for historical analogues, respond ONLY with valid JSON matching the exact schema provided. Do not include any text outside the JSON object.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens:       600,
        response_format:  { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(50_000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error(`[CycleHistorian] Grok HTTP ${res.status}: ${err.substring(0, 200)}`);
      return null;
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.error('[CycleHistorian] Grok request failed:', err);
    return null;
  }
}

// ── Prompt builder ────────────────────────────────────────────────────────────

interface CycleSnapshot {
  composite: number;
  phase: string;
  btcPrice: number;
  mvrv: number | null;
  puell: number | null;
  piCycleRatio: number | null;
  rainbowBand: number | null;
  realisedPriceRatio: number | null;
}

function buildPrompt(snap: CycleSnapshot, weekKey: string): string {
  const date = new Date().toISOString().split('T')[0];
  return `Date: ${date} (${weekKey})

Current Bitcoin cycle position:
  Composite score: ${snap.composite}/100
  Phase: ${snap.phase}
  BTC Price: $${snap.btcPrice.toLocaleString()}
  MVRV Ratio: ${snap.mvrv?.toFixed(2) ?? 'unavailable'}
  Puell Multiple: ${snap.puell?.toFixed(3) ?? 'unavailable'}
  Pi Cycle ratio: ${snap.piCycleRatio?.toFixed(3) ?? 'unavailable'} (>=1.0 = top signal crossed)
  Rainbow Band: ${snap.rainbowBand ?? 'unavailable'} (1=fire sale, 9=max bubble)
  Price/Realised Price: ${snap.realisedPriceRatio?.toFixed(2) ?? 'unavailable'}x

Drawing on Bitcoin's complete price and on-chain history (2011–present), identify the last 1–2 times these on-chain indicators were at a comparable composite reading. Describe what happened to price in the following 90, 180, and 365 days. Be specific about dates and percentage moves. Acknowledge uncertainty clearly.

Respond ONLY with valid JSON matching this exact schema:
{
  "historicalContext": "2–3 sentences describing the last historical parallel and price outcome",
  "priceChange90d": "e.g. '+35% (2019-Q3 precedent) — high uncertainty'",
  "priceChange180d": "...",
  "priceChange365d": "...",
  "caveats": "1 sentence on key differences between then and now"
}`;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const weekKey = isoWeek();

  // Idempotency — skip if already generated this week
  const existing = await (prisma as any).signalAnnotation.findUnique({
    where: { panelId_valueKey: { panelId: PANEL_ID, valueKey: weekKey } },
  });
  if (existing && (existing as { expiresAt: Date }).expiresAt > new Date()) {
    return NextResponse.json({ status: 'already_generated', weekKey });
  }

  // Fetch current cycle gauge data
  let snap: CycleSnapshot | null = null;
  try {
    const res = await fetch(`${BASE}/api/cycle-gauge`, { signal: AbortSignal.timeout(15_000) });
    if (res.ok) snap = await res.json();
  } catch (err) {
    console.error('[CycleHistorian] Failed to fetch cycle gauge:', err);
  }

  if (!snap || snap.composite === undefined) {
    return NextResponse.json({ error: 'Could not fetch cycle gauge data' }, { status: 503 });
  }

  // Generate via Grok
  const prompt   = buildPrompt(snap, weekKey);
  const grokText = await callGrok(prompt);

  if (!grokText) {
    return NextResponse.json({ error: 'Grok generation failed' }, { status: 503 });
  }

  // Parse and enrich with snapshot data
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(grokText);
  } catch {
    console.error('[CycleHistorian] Failed to parse Grok JSON:', grokText.substring(0, 300));
    return NextResponse.json({ error: 'Grok returned invalid JSON' }, { status: 503 });
  }

  const annotation = {
    // Snapshot data (for display without re-fetch)
    composite:          snap.composite,
    phase:              snap.phase,
    btcPrice:           snap.btcPrice,
    mvrv:               snap.mvrv,
    puell:              snap.puell,
    piCycleRatio:       snap.piCycleRatio,
    rainbowBand:        snap.rainbowBand,
    realisedPriceRatio: snap.realisedPriceRatio,
    // Grok output
    historicalContext:  parsed.historicalContext ?? '',
    priceChange90d:     parsed.priceChange90d ?? '',
    priceChange180d:    parsed.priceChange180d ?? '',
    priceChange365d:    parsed.priceChange365d ?? '',
    caveats:            parsed.caveats ?? '',
    // Metadata
    weekKey,
    generatedAt: new Date().toISOString(),
  };

  const expiresAt = new Date(Date.now() + KEEP_DAYS * 86_400_000);

  await (prisma as any).signalAnnotation.upsert({
    where:  { panelId_valueKey: { panelId: PANEL_ID, valueKey: weekKey } },
    create: { panelId: PANEL_ID, valueKey: weekKey, annotation: JSON.stringify(annotation), expiresAt },
    update: { annotation: JSON.stringify(annotation), expiresAt, generatedAt: new Date() },
  });

  console.log(`[CycleHistorian] Generated for ${weekKey} — composite ${snap.composite} (${snap.phase})`);

  return NextResponse.json({ success: true, weekKey, composite: snap.composite, phase: snap.phase });
}
