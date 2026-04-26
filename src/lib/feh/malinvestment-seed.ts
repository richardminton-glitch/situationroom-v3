/**
 * Malinvestment Mapper — sector seed dataset.
 *
 * 9 sectors per spec. Each carries a 0-100 stress score, a headline metric
 * with display value, YoY delta, and half-life-at-current-rates.
 *
 * Composite Bust Probability is the equal-weight GEOMETRIC mean of all 9
 * sector stress scores — this is a deliberate editorial choice (locked
 * decision): a cluster of weak signals beats a single strong one. The
 * composite measures kindling, not timing.
 */

export interface MalinvestmentSector {
  id: string;
  /** Short code shown on the radar axes. */
  short: string;
  label: string;
  /** 0-100, higher = more stress. */
  stress: number;
  /** Headline metric — short narrative. */
  headline: string;
  /** Year-over-year delta in stress, percentage points. */
  yoyDelta: number;
  /** Months until secondary stress trigger fires under current rates. */
  halfLifeMonths: number;
}

export const MALINVESTMENT_SECTORS: MalinvestmentSector[] = [
  {
    id: 'cre',
    short: 'CRE',
    label: 'COMMERCIAL REAL ESTATE',
    stress: 72,
    headline: 'Office vacancy 18% nationally; refi wall $1.2T due 2026-27.',
    yoyDelta: 4.6,
    halfLifeMonths: 18,
  },
  {
    id: 'zombie',
    short: 'ZOMBIE',
    label: 'ZOMBIE CORPORATES',
    stress: 78,
    headline: '18.2% of Russell 3000 unable to cover interest from earnings.',
    yoyDelta: 2.3,
    halfLifeMonths: 14,
  },
  {
    id: 'vc',
    short: 'VC',
    label: 'VENTURE / TECH',
    stress: 65,
    headline: 'Dry powder $1.4T against deployment ratio at 5-year low.',
    yoyDelta: -1.8,
    halfLifeMonths: 24,
  },
  {
    id: 'spac',
    short: 'SPAC',
    label: 'SPACs',
    stress: 88,
    headline: 'Post-merger trust price discount averaging 35% across cohort.',
    yoyDelta: 6.2,
    halfLifeMonths: 8,
  },
  {
    id: 'private-credit',
    short: 'PRV CR',
    label: 'PRIVATE CREDIT',
    stress: 70,
    headline: 'Mark-to-model spread vs liquid HY now 480bps and widening.',
    yoyDelta: 5.1,
    halfLifeMonths: 16,
  },
  {
    id: 'crypto',
    short: 'CRYPTO',
    label: 'CRYPTO LEVERAGE',
    stress: 55,
    headline: 'Perp funding mixed; liquidation queue depth +28% MoM.',
    yoyDelta: -3.0,
    halfLifeMonths: 6,
  },
  {
    id: 'auto',
    short: 'AUTO',
    label: 'AUTO / SUBPRIME',
    stress: 62,
    headline: 'Subprime auto delinquency 8.5%, repo rate at GFC levels.',
    yoyDelta: 1.4,
    halfLifeMonths: 12,
  },
  {
    id: 'student',
    short: 'STUDNT',
    label: 'STUDENT DEBT',
    stress: 58,
    headline: 'Forbearance roll-off accelerating; default rate climbing.',
    yoyDelta: 3.8,
    halfLifeMonths: 22,
  },
  {
    id: 'buyback',
    short: 'BUYBK',
    label: 'BUYBACK-FUNDED EQUITY',
    stress: 68,
    headline: '%-of-market-cap repurchased on credit at 12-year high.',
    yoyDelta: 2.1,
    halfLifeMonths: 20,
  },
];

/** Equal-weight geometric mean — locked editorial composite. Returns 0-100. */
export function bustProbability(sectors: MalinvestmentSector[]): number {
  if (sectors.length === 0) return 0;
  const product = sectors.reduce((p, s) => p * Math.max(1, s.stress), 1);
  return Math.round(Math.pow(product, 1 / sectors.length) * 10) / 10;
}
