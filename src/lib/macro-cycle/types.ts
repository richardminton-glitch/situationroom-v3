/**
 * Macro Cycle Room — shared types.
 *
 * The room tracks ISM Manufacturing PMI as a coincident tell for risk-asset
 * cycle phase, framed via the "dominoes" chain: Financial Conditions →
 * Total Liquidity → ISM → Risk Assets / crypto beta.
 *
 * ISM PMI has no free public API (ISM revoked FRED redistribution in 2016),
 * so values are entered manually by an admin via /api/admin/update-ism on
 * release day (1st business day each month). The S&P Global US Manufacturing
 * PMI is shown on the page as a referenced sibling indicator with a clear
 * caveat that it is not the same series.
 */

/** A single monthly ISM Manufacturing PMI reading. */
export interface IsmReading {
  /** YYYY-MM, e.g. "2026-04". This is the *survey* month, not the release month. */
  month: string;
  /** Headline PMI value, typical range 40–65. 50 = neutral. */
  value: number;
  /** Optional one-line note from admin (e.g. "flash estimate", "revised"). */
  note?: string;
}

/** Full ISM cycle dataset returned by /api/data/ism-cycle. */
export interface IsmCycleData {
  /** Monthly readings, sorted oldest → newest. */
  readings: IsmReading[];
  /** ISO timestamp of the last admin update (or null if never updated). */
  updatedAt: string | null;
  /** Whether the dataset is the empty seed shipped with the build. */
  seed: boolean;
}
