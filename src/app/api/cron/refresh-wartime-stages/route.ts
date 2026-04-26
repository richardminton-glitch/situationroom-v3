/**
 * GET /api/cron/refresh-wartime-stages
 *
 * Monthly cron — refreshes 22 countries' wartime-finance stage classification
 * + four monitored metrics (defence/GDP, defence CAGR 3y, M2 CAGR 3y, CPI YoY)
 * + documented evidence bullets. Module 05 reads from `feh_wartime_countries`.
 *
 * Suggested schedule:
 *
 *   0 20 5 * *  curl -s -H "x-cron-secret: $CRON_SECRET" \
 *     https://situationroom.space/api/cron/refresh-wartime-stages ...
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { WARTIME_COUNTRIES } from '@/lib/feh/wartime-seed';
import {
  runGrokExtraction,
  checkSanityBound,
  logExtraction,
  emailFehAdmin,
  formatRejections,
  type SanityBound,
} from '@/lib/feh/extract';

export const dynamic = 'force-dynamic';
export const maxDuration = 290;

const CRON_SECRET = process.env.CRON_SECRET || '';
const BATCH_SIZE = 6;

const BOUNDS: Record<string, SanityBound> = {
  defenceSpendPctGdp: { low: 0,    high: 50,  relativeFloor: 0.6, relativeCeil: 1.7 },
  defenceCagr3y:      { low: -50,  high: 100, relativeFloor: 0.3, relativeCeil: 3.0 },
  m2Growth3y:         { low: -10,  high: 1000 },
  cpiYoY:             { low: -10,  high: 1000 },
};

interface ExtractedWartime {
  iso3: string;
  stage?: number;
  defenceSpendPctGdp?: number;
  defenceCagr3y?: number;
  m2Growth3y?: number;
  cpiYoY?: number;
  evidence?: string[];
}

const PROMPT = (codes: string[]) =>
  `For each country, classify its wartime-finance stage and report monitored metrics.

Stage thresholds (cumulative — country at higher stage implies all lower stages also fired):
  Stage 1: defence spending >2.5% GDP AND increasing 3y CAGR >5%
  Stage 2: net new sovereign issuance specifically marked for defence/security in last 24m
  Stage 3: any documented capital outflow restriction in last 24m
  Stage 4: any documented price/wage decree or cap in last 24m
  Stage 5: M2 growth >15% sustained 3y AND CPI double-digit

Countries:
${codes.map((c) => `  - ${c}`).join('\n')}

Return for each:
  - iso3
  - stage: integer 1-5 (deepest stage triggered)
  - defenceSpendPctGdp: %
  - defenceCagr3y: % (3y CAGR of defence spending)
  - m2Growth3y: % (3y CAGR of broad money M2)
  - cpiYoY: % (latest YoY headline CPI)
  - evidence: array of 3-5 short documented bullets supporting the stage classification

Return ONLY a JSON object, no commentary:
{"countries":[{"iso3":"USA","stage":1,"defenceSpendPctGdp":3.4,"defenceCagr3y":6.2,"m2Growth3y":4.8,"cpiYoY":2.9,"evidence":["..."]}, ...]}

If you cannot classify with high confidence, omit the country. Cite SIPRI, IMF AREAER, IMF WEO, national statistics offices, or named news of decrees.`;

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const allCodes = WARTIME_COUNTRIES.map((c) => c.iso3);
  const batches: string[][] = [];
  for (let i = 0; i < allCodes.length; i += BATCH_SIZE) batches.push(allCodes.slice(i, i + BATCH_SIZE));

  const existingRows = await prisma.fehWartimeCountry.findMany();
  const existingByIso3 = new Map(existingRows.map((r) => [r.iso3, r]));

  const allRejections: Array<{ metric: string; reason: string; oldValue?: number; newValue?: number }> = [];
  const batchFailures: string[][] = [];
  let publishedCount = 0;

  for (const batch of batches) {
    const result = await runGrokExtraction<{ countries: ExtractedWartime[] }>(PROMPT(batch));
    if (result.failed || !result.parsed?.countries) {
      batchFailures.push(batch);
      for (const code of batch) {
        await logExtraction({
          module: 'wartime', metric: `${code}.batch`, oldValue: null, newValue: null,
          outcome: result.reason === 'parse_failed' ? 'parse_failed' : 'grok_failed',
          grokModel: result.model, grokRawExcerpt: result.rawExcerpt, sourceUrl: result.sourceUrl,
        });
      }
      continue;
    }

    for (const c of result.parsed.countries) {
      if (!c.iso3 || !batch.includes(c.iso3)) continue;
      const seed = WARTIME_COUNTRIES.find((x) => x.iso3 === c.iso3);
      if (!seed) continue;
      const existing = existingByIso3.get(c.iso3);

      const publishable: Record<string, unknown> = {};
      for (const [key, bound] of Object.entries(BOUNDS)) {
        const newValue = (c as unknown as Record<string, number | undefined>)[key];
        if (typeof newValue !== 'number' || !Number.isFinite(newValue)) continue;
        const oldValue = (existing as Record<string, unknown> | undefined)?.[key] as number | undefined ?? null;
        const reason = checkSanityBound(newValue, oldValue, bound);
        if (reason) {
          allRejections.push({ metric: `${c.iso3}.${key}`, reason, oldValue: oldValue ?? undefined, newValue });
          await logExtraction({
            module: 'wartime', metric: `${c.iso3}.${key}`, oldValue, newValue,
            outcome: 'sanity_failed', sanityLow: bound.low, sanityHigh: bound.high,
            grokModel: result.model, sourceUrl: result.sourceUrl,
          });
          continue;
        }
        publishable[key] = newValue;
        await logExtraction({
          module: 'wartime', metric: `${c.iso3}.${key}`, oldValue, newValue,
          outcome: 'published', grokModel: result.model, sourceUrl: result.sourceUrl,
        });
      }

      // Stage validation — must be 1-5 integer
      let stage: number | null = null;
      if (typeof c.stage === 'number' && Number.isInteger(c.stage) && c.stage >= 1 && c.stage <= 5) {
        stage = c.stage;
      }

      // Evidence — array of strings, capped at 5
      let evidenceJson: string | null = null;
      if (Array.isArray(c.evidence)) {
        const cleaned = c.evidence.filter((e): e is string => typeof e === 'string' && e.length > 0).slice(0, 5);
        if (cleaned.length > 0) evidenceJson = JSON.stringify(cleaned);
      }

      const writeData = {
        iso3:               seed.iso3,
        name:               seed.name,
        flag:               seed.flag,
        stage:              stage                                                ?? existing?.stage              ?? seed.stage,
        defenceSpendPctGdp: (publishable.defenceSpendPctGdp as number)          ?? existing?.defenceSpendPctGdp ?? seed.defenceSpendPctGdp,
        defenceCagr3y:      (publishable.defenceCagr3y as number)               ?? existing?.defenceCagr3y      ?? seed.defenceCagr3y,
        m2Growth3y:         (publishable.m2Growth3y as number)                  ?? existing?.m2Growth3y         ?? seed.m2Growth3y,
        cpiYoY:             (publishable.cpiYoY as number)                      ?? existing?.cpiYoY             ?? seed.cpiYoY,
        evidenceJson:       evidenceJson                                         ?? existing?.evidenceJson       ?? JSON.stringify(seed.evidence),
        sourceUrl:          result.sourceUrl,
      };

      await prisma.fehWartimeCountry.upsert({
        where: { iso3: c.iso3 },
        update: writeData,
        create: writeData,
      });
      publishedCount += 1;
    }
  }

  const elapsed = Math.round((Date.now() - startedAt) / 1000);

  await emailFehAdmin(
    `[Situation Room] FEH wartime refresh — ${publishedCount}/${allCodes.length} countries`,
    [
      `Monthly wartime-finance stage refresh.`,
      `Published: ${publishedCount}/${allCodes.length}`,
      `Batch failures: ${batchFailures.length}`,
      `Sanity rejections: ${allRejections.length}`,
      `Elapsed: ${elapsed}s`,
      ``,
      formatRejections(allRejections),
    ].join('\n'),
  );

  return NextResponse.json({ ok: true, processed: allCodes.length, published: publishedCount, batchFailures: batchFailures.length, rejections: allRejections.length, elapsedSeconds: elapsed });
}
