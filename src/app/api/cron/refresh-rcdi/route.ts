/**
 * GET /api/cron/refresh-rcdi
 *
 * Monthly cron — refreshes the Reserve Currency Decay Index composite
 * and its four component scores. Appends one new monthly point to
 * `feh_rcdi_points`, refreshes the standalone components row.
 *
 * Suggested schedule (after IMF COFER quarterly release, but month-by-month
 * is fine — components shift slowly):
 *
 *   0 19 5 * *  curl -s -H "x-cron-secret: $CRON_SECRET" \
 *     https://situationroom.space/api/cron/refresh-rcdi \
 *     >> /opt/situationroom-v3/logs/cron.log 2>&1
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { RCDI_COMPONENTS } from '@/lib/feh/rcdi-seed';
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

const BOUNDS: Record<string, SanityBound> = {
  goldUsdScore:   { low: 0, high: 100, relativeFloor: 0.7, relativeCeil: 1.4 },
  cipsSwiftScore: { low: 0, high: 100, relativeFloor: 0.7, relativeCeil: 1.4 },
  yuanOilScore:   { low: 0, high: 100, relativeFloor: 0.7, relativeCeil: 1.4 },
  bricsSwapScore: { low: 0, high: 100, relativeFloor: 0.7, relativeCeil: 1.4 },
};

const WEIGHTS = { goldUsdScore: 0.30, cipsSwiftScore: 0.25, yuanOilScore: 0.25, bricsSwapScore: 0.20 };

interface RCDIExtraction {
  goldUsdScore: number;
  cipsSwiftScore: number;
  yuanOilScore: number;
  bricsSwapScore: number;
}

const PROMPT = (target: string) =>
  `Estimate the four components of a Reserve Currency Decay Index for ${target}, each scaled 0-100 against a 2010-2020 baseline (higher = more decay):

  - goldUsdScore: shift in central bank gold reserves vs USD reserves (IMF COFER + WGC)
  - cipsSwiftScore: ratio of CIPS message volume to SWIFT volume (PBoC + BIS)
  - yuanOilScore: yuan-denominated oil settlement as % of global oil trade (Aramco/CNPC/Russian disclosures)
  - bricsSwapScore: BRICS+ bilateral swap line aggregate notional vs Fed swap line notional (BIS)

Return ONLY a JSON object, no commentary or code fences:
{"goldUsdScore":number,"cipsSwiftScore":number,"yuanOilScore":number,"bricsSwapScore":number}

If you cannot find data for a component with high confidence, omit that field. Cite IMF, BIS, WGC, PBoC, or recognised national/multilateral sources only.`;

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
  const previous = await prisma.fehRcdiPoint.findFirst({ orderBy: { date: 'desc' } });

  const result = await runGrokExtraction<RCDIExtraction>(PROMPT(target));

  if (result.failed || !result.parsed) {
    await logExtraction({
      module: 'rcdi', metric: target,
      oldValue: previous?.composite ?? null, newValue: null,
      outcome: result.reason === 'parse_failed' ? 'parse_failed' : 'grok_failed',
      grokModel: result.model, grokRawExcerpt: result.rawExcerpt, sourceUrl: result.sourceUrl,
    });
    await emailFehAdmin(`[Situation Room] FEH RCDI cron — Grok ${result.reason ?? 'failed'}`,
      `Target month: ${target}\nReason: ${result.reason}\nRaw excerpt: ${result.rawExcerpt.slice(0, 400)}`);
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });
  }

  // Per-component sanity check + audit log
  const publishable: Partial<RCDIExtraction> = {};
  const rejections: Array<{ metric: string; reason: string; oldValue?: number; newValue?: number }> = [];

  const componentDefaults = Object.fromEntries(RCDI_COMPONENTS.map((c) => [{
    'gold-usd': 'goldUsdScore',
    'cips-swift': 'cipsSwiftScore',
    'yuan-oil': 'yuanOilScore',
    'brics-swaps': 'bricsSwapScore',
  }[c.id] ?? c.id, c.value])) as Record<string, number>;

  for (const [key, bound] of Object.entries(BOUNDS)) {
    const newValue = (result.parsed as Record<string, number | undefined>)[key];
    if (typeof newValue !== 'number' || !Number.isFinite(newValue)) continue;
    const oldValue = (previous as Record<string, unknown> | null)?.[key] as number | undefined ?? null;
    const reason = checkSanityBound(newValue, oldValue, bound);
    if (reason) {
      rejections.push({ metric: key, reason, oldValue: oldValue ?? undefined, newValue });
      await logExtraction({
        module: 'rcdi', metric: `${target}.${key}`, oldValue, newValue,
        outcome: 'sanity_failed', sanityLow: bound.low, sanityHigh: bound.high,
        grokModel: result.model, sourceUrl: result.sourceUrl,
      });
      continue;
    }
    (publishable as Record<string, number>)[key] = newValue;
    await logExtraction({
      module: 'rcdi', metric: `${target}.${key}`, oldValue, newValue,
      outcome: 'published', grokModel: result.model, sourceUrl: result.sourceUrl,
    });
  }

  // Build the monthly point — fall back to prior point or seed for any rejected/missing field.
  const point = {
    date:           target,
    goldUsdScore:   publishable.goldUsdScore   ?? previous?.goldUsdScore   ?? componentDefaults.goldUsdScore,
    cipsSwiftScore: publishable.cipsSwiftScore ?? previous?.cipsSwiftScore ?? componentDefaults.cipsSwiftScore,
    yuanOilScore:   publishable.yuanOilScore   ?? previous?.yuanOilScore   ?? componentDefaults.yuanOilScore,
    bricsSwapScore: publishable.bricsSwapScore ?? previous?.bricsSwapScore ?? componentDefaults.bricsSwapScore,
    sourceUrl:      result.sourceUrl,
  };
  const composite =
    point.goldUsdScore   * WEIGHTS.goldUsdScore +
    point.cipsSwiftScore * WEIGHTS.cipsSwiftScore +
    point.yuanOilScore   * WEIGHTS.yuanOilScore +
    point.bricsSwapScore * WEIGHTS.bricsSwapScore;

  await prisma.fehRcdiPoint.upsert({
    where: { date: target },
    update: { ...point, composite },
    create: { ...point, composite },
  });

  await emailFehAdmin(
    `[Situation Room] FEH RCDI refresh — composite ${composite.toFixed(1)}`,
    [
      `RCDI monthly refresh complete for ${target}.`,
      ``,
      `Composite:        ${composite.toFixed(1)}`,
      `Gold/USD:         ${point.goldUsdScore}`,
      `CIPS/SWIFT:       ${point.cipsSwiftScore}`,
      `Yuan oil:         ${point.yuanOilScore}`,
      `BRICS swaps:      ${point.bricsSwapScore}`,
      ``,
      `Sanity rejections (kept last-known-good):`,
      formatRejections(rejections),
    ].join('\n'),
  );

  return NextResponse.json({ ok: true, target, composite, rejections: rejections.length });
}
