/**
 * Sovereignty Score — composite 0-100, higher = stronger sovereignty.
 *
 * Weights per spec (locked editorial decision):
 *   - Debt/GDP                  30%
 *   - Interest as % revenue     30%   (the metric that actually kills sovereigns)
 *   - FX debt share             15%
 *   - External debt share       15%
 *   - Reserve adequacy          10%
 */

import type { Sovereign } from './types';

const W_DEBT = 0.30;
const W_INTEREST = 0.30;
const W_FX = 0.15;
const W_EXT = 0.15;
const W_RESERVE = 0.10;

/** Scale debt/GDP → score: 30%=100, 150%=50, 230%+=0. */
function debtScore(debtGdp: number): number {
  return clamp(100 - Math.max(0, debtGdp - 30) * (50 / 120), 0, 100);
}

/** Scale interest/revenue → score: 0%=100, 25%=0. Sharp because it's the kill metric. */
function interestScore(interestPctRevenue: number): number {
  return clamp(100 - interestPctRevenue * 4, 0, 100);
}

export function sovereigntyScore(s: Sovereign): number {
  const fxScore = clamp(100 - s.fxDebtShare, 0, 100);
  const extScore = clamp(100 - s.externalDebtShare, 0, 100);
  const reserveScore = clamp(s.reserveAdequacyScore, 0, 100);

  const composite =
    W_DEBT * debtScore(s.debtGdp) +
    W_INTEREST * interestScore(s.interestPctRevenue) +
    W_FX * fxScore +
    W_EXT * extScore +
    W_RESERVE * reserveScore;

  return Math.round(composite);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
