/**
 * Grok / xAI monthly cost estimates — single source of truth.
 *
 * This table drives two places:
 *   1. The admin page AI-use table (src/app/admin/page.tsx) which renders
 *      each row as a table and shows 7d / 30d totals.
 *   2. The funding status route (src/app/api/funding/status/route.ts) which
 *      sums the 30-day costs, converts USD → GBP, and returns the result
 *      as `costsBreakdown.ai`. That figure then flows into the header
 *      funding bar and the /support page "Running costs" list.
 *
 * **Editing workflow:** whenever you onboard a new AI-powered feature or
 * retire an old one, update the rows in this file only. Both the admin
 * table and the public funding display will pick up the change
 * automatically.
 *
 * Pricing assumptions (xAI, Apr 2026):
 *   grok-4.20 multi-agent (Responses API): $3.00/M in, $15.00/M out + $5/1K web searches
 *   grok-4-1-fast-non-reasoning:           $0.20/M in, $0.50/M out
 *   grok-3:                                $3.00/M in, $15.00/M out  (chat completions only —
 *                                          xAI deprecated grok-3 for the Responses API /
 *                                          server-side tools in late Apr 2026)
 *   grok-3-mini-fast:                      ~$0.10/M in, $0.40/M out
 *
 * Calibration (2026-04-25):
 *   xAI billing dashboard reports $87.04 over the trailing 31 days
 *   (26 Mar – 25 Apr 2026), averaging $2.80/day with a peak of $6.16.
 *   Each row's est7d/est30d below is the raw model figure × 2.044
 *   (~4.14× the unscaled token math) to match that observed spend.
 *   callsPerDay and costPerCall stay as structural numbers — the
 *   scale factor absorbs the gap.
 *
 *   Three events on 2026-04-25 will pull the next calibration *down*:
 *     1. v2 (legacy.situationroom.space) retired — its midnight UTC
 *        daily briefing on the same shared GROK_API_KEY is gone.
 *     2. Briefing pipeline fallback model switched from grok-3 to
 *        grok-4-1-fast-non-reasoning (~15× cheaper per token), so
 *        retry paths cost less when grok-4.20 multi-agent times out.
 *     3. On-chain + macro analysis (Members & VIP) migrated off
 *        grok-3 onto grok-4-1-fast-non-reasoning. Those four rows
 *        carried ~$52/mo at the calibrated estimate — the new model
 *        prices the same prompts at ~$1.14/mo. Real saving lands
 *        somewhere below that depending on how much of the prior
 *        spend was retries / oversized contexts.
 *   Combined drag on the bill should be ~$45–55/month after the
 *   12h analysis caches turn over. Recalibrate the 2.044× factor
 *   once the xAI dashboard reflects a full week of post-migration
 *   spend.
 */

export interface AiUsageRow {
  feature: string;
  model: string;
  trigger: string;
  /** Average input tokens per call. */
  inputTokens: number;
  /** Average output tokens per call. */
  outputTokens: number;
  /** Estimated average calls per day. */
  callsPerDay: number;
  /** USD cost per single call. */
  costPerCall: number;
  /** USD over 7 days. Usually `costPerCall * callsPerDay * 7`. */
  est7dCost: number;
  /** USD over 30 days. Usually `costPerCall * callsPerDay * 30`. */
  est30dCost: number;
}

export const AI_USAGE_DATA: AiUsageRow[] = [
  {
    feature: 'Daily Briefing',
    model: 'grok-4.20',
    trigger: 'Cron 06:00 UTC',
    inputTokens: 3_000,
    outputTokens: 400,
    callsPerDay: 6,
    // (3000 × $3/M) + (400 × $15/M) + ~3 web searches × $0.005 = $0.030
    costPerCall: 0.030,
    est7dCost: 5.21,
    est30dCost: 22.38,
  },
  {
    feature: 'VIP Briefings',
    model: 'grok-4-1-fast',
    trigger: 'Cron 06:10 UTC',
    inputTokens: 1_750,
    outputTokens: 250,
    callsPerDay: 10,  // ~5 VIP users × 2 calls
    costPerCall: 0.0005,
    est7dCost: 0.16,
    est30dCost: 0.61,
  },
  {
    feature: 'RSS Classifier',
    model: 'grok-4-1-fast',
    trigger: 'Auto (feed ingest)',
    inputTokens: 1_250,
    outputTokens: 175,
    callsPerDay: 75,  // 50–100 depending on feed velocity
    // (1250 × $0.20/M) + (175 × $0.50/M) = $0.0003
    costPerCall: 0.0003,
    est7dCost: 0.65,
    est30dCost: 2.82,
  },
  {
    feature: 'Signal Annotation',
    model: 'grok-4-1-fast',
    trigger: 'On-demand (Members+)',
    inputTokens: 800,
    outputTokens: 125,
    callsPerDay: 10,
    costPerCall: 0.0002,
    est7dCost: 0.04,
    est30dCost: 0.25,
  },
  {
    feature: 'Signal Interpreter',
    model: 'grok-4-1-fast',
    trigger: 'On-demand (Members+)',
    inputTokens: 2_500,
    outputTokens: 750,
    callsPerDay: 5,
    costPerCall: 0.0009,
    est7dCost: 0.12,
    est30dCost: 0.57,
  },
  {
    feature: 'Cohort Analysis',
    model: 'grok-4-1-fast',
    trigger: 'On-demand (Members+)',
    inputTokens: 1_800,
    outputTokens: 430,
    callsPerDay: 4,
    costPerCall: 0.0006,
    est7dCost: 0.08,
    est30dCost: 0.29,
  },
  {
    feature: 'Bitcoin Argument',
    model: 'grok-4-1-fast',
    trigger: 'On-demand (Members+)',
    inputTokens: 2_000,
    outputTokens: 500,
    callsPerDay: 2,
    costPerCall: 0.0007,
    est7dCost: 0.04,
    est30dCost: 0.16,
  },
  {
    feature: 'Pattern Historian',
    model: 'grok-4-1-fast',
    trigger: 'On-demand (Members+)',
    inputTokens: 1_600,
    outputTokens: 430,
    callsPerDay: 3,
    costPerCall: 0.0005,
    est7dCost: 0.04,
    est30dCost: 0.20,
  },
  {
    feature: 'Briefing Search',
    model: 'grok-4-1-fast',
    trigger: 'On-demand (VIP only)',
    inputTokens: 10_000,
    outputTokens: 1_100,
    callsPerDay: 2,
    costPerCall: 0.0026,
    est7dCost: 0.16,
    est30dCost: 0.65,
  },
  {
    feature: 'Briefing Retrospective',
    model: 'grok-4-1-fast',
    trigger: 'On-demand (Members+)',
    inputTokens: 2_500,
    outputTokens: 450,
    callsPerDay: 3,
    costPerCall: 0.0007,
    est7dCost: 0.08,
    est30dCost: 0.25,
  },
  {
    feature: 'Threat Analysis',
    model: 'grok-4-1-fast',
    trigger: 'Auto (state shifts)',
    inputTokens: 1_200,
    outputTokens: 175,
    callsPerDay: 15,
    costPerCall: 0.0003,
    est7dCost: 0.12,
    est30dCost: 0.57,
  },
  {
    feature: 'On-Chain Analysis (Members)',
    model: 'grok-4-1-fast',
    trigger: 'On-demand (Members, 12h cache)',
    inputTokens: 2_500,
    outputTokens: 900,
    callsPerDay: 6,  // ~10 members × ~0.6 calls/day (12h window)
    // (2500 × $0.20/M) + (900 × $0.50/M) = $0.0005 + $0.00045 = $0.00095
    costPerCall: 0.0010,
    est7dCost: 0.08,
    est30dCost: 0.35,
  },
  {
    feature: 'On-Chain Analysis (VIP)',
    model: 'grok-4-1-fast',
    trigger: 'On-demand (VIP, 6h cache)',
    inputTokens: 3_000,
    outputTokens: 1_400,
    callsPerDay: 4,  // ~4 VIP users × 1 call per 6h window
    // (3000 × $0.20/M) + (1400 × $0.50/M) = $0.0006 + $0.0007 = $0.0013
    costPerCall: 0.0013,
    est7dCost: 0.07,
    est30dCost: 0.32,
  },
  {
    feature: 'Macro Analysis (General)',
    model: 'grok-3-mini-fast',
    trigger: 'On-demand (General, 24h cache)',
    inputTokens: 2_000,
    outputTokens: 500,
    callsPerDay: 1,  // 1 per 24h window (shared cache)
    // grok-3-mini-fast: ~$0.10/M in, $0.40/M out
    // (2000 × $0.10/M) + (500 × $0.40/M) = $0.0002 + $0.0002 = $0.0004
    costPerCall: 0.0004,
    est7dCost: 0.012,
    est30dCost: 0.04,
  },
  {
    feature: 'Macro Analysis (Members)',
    model: 'grok-4-1-fast',
    trigger: 'On-demand (Members, 12h cache)',
    inputTokens: 3_000,
    outputTokens: 900,
    callsPerDay: 2,  // 2 per 12h window (shared cache)
    // (3000 × $0.20/M) + (900 × $0.50/M) = $0.0006 + $0.00045 = $0.00105
    costPerCall: 0.0011,
    est7dCost: 0.03,
    est30dCost: 0.13,
  },
  {
    feature: 'Macro Analysis (VIP)',
    model: 'grok-4-1-fast',
    trigger: 'On-demand (VIP, 6h cache)',
    inputTokens: 3_500,
    outputTokens: 1_400,
    callsPerDay: 4,  // ~4 VIP users × 1 call per 6h window
    // (3500 × $0.20/M) + (1400 × $0.50/M) = $0.0007 + $0.0007 = $0.0014
    costPerCall: 0.0014,
    est7dCost: 0.08,
    est30dCost: 0.34,
  },
  {
    feature: 'Trading AI Engine',
    model: 'grok-4-1-fast',
    trigger: '1h cron (24×/day)',
    inputTokens: 2_000,
    outputTokens: 1_200,
    callsPerDay: 24,  // 24 cycles/day × 1 Grok call per cycle
    // (2000 × $0.20/M) + (1200 × $0.50/M) = $0.0004 + $0.0006 = $0.001
    costPerCall: 0.001,
    est7dCost: 0.69,
    est30dCost: 2.98,
  },
  {
    feature: 'ISM PMI Auto-Update',
    model: 'grok-4.20',
    trigger: 'Monthly cron (1st-3rd of month)',
    inputTokens: 400,
    outputTokens: 100,
    callsPerDay: 0.07,  // ~2 calls/month (retries) ≈ 2/30
    // (400 × $3/M) + (100 × $15/M) + ~2 web searches × $0.005 = $0.013
    costPerCall: 0.013,
    est7dCost: 0.01,
    est30dCost: 0.03,
  },
];

// ── Computed totals ──────────────────────────────────────────────────────────

/** Total estimated AI cost over the last 7 days, in USD. */
export const AI_TOTAL_7D_USD = AI_USAGE_DATA.reduce((s, r) => s + r.est7dCost, 0);

/** Total estimated AI cost over the last 30 days, in USD. */
export const AI_TOTAL_30D_USD = AI_USAGE_DATA.reduce((s, r) => s + r.est30dCost, 0);

/**
 * Returns the estimated monthly AI (Grok) cost in USD. This is the single
 * value the funding route should use for `costsBreakdown.ai` — convert it
 * to GBP at the caller. Sums every row in AI_USAGE_DATA, so adding or
 * removing a feature here immediately moves the number on the /support
 * page and the header funding bar.
 */
export function getMonthlyAiCostUsd(): number {
  return AI_TOTAL_30D_USD;
}
