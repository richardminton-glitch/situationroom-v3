/**
 * Wartime Finance Monitor — country staging seed dataset.
 *
 * Each country gets classified at the DEEPEST stage it currently triggers
 * (cumulative: Stage 3 implies 1+2 also fired). Stage thresholds per spec:
 *
 *   1 — Defence spending >2.5% GDP AND increasing 3y CAGR >5%
 *   2 — Net new sovereign issuance specifically marked for defence/security
 *   3 — Any documented capital outflow restriction in last 24m
 *   4 — Any documented price/wage decree or cap in last 24m
 *   5 — M2 growth >15% sustained 3y AND CPI >double-digit
 *
 * Phase 8 Grok extraction refreshes the staging via news + SIPRI + IMF
 * AREAER scrapes; this is the Apr-2026 baseline.
 */

export type WartimeStage = 1 | 2 | 3 | 4 | 5;

export interface WartimeCountry {
  iso3: string;
  flag: string;          // emoji
  name: string;
  stage: WartimeStage;
  /** % of GDP spent on defence — current. */
  defenceSpendPctGdp: number;
  /** 3-year CAGR of defence spend, %. */
  defenceCagr3y: number;
  /** 3-year CAGR of M2, %. */
  m2Growth3y: number;
  /** YoY CPI, %. */
  cpiYoY: number;
  /** Specific evidence shown in drilldown — bullets. */
  evidence: string[];
}

export const WARTIME_COUNTRIES: WartimeCountry[] = [
  // ─── Stage 1 — defence ↑ ───
  { iso3: 'USA', flag: '🇺🇸', name: 'United States', stage: 1, defenceSpendPctGdp: 3.4, defenceCagr3y: 6.2, m2Growth3y: 4.8, cpiYoY: 2.9,
    evidence: ['FY26 defence appropriation $886B (+5.3% YoY)', '3-yr CAGR 6.2% — over Stage 1 threshold', 'No documented capital controls or decrees'] },
  { iso3: 'GBR', flag: '🇬🇧', name: 'United Kingdom', stage: 1, defenceSpendPctGdp: 2.6, defenceCagr3y: 5.4, m2Growth3y: 3.2, cpiYoY: 3.1,
    evidence: ['Defence spend pledge → 2.5% by 2027 already crossed', 'War-readiness review Q1 2026'] },
  { iso3: 'FRA', flag: '🇫🇷', name: 'France',         stage: 1, defenceSpendPctGdp: 2.1, defenceCagr3y: 5.8, m2Growth3y: 4.1, cpiYoY: 2.5,
    evidence: ['Multi-year LPM defence law 2024-30', '€413B over 7 years — significant escalation'] },
  { iso3: 'DEU', flag: '🇩🇪', name: 'Germany',        stage: 1, defenceSpendPctGdp: 2.0, defenceCagr3y: 8.6, m2Growth3y: 3.0, cpiYoY: 2.2,
    evidence: ['Zeitenwende €100B special fund', '3-yr CAGR 8.6% — accelerating', 'NATO 2% target hit 2024'] },
  { iso3: 'JPN', flag: '🇯🇵', name: 'Japan',          stage: 1, defenceSpendPctGdp: 1.9, defenceCagr3y: 9.4, m2Growth3y: 2.1, cpiYoY: 2.8,
    evidence: ['5-yr defence buildup ¥43T', 'Will exceed 2% GDP by 2027 plan', 'No capital controls'] },
  { iso3: 'ITA', flag: '🇮🇹', name: 'Italy',          stage: 1, defenceSpendPctGdp: 1.6, defenceCagr3y: 5.1, m2Growth3y: 4.0, cpiYoY: 1.9,
    evidence: ['Slow climb toward 2% NATO floor'] },
  { iso3: 'CAN', flag: '🇨🇦', name: 'Canada',         stage: 1, defenceSpendPctGdp: 1.4, defenceCagr3y: 5.0, m2Growth3y: 4.5, cpiYoY: 2.1,
    evidence: ['NATO pressure to hit 2%', 'Defence policy update 2024'] },
  { iso3: 'AUS', flag: '🇦🇺', name: 'Australia',      stage: 1, defenceSpendPctGdp: 2.1, defenceCagr3y: 6.8, m2Growth3y: 5.0, cpiYoY: 2.4,
    evidence: ['AUKUS submarines $368B over 30y', 'Defence Strategic Review 2023'] },
  { iso3: 'KOR', flag: '🇰🇷', name: 'South Korea',    stage: 1, defenceSpendPctGdp: 2.6, defenceCagr3y: 7.0, m2Growth3y: 4.6, cpiYoY: 1.8,
    evidence: ['Defence spend tied to NK escalation cycle', '3-yr CAGR 7%'] },
  { iso3: 'IND', flag: '🇮🇳', name: 'India',          stage: 1, defenceSpendPctGdp: 2.4, defenceCagr3y: 6.3, m2Growth3y: 8.2, cpiYoY: 4.6,
    evidence: ['Make-in-India defence push', 'Border tensions sustaining elevated spend'] },

  // ─── Stage 2 — defence + war bonds ───
  { iso3: 'POL', flag: '🇵🇱', name: 'Poland',         stage: 2, defenceSpendPctGdp: 4.7, defenceCagr3y: 22.0, m2Growth3y: 6.4, cpiYoY: 4.8,
    evidence: ['NATO\'s highest defence/GDP at 4.7%', 'Defence-specific bond issuance 2024-25', 'War readiness CAGR 22%'] },
  { iso3: 'ISR', flag: '🇮🇱', name: 'Israel',         stage: 2, defenceSpendPctGdp: 5.6, defenceCagr3y: 11.0, m2Growth3y: 7.4, cpiYoY: 3.5,
    evidence: ['War supplementary budgets 2024-26', 'Issuance specifically marked for security ops', 'Primary deficit -8% GDP'] },
  { iso3: 'TWN', flag: '🇹🇼', name: 'Taiwan',         stage: 2, defenceSpendPctGdp: 2.8, defenceCagr3y: 12.5, m2Growth3y: 5.2, cpiYoY: 2.0,
    evidence: ['Special defence budget 2024', 'NTD$240B asymmetric warfare bond', 'CSST escalation'] },

  // ─── Stage 3 — capital controls ───
  { iso3: 'RUS', flag: '🇷🇺', name: 'Russia',         stage: 3, defenceSpendPctGdp: 6.8, defenceCagr3y: 28.0, m2Growth3y: 12.0, cpiYoY: 7.4,
    evidence: ['Mandatory FX surrender 80% (Oct 2023, extended)', 'Cross-border cash transfer caps', 'Defence spend 30% of total budget'] },
  { iso3: 'CHN', flag: '🇨🇳', name: 'China',          stage: 3, defenceSpendPctGdp: 1.7, defenceCagr3y: 7.2, m2Growth3y: 9.4, cpiYoY: 0.8,
    evidence: ['Outbound capital outflow restrictions tightened 2024', 'Crackdown on offshoring', 'Property leverage caps'] },
  { iso3: 'TUR', flag: '🇹🇷', name: 'Türkiye',        stage: 3, defenceSpendPctGdp: 2.2, defenceCagr3y: 9.0, m2Growth3y: 38.0, cpiYoY: 35.0,
    evidence: ['FX-protected deposit scheme (KKM)', 'Lira convertibility friction', 'Capital flow restrictions on residents'] },
  { iso3: 'EGY', flag: '🇪🇬', name: 'Egypt',          stage: 3, defenceSpendPctGdp: 1.2, defenceCagr3y: 4.0, m2Growth3y: 22.0, cpiYoY: 26.0,
    evidence: ['Repeated FX rationing for imports', 'Capital outflow limits on residents', 'IMF programme conditional on relaxation'] },

  // ─── Stage 4 — price/wage decrees ───
  { iso3: 'IRN', flag: '🇮🇷', name: 'Iran',           stage: 4, defenceSpendPctGdp: 2.2, defenceCagr3y: 6.0, m2Growth3y: 35.0, cpiYoY: 35.0,
    evidence: ['Price caps on staple food 2024-26', 'Wage decrees through Supreme Council', 'FX rate decrees parallel to market'] },

  // ─── Stage 5 — monetary debasement ───
  { iso3: 'VEN', flag: '🇻🇪', name: 'Venezuela',      stage: 5, defenceSpendPctGdp: 0.6, defenceCagr3y: -4.0, m2Growth3y: 145.0, cpiYoY: 250.0,
    evidence: ['Bolivar redenomination cycle continues', 'M2 growth 145% 3-yr CAGR', 'CPI 250% YoY'] },
  { iso3: 'ZWE', flag: '🇿🇼', name: 'Zimbabwe',       stage: 5, defenceSpendPctGdp: 0.9, defenceCagr3y: 2.0, m2Growth3y: 80.0, cpiYoY: 65.0,
    evidence: ['ZiG currency launched 2024 backed by gold (4th iteration)', 'M2 80% 3-yr CAGR', 'Hyperinflation regime'] },
  { iso3: 'LBN', flag: '🇱🇧', name: 'Lebanon',        stage: 5, defenceSpendPctGdp: 4.0, defenceCagr3y: 0.0, m2Growth3y: 95.0, cpiYoY: 80.0,
    evidence: ['BdL informal capital controls + decrees', 'Multiple FX rates', 'M2 95% 3-yr CAGR · CPI 80%'] },
  { iso3: 'ARG', flag: '🇦🇷', name: 'Argentina',      stage: 5, defenceSpendPctGdp: 0.7, defenceCagr3y: 3.0, m2Growth3y: 110.0, cpiYoY: 95.0,
    evidence: ['Cepo cambiario layered controls', 'Multiple official/parallel rates', 'M2 110% 3-yr CAGR · CPI 95%'] },
];

export const WARTIME_STAGES: { stage: WartimeStage; label: string; description: string }[] = [
  { stage: 1, label: 'DEFENCE SPENDING ↑',  description: '>2.5% GDP and CAGR >5% (3y)' },
  { stage: 2, label: 'WAR BOND ISSUANCE',   description: 'Issuance flagged for defence/security' },
  { stage: 3, label: 'CAPITAL CONTROLS',    description: 'Outflow restriction in last 24m' },
  { stage: 4, label: 'PRICE / WAGE DECREES',description: 'Documented cap or decree in last 24m' },
  { stage: 5, label: 'MONETARY DEBASEMENT', description: 'M2 >15% (3y) AND CPI double-digit' },
];

/** Sub-readout: countries currently at Stage 3 or deeper. */
export function countriesAtStage3Plus(countries: WartimeCountry[]): number {
  return countries.filter((c) => c.stage >= 3).length;
}

/** Sub-readout: median stage of G20 subset. */
export function medianG20Stage(countries: WartimeCountry[]): number {
  const G20 = new Set(['USA','GBR','FRA','DEU','ITA','CAN','JPN','AUS','KOR','MEX','BRA','IND','CHN','RUS','ZAF','IDN','SAU','TUR','ARG']);
  const stages = countries.filter((c) => G20.has(c.iso3)).map((c) => c.stage).sort((a, b) => a - b);
  if (stages.length === 0) return 0;
  const mid = Math.floor(stages.length / 2);
  return stages.length % 2 === 0 ? (stages[mid - 1] + stages[mid]) / 2 : stages[mid];
}
