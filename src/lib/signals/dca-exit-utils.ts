/**
 * DCA exit strategy utilities — client-safe, no server imports.
 * Shared between DCAOutSection (client) and daily-snapshot.ts (server).
 */

/** Composite below this = distribution territory begins */
export const DCA_CROSSOVER = 0.70;

/**
 * Returns the weekly sell multiplier based on the composite signal.
 * Returns 0 when composite >= DCA_CROSSOVER (still in accumulate zone).
 */
export function compositeToSellMult(composite: number): number {
  if (composite >= DCA_CROSSOVER) return 0;
  if (composite >= 0.55) return 0.3;
  if (composite >= 0.40) return 0.7;
  if (composite >= 0.25) return 1.2;
  return 2.0;
}

export function compositeToExitTier(composite: number): string {
  if (composite >= DCA_CROSSOVER) return 'Accumulate zone';
  if (composite >= 0.55) return 'Light exits';
  if (composite >= 0.40) return 'Building distribution';
  if (composite >= 0.25) return 'Increase exits';
  return 'Heavy distribution';
}

/**
 * Returns the fraction of held excess BTC to sell per week.
 * Excess BTC = (signal accumulated - vanilla accumulated) - already sold.
 * Returns 0 when composite >= DCA_CROSSOVER (accumulate zone — no exits).
 */
export function compositeToExcessRate(composite: number): number {
  if (composite >= DCA_CROSSOVER) return 0;     // accumulate zone — no exits
  if (composite >= 0.55) return 0.10;            // light exits — 10%/week of excess
  if (composite >= 0.40) return 0.15;            // building distribution — 15%/week
  if (composite >= 0.25) return 0.22;            // increase exits — 22%/week
  return 0.30;                                   // heavy distribution — 30%/week
}
