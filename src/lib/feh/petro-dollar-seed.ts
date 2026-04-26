/**
 * Petro-Dollar Erosion seed dataset — 10y monthly history × 4 series.
 *
 * Series are indexed (Apr 2016 = 100) so they share a comparable y-axis
 * regardless of underlying units. The editorial point is the trend
 * divergence — DXY can rise simultaneously with the erosion layers.
 *
 * Phase 8 Grok extraction replaces these with quarterly WGC + BIS
 * + bilateral-deal scrapes. DXY can be wired live via FRED daily.
 */

export interface PetroPoint {
  /** YYYY-MM */
  date: string;
  /** USD index (~95-115 historical, indexed to 100 at start). */
  dxy: number;
  /** Yuan oil settlement share (% of global oil trade), indexed. */
  yuanOil: number;
  /** Gold repatriation index (cross-border flows back to source nations), indexed. */
  goldRepat: number;
  /** BRICS+ bilateral swap notional (USD), indexed. */
  bricsSwaps: number;
}

export interface PetroAnnotation {
  date: string;
  label: string;
  short: string;
}

export const PETRO_HISTORY: PetroPoint[] = (() => {
  const out: PetroPoint[] = [];
  for (let i = 0; i < 120; i++) {
    const d = new Date(Date.UTC(2016, 3 + i, 1));
    const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

    // DXY oscillates 95-115, indexed to ~100 at start. Mostly cycle, no secular trend.
    const dxy = 100 + Math.sin(i * 0.18) * 8 + Math.cos(i * 0.07) * 4;

    // Yuan oil settlement: slow growth pre-2022, step jump at month 71 (Mar 2022),
    // then accelerated growth.
    const yuanOilBase =
      i < 71 ? 100 + i * 0.6 :
      i === 71 ? 142 :
      142 + (i - 71) * 1.4;
    const yuanOil = yuanOilBase + Math.sin(i * 0.4) * 1.5;

    // Gold repatriation: steady climb, accelerating from 2020 (CB gold buying).
    const goldRepat = 100 + i * 0.85 + (i > 48 ? (i - 48) * 0.4 : 0) + Math.sin(i * 0.31) * 1.2;

    // BRICS bilateral swaps: small until 2022, then exponential-ish.
    const bricsSwaps =
      i < 71 ? 100 + i * 0.3 :
      121 + Math.pow(i - 71, 1.45) * 0.6;

    out.push({
      date: dateStr,
      dxy: Math.round(dxy * 10) / 10,
      yuanOil: Math.round(yuanOil * 10) / 10,
      goldRepat: Math.round(goldRepat * 10) / 10,
      bricsSwaps: Math.round(bricsSwaps * 10) / 10,
    });
  }
  return out;
})();

export const PETRO_ANNOTATIONS: PetroAnnotation[] = [
  { date: '2022-03', label: 'FEB 2022 — RUSSIAN FX RESERVES FROZEN',  short: 'RUS FX FREEZE' },
  { date: '2023-03', label: 'MAR 2023 — SAUDI-CHINA YUAN OIL DEAL',    short: 'SA-CN OIL' },
  { date: '2023-08', label: 'AUG 2023 — BRICS+ EXPANSION ANNOUNCED',   short: 'BRICS+ EXP' },
  { date: '2025-09', label: 'SEP 2025 — BRICS PAYMENT SYSTEM LAUNCH',  short: 'BRICS PAY' },
];
