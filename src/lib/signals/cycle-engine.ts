/**
 * Cycle Position Engine — 5-signal weighted composite.
 *
 * Signals:
 *   1. MVRV Ratio              (25%) — market-to-realised value
 *   2. Realised Price Position (20%) — price / realised price ratio
 *   3. Puell Multiple          (20%) — miner revenue vs 365d average
 *   4. Pi Cycle Ratio          (20%) — 111d SMA / (2 × 350d SMA)
 *   5. Rainbow Band            (15%) — logarithmic regression band 1–9
 */

export interface CycleIndicatorResult {
  name: string;
  key: string;
  score: number;         // 0–100 (100 = deep bear / max value)
  weight: number;        // decimal weight
  direction: 'bullish' | 'bearish' | 'neutral';
  zone: string;          // human label for the zone
  rawValue: number;
  rawLabel: string;
  interpretation: string;
}

export interface ConfidenceBand {
  level: 'High' | 'Moderate' | 'Low / Mixed';
  agreementCount: number;
  dominantDirection: 'bullish' | 'bearish' | 'neutral';
}

export interface CycleCompositeResult {
  composite: number;     // 0–100
  phase: string;
  phaseColor: string;
  indicators: CycleIndicatorResult[];
  confidence: ConfidenceBand;
  calculatedAt: string;
}

export interface CycleEngineInputs {
  mvrv: number | null;
  realisedPriceRatio: number | null;   // btcPrice / realisedPrice
  puellMultiple: number | null;
  piCycleRatio: number | null;         // 111d SMA / (2 × 350d SMA)
  rainbowBand: number | null;          // 1–9 integer
}

// ── Phase map ─────────────────────────────────────────────────────────────────

interface Phase {
  label: string;
  color: string;
}

function getPhase(score: number): Phase {
  if (score >= 88) return { label: 'Distribution', color: '#c04040' };
  if (score >= 75) return { label: 'Late Bull',    color: '#1a9e78' };
  if (score >= 60) return { label: 'Mid Bull',     color: '#2e8b57' };
  if (score >= 45) return { label: 'Early Bull',   color: '#5a8a5a' };
  if (score >= 30) return { label: 'Mid Accumulation', color: '#b8860b' };
  if (score >= 15) return { label: 'Early Accumulation', color: '#c85a2d' };
  return { label: 'Deep Bear', color: '#8b2020' };
}

// ── Signal 1: MVRV ────────────────────────────────────────────────────────────

function scoreMvrv(mvrv: number | null): CycleIndicatorResult | null {
  if (mvrv === null || mvrv <= 0) return null;

  let score: number;
  let zone: string;
  let direction: 'bullish' | 'bearish' | 'neutral';
  let interpretation: string;

  if (mvrv < 1.0) {
    score = 95; zone = 'Deep Value'; direction = 'bullish';
    interpretation = 'Below realised price — historically strongest accumulation zone';
  } else if (mvrv < 1.5) {
    score = 80; zone = 'Undervalued'; direction = 'bullish';
    interpretation = 'Undervalued relative to cost basis — favourable entry conditions';
  } else if (mvrv < 2.5) {
    score = 55; zone = 'Fair Value'; direction = 'neutral';
    interpretation = 'Fair value range — neutral cycle positioning';
  } else if (mvrv < 3.5) {
    score = 30; zone = 'Elevated'; direction = 'bearish';
    interpretation = 'Elevated above cost basis — late-cycle caution warranted';
  } else {
    score = 10; zone = 'Overheated'; direction = 'bearish';
    interpretation = 'Significantly overheated — historically high distribution risk';
  }

  return {
    name: 'MVRV Ratio', key: 'mvrv', score, weight: 0.25,
    direction, zone, rawValue: mvrv, rawLabel: `MVRV: ${mvrv.toFixed(2)}`,
    interpretation,
  };
}

// ── Signal 2: Realised Price Position ────────────────────────────────────────

function scoreRealisedPrice(ratio: number | null): CycleIndicatorResult | null {
  if (ratio === null || ratio <= 0) return null;

  let score: number;
  let zone: string;
  let direction: 'bullish' | 'bearish' | 'neutral';
  let interpretation: string;

  if (ratio < 0.8) {
    score = 98; zone = 'Below Cost Basis'; direction = 'bullish';
    interpretation = 'Price below network average cost basis — extreme value zone';
  } else if (ratio < 1.0) {
    score = 85; zone = 'Near Cost Basis'; direction = 'bullish';
    interpretation = 'Trading near aggregate cost basis — historically strong accumulation';
  } else if (ratio < 1.5) {
    score = 60; zone = 'Moderate Premium'; direction = 'neutral';
    interpretation = 'Modest premium above cost basis — early recovery territory';
  } else if (ratio < 2.5) {
    score = 35; zone = 'High Premium'; direction = 'bearish';
    interpretation = 'Significant premium — late-cycle behaviour emerging';
  } else {
    score = 12; zone = 'Extreme Premium'; direction = 'bearish';
    interpretation = 'Extreme premium above cost basis — historical distribution zone';
  }

  return {
    name: 'Realised Price', key: 'realised', score, weight: 0.20,
    direction, zone, rawValue: ratio, rawLabel: `P/RP: ${ratio.toFixed(2)}x`,
    interpretation,
  };
}

// ── Signal 3: Puell Multiple ──────────────────────────────────────────────────

function scorePuell(puell: number | null): CycleIndicatorResult | null {
  if (puell === null || puell <= 0) return null;

  let score: number;
  let zone: string;
  let direction: 'bullish' | 'bearish' | 'neutral';
  let interpretation: string;

  if (puell < 0.5) {
    score = 95; zone = 'Capitulation'; direction = 'bullish';
    interpretation = 'Miner revenue far below average — deep bear, historically strongest buy zone';
  } else if (puell < 1.0) {
    score = 75; zone = 'Undervalue'; direction = 'bullish';
    interpretation = 'Below-average miner revenue — favourable accumulation conditions';
  } else if (puell < 2.0) {
    score = 50; zone = 'Normal'; direction = 'neutral';
    interpretation = 'Normal miner revenue range — neutral cycle signal';
  } else if (puell < 4.0) {
    score = 25; zone = 'Elevated'; direction = 'bearish';
    interpretation = 'Elevated miner revenue — late-cycle conditions developing';
  } else {
    score = 8; zone = 'Extreme High'; direction = 'bearish';
    interpretation = 'Extreme miner revenue — historically top territory';
  }

  return {
    name: 'Puell Multiple', key: 'puell', score, weight: 0.20,
    direction, zone, rawValue: puell, rawLabel: `Puell: ${puell.toFixed(3)}`,
    interpretation,
  };
}

// ── Signal 4: Pi Cycle ────────────────────────────────────────────────────────

function scorePiCycle(ratio: number | null): CycleIndicatorResult | null {
  if (ratio === null || ratio <= 0) return null;

  let score: number;
  let zone: string;
  let direction: 'bullish' | 'bearish' | 'neutral';
  let interpretation: string;

  if (ratio < 0.60) {
    score = 90; zone = 'Deep Accumulation'; direction = 'bullish';
    interpretation = '111d MA far below 350d MA × 2 — deep accumulation, far from cycle top';
  } else if (ratio < 0.75) {
    score = 70; zone = 'Building Up'; direction = 'bullish';
    interpretation = 'Moving averages building — early-to-mid bull market territory';
  } else if (ratio < 0.90) {
    score = 50; zone = 'Approaching'; direction = 'neutral';
    interpretation = 'MAs converging — mid-cycle, monitoring for top signal';
  } else if (ratio < 1.00) {
    score = 25; zone = 'Near Top Signal'; direction = 'bearish';
    interpretation = 'Approaching Pi Cycle crossover — late-cycle risk elevated';
  } else {
    score = 5; zone = 'Top Signal Crossed'; direction = 'bearish';
    interpretation = 'Pi Cycle cross has occurred — historically marks major cycle tops';
  }

  return {
    name: 'Pi Cycle', key: 'picycle', score, weight: 0.20,
    direction, zone, rawValue: ratio, rawLabel: `Pi ratio: ${ratio.toFixed(3)}`,
    interpretation,
  };
}

// ── Signal 5: Rainbow Band ────────────────────────────────────────────────────

const RAINBOW_BANDS: { maxRatio: number; zone: string; direction: 'bullish' | 'bearish' | 'neutral'; score: number; interpretation: string }[] = [
  { maxRatio: 0.20, zone: 'Fire Sale',          direction: 'bullish', score: 97, interpretation: 'Extreme undervaluation vs long-term regression — rare buying opportunity' },
  { maxRatio: 0.40, zone: 'BUY!',               direction: 'bullish', score: 88, interpretation: 'Deep value relative to power-law trend — strong accumulation zone' },
  { maxRatio: 0.70, zone: 'Accumulate',         direction: 'bullish', score: 75, interpretation: 'Below-trend valuation — favourable accumulation territory' },
  { maxRatio: 1.10, zone: 'Still Cheap',        direction: 'neutral', score: 58, interpretation: 'Near the long-term regression line — fair value zone' },
  { maxRatio: 1.80, zone: 'Hold',               direction: 'neutral', score: 45, interpretation: 'Moderate premium above trend — hold / cautious accumulation' },
  { maxRatio: 3.00, zone: 'Is This a Bubble?',  direction: 'bearish', score: 30, interpretation: 'Significant premium — bubble territory beginning to form' },
  { maxRatio: 5.00, zone: 'FOMO Intensifies',   direction: 'bearish', score: 18, interpretation: 'Well above trend — speculative excess' },
  { maxRatio: 8.00, zone: 'Sell!',              direction: 'bearish', score: 10, interpretation: 'Far above trend — historically high risk of major correction' },
  { maxRatio: Infinity, zone: 'Maximum Bubble', direction: 'bearish', score: 5, interpretation: 'Extreme overvaluation vs power-law — maximum bubble territory' },
];

function scoreRainbow(band: number | null): CycleIndicatorResult | null {
  if (band === null || band < 1 || band > 9) return null;
  const idx = Math.min(Math.max(Math.round(band) - 1, 0), 8);
  const b = RAINBOW_BANDS[idx];
  return {
    name: 'Rainbow Band', key: 'rainbow', score: b.score, weight: 0.15,
    direction: b.direction, zone: b.zone,
    rawValue: band, rawLabel: `Band ${band}: ${b.zone}`,
    interpretation: b.interpretation,
  };
}

// ── Confidence Band ───────────────────────────────────────────────────────────

function computeConfidence(indicators: CycleIndicatorResult[]): ConfidenceBand {
  const counts = { bullish: 0, bearish: 0, neutral: 0 };
  for (const ind of indicators) counts[ind.direction]++;

  const dominant = (Object.entries(counts) as [string, number][])
    .sort((a, b) => b[1] - a[1])[0];
  const dominantDirection = dominant[0] as 'bullish' | 'bearish' | 'neutral';
  const agreementCount = dominant[1];

  let level: ConfidenceBand['level'];
  if (agreementCount >= 4) level = 'High';
  else if (agreementCount >= 3) level = 'Moderate';
  else level = 'Low / Mixed';

  return { level, agreementCount, dominantDirection };
}

// ── Composite ─────────────────────────────────────────────────────────────────

export function calculateCycleComposite(inputs: CycleEngineInputs): CycleCompositeResult {
  const allSignals = [
    scoreMvrv(inputs.mvrv),
    scoreRealisedPrice(inputs.realisedPriceRatio),
    scorePuell(inputs.puellMultiple),
    scorePiCycle(inputs.piCycleRatio),
    scoreRainbow(inputs.rainbowBand),
  ];

  const indicators = allSignals.filter((s): s is CycleIndicatorResult => s !== null);
  const totalWeight = indicators.reduce((s, i) => s + i.weight, 0);
  const weightedSum = indicators.reduce((s, i) => s + i.score * i.weight, 0);

  // Normalise against available weight (handles missing signals gracefully)
  const composite = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
  const { label: phase, color: phaseColor } = getPhase(composite);
  const confidence = computeConfidence(indicators);

  return {
    composite,
    phase,
    phaseColor,
    indicators,
    confidence,
    calculatedAt: new Date().toISOString(),
  };
}

// ── Pi Cycle Utility ──────────────────────────────────────────────────────────

export interface DayPrice {
  date: string;
  price: number;
}

/**
 * Compute Pi Cycle ratio: 111d SMA / (2 × 350d SMA).
 * Returns null if fewer than 350 prices are provided.
 */
export function computePiCycleRatio(prices: DayPrice[]): number | null {
  if (prices.length < 350) return null;

  const len = prices.length;
  const sma111 = prices.slice(len - 111).reduce((s, p) => s + p.price, 0) / 111;
  const sma350 = prices.slice(len - 350).reduce((s, p) => s + p.price, 0) / 350;

  if (sma350 === 0) return null;
  return sma111 / (2 * sma350);
}

// ── Rainbow Chart Utility ─────────────────────────────────────────────────────

/**
 * Power-law regression formula calibrated to Bitcoin price history.
 *
 * Formula: regression = e^(A × ln(daysSinceGenesis) + B)
 * Constants verified against known cycle tops/bottoms:
 *   - 2020 COVID low (~$3.8k, day 4018): ratio ≈ 0.16 → Fire Sale ✓
 *   - 2021 ATH (~$69k, day 4694): ratio ≈ 1.92 → "Is This a Bubble?" ✓
 *   - 2022 bear low (~$15k, day 4748): ratio ≈ 0.41 → Accumulate ✓
 */
const RAINBOW_GENESIS = new Date('2009-01-03T00:00:00Z').getTime();
const RAINBOW_A = 2.66;
const RAINBOW_B = -12.0;

export function computeRainbowBand(btcPrice: number): number {
  const daysSinceGenesis = (Date.now() - RAINBOW_GENESIS) / 86_400_000;
  if (daysSinceGenesis <= 0) return 5;

  const regression = Math.exp(RAINBOW_A * Math.log(daysSinceGenesis) + RAINBOW_B);
  const ratio = btcPrice / regression;

  for (let i = 0; i < RAINBOW_BANDS.length; i++) {
    if (ratio < RAINBOW_BANDS[i].maxRatio) return i + 1;
  }
  return 9;
}
