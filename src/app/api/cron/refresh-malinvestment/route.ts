/**
 * GET /api/cron/refresh-malinvestment
 *
 * Weekly cron — refreshes 9 sector stress scores + headline metrics.
 * Module 04 reads from `feh_malinvestment_sectors`.
 *
 * Suggested schedule:
 *
 *   0 21 * * 1  curl -s -H "x-cron-secret: $CRON_SECRET" \
 *     https://situationroom.space/api/cron/refresh-malinvestment ...
 *     (Mondays 21:00 UTC — gives weekend FRED + Coinglass data time to settle)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MALINVESTMENT_SECTORS } from '@/lib/feh/malinvestment-seed';
import {
  runGrokExtraction,
  checkSanityBound,
  logExtraction,
  emailFehAdmin,
  formatRejections,
  type SanityBound,
} from '@/lib/feh/extract';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

const CRON_SECRET = process.env.CRON_SECRET || '';

const BOUNDS: Record<string, SanityBound> = {
  stress:         { low: 0, high: 100, relativeFloor: 0.6, relativeCeil: 1.6 },
  yoyDelta:       { low: -25, high: 25 },
  halfLifeMonths: { low: 1, high: 60, relativeFloor: 0.4, relativeCeil: 2.5 },
};

interface ExtractedSector {
  id: string;
  stress?: number;
  headline?: string;
  yoyDelta?: number;
  halfLifeMonths?: number;
}

const SECTOR_PROMPT = MALINVESTMENT_SECTORS.map(
  (s) => `  - ${s.id}: ${s.label}`,
).join('\n');

const PROMPT = `For each of these 9 malinvestment sectors, return current stress data:

${SECTOR_PROMPT}

For each sector return:
  - id: short id (matches above, e.g. "cre", "zombie", "spac")
  - stress: 0-100 stress score (z-score normalised vs 20-year history; higher = more stress)
  - headline: ≤80-char prose with the killer current metric (e.g. "18.2% of Russell 3000 unable to cover interest")
  - yoyDelta: change in stress score, percentage points YoY (negative = improving)
  - halfLifeMonths: integer months until secondary stress trigger fires under current rates

Return ONLY a JSON object, no commentary:
{"sectors":[{"id":"cre","stress":72,"headline":"...","yoyDelta":4.6,"halfLifeMonths":18}, ...]}

If you cannot find data for a sector, omit that sector. Cite FRED, Coinglass, S&P, Pitchbook, Trepp, or recognised data providers only.`;

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existingRows = await prisma.fehMalinvestmentSector.findMany();
  const existingById = new Map(existingRows.map((r) => [r.id, r]));

  const result = await runGrokExtraction<{ sectors: ExtractedSector[] }>(PROMPT);

  if (result.failed || !result.parsed?.sectors) {
    await emailFehAdmin(`[Situation Room] FEH malinvestment cron — Grok ${result.reason ?? 'failed'}`,
      `Reason: ${result.reason}\nRaw: ${result.rawExcerpt.slice(0, 400)}`);
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });
  }

  const allRejections: Array<{ metric: string; reason: string; oldValue?: number; newValue?: number }> = [];
  let publishedCount = 0;

  for (const sec of result.parsed.sectors) {
    if (!sec.id) continue;
    const seed = MALINVESTMENT_SECTORS.find((s) => s.id === sec.id);
    if (!seed) continue;
    const existing = existingById.get(sec.id);

    const publishable: Record<string, unknown> = {};
    for (const [key, bound] of Object.entries(BOUNDS)) {
      const newValue = (sec as unknown as Record<string, number | undefined>)[key];
      if (typeof newValue !== 'number' || !Number.isFinite(newValue)) continue;
      const oldValue = (existing as Record<string, unknown> | undefined)?.[key] as number | undefined ?? null;
      const reason = checkSanityBound(newValue, oldValue, bound);
      if (reason) {
        allRejections.push({ metric: `${sec.id}.${key}`, reason, oldValue: oldValue ?? undefined, newValue });
        await logExtraction({
          module: 'malinvestment', metric: `${sec.id}.${key}`, oldValue, newValue,
          outcome: 'sanity_failed', sanityLow: bound.low, sanityHigh: bound.high,
          grokModel: result.model, sourceUrl: result.sourceUrl,
        });
        continue;
      }
      publishable[key] = newValue;
      await logExtraction({
        module: 'malinvestment', metric: `${sec.id}.${key}`, oldValue, newValue,
        outcome: 'published', grokModel: result.model, sourceUrl: result.sourceUrl,
      });
    }

    const headline = typeof sec.headline === 'string' && sec.headline.length > 0 && sec.headline.length <= 200
      ? sec.headline
      : existing?.headline ?? seed.headline;

    const writeData = {
      id:             seed.id,
      short:          seed.short,
      label:          seed.label,
      stress:         (publishable.stress as number)         ?? existing?.stress         ?? seed.stress,
      headline,
      yoyDelta:       (publishable.yoyDelta as number)       ?? existing?.yoyDelta       ?? seed.yoyDelta,
      halfLifeMonths: Math.round((publishable.halfLifeMonths as number) ?? existing?.halfLifeMonths ?? seed.halfLifeMonths),
      sourceUrl:      result.sourceUrl,
    };

    await prisma.fehMalinvestmentSector.upsert({
      where: { id: sec.id },
      update: writeData,
      create: writeData,
    });
    publishedCount += 1;
  }

  await emailFehAdmin(
    `[Situation Room] FEH malinvestment refresh — ${publishedCount}/9 sectors`,
    [
      `Weekly malinvestment refresh complete.`,
      `Published: ${publishedCount}/9`,
      `Rejections: ${allRejections.length}`,
      ``,
      formatRejections(allRejections),
    ].join('\n'),
  );

  return NextResponse.json({ ok: true, published: publishedCount, rejections: allRejections.length });
}
