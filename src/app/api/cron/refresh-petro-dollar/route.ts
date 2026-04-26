/**
 * GET /api/cron/refresh-petro-dollar
 *
 * Daily-ish cron — appends current month's petro-dollar layered-chart point
 * to `feh_petro_dollar_points`. Re-runs are idempotent (upsert on date).
 *
 * Suggested schedule:
 *
 *   0 23 * * *  curl -s -H "x-cron-secret: $CRON_SECRET" \
 *     https://situationroom.space/api/cron/refresh-petro-dollar ...
 *
 * Optimisation note: DXY can be sourced live from FRED / API-Ninjas (already
 * wired in v3). The other three series (yuan oil settlement, gold repat
 * index, BRICS swap notional) move quarterly — long term split this into a
 * cheap daily DXY-only refresh + a quarterly Grok refresh for the others.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PETRO_HISTORY } from '@/lib/feh/petro-dollar-seed';
import {
  runGrokExtraction,
  checkSanityBound,
  logExtraction,
  emailFehAdmin,
  formatRejections,
  type SanityBound,
} from '@/lib/feh/extract';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET || '';

// All series indexed Apr 2016 = 100, so plausible band is ~50..400.
const BOUNDS: Record<string, SanityBound> = {
  dxy:        { low: 60,  high: 200, relativeFloor: 0.85, relativeCeil: 1.18 },
  yuanOil:    { low: 50,  high: 800, relativeFloor: 0.85, relativeCeil: 1.30 },
  goldRepat:  { low: 50,  high: 500, relativeFloor: 0.85, relativeCeil: 1.20 },
  bricsSwaps: { low: 50,  high: 800, relativeFloor: 0.85, relativeCeil: 1.30 },
};

interface ExtractedPetro {
  dxy?: number;
  yuanOil?: number;
  goldRepat?: number;
  bricsSwaps?: number;
}

const PROMPT = (target: string) =>
  `Estimate four petro-dollar trajectory series for ${target}, each indexed to Apr 2016 = 100:

  - dxy: US Dollar Index (FRED DTWEXBGS or DXY/ICE), indexed
  - yuanOil: Yuan-denominated share of global oil settlement, indexed
  - goldRepat: Cross-border gold repatriation index — aggregate flows back to source nations (WGC quarterly)
  - bricsSwaps: BRICS+ bilateral swap notional outstanding, indexed

Return ONLY a JSON object, no commentary:
{"dxy":number,"yuanOil":number,"goldRepat":number,"bricsSwaps":number}

If a series cannot be sourced with high confidence, OMIT it. Cite FRED, BIS, World Gold Council, or named oil-deal news only.`;

function targetMonth(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return d.toISOString().slice(0, 7);
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const target = targetMonth();
  const previous = await prisma.fehPetroDollarPoint.findFirst({ orderBy: { date: 'desc' } });
  const seedDefault = PETRO_HISTORY[PETRO_HISTORY.length - 1];

  const result = await runGrokExtraction<ExtractedPetro>(PROMPT(target));

  if (result.failed || !result.parsed) {
    await emailFehAdmin(`[Situation Room] FEH petro-dollar cron — Grok ${result.reason ?? 'failed'}`,
      `Reason: ${result.reason}\nRaw: ${result.rawExcerpt.slice(0, 400)}`);
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });
  }

  const publishable: Record<string, number> = {};
  const rejections: Array<{ metric: string; reason: string; oldValue?: number; newValue?: number }> = [];

  for (const [key, bound] of Object.entries(BOUNDS)) {
    const newValue = (result.parsed as Record<string, number | undefined>)[key];
    if (typeof newValue !== 'number' || !Number.isFinite(newValue)) continue;
    const oldValue = (previous as Record<string, unknown> | null)?.[key] as number | undefined ?? null;
    const reason = checkSanityBound(newValue, oldValue, bound);
    if (reason) {
      rejections.push({ metric: key, reason, oldValue: oldValue ?? undefined, newValue });
      await logExtraction({
        module: 'petro-dollar', metric: `${target}.${key}`, oldValue, newValue,
        outcome: 'sanity_failed', sanityLow: bound.low, sanityHigh: bound.high,
        grokModel: result.model, sourceUrl: result.sourceUrl,
      });
      continue;
    }
    publishable[key] = newValue;
    await logExtraction({
      module: 'petro-dollar', metric: `${target}.${key}`, oldValue, newValue,
      outcome: 'published', grokModel: result.model, sourceUrl: result.sourceUrl,
    });
  }

  const point = {
    date:       target,
    dxy:        publishable.dxy        ?? previous?.dxy        ?? seedDefault.dxy,
    yuanOil:    publishable.yuanOil    ?? previous?.yuanOil    ?? seedDefault.yuanOil,
    goldRepat:  publishable.goldRepat  ?? previous?.goldRepat  ?? seedDefault.goldRepat,
    bricsSwaps: publishable.bricsSwaps ?? previous?.bricsSwaps ?? seedDefault.bricsSwaps,
    sourceUrl:  result.sourceUrl,
  };

  await prisma.fehPetroDollarPoint.upsert({
    where: { date: target },
    update: point,
    create: point,
  });

  if (rejections.length > 0) {
    await emailFehAdmin(
      `[Situation Room] FEH petro-dollar refresh — ${rejections.length} sanity rejections for ${target}`,
      formatRejections(rejections),
    );
  }

  return NextResponse.json({ ok: true, target, point, rejections: rejections.length });
}
