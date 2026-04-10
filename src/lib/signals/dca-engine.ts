/**
 * DCA Signal Engine — v3
 *
 * Two-signal composite: 200-week MA ratio (weight 2.5) + Puell Multiple (weight 0.5).
 * Normalised by the causal expanding mean so 1.0x always means vanilla DCA.
 *
 * Derived from the Python backtester at Python Backtester/btc_dca/signals.py.
 * Threshold tables match the backtester exactly.
 *
 * This module is SERVER-SIDE ONLY. Do not import it in client components.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DayPrice {
  date: string;   // YYYY-MM-DD
  price: number;
}

export interface MA200wPoint {
  date: string;
  price: number;
  sma1400: number;
  ratio: number;       // price / sma1400
  multiplier: number;  // from threshold table
}

export interface CompositeRow {
  date: string;
  price: number;
  maRatio: number;
  maMult: number;
  puellValue: number;
  puellMult: number;
  rawComposite: number;
  normalisedComposite: number;
}

// ── Threshold tables ───────────────────────────────────────────────────────────
// Exact match to Python backtester SteppedMultiplierTable entries.
// Format: [upperBound, multiplier] — first match (value <= upperBound) wins.

const MA200W_THRESHOLDS: [number, number][] = [
  [0.7,      3.0],
  [1.0,      2.0],
  [1.5,      1.2],
  [2.0,      0.8],
  [3.0,      0.5],
  [Infinity, 0.2],
];

const PUELL_THRESHOLDS: [number, number][] = [
  [0.5,      3.0],
  [0.8,      2.0],
  [1.2,      1.0],
  [2.0,      0.7],
  [Infinity, 0.4],
];

// ── Core functions ─────────────────────────────────────────────────────────────

/**
 * Stepped multiplier table lookup.
 * Returns the multiplier of the first entry where value <= upperBound.
 * Port of Python's SteppedMultiplierTable.apply() for a scalar value.
 */
export function steppedMultiplier(value: number, thresholds: [number, number][]): number {
  for (const [upper, mult] of thresholds) {
    if (value <= upper) return mult;
  }
  // Fallback — should not happen if last threshold is Infinity
  return thresholds[thresholds.length - 1][1];
}

/**
 * Compute 200-week (1400-day) MA ratio signal for each day in the price array.
 *
 * Uses a sliding-window running sum for O(n) performance.
 * Returns only warmed-up points (starting from index 1399).
 * Port of Python's WeeklyMASignal.compute().
 */
export function computeMA200w(prices: DayPrice[]): MA200wPoint[] {
  const SMA_WINDOW = 1400;
  const result: MA200wPoint[] = [];

  // Build running sum using a sliding window
  let windowSum = 0;

  for (let i = 0; i < prices.length; i++) {
    windowSum += prices[i].price;

    // Remove the element going out of the window
    if (i >= SMA_WINDOW) {
      windowSum -= prices[i - SMA_WINDOW].price;
    }

    // Only emit once we have a full window
    if (i >= SMA_WINDOW - 1) {
      const sma1400 = windowSum / SMA_WINDOW;
      const ratio   = prices[i].price / sma1400;
      result.push({
        date:       prices[i].date,
        price:      prices[i].price,
        sma1400,
        ratio,
        multiplier: steppedMultiplier(ratio, MA200W_THRESHOLDS),
      });
    }
  }

  return result;
}

/**
 * Puell Multiple threshold lookup.
 * Port of Python's PuellMultipleSignal threshold table.
 */
export function puellMultiplier(value: number): number {
  return steppedMultiplier(value, PUELL_THRESHOLDS);
}

/**
 * Compute the v3 composite signal.
 *
 * raw_composite = (2.5 * ma200wMult + 0.5 * puellMult) / 3.0
 * normalised    = raw_composite / expanding_mean(raw_composite, min_periods=30)
 *
 * The expanding mean is CAUSAL — at each index it uses only data up to that
 * point. This prevents lookahead bias. Port of Python's CompositeSignal.compute()
 * with the explicit 2.5/0.5 weight ratio from the v3 spec.
 *
 * Rows where the Puell Multiple is unavailable (0 or missing) are skipped.
 * Rows before min_periods=30 are excluded from the output.
 */
export function computeComposite(
  ma200wPoints: MA200wPoint[],
  puellValues: number[],
  puellDates: string[],
): CompositeRow[] {
  // Build date → puell value lookup
  const puellByDate = new Map<string, number>();
  for (let i = 0; i < puellDates.length; i++) {
    const v = puellValues[i];
    if (v > 0 && isFinite(v)) {
      puellByDate.set(puellDates[i], v);
    }
  }

  const result: CompositeRow[] = [];
  let runningSum = 0;
  let count      = 0;

  for (const pt of ma200wPoints) {
    const puellValue = puellByDate.get(pt.date);
    if (puellValue === undefined || puellValue <= 0) continue;

    const puellMult     = puellMultiplier(puellValue);
    const rawComposite  = (2.5 * pt.multiplier + 0.5 * puellMult) / 3.0;

    // Causal expanding mean — include this row's raw value before normalising
    runningSum += rawComposite;
    count++;

    // Require min_periods=30 before emitting normalised values
    if (count < 30) continue;

    const expandingMean       = runningSum / count;
    const normalisedComposite = rawComposite / expandingMean;

    result.push({
      date:               pt.date,
      price:              pt.price,
      maRatio:            pt.ratio,
      maMult:             pt.multiplier,
      puellValue,
      puellMult,
      rawComposite,
      normalisedComposite,
    });
  }

  return result;
}

/**
 * Map a composite score to its tier label.
 * Used by the API route and by HeroSignal client component.
 */
export function compositeToTier(composite: number): string {
  if (composite >= 2.5) return 'Strong accumulate';
  if (composite >= 1.5) return 'Accumulate';
  if (composite >= 1.15) return 'DCA normally';
  if (composite >= 0.85) return 'Neutral';
  if (composite >= 0.5) return 'Reduce';
  return 'Pause';
}
