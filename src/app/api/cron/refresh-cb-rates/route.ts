/**
 * GET /api/cron/refresh-cb-rates
 *
 * Daily cron — refreshes 24 central-bank policy rates, last-move dates,
 * stance classification, and market-implied 12mo paths. The Module 03
 * matrix reads from `feh_cb_rates`.
 *
 * Suggested schedule (after most CB statements settle):
 *
 *   0 22 * * *  curl -s -H "x-cron-secret: $CRON_SECRET" \
 *     https://situationroom.space/api/cron/refresh-cb-rates ...
 *
 * Optimisation note: where v3 already has live rates via API-Ninjas
 * (USA/EUR/UK/JPN), the Grok refresh re-confirms the value; long term
 * the daily refresher should be hybrid (API-Ninjas for live rates +
 * Grok weekly for stance + market-implied path).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CB_RATES } from '@/lib/feh/cb-rates-seed';
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
const BATCH_SIZE = 8;

const BOUNDS: Record<string, SanityBound> = {
  rate:                { low: -1, high: 200 },
  marketImpliedBps12m: { low: -3000, high: 3000 },
};

const VALID_STANCES = new Set(['easing', 'holding', 'tightening']);

interface ExtractedCB {
  iso3: string;
  rate?: number;
  lastMoveBps?: number;
  lastMoveDate?: string; // DDMMMYY
  stance?: string;
  marketImpliedBps12m?: number;
}

const PROMPT = (codes: string[]) =>
  `For each of these central banks, return current policy stance data:

${codes.map((c) => `  - ${c}`).join('\n')}

Required fields:
  - iso3: 3-letter country code (use EUZ for ECB)
  - rate: current policy rate, %
  - lastMoveBps: last move in basis points (negative = cut, 0 = unchanged)
  - lastMoveDate: date of last move in DDMMMYY military format (e.g. "18MAR26")
  - stance: one of "easing" | "holding" | "tightening" — based on trailing 6 months
  - marketImpliedBps12m: market-implied cumulative move over next 12 months in bps (from OIS curves where liquid, futures elsewhere)

Return ONLY a JSON object, no commentary:
{"banks":[{"iso3":"USA","rate":4.25,"lastMoveBps":-25,"lastMoveDate":"18MAR26","stance":"easing","marketImpliedBps12m":-75}, ...]}

If you cannot find a field with high confidence, OMIT it for that bank. Cite each CB website, BIS, Trading Economics, or Refinitiv only.`;

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const allCodes = CB_RATES.map((r) => r.iso3);
  const batches: string[][] = [];
  for (let i = 0; i < allCodes.length; i += BATCH_SIZE) batches.push(allCodes.slice(i, i + BATCH_SIZE));

  const existingRows = await prisma.fehCbRate.findMany();
  const existingByIso3 = new Map(existingRows.map((r) => [r.iso3, r]));

  const allRejections: Array<{ metric: string; reason: string; oldValue?: number; newValue?: number }> = [];
  const batchFailures: string[][] = [];
  let publishedCount = 0;

  for (const batch of batches) {
    const result = await runGrokExtraction<{ banks: ExtractedCB[] }>(PROMPT(batch));
    if (result.failed || !result.parsed?.banks) {
      batchFailures.push(batch);
      for (const code of batch) {
        await logExtraction({
          module: 'cb-rates', metric: `${code}.batch`, oldValue: null, newValue: null,
          outcome: result.reason === 'parse_failed' ? 'parse_failed' : 'grok_failed',
          grokModel: result.model, grokRawExcerpt: result.rawExcerpt, sourceUrl: result.sourceUrl,
        });
      }
      continue;
    }

    for (const cb of result.parsed.banks) {
      if (!cb.iso3 || !batch.includes(cb.iso3)) continue;
      const seed = CB_RATES.find((r) => r.iso3 === cb.iso3);
      if (!seed) continue;
      const existing = existingByIso3.get(cb.iso3);

      // Numeric sanity-bound checks
      const publishable: Record<string, unknown> = {};
      for (const [key, bound] of Object.entries(BOUNDS)) {
        const newValue = (cb as unknown as Record<string, number | undefined>)[key];
        if (typeof newValue !== 'number' || !Number.isFinite(newValue)) continue;
        const oldValue = (existing as Record<string, unknown> | undefined)?.[key] as number | undefined ?? null;
        const reason = checkSanityBound(newValue, oldValue, bound);
        if (reason) {
          allRejections.push({ metric: `${cb.iso3}.${key}`, reason, oldValue: oldValue ?? undefined, newValue });
          await logExtraction({
            module: 'cb-rates', metric: `${cb.iso3}.${key}`, oldValue, newValue,
            outcome: 'sanity_failed', sanityLow: bound.low, sanityHigh: bound.high,
            grokModel: result.model, sourceUrl: result.sourceUrl,
          });
          continue;
        }
        publishable[key] = newValue;
        await logExtraction({
          module: 'cb-rates', metric: `${cb.iso3}.${key}`, oldValue, newValue,
          outcome: 'published', grokModel: result.model, sourceUrl: result.sourceUrl,
        });
      }

      // Stance — string validation
      let stance: string | null = null;
      if (typeof cb.stance === 'string' && VALID_STANCES.has(cb.stance)) {
        stance = cb.stance;
      }

      // Date — DDMMMYY pattern
      let lastMoveDate: string | null = null;
      if (typeof cb.lastMoveDate === 'string' && /^\d{2}[A-Z]{3}\d{2}$/.test(cb.lastMoveDate)) {
        lastMoveDate = cb.lastMoveDate;
      }

      // lastMoveBps — sanity (can be 0)
      let lastMoveBps: number | null = null;
      if (typeof cb.lastMoveBps === 'number' && Math.abs(cb.lastMoveBps) <= 2000) {
        lastMoveBps = cb.lastMoveBps;
      }

      const writeData = {
        iso3:                seed.iso3,
        countryName:         seed.name,
        bank:                seed.bank,
        rate:                (publishable.rate as number)                ?? existing?.rate                ?? seed.rate,
        lastMoveBps:         lastMoveBps                                  ?? existing?.lastMoveBps         ?? seed.lastMoveBps,
        lastMoveDate:        lastMoveDate                                 ?? existing?.lastMoveDate        ?? seed.lastMoveDate,
        stance:              stance                                       ?? existing?.stance              ?? seed.stance,
        marketImpliedBps12m: (publishable.marketImpliedBps12m as number) ?? existing?.marketImpliedBps12m ?? seed.marketImpliedBps12m,
        gdpUsdT:             existing?.gdpUsdT                            ?? seed.gdpUsdT,
        sourceUrl:           result.sourceUrl,
      };

      await prisma.fehCbRate.upsert({
        where: { iso3: cb.iso3 },
        update: writeData,
        create: writeData,
      });
      publishedCount += 1;
    }
  }

  const elapsed = Math.round((Date.now() - startedAt) / 1000);

  // Only email admin on outages or significant rejection volume — daily cron
  // would otherwise spam.
  if (batchFailures.length > 0 || allRejections.length > 5) {
    await emailFehAdmin(
      `[Situation Room] FEH CB rates refresh — ${batchFailures.length} batch failures, ${allRejections.length} rejections`,
      [
        `Daily CB rates refresh: ${publishedCount}/${allCodes.length} updated.`,
        ``,
        `Sanity rejections:`,
        formatRejections(allRejections),
      ].join('\n'),
    );
  }

  return NextResponse.json({ ok: true, processed: allCodes.length, published: publishedCount, batchFailures: batchFailures.length, rejections: allRejections.length, elapsedSeconds: elapsed });
}
