/**
 * Sovereign seed dataset — 30 countries, G20 + editorial picks.
 *
 * Plausible-realistic values consistent with public IMF WEO / national
 * treasury / world bank figures around 2026. These are the **seed** values;
 * the Phase 8 Grok extraction pipeline replaces them with quarterly refreshes.
 *
 * Numeric ISO codes match world-atlas TopoJSON country ids — required for
 * the globe to colour the right polygons.
 */

import type { Sovereign } from './types';

export const SOVEREIGNS_SEED: Sovereign[] = [
  // ─── G20 advanced ───
  { iso3: 'USA', isoNumeric: 840, name: 'United States',     region: 'NA',    debtGdp: 123, interestPctRevenue: 16, primaryBalance: -5.0, realGdpGrowth: 1.8, effectiveRate: 3.5, avgMaturity: 6.0,  fxDebtShare: 0,  externalDebtShare: 35, reserveAdequacyScore: 50 },
  { iso3: 'GBR', isoNumeric: 826, name: 'United Kingdom',    region: 'EU',    debtGdp: 100, interestPctRevenue: 14, primaryBalance: -2.5, realGdpGrowth: 1.2, effectiveRate: 3.8, avgMaturity: 14.0, fxDebtShare: 0,  externalDebtShare: 25, reserveAdequacyScore: 45 },
  { iso3: 'FRA', isoNumeric: 250, name: 'France',            region: 'EU',    debtGdp: 112, interestPctRevenue: 10, primaryBalance: -4.0, realGdpGrowth: 1.0, effectiveRate: 2.8, avgMaturity: 8.0,  fxDebtShare: 0,  externalDebtShare: 50, reserveAdequacyScore: 50 },
  { iso3: 'DEU', isoNumeric: 276, name: 'Germany',           region: 'EU',    debtGdp: 63,  interestPctRevenue: 3,  primaryBalance: -1.8, realGdpGrowth: 0.9, effectiveRate: 1.8, avgMaturity: 7.0,  fxDebtShare: 0,  externalDebtShare: 50, reserveAdequacyScore: 65 },
  { iso3: 'ITA', isoNumeric: 380, name: 'Italy',             region: 'EU',    debtGdp: 135, interestPctRevenue: 17, primaryBalance: -2.5, realGdpGrowth: 0.5, effectiveRate: 3.5, avgMaturity: 7.5,  fxDebtShare: 0,  externalDebtShare: 35, reserveAdequacyScore: 50 },
  { iso3: 'CAN', isoNumeric: 124, name: 'Canada',            region: 'NA',    debtGdp: 107, interestPctRevenue: 10, primaryBalance: -1.5, realGdpGrowth: 1.5, effectiveRate: 3.0, avgMaturity: 7.0,  fxDebtShare: 0,  externalDebtShare: 30, reserveAdequacyScore: 60 },
  { iso3: 'JPN', isoNumeric: 392, name: 'Japan',             region: 'APAC',  debtGdp: 250, interestPctRevenue: 18, primaryBalance: -3.0, realGdpGrowth: 0.8, effectiveRate: 0.7, avgMaturity: 9.0,  fxDebtShare: 0,  externalDebtShare: 7,  reserveAdequacyScore: 90 },
  { iso3: 'AUS', isoNumeric: 36,  name: 'Australia',         region: 'APAC',  debtGdp: 58,  interestPctRevenue: 6,  primaryBalance: -2.0, realGdpGrowth: 2.1, effectiveRate: 3.5, avgMaturity: 7.0,  fxDebtShare: 0,  externalDebtShare: 40, reserveAdequacyScore: 60 },
  { iso3: 'KOR', isoNumeric: 410, name: 'South Korea',       region: 'APAC',  debtGdp: 57,  interestPctRevenue: 3,  primaryBalance: 0.5,  realGdpGrowth: 2.3, effectiveRate: 3.0, avgMaturity: 9.0,  fxDebtShare: 5,  externalDebtShare: 30, reserveAdequacyScore: 75 },

  // ─── G20 emerging ───
  { iso3: 'MEX', isoNumeric: 484, name: 'Mexico',            region: 'LATAM', debtGdp: 58,  interestPctRevenue: 17, primaryBalance: -1.5, realGdpGrowth: 2.0, effectiveRate: 8.0,  avgMaturity: 8.0, fxDebtShare: 25, externalDebtShare: 40, reserveAdequacyScore: 70 },
  { iso3: 'BRA', isoNumeric: 76,  name: 'Brazil',            region: 'LATAM', debtGdp: 88,  interestPctRevenue: 26, primaryBalance: -3.0, realGdpGrowth: 2.5, effectiveRate: 11.0, avgMaturity: 4.0, fxDebtShare: 5,  externalDebtShare: 8,  reserveAdequacyScore: 75 },
  { iso3: 'IND', isoNumeric: 356, name: 'India',             region: 'APAC',  debtGdp: 83,  interestPctRevenue: 25, primaryBalance: -3.0, realGdpGrowth: 6.5, effectiveRate: 6.5,  avgMaturity: 12.0,fxDebtShare: 5,  externalDebtShare: 15, reserveAdequacyScore: 75 },
  { iso3: 'CHN', isoNumeric: 156, name: 'China',             region: 'APAC',  debtGdp: 90,  interestPctRevenue: 10, primaryBalance: -5.5, realGdpGrowth: 4.5, effectiveRate: 2.8,  avgMaturity: 7.0, fxDebtShare: 1,  externalDebtShare: 5,  reserveAdequacyScore: 95 },
  { iso3: 'RUS', isoNumeric: 643, name: 'Russia',            region: 'EMEA',  debtGdp: 22,  interestPctRevenue: 5,  primaryBalance: -2.5, realGdpGrowth: 1.0, effectiveRate: 12.0, avgMaturity: 5.0, fxDebtShare: 30, externalDebtShare: 18, reserveAdequacyScore: 60 },
  { iso3: 'ZAF', isoNumeric: 710, name: 'South Africa',      region: 'EMEA',  debtGdp: 76,  interestPctRevenue: 22, primaryBalance: -2.5, realGdpGrowth: 1.0, effectiveRate: 9.5,  avgMaturity: 12.0,fxDebtShare: 12, externalDebtShare: 30, reserveAdequacyScore: 50 },
  { iso3: 'IDN', isoNumeric: 360, name: 'Indonesia',         region: 'APAC',  debtGdp: 40,  interestPctRevenue: 14, primaryBalance: -2.0, realGdpGrowth: 5.0, effectiveRate: 6.5,  avgMaturity: 9.0, fxDebtShare: 25, externalDebtShare: 35, reserveAdequacyScore: 65 },
  { iso3: 'SAU', isoNumeric: 682, name: 'Saudi Arabia',      region: 'EMEA',  debtGdp: 30,  interestPctRevenue: 5,  primaryBalance: -1.5, realGdpGrowth: 4.0, effectiveRate: 5.0,  avgMaturity: 8.0, fxDebtShare: 30, externalDebtShare: 25, reserveAdequacyScore: 90 },
  { iso3: 'TUR', isoNumeric: 792, name: 'Türkiye',           region: 'EMEA',  debtGdp: 35,  interestPctRevenue: 30, primaryBalance: -3.0, realGdpGrowth: 3.0, effectiveRate: 35.0, avgMaturity: 4.0, fxDebtShare: 60, externalDebtShare: 35, reserveAdequacyScore: 30 },
  { iso3: 'ARG', isoNumeric: 32,  name: 'Argentina',         region: 'LATAM', debtGdp: 155, interestPctRevenue: 50, primaryBalance: -3.0, realGdpGrowth: -1.0,effectiveRate: 40.0, avgMaturity: 3.0, fxDebtShare: 70, externalDebtShare: 75, reserveAdequacyScore: 15 },

  // ─── Editorial picks ───
  { iso3: 'VEN', isoNumeric: 862, name: 'Venezuela',         region: 'LATAM', debtGdp: 250, interestPctRevenue: 60, primaryBalance: -8.0, realGdpGrowth: -2.0,effectiveRate: 50.0, avgMaturity: 2.0, fxDebtShare: 90, externalDebtShare: 90, reserveAdequacyScore: 5  },
  { iso3: 'ZWE', isoNumeric: 716, name: 'Zimbabwe',          region: 'EMEA',  debtGdp: 95,  interestPctRevenue: 40, primaryBalance: -5.0, realGdpGrowth: 2.0, effectiveRate: 30.0, avgMaturity: 3.0, fxDebtShare: 80, externalDebtShare: 75, reserveAdequacyScore: 10 },
  { iso3: 'LBN', isoNumeric: 422, name: 'Lebanon',           region: 'EMEA',  debtGdp: 280, interestPctRevenue: 70, primaryBalance: -10.0,realGdpGrowth: -2.0,effectiveRate: 25.0, avgMaturity: 4.0, fxDebtShare: 75, externalDebtShare: 80, reserveAdequacyScore: 8  },
  { iso3: 'EGY', isoNumeric: 818, name: 'Egypt',             region: 'EMEA',  debtGdp: 96,  interestPctRevenue: 70, primaryBalance: -4.0, realGdpGrowth: 4.0, effectiveRate: 22.0, avgMaturity: 3.0, fxDebtShare: 35, externalDebtShare: 35, reserveAdequacyScore: 30 },
  { iso3: 'PAK', isoNumeric: 586, name: 'Pakistan',          region: 'APAC',  debtGdp: 78,  interestPctRevenue: 58, primaryBalance: -3.0, realGdpGrowth: 3.0, effectiveRate: 17.0, avgMaturity: 4.0, fxDebtShare: 35, externalDebtShare: 35, reserveAdequacyScore: 18 },
  { iso3: 'LKA', isoNumeric: 144, name: 'Sri Lanka',         region: 'APAC',  debtGdp: 115, interestPctRevenue: 65, primaryBalance: -5.0, realGdpGrowth: 3.0, effectiveRate: 14.0, avgMaturity: 4.0, fxDebtShare: 50, externalDebtShare: 50, reserveAdequacyScore: 20 },
  { iso3: 'CHE', isoNumeric: 756, name: 'Switzerland',       region: 'EU',    debtGdp: 38,  interestPctRevenue: 2,  primaryBalance: 0.5,  realGdpGrowth: 1.5, effectiveRate: 1.0,  avgMaturity: 10.0,fxDebtShare: 0,  externalDebtShare: 20, reserveAdequacyScore: 95 },
  { iso3: 'SWE', isoNumeric: 752, name: 'Sweden',            region: 'EU',    debtGdp: 32,  interestPctRevenue: 3,  primaryBalance: 0.0,  realGdpGrowth: 1.8, effectiveRate: 2.5,  avgMaturity: 6.0, fxDebtShare: 0,  externalDebtShare: 30, reserveAdequacyScore: 80 },
  { iso3: 'NOR', isoNumeric: 578, name: 'Norway',            region: 'EU',    debtGdp: 42,  interestPctRevenue: 2,  primaryBalance: 8.0,  realGdpGrowth: 1.5, effectiveRate: 4.5,  avgMaturity: 4.0, fxDebtShare: 0,  externalDebtShare: 25, reserveAdequacyScore: 100 },
  { iso3: 'ISR', isoNumeric: 376, name: 'Israel',            region: 'EMEA',  debtGdp: 70,  interestPctRevenue: 15, primaryBalance: -8.0, realGdpGrowth: 2.5, effectiveRate: 4.5,  avgMaturity: 8.0, fxDebtShare: 12, externalDebtShare: 30, reserveAdequacyScore: 80 },
  { iso3: 'POL', isoNumeric: 616, name: 'Poland',            region: 'EU',    debtGdp: 50,  interestPctRevenue: 9,  primaryBalance: -4.0, realGdpGrowth: 3.5, effectiveRate: 5.5,  avgMaturity: 5.0, fxDebtShare: 22, externalDebtShare: 30, reserveAdequacyScore: 65 },
];

/** Quick lookup: numeric ISO → ISO3 (used by globe to map TopoJSON ids back to data rows). */
export const ISO_NUMERIC_TO_ISO3: Record<number, string> = Object.fromEntries(
  SOVEREIGNS_SEED.map((s) => [s.isoNumeric, s.iso3])
);

/** Quick lookup: ISO3 → seed row. */
export const SOVEREIGNS_BY_ISO3: Record<string, Sovereign> = Object.fromEntries(
  SOVEREIGNS_SEED.map((s) => [s.iso3, s])
);
