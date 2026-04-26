/**
 * Reserve Currency Decay Index — seed dataset.
 *
 * Composite weighting (locked editorial decision per spec):
 *   - CB GOLD vs USD allocation shift  30%
 *   - CIPS / SWIFT volume ratio        25%
 *   - Yuan oil settlement share        25%
 *   - BRICS+ bilateral swap notional   20%
 *
 * Each component is z-score normalised against a 2010-2020 baseline and
 * scaled 0-100 (higher = more decay). Composite is the weighted mean.
 *
 * Phase 8 Grok extraction replaces these seed values with quarterly
 * COFER + WGC + bilateral-deal scrapes.
 */

export interface RCDIComponent {
  id: string;
  label: string;
  /** 0-100, higher = more decay. */
  value: number;
  weight: number;
}

export interface RCDIPoint {
  /** YYYY-MM */
  date: string;
  value: number;
}

export interface RCDIAnnotation {
  date: string;
  label: string;
}

export const RCDI_COMPONENTS: RCDIComponent[] = [
  { id: 'gold-usd',    label: 'CB GOLD vs USD ALLOC',  value: 72, weight: 0.30 },
  { id: 'cips-swift',  label: 'CIPS / SWIFT VOL',      value: 58, weight: 0.25 },
  { id: 'yuan-oil',    label: 'YUAN OIL SETTLEMENT',   value: 65, weight: 0.25 },
  { id: 'brics-swaps', label: 'BRICS BILATERAL SWAPS', value: 75, weight: 0.20 },
];

/** 60 monthly points, 2021-05 → 2026-04. Inflection at 2022-03 from Russian FX reserve seizure. */
export const RCDI_HISTORY: RCDIPoint[] = (() => {
  const out: RCDIPoint[] = [];
  for (let i = 0; i < 60; i++) {
    const d = new Date(Date.UTC(2021, 4 + i, 1));
    const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    let v: number;
    if (i < 10) v = 56 + i * 0.18;                // Slow rise pre-seizure
    else if (i === 10) v = 60.5;                   // Step up at Russian FX seizure
    else v = 60.5 + (i - 10) * 0.14;               // Compounding decay since
    v += Math.sin(i * 0.45) * 0.5;                  // Deterministic ripple — gives the line a heartbeat
    out.push({ date: dateStr, value: Math.round(v * 10) / 10 });
  }
  return out;
})();

export const RCDI_ANNOTATIONS: RCDIAnnotation[] = [
  { date: '2022-03', label: 'FEB 2022 — RUSSIAN FX RESERVES FROZEN' },
];

/** Composite is the latest history point. */
export const RCDI_COMPOSITE = RCDI_HISTORY[RCDI_HISTORY.length - 1].value;

/** Year-over-year delta (latest − 12mo ago) as a percentage of the 12mo-ago value. */
export const RCDI_YOY = (() => {
  const latest = RCDI_HISTORY[RCDI_HISTORY.length - 1].value;
  const yearAgo = RCDI_HISTORY[RCDI_HISTORY.length - 13].value;
  return Math.round(((latest - yearAgo) / yearAgo) * 1000) / 10;
})();

/** 5-year delta (latest − first point) as a percentage of the first point. */
export const RCDI_5Y = (() => {
  const latest = RCDI_HISTORY[RCDI_HISTORY.length - 1].value;
  const first = RCDI_HISTORY[0].value;
  return Math.round(((latest - first) / first) * 1000) / 10;
})();
