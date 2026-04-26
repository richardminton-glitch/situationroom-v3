/**
 * GET /api/cron/refresh-sovereign-commentary
 *
 * Quarterly cron — generates the 3-section narrative ("STATE OF [country]")
 * for each of the 30 dossier sovereigns and persists it to
 * `feh_sovereign_commentary`, keyed on (iso3, quarter). Reads each
 * sovereign's latest metrics from `feh_sovereign_metrics` so the
 * commentary stays anchored to the same numbers the dossier is
 * rendering. Falls back to seed defaults when a metric row is missing.
 *
 * Schedule (suggested crontab on the VPS, runs the day AFTER metrics
 * refresh so commentary picks up the freshest numbers):
 *
 *   0 18 2 1,4,7,10 *  curl -s -H "x-cron-secret: $CRON_SECRET" \
 *     https://situationroom.space/api/cron/refresh-sovereign-commentary \
 *     >> /opt/situationroom-v3/logs/cron.log 2>&1
 *
 * Failure handling (mirrors refresh-sovereign-metrics):
 *   - parse failure on a sovereign → that sovereign skipped, others continue
 *   - sanity-bound trip (word count out of [50, 130]) → keep last-known-good
 *   - whole-call Grok failure → admin email with summary
 *
 * Auth: x-cron-secret header (matched against CRON_SECRET env).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SOVEREIGNS_SEED } from '@/lib/feh/sovereigns-seed';
import type { Sovereign } from '@/lib/feh/types';
import {
  runGrokExtraction,
  logExtraction,
  emailFehAdmin,
  formatRejections,
  FEH_SITE_URL,
} from '@/lib/feh/extract';

export const dynamic = 'force-dynamic';
export const maxDuration = 290;

const CRON_SECRET = process.env.CRON_SECRET || '';

const MIN_WORDS = 50;
const MAX_WORDS = 130;

interface ExtractedCommentary {
  fiscalTrajectory: string;
  keyRisks: string;
  comparablePeers: string;
}

/** Returns "YYYYQq" for the quarter containing the given Date (UTC). */
function quarterKey(date: Date): string {
  const y = date.getUTCFullYear();
  const q = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${y}Q${q}`;
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function buildPrompt(s: {
  iso3: string;
  name: string;
  region: string;
  debtGdp: number;
  interestPctRevenue: number;
  primaryBalance: number;
  realGdpGrowth: number;
  effectiveRate: number;
  avgMaturity: number;
}): string {
  return `You are writing a quarterly fiscal dossier section for ${s.name} (${s.iso3}, ${s.region}).

Latest published metrics for this sovereign:
  - Gross debt / GDP:           ${s.debtGdp.toFixed(1)}%
  - Interest / revenue:         ${s.interestPctRevenue.toFixed(1)}%
  - Primary balance / GDP:      ${s.primaryBalance.toFixed(1)}% (negative = deficit)
  - Real GDP growth:            ${s.realGdpGrowth.toFixed(1)}%
  - Effective rate on debt:     ${s.effectiveRate.toFixed(2)}%
  - Avg remaining maturity:     ${s.avgMaturity.toFixed(1)} years

Write three sections of 60-100 words each. Each must be anchored to one of the metrics above and refer to it numerically. Plain prose, no bullets, no headings, no markdown.

Section 1 — fiscalTrajectory: assess where the sovereign's debt path is heading over the next 3-5 years given the primary balance and effective rate. Cite the actual numbers.
Section 2 — keyRisks: what breaks this trajectory. Anchor to interest/revenue and avg maturity. Identify the specific channel by which discretionary spending compresses or refinancing pressure escalates.
Section 3 — comparablePeers: name 2-3 sovereigns whose current metrics most resemble this one's, and explain in what dimension. Reference at least one shared metric value.

Be analytically honest — no consultancy hedging, no comforting lies. If the numbers point to a hard outcome, say so.

Return ONLY a JSON object with no commentary, no markdown, no code fences:
{"fiscalTrajectory":"...","keyRisks":"...","comparablePeers":"..."}`;
}

interface MetricRow {
  iso3: string;
  countryName: string;
  region: string;
  debtGdp: number;
  interestPctRevenue: number;
  primaryBalance: number;
  realGdpGrowth: number;
  effectiveRate: number;
  avgMaturity: number;
}

function metricsForSovereign(seed: Sovereign, dbRow: MetricRow | undefined) {
  return {
    iso3: seed.iso3,
    name: seed.name,
    region: seed.region,
    debtGdp:            dbRow?.debtGdp            ?? seed.debtGdp,
    interestPctRevenue: dbRow?.interestPctRevenue ?? seed.interestPctRevenue,
    primaryBalance:     dbRow?.primaryBalance     ?? seed.primaryBalance,
    realGdpGrowth:      dbRow?.realGdpGrowth      ?? seed.realGdpGrowth,
    effectiveRate:      dbRow?.effectiveRate      ?? seed.effectiveRate,
    avgMaturity:        dbRow?.avgMaturity        ?? seed.avgMaturity,
  };
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const quarter = quarterKey(new Date());

  // Pull latest metrics for all sovereigns in one query.
  const metricRows = await prisma.fehSovereignMetric.findMany();
  const metricsByIso3 = new Map(metricRows.map((r) => [r.iso3, r as MetricRow]));

  const rejections: Array<{ metric: string; reason: string }> = [];
  const callFailures: Array<{ iso3: string; reason: string; raw: string }> = [];
  let publishedCount = 0;
  let skippedCount = 0;

  for (const seed of SOVEREIGNS_SEED) {
    const m = metricsForSovereign(seed, metricsByIso3.get(seed.iso3));
    const result = await runGrokExtraction<ExtractedCommentary>(buildPrompt(m));

    if (result.failed || !result.parsed) {
      callFailures.push({ iso3: seed.iso3, reason: result.reason ?? 'unknown', raw: result.rawExcerpt });
      await logExtraction({
        module: 'sovereign-commentary',
        metric: `${seed.iso3}.${quarter}`,
        oldValue: null,
        newValue: null,
        outcome: result.reason === 'parse_failed' ? 'parse_failed' : 'grok_failed',
        grokModel: result.model,
        grokRawExcerpt: result.rawExcerpt,
        sourceUrl: result.sourceUrl,
      });
      skippedCount += 1;
      continue;
    }

    const { fiscalTrajectory, keyRisks, comparablePeers } = result.parsed;
    const sections: Array<{ key: keyof ExtractedCommentary; text: string }> = [
      { key: 'fiscalTrajectory', text: fiscalTrajectory ?? '' },
      { key: 'keyRisks',         text: keyRisks         ?? '' },
      { key: 'comparablePeers',  text: comparablePeers  ?? '' },
    ];

    // Word-count sanity bound on each section.
    let allSectionsValid = true;
    for (const s of sections) {
      const words = wordCount(s.text);
      const ok = typeof s.text === 'string' && words >= MIN_WORDS && words <= MAX_WORDS;
      if (!ok) {
        allSectionsValid = false;
        rejections.push({
          metric: `${seed.iso3}.${s.key}`,
          reason: `word_count_${words}_out_of_[${MIN_WORDS},${MAX_WORDS}]`,
        });
        await logExtraction({
          module: 'sovereign-commentary',
          metric: `${seed.iso3}.${s.key}`,
          oldValue: null,
          newValue: words,
          outcome: 'sanity_failed',
          sanityLow: MIN_WORDS,
          sanityHigh: MAX_WORDS,
          grokModel: result.model,
          grokRawExcerpt: s.text.slice(0, 400),
          sourceUrl: result.sourceUrl,
        });
      } else {
        await logExtraction({
          module: 'sovereign-commentary',
          metric: `${seed.iso3}.${s.key}`,
          oldValue: null,
          newValue: words,
          outcome: 'published',
          sanityLow: MIN_WORDS,
          sanityHigh: MAX_WORDS,
          grokModel: result.model,
          sourceUrl: result.sourceUrl,
        });
      }
    }

    if (!allSectionsValid) {
      // Keep last-known-good — leave any prior (iso3, quarter) row untouched.
      // If there is no prior row for this quarter the dossier falls back to
      // the metric-anchored sentence on the page, which is fine.
      skippedCount += 1;
      continue;
    }

    await prisma.fehSovereignCommentary.upsert({
      where: { iso3_quarter: { iso3: seed.iso3, quarter } },
      update: {
        fiscalTrajectory,
        keyRisks,
        comparablePeers,
        grokModel: result.model,
        sourceUrl: result.sourceUrl,
        generatedAt: new Date(),
      },
      create: {
        iso3: seed.iso3,
        quarter,
        fiscalTrajectory,
        keyRisks,
        comparablePeers,
        grokModel: result.model,
        sourceUrl: result.sourceUrl,
      },
    });

    publishedCount += 1;
  }

  const elapsed = Math.round((Date.now() - startedAt) / 1000);

  await emailFehAdmin(
    `[Situation Room] FEH sovereign commentary refresh (${quarter}) — ${publishedCount}/${SOVEREIGNS_SEED.length} published`,
    [
      `Sovereign Commentary quarterly refresh complete.`,
      ``,
      `Quarter:               ${quarter}`,
      `Sovereigns processed:  ${SOVEREIGNS_SEED.length}`,
      `Sovereigns published:  ${publishedCount}`,
      `Sovereigns skipped:    ${skippedCount}`,
      `Call failures:         ${callFailures.length}`,
      `Section rejections:    ${rejections.length}`,
      `Elapsed:               ${elapsed}s`,
      ``,
      `Section rejections (kept last-known-good):`,
      formatRejections(rejections),
      ``,
      `Call failures:`,
      callFailures.length === 0
        ? '(none)'
        : callFailures.map((f) => `  - ${f.iso3}: ${f.reason}`).join('\n'),
      ``,
      `Audit trail: feh_extraction_log (module='sovereign-commentary').`,
      `Dossier:     ${FEH_SITE_URL}/tools/fiscal-event-horizon`,
    ].join('\n'),
  );

  return NextResponse.json({
    ok: true,
    quarter,
    processed: SOVEREIGNS_SEED.length,
    published: publishedCount,
    skipped: skippedCount,
    callFailures: callFailures.length,
    sectionRejections: rejections.length,
    elapsedSeconds: elapsed,
  });
}
