export interface MetricDef {
  key: string;
  label: string;
  group: 'Economic' | 'Demographic' | 'Social' | 'Environment' | 'Governance';
  format: (v: number) => string;
  higherIsBetter: boolean;
  domain?: [number, number]; // fixed domain; auto-computed if omitted
}

function fmtPct(v: number) { return `${v.toFixed(1)}%`; }
function fmtUsd(v: number) { return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`; }
function fmtNum(v: number) { return v.toLocaleString('en-US', { maximumFractionDigits: 1 }); }
function fmtDec(v: number) { return v.toFixed(2); }
function fmtInt(v: number) { return `#${Math.round(v)}`; }
function fmtScore(v: number) { return `${Math.round(v)}/100`; }
function fmtPop(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  return v.toLocaleString();
}

export const METRICS: MetricDef[] = [
  // Economic
  { key: 'gdpPerCap', label: 'GDP per Capita', group: 'Economic', format: fmtUsd, higherIsBetter: true },
  { key: 'gdpGrowth', label: 'GDP Growth', group: 'Economic', format: fmtPct, higherIsBetter: true },
  { key: 'debtPct', label: 'Debt-to-GDP', group: 'Economic', format: fmtPct, higherIsBetter: false },
  { key: 'inflation', label: 'Inflation (CPI)', group: 'Economic', format: fmtPct, higherIsBetter: false },
  { key: 'unemployment', label: 'Unemployment', group: 'Economic', format: fmtPct, higherIsBetter: false },
  { key: 'freedomScore', label: 'Economic Freedom', group: 'Economic', format: fmtScore, higherIsBetter: true, domain: [0, 100] },
  { key: 'cbRate', label: 'Central Bank Rate', group: 'Economic', format: fmtPct, higherIsBetter: false },

  // Demographic
  { key: 'population', label: 'Population', group: 'Demographic', format: fmtPop, higherIsBetter: true },
  { key: 'urbanPct', label: 'Urbanisation', group: 'Demographic', format: fmtPct, higherIsBetter: true },
  { key: 'fertility', label: 'Fertility Rate', group: 'Demographic', format: fmtDec, higherIsBetter: true },
  { key: 'infantMort', label: 'Infant Mortality', group: 'Demographic', format: fmtNum, higherIsBetter: false },
  { key: 'medianAge', label: 'Median Age', group: 'Demographic', format: (v) => `${v.toFixed(1)} yrs`, higherIsBetter: true },
  { key: 'lifeExp', label: 'Life Expectancy', group: 'Demographic', format: (v) => `${v.toFixed(1)} yrs`, higherIsBetter: true },

  // Social
  { key: 'hdi', label: 'Human Development (HDI)', group: 'Social', format: (v) => v.toFixed(3), higherIsBetter: true, domain: [0.4, 1.0] },
  { key: 'giniIndex', label: 'Inequality (Gini)', group: 'Social', format: fmtNum, higherIsBetter: false, domain: [20, 65] },
  { key: 'homicideRate', label: 'Homicide Rate', group: 'Social', format: (v) => `${v.toFixed(1)}/100k`, higherIsBetter: false },

  // Environment
  { key: 'aqi', label: 'Air Quality (AQI)', group: 'Environment', format: (v) => `${Math.round(v)}`, higherIsBetter: false },
  { key: 'co2PerCap', label: 'CO2 per Capita', group: 'Environment', format: (v) => `${v.toFixed(1)}t`, higherIsBetter: false },
  { key: 'forestPct', label: 'Forest Coverage', group: 'Environment', format: fmtPct, higherIsBetter: true },

  // Governance
  { key: 'corruption', label: 'Corruption Index', group: 'Governance', format: fmtScore, higherIsBetter: true, domain: [0, 100] },
  { key: 'peaceRank', label: 'Peace Index', group: 'Governance', format: fmtInt, higherIsBetter: false },
  { key: 'pressRank', label: 'Press Freedom', group: 'Governance', format: fmtInt, higherIsBetter: false },
  { key: 'democracy', label: 'Democracy Score', group: 'Governance', format: (v) => `${v.toFixed(1)}/10`, higherIsBetter: true, domain: [0, 10] },
];

export const METRIC_BY_KEY = Object.fromEntries(METRICS.map((m) => [m.key, m]));
export const METRIC_GROUPS = [...new Set(METRICS.map((m) => m.group))] as const;

export const DEFAULT_METRIC = 'gdpPerCap';
