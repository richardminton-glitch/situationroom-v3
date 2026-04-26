/**
 * Central bank policy-rate seed dataset — 24 cells.
 *
 * G20 central banks + ECB + SNB + a few editorial extras (Sweden, Norway,
 * Israel, Czech, Hungary). Phase 8 Grok extraction refreshes this daily;
 * the seed represents an Apr-2026 snapshot.
 */

export type CBStance = 'easing' | 'holding' | 'tightening';

export interface CBRate {
  iso3: string;
  name: string;
  /** Short bank code shown on the card. */
  bank: string;
  /** Current policy rate, % */
  rate: number;
  /** Last move in bps (negative = cut). */
  lastMoveBps: number;
  /** DDMMMYY military date for last move. */
  lastMoveDate: string;
  stance: CBStance;
  /** Market-implied 12-month rate (cumulative bps from current). */
  marketImpliedBps12m: number;
  /** GDP weight (USD trillions, approximate) — used for divergence weighting. */
  gdpUsdT: number;
}

export const CB_RATES: CBRate[] = [
  { iso3: 'USA', name: 'United States', bank: 'FED',     rate: 4.25, lastMoveBps: -25,  lastMoveDate: '18MAR26', stance: 'easing',     marketImpliedBps12m: -75,  gdpUsdT: 28.5 },
  { iso3: 'EUZ', name: 'Eurozone',      bank: 'ECB',     rate: 2.25, lastMoveBps: -25,  lastMoveDate: '12APR26', stance: 'easing',     marketImpliedBps12m: -50,  gdpUsdT: 20.8 },
  { iso3: 'JPN', name: 'Japan',         bank: 'BOJ',     rate: 0.50, lastMoveBps:  15,  lastMoveDate: '23JUL25', stance: 'tightening', marketImpliedBps12m:  50,  gdpUsdT: 4.2  },
  { iso3: 'GBR', name: 'United Kingdom',bank: 'BOE',     rate: 4.00, lastMoveBps: -25,  lastMoveDate: '06FEB26', stance: 'easing',     marketImpliedBps12m: -100, gdpUsdT: 3.5  },
  { iso3: 'CHN', name: 'China',         bank: 'PBOC',    rate: 2.85, lastMoveBps: -10,  lastMoveDate: '20JAN26', stance: 'easing',     marketImpliedBps12m: -40,  gdpUsdT: 18.9 },
  { iso3: 'CAN', name: 'Canada',        bank: 'BOC',     rate: 2.50, lastMoveBps: -25,  lastMoveDate: '11MAR26', stance: 'easing',     marketImpliedBps12m: -50,  gdpUsdT: 2.2  },
  { iso3: 'AUS', name: 'Australia',     bank: 'RBA',     rate: 3.85, lastMoveBps: -25,  lastMoveDate: '02APR26', stance: 'easing',     marketImpliedBps12m: -75,  gdpUsdT: 1.7  },
  { iso3: 'KOR', name: 'South Korea',   bank: 'BOK',     rate: 2.50, lastMoveBps: -25,  lastMoveDate: '17MAR26', stance: 'easing',     marketImpliedBps12m: -25,  gdpUsdT: 1.8  },
  { iso3: 'MEX', name: 'Mexico',        bank: 'BANXICO', rate: 8.75, lastMoveBps: -50,  lastMoveDate: '20MAR26', stance: 'easing',     marketImpliedBps12m: -150, gdpUsdT: 1.8  },
  { iso3: 'BRA', name: 'Brazil',        bank: 'BCB',     rate: 11.75,lastMoveBps: -50,  lastMoveDate: '09APR26', stance: 'easing',     marketImpliedBps12m: -200, gdpUsdT: 2.1  },
  { iso3: 'IND', name: 'India',         bank: 'RBI',     rate: 5.75, lastMoveBps: -25,  lastMoveDate: '04APR26', stance: 'easing',     marketImpliedBps12m: -50,  gdpUsdT: 4.0  },
  { iso3: 'RUS', name: 'Russia',        bank: 'CBR',     rate: 19.00,lastMoveBps:  200, lastMoveDate: '13FEB26', stance: 'tightening', marketImpliedBps12m:  100, gdpUsdT: 2.0  },
  { iso3: 'ZAF', name: 'South Africa',  bank: 'SARB',    rate: 7.25, lastMoveBps: -25,  lastMoveDate: '04APR26', stance: 'easing',     marketImpliedBps12m: -75,  gdpUsdT: 0.4  },
  { iso3: 'IDN', name: 'Indonesia',     bank: 'BI',      rate: 5.50, lastMoveBps: -25,  lastMoveDate: '19MAR26', stance: 'easing',     marketImpliedBps12m: -75,  gdpUsdT: 1.4  },
  { iso3: 'SAU', name: 'Saudi Arabia',  bank: 'SAMA',    rate: 4.75, lastMoveBps: -25,  lastMoveDate: '19MAR26', stance: 'easing',     marketImpliedBps12m: -75,  gdpUsdT: 1.1  },
  { iso3: 'TUR', name: 'Türkiye',       bank: 'CBRT',    rate: 42.50,lastMoveBps: -250, lastMoveDate: '18APR26', stance: 'easing',     marketImpliedBps12m: -800, gdpUsdT: 1.2  },
  { iso3: 'ARG', name: 'Argentina',     bank: 'BCRA',    rate: 35.00,lastMoveBps: -500, lastMoveDate: '11APR26', stance: 'easing',     marketImpliedBps12m: -1500,gdpUsdT: 0.6  },
  { iso3: 'CHE', name: 'Switzerland',   bank: 'SNB',     rate: 0.25, lastMoveBps:   0,  lastMoveDate: '21MAR26', stance: 'holding',    marketImpliedBps12m:   0,  gdpUsdT: 0.9  },
  { iso3: 'SWE', name: 'Sweden',        bank: 'RIKSBK',  rate: 1.75, lastMoveBps: -25,  lastMoveDate: '13MAR26', stance: 'easing',     marketImpliedBps12m: -50,  gdpUsdT: 0.6  },
  { iso3: 'NOR', name: 'Norway',        bank: 'NORGES',  rate: 3.50, lastMoveBps: -25,  lastMoveDate: '10APR26', stance: 'easing',     marketImpliedBps12m: -75,  gdpUsdT: 0.5  },
  { iso3: 'ISR', name: 'Israel',        bank: 'BOI',     rate: 4.00, lastMoveBps: -25,  lastMoveDate: '07APR26', stance: 'easing',     marketImpliedBps12m: -50,  gdpUsdT: 0.5  },
  { iso3: 'POL', name: 'Poland',        bank: 'NBP',     rate: 4.75, lastMoveBps: -25,  lastMoveDate: '04MAR26', stance: 'easing',     marketImpliedBps12m: -100, gdpUsdT: 0.9  },
  { iso3: 'CZE', name: 'Czechia',       bank: 'CNB',     rate: 3.25, lastMoveBps: -25,  lastMoveDate: '20MAR26', stance: 'easing',     marketImpliedBps12m: -75,  gdpUsdT: 0.3  },
  { iso3: 'HUN', name: 'Hungary',       bank: 'MNB',     rate: 5.00, lastMoveBps: -25,  lastMoveDate: '22APR26', stance: 'easing',     marketImpliedBps12m: -100, gdpUsdT: 0.2  },
];

/** Divergence Index — GDP-weighted standard deviation of stance scores (-1/0/+1). */
export function divergenceIndex(rates: CBRate[]): number {
  const stanceVal: Record<CBStance, number> = { easing: -1, holding: 0, tightening: 1 };
  const totalGdp = rates.reduce((sum, r) => sum + r.gdpUsdT, 0);
  const mean = rates.reduce((sum, r) => sum + stanceVal[r.stance] * r.gdpUsdT, 0) / totalGdp;
  const variance = rates.reduce((sum, r) => {
    const diff = stanceVal[r.stance] - mean;
    return sum + diff * diff * r.gdpUsdT;
  }, 0) / totalGdp;
  return Math.sqrt(variance);
}
