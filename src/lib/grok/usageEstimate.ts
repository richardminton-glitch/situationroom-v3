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
 *   grok-3:                                $3.00/M in, $15.00/M out
 *   grok-3-mini-fast:                      ~$0.10/M in, $0.40/M out
 *
 * Calibration (2026-04-25):
 *   xAI billing dashboard reports $87.04 over the trailing 31 days
 *   (26 Mar – 25 Apr 2026), averaging $2.80/day with a peak of $6.16.
 *   The previous calibration (2026-04-17) targeted $1.37/day off a
 *   ~$0.68/day raw model via a 2.027× scale factor. Sustained spend
 *   has since roughly doubled — driven mostly by heavier on-demand
 *   member/VIP analysis traffic and bigger Grok-3 prompts on the
 *   on-chain and macro routes. Each row's est7d/est30d below is now
 *   the prior figure × 2.044 (i.e. raw model × ~4.14). callsPerDay
 *   and costPerCall remain illustrative structural numbers — the
 *   scale factor absorbs the gap. Recalibrate whenever the xAI daily
 *   figure drifts by more than ~15% from the $2.80/day target.
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
    model: 'grok-3',
    trigger: 'On-demand (Members, 12h cache)',
    inputTokens: 2_500,
    outputTokens: 900,
    callsPerDay: 6,  // ~10 members × ~0.6 calls/day (12h window)
    // (2500 × $3/M) + (900 × $15/M) = $0.0075 + $0.0135 = $0.021
    costPerCall: 0.021,
    est7dCost: 3.64,
    est30dCost: 15.66,
  },
  {
    feature: 'On-Chain Analysis (VIP)',
    model: 'grok-3',
    trigger: 'On-demand (VIP, 6h cache)',
    inputTokens: 3_000,
    outputTokens: 1_400,
    callsPerDay: 4,  // ~4 VIP users × 1 call per 6h window
    // (3000 × $3/M) + (1400 × $15/M) = $0.009 + $0.021 = $0.030
    costPerCall: 0.030,
    est7dCost: 3.47,
    est30dCost: 14.92,
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
    model: 'grok-3',
    trigger: 'On-demand (Members, 12h cache)',
    inputTokens: 3_000,
    outputTokens: 900,
    callsPerDay: 2,  // 2 per 12h window (shared cache)
    // (3000 × $3/M) + (900 × $15/M) = $0.009 + $0.0135 = $0.023
    costPerCall: 0.023,
    est7dCost: 1.33,
    est30dCost: 5.72,
  },
  {
    feature: 'Macro Analysis (VIP)',
    model: 'grok-3',
    trigger: 'On-demand (VIP, 6h cache)',
    inputTokens: 3_500,
    outputTokens: 1_400,
    callsPerDay: 4,  // ~4 VIP users × 1 call per 6h window
    // (3500 × $3/M) + (1400 × $15/M) = $0.0105 + $0.021 = $0.032
    costPerCall: 0.032,
    est7dCost: 3.72,
    est30dCost: 15.90,
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
