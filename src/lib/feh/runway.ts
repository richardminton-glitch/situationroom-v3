/**
 * Runway model — hybrid threshold:
 *   debt/GDP > 150%  OR  interest > 25% of revenue, whichever crosses first.
 *
 * The dossier surfaces the failure mode that triggered first ("FAILURE MODE:
 * INTEREST CROWD-OUT" vs "DEBT STOCK") — that single editorial flourish is
 * what makes this an intelligence product instead of a calculator.
 *
 * Stress mode applies +200bps to effective rate and -100bps to real growth,
 * per the spec's "AT CURRENT RATES" / "STRESSED" toggle.
 */

import type { Sovereign, RunwayResult } from './types';

const DEBT_THRESHOLD = 1.5;       // 150% debt/GDP
const INTEREST_THRESHOLD = 0.25;  // 25% of revenue
const ASSUMED_INFLATION = 0.02;   // 2% — turns real growth into nominal
const HORIZON_YEARS = 100;

export function computeRunway(s: Sovereign, stressed = false): RunwayResult {
  const rateAdj = stressed ? 2 : 0;
  const growthAdj = stressed ? -1 : 0;

  const r = (s.effectiveRate + rateAdj) / 100;
  const g = (s.realGdpGrowth + growthAdj) / 100 + ASSUMED_INFLATION;
  const pb = s.primaryBalance / 100;

  const initialDebt = s.debtGdp / 100;
  const initialRate = s.effectiveRate / 100 || 0.001; // guard divide-by-zero
  const initialInterest = s.interestPctRevenue / 100;

  // Year-0 already-crossed checks
  if (initialInterest >= INTEREST_THRESHOLD) {
    return { years: 0, failureMode: 'INTEREST_CROWD_OUT', confidenceYears: 1 };
  }
  const debtT1 = initialDebt * (1 + r) / (1 + g) - pb;
  if (initialDebt >= DEBT_THRESHOLD && debtT1 > initialDebt) {
    return { years: 0, failureMode: 'DEBT_STOCK', confidenceYears: 1 };
  }

  // Forward projection
  let debtRatio = initialDebt;
  for (let t = 1; t <= HORIZON_YEARS; t++) {
    debtRatio = debtRatio * (1 + r) / (1 + g) - pb;
    if (debtRatio < 0) debtRatio = 0;

    // DEBT_STOCK only triggers on forward crossing — Japan-style "stable at high level" doesn't trip
    if (initialDebt < DEBT_THRESHOLD && debtRatio >= DEBT_THRESHOLD) {
      return { years: t, failureMode: 'DEBT_STOCK', confidenceYears: confidenceFor(t) };
    }

    // Interest scales with (debt × rate) / revenue; revenue tracks GDP
    const interestRatio = initialInterest * (debtRatio / initialDebt) * (r / initialRate);
    if (interestRatio >= INTEREST_THRESHOLD) {
      return { years: t, failureMode: 'INTEREST_CROWD_OUT', confidenceYears: confidenceFor(t) };
    }
  }
  return { years: HORIZON_YEARS, failureMode: 'NONE', confidenceYears: 10 };
}

function confidenceFor(years: number): number {
  // Simple proxy until we have time-series volatility — wider band on longer horizons.
  return Math.max(0.5, Math.round(years * 0.2 * 10) / 10);
}

/** Failure-mode label for the dossier. */
export function failureModeLabel(mode: RunwayResult['failureMode']): string {
  switch (mode) {
    case 'DEBT_STOCK':         return 'DEBT STOCK';
    case 'INTEREST_CROWD_OUT': return 'INTEREST CROWD-OUT';
    case 'NONE':               return 'STABLE TRAJECTORY';
  }
}
