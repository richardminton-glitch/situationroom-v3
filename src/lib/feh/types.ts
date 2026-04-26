/**
 * Fiscal Event Horizon — shared types.
 */

export type FailureMode = 'DEBT_STOCK' | 'INTEREST_CROWD_OUT' | 'NONE';

/**
 * Sovereign — seed values that feed runway + sovereignty calcs.
 *
 * All percentages are expressed as percentages (e.g. 123.4 means 123.4%).
 * Future Grok-extraction pipeline (Phase 8) replaces these with quarterly
 * refreshes; the shape of the row stays identical.
 */
export interface Sovereign {
  iso3: string;
  isoNumeric: number;          // matches world-atlas TopoJSON country id
  name: string;
  region: 'NA' | 'LATAM' | 'EU' | 'EMEA' | 'APAC';

  /** Gross general government debt / GDP, % */
  debtGdp: number;
  /** Annual interest expense / general government revenue, % */
  interestPctRevenue: number;
  /** Primary balance / GDP, %. Negative = deficit. */
  primaryBalance: number;
  /** Real GDP growth, % YoY */
  realGdpGrowth: number;
  /** Effective interest rate on outstanding debt stock, % */
  effectiveRate: number;
  /** Average remaining maturity of debt stock, years */
  avgMaturity: number;

  /** Share of debt denominated in foreign currency, % */
  fxDebtShare: number;
  /** Share of debt held by foreign creditors, % */
  externalDebtShare: number;
  /** Reserve adequacy index, 0-100 (higher = more buffer) */
  reserveAdequacyScore: number;
}

export interface RunwayResult {
  /** Years until first threshold crossing. 0 = already past. 100 = never crosses inside the projection horizon. */
  years: number;
  failureMode: FailureMode;
  /** ±years confidence band, simple proxy until time-series volatility data is available. */
  confidenceYears: number;
}

/** A sovereign with computed runway + sovereignty score for the active mode. */
export interface SovereignProjected extends Sovereign {
  runway: RunwayResult;
  sovereigntyScore: number;     // 0-100, higher = stronger
}
