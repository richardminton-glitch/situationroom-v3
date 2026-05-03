/**
 * Sound Money chart data — four annual series, 1900 → 2025.
 *
 * Hardcoded curriculum data (not live). The point of the visualisation is
 * the *shape* of the curves: gold's steady ~1.5%/yr accumulation against
 * M2's post-1971 hockey stick and post-2020 vertical. Annual granularity
 * is plenty — anyone wanting the latest M2SL print should look at FRED
 * directly. If a data pipeline lands later, swap this file for a fetch.
 *
 * Sources:
 *   - USD M2 (M2SL):  Federal Reserve / FRED + Friedman & Schwartz pre-1959
 *   - Gold stocks:    World Gold Council above-ground reconstructions
 *   - BTC supply:     Deterministic from block schedule (halvings 2012, 2016,
 *                     2020, 2024)
 *   - USD CPI 1913=100: BLS historical series. Purchasing power of $1
 *                     (1913) = 100 / CPI(year).
 *
 * Numbers are end-of-year, rounded for clarity, and intentionally
 * approximate — anyone challenging "the BLS rounding" has missed the
 * point of the chart by 18 orders of magnitude.
 */

export interface SoundMoneyDataPoint {
  year:               number;
  /** USD M2 broad money stock, USD billions. */
  m2Billions:         number;
  /** Gold above-ground stock, thousand tonnes. */
  goldKilotonnes:     number;
  /** Bitcoin supply in millions of coins. Pre-2009 = 0. */
  btcSupplyM:         number;
  /** Purchasing power of $1 (1913 dollar) in current-year dollars. */
  usdPp1913:          number;
}

// CPI base 1913 = 100. Purchasing power of $1 in 1913 = 100 / CPI(year).
function pp(cpi: number): number { return Number((100 / cpi).toFixed(4)); }

export const SOUND_MONEY_DATA: SoundMoneyDataPoint[] = [
  // ── Pre-Fed era ─────────────────────────────────────────────────────
  { year: 1900, m2Billions:    7.0, goldKilotonnes:  32, btcSupplyM: 0, usdPp1913: pp( 84) },
  { year: 1905, m2Billions:    9.5, goldKilotonnes:  35, btcSupplyM: 0, usdPp1913: pp( 87) },
  { year: 1910, m2Billions:   13.0, goldKilotonnes:  38, btcSupplyM: 0, usdPp1913: pp( 95) },
  { year: 1913, m2Billions:   15.7, goldKilotonnes:  40, btcSupplyM: 0, usdPp1913: pp(100) },

  // ── Fed founded 1913, WWI inflation ────────────────────────────────
  { year: 1915, m2Billions:   18.5, goldKilotonnes:  41, btcSupplyM: 0, usdPp1913: pp(108) },
  { year: 1920, m2Billions:   35.0, goldKilotonnes:  44, btcSupplyM: 0, usdPp1913: pp(200) },
  { year: 1925, m2Billions:   42.0, goldKilotonnes:  47, btcSupplyM: 0, usdPp1913: pp(176) },
  { year: 1929, m2Billions:   46.0, goldKilotonnes:  49, btcSupplyM: 0, usdPp1913: pp(172) },

  // ── Depression / FDR confiscation 1933 ─────────────────────────────
  { year: 1933, m2Billions:   32.0, goldKilotonnes:  51, btcSupplyM: 0, usdPp1913: pp(130) },
  { year: 1935, m2Billions:   39.0, goldKilotonnes:  53, btcSupplyM: 0, usdPp1913: pp(137) },
  { year: 1940, m2Billions:   55.0, goldKilotonnes:  56, btcSupplyM: 0, usdPp1913: pp(142) },

  // ── WWII + Bretton Woods 1944 ──────────────────────────────────────
  { year: 1945, m2Billions:  127.0, goldKilotonnes:  58, btcSupplyM: 0, usdPp1913: pp(180) },
  { year: 1950, m2Billions:  150.0, goldKilotonnes:  62, btcSupplyM: 0, usdPp1913: pp(240) },
  { year: 1955, m2Billions:  220.0, goldKilotonnes:  67, btcSupplyM: 0, usdPp1913: pp(267) },
  { year: 1960, m2Billions:  315.0, goldKilotonnes:  72, btcSupplyM: 0, usdPp1913: pp(295) },
  { year: 1965, m2Billions:  460.0, goldKilotonnes:  78, btcSupplyM: 0, usdPp1913: pp(314) },
  { year: 1970, m2Billions:  626.0, goldKilotonnes:  85, btcSupplyM: 0, usdPp1913: pp(388) },

  // ── Nixon Shock 1971 — gold window closes ──────────────────────────
  { year: 1971, m2Billions:  685.0, goldKilotonnes:  86, btcSupplyM: 0, usdPp1913: pp(405) },
  { year: 1975, m2Billions: 1024.0, goldKilotonnes:  92, btcSupplyM: 0, usdPp1913: pp(539) },
  { year: 1980, m2Billions: 1599.0, goldKilotonnes:  98, btcSupplyM: 0, usdPp1913: pp(825) },
  { year: 1985, m2Billions: 2496.0, goldKilotonnes: 107, btcSupplyM: 0, usdPp1913: pp(1075) },
  { year: 1990, m2Billions: 3279.0, goldKilotonnes: 117, btcSupplyM: 0, usdPp1913: pp(1305) },
  { year: 1995, m2Billions: 3641.0, goldKilotonnes: 128, btcSupplyM: 0, usdPp1913: pp(1521) },
  { year: 2000, m2Billions: 4925.0, goldKilotonnes: 140, btcSupplyM: 0, usdPp1913: pp(1735) },
  { year: 2005, m2Billions: 6692.0, goldKilotonnes: 153, btcSupplyM: 0, usdPp1913: pp(1962) },
  { year: 2008, m2Billions: 8190.0, goldKilotonnes: 161, btcSupplyM: 0, usdPp1913: pp(2152) },

  // ── Bitcoin genesis Jan 2009 + GFC bailouts ────────────────────────
  { year: 2009, m2Billions: 8540.0, goldKilotonnes: 163, btcSupplyM:  1.6, usdPp1913: pp(2145) },
  { year: 2010, m2Billions: 8845.0, goldKilotonnes: 166, btcSupplyM:  5.0, usdPp1913: pp(2185) },
  { year: 2012, m2Billions:10455.0, goldKilotonnes: 172, btcSupplyM: 10.5, usdPp1913: pp(2272) },
  { year: 2015, m2Billions:12330.0, goldKilotonnes: 180, btcSupplyM: 14.9, usdPp1913: pp(2380) },
  { year: 2016, m2Billions:13208.0, goldKilotonnes: 184, btcSupplyM: 16.0, usdPp1913: pp(2410) },
  { year: 2019, m2Billions:15322.0, goldKilotonnes: 196, btcSupplyM: 18.1, usdPp1913: pp(2575) },

  // ── COVID stimulus 2020 — vertical M2 ──────────────────────────────
  { year: 2020, m2Billions:19128.0, goldKilotonnes: 200, btcSupplyM: 18.6, usdPp1913: pp(2585) },
  { year: 2021, m2Billions:21600.0, goldKilotonnes: 203, btcSupplyM: 18.9, usdPp1913: pp(2705) },
  { year: 2022, m2Billions:21400.0, goldKilotonnes: 206, btcSupplyM: 19.2, usdPp1913: pp(2920) },
  { year: 2023, m2Billions:20830.0, goldKilotonnes: 209, btcSupplyM: 19.5, usdPp1913: pp(3030) },
  { year: 2024, m2Billions:21520.0, goldKilotonnes: 212, btcSupplyM: 19.7, usdPp1913: pp(3140) },
  { year: 2025, m2Billions:22100.0, goldKilotonnes: 213, btcSupplyM: 19.85, usdPp1913: pp(3245) },
];

/** Annotated events — used as ReferenceLines on the M2 chart. */
export interface ChartAnnotation {
  year:  number;
  label: string;
}

export const CHART_ANNOTATIONS: ChartAnnotation[] = [
  { year: 1913, label: 'Fed founded' },
  { year: 1933, label: 'Gold confiscation' },
  { year: 1944, label: 'Bretton Woods' },
  { year: 1971, label: 'Nixon Shock' },
  { year: 2008, label: 'QE1' },
  { year: 2020, label: 'COVID stimulus' },
];
