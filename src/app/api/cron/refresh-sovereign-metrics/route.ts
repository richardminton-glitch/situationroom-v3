/**
 * GET /api/cron/refresh-sovereign-metrics
 *
 * Quarterly cron — refreshes 30 sovereigns' fiscal metrics via Grok web
 * search, applies sanity bounds, writes the publishable subset to the
 * `feh_sovereign_metrics` table, and logs every extraction attempt to
 * `feh_extraction_log` for audit.
 *
 * Schedule (suggested crontab on the VPS, staggered across the quarter):
 *
 *   0 18 1 1,4,7,10 *  curl -s -H "x-cron-secret: $CRON_SECRET" \
 *     https://situationroom.space/api/cron/refresh-sovereign-metrics \
 *     >> /opt/situationroom-v3/logs/cron.log 2>&1
 *
 * Failure handling (locked decision: auto-publish + sanity bounds):
 *   - sanity-bound trip → keep last-known-good, log, alert admin
 *   - parse failure on a sovereign → that sovereign skipped, others continue
 *   - whole-batch Grok failure → admin email with manual-override curl
 *
 * Auth: x-cron-secret header (matched against CRON_SECRET env).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SOVEREIGNS_SEED } from '@/lib/feh/sovereigns-seed';
import {
  runGrokExtraction,
  checkSanityBound,
  logExtraction,
  emailFehAdmin,
  formatRejections,
  FEH_SITE_URL,
  type SanityBound,
} from '@/lib/feh/extract';

export const dynamic = 'force-dynamic';
export const maxDuration = 290;

const CRON_SECRET = process.env.CRON_SECRET || '';
const BATCH_SIZE = 5; // 5 sovereigns per Grok call → 6 calls for 30 sovereigns

// Per-metric sanity bounds. Tighter overrides for slow movers — debt/GDP
// can't move 2× in a quarter; primary balance can flip sign but not by more
// than 10pp; growth bounded to a plausible -15% .. +15% real range.
const BOUNDS: Record<string, SanityBound> = {
  debtGdp:           { low: 0,    high: 400, relativeFloor: 0.7, relativeCeil: 1.4 },
  interestPctRevenue:{ low: 0,    high: 100, relativeFloor: 0.5, relativeCeil: 2.0 },
  primaryBalance:    { low: -20,  high: 20  },                            // can flip sign — no relative bound
  realGdpGrowth:     { low: -15,  high: 15  },
  effectiveRate:     { low: 0,    high: 80,  relativeFloor: 0.4, relativeCeil: 2.5 },
  avgMaturity:       { low: 0,    high: 30,  relativeFloor: 0.7, relativeCeil: 1.5 },
};

interface ExtractedSovereign {
  iso3: string;
  debtGdp: number;
  interestPctRevenue: number;
  primaryBalance: number;
  realGdpGrowth: number;
  effectiveRate: number;
  avgMaturity: number;
}

const PROMPT = (codes: string[]) =>
  `For each of these sovereigns, return the most recent published values from IMF WEO, IMF Fiscal Monitor, OECD, or the national treasury / debt management office:

${codes.map((c) => `  - ${c}`).join('\n')}

Required metrics (return as numbers, percentages where applicable):
  - debtGdp: gross general government debt / GDP, %
  - interestPctRevenue: interest expense / general government revenue, %
  - primaryBalance: primary balance / GDP, % (negative = deficit)
  - realGdpGrowth: real GDP growth (latest annual or projected), %
  - effectiveRate: effective interest rate on outstanding debt stock, %
  - avgMaturity: average remaining maturity of debt stock, years

Return ONLY a JSON object with no commentary, no markdown, no code fences:
{"sovereigns": [
  {"iso3":"USA","debtGdp":123.0,"interestPctRevenue":16.0,"primaryBalance":-5.0,"realGdpGrowth":1.8,"effectiveRate":3.5,"avgMaturity":6.0},
  ...
]}

If you cannot find a metric for a sovereign with high confidence, OMIT that field for that sovereign — do not guess. Cite IMF WEO / OECD / national treasury / national debt management office only.`;

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const allCodes = SOVEREIGNS_SEED.map((s) => s.iso3);
  const batches: string[][] = [];
  for (let i = 0; i < allCodes.length; i += BATCH_SIZE) {
    batches.push(allCodes.slice(i, i + BATCH_SIZE));
  }

  // Existing rows → for sanity bounds (relative floor/ceil checks).
  const existingRows = await prisma.fehSovereignMetric.findMany();
  const existingByIso3 = new Map(existingRows.map((r) => [r.iso3, r]));

  const allRejections: Array<{ metric: string; reason: string; oldValue?: number; newValue?: number }> = [];
  const batchFailures: Array<{ codes: string[]; reason: string; raw: string }> = [];
  let publishedCount = 0;

  for (const batch of batches) {
    const result = await runGrokExtraction<{ sovereigns: ExtractedSovereign[] }>(PROMPT(batch));

    if (result.failed || !result.parsed?.sovereigns) {
      batchFailures.push({ codes: batch, reason: result.reason ?? 'unknown', raw: result.rawExcerpt });
      // Log one entry per sovereign in the failed batch.
      for (const code of batch) {
        await logExtraction({
          module: 'sovereign',
          metric: `${code}.batch`,
          oldValue: null,
          newValue: null,
          outcome: result.reason === 'parse_failed' ? 'parse_failed' : 'grok_failed',
          grokModel: result.model,
          grokRawExcerpt: result.rawExcerpt,
          sourceUrl: result.sourceUrl,
        });
      }
      continue;
    }

    for (const sov of result.parsed.sovereigns) {
      if (!sov.iso3 || !batch.includes(sov.iso3)) continue;
      const seed = SOVEREIGNS_SEED.find((s) => s.iso3 === sov.iso3);
      if (!seed) continue;

      const existing = existingByIso3.get(sov.iso3);
      const publishable: Record<string, number> = {};
      const rowRejections: Array<{ metric: string; reason: string; oldValue?: number; newValue?: number }> = [];

      for (const [key, bound] of Object.entries(BOUNDS)) {
        const newValue = (sov as unknown as Record<string, number | undefined>)[key];
        if (typeof newValue !== 'number' || !Number.isFinite(newValue)) {
          // Field omitted by Grok — skip silently, no audit row needed.
          continue;
        }
        const oldValue = (existing as Record<string, unknown> | undefined)?.[key] as number | undefined ?? null;
        const reason = checkSanityBound(newValue, oldValue, bound);

        if (reason) {
          rowRejections.push({ metric: `${sov.iso3}.${key}`, reason, oldValue: oldValue ?? undefined, newValue });
          await logExtraction({
            module: 'sovereign',
            metric: `${sov.iso3}.${key}`,
            oldValue: oldValue ?? null,
            newValue,
            outcome: 'sanity_failed',
            sanityLow: bound.low ?? null,
            sanityHigh: bound.high ?? null,
            grokModel: result.model,
            sourceUrl: result.sourceUrl,
          });
          continue;
        }

        publishable[key] = newValue;
        await logExtraction({
          module: 'sovereign',
          metric: `${sov.iso3}.${key}`,
          oldValue: oldValue ?? null,
          newValue,
          outcome: 'published',
          grokModel: result.model,
          sourceUrl: result.sourceUrl,
        });
      }

      allRejections.push(...rowRejections);

      // Upsert with seed defaults for fields not in the publishable set
      // (so we always have a complete row even on first run / partial extracts).
      const writeData = {
        iso3:                 seed.iso3,
        countryName:          seed.name,
        isoNumeric:           seed.isoNumeric,
        region:               seed.region,
        debtGdp:              publishable.debtGdp              ?? existing?.debtGdp              ?? seed.debtGdp,
        interestPctRevenue:   publishable.interestPctRevenue   ?? existing?.interestPctRevenue   ?? seed.interestPctRevenue,
        primaryBalance:       publishable.primaryBalance       ?? existing?.primaryBalance       ?? seed.primaryBalance,
        realGdpGrowth:        publishable.realGdpGrowth        ?? existing?.realGdpGrowth        ?? seed.realGdpGrowth,
        effectiveRate:        publishable.effectiveRate        ?? existing?.effectiveRate        ?? seed.effectiveRate,
        avgMaturity:          publishable.avgMaturity          ?? existing?.avgMaturity          ?? seed.avgMaturity,
        fxDebtShare:          existing?.fxDebtShare             ?? seed.fxDebtShare,
        externalDebtShare:    existing?.externalDebtShare       ?? seed.externalDebtShare,
        reserveAdequacyScore: existing?.reserveAdequacyScore    ?? seed.reserveAdequacyScore,
        sourceUrl:            result.sourceUrl,
      };

      await prisma.fehSovereignMetric.upsert({
        where: { iso3: sov.iso3 },
        update: writeData,
        create: writeData,
      });

      if (Object.keys(publishable).length > 0) publishedCount += 1;
    }
  }

  const elapsed = Math.round((Date.now() - startedAt) / 1000);

  // Admin email — always send a quarterly summary.
  await emailFehAdmin(
    `[Situation Room] FEH sovereign metrics refresh — ${publishedCount}/${allCodes.length} updated`,
    [
      `Sovereign Metrics quarterly refresh complete.`,
      ``,
      `Sovereigns processed:  ${allCodes.length}`,
      `Sovereigns published:  ${publishedCount}`,
      `Batch failures:        ${batchFailures.length}`,
      `Sanity rejections:     ${allRejections.length}`,
      `Elapsed:               ${elapsed}s`,
      ``,
      `Sanity rejections (kept last-known-good):`,
      formatRejections(allRejections),
      ``,
      `Batch failures:`,
      batchFailures.length === 0
        ? '(none)'
        : batchFailures.map((b) => `  - ${b.codes.join(', ')}: ${b.reason}`).join('\n'),
      ``,
      `Manual override (single sovereign, requires admin route — TODO Phase 8b):`,
      `  ${FEH_SITE_URL}/admin/feh/inject-sovereign`,
      ``,
      `Audit trail: feh_extraction_log table.`,
    ].join('\n'),
  );

  return NextResponse.json({
    ok: true,
    processed: allCodes.length,
    published: publishedCount,
    batchFailures: batchFailures.length,
    sanityRejections: allRejections.length,
    elapsedSeconds: elapsed,
  });
}
