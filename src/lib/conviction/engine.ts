/**
 * Conviction Score Engine — 5-signal weighted composite.
 *
 * Signals (V3 weights per spec):
 *   1. Price Momentum (25%) — 30d change + trend analysis
 *   2. On-Chain Health (25%) — MVRV, exchange flows
 *   3. Macro Environment (20%) — DXY, yields, monetary policy
 *   4. Network Fundamentals (15%) — Hashrate trend, difficulty
 *   5. Sentiment (15%) — Fear & Greed (contrarian)
 */

export interface SignalResult {
  name: string;
  key: string;
  score: number;       // 0–100
  weight: number;      // decimal (e.g. 0.25)
  interpretation: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  rawValue: number;
  rawLabel: string;
}

export interface ConvictionResult {
  composite: number;   // 0–100
  band: string;
  bandColor: string;
  signals: SignalResult[];
  signalsAvailable: number;
  signalsTotal: number;
  calculatedAt: string;
}

// ── Signal 1: Sentiment (Fear & Greed — Contrarian) ──

function scoreSentiment(fearGreed: number | null): SignalResult | null {
  if (fearGreed === null) return null;

  let score: number;
  let interpretation: string;
  let direction: 'bullish' | 'bearish' | 'neutral';

  if (fearGreed <= 15) { score = 92; interpretation = 'Extreme fear — historically strong accumulation zone'; direction = 'bullish'; }
  else if (fearGreed <= 30) { score = 78; interpretation = 'Fear — favourable conditions for entry'; direction = 'bullish'; }
  else if (fearGreed <= 45) { score = 62; interpretation = 'Mild fear — cautiously constructive'; direction = 'bullish'; }
  else if (fearGreed <= 55) { score = 50; interpretation = 'Neutral — wait for directional signal'; direction = 'neutral'; }
  else if (fearGreed <= 70) { score = 35; interpretation = 'Greed — elevated risk, reduce aggression'; direction = 'bearish'; }
  else if (fearGreed <= 85) { score = 20; interpretation = 'Greed — caution warranted'; direction = 'bearish'; }
  else { score = 8; interpretation = 'Extreme greed — unfavourable'; direction = 'bearish'; }

  return {
    name: 'Sentiment', key: 'sentiment', score, weight: 0.15,
    interpretation, direction, rawValue: fearGreed, rawLabel: `F&G: ${fearGreed}`,
  };
}

// ── Signal 2: Price Momentum (30-Day Change) ──

function scoreMomentum(change30d: number | null): SignalResult | null {
  if (change30d === null) return null;

  let score: number;
  let interpretation: string;
  let direction: 'bullish' | 'bearish' | 'neutral';

  if (change30d < -40) { score = 78; interpretation = 'Capitulation — historically strong medium-term entry'; direction = 'bullish'; }
  else if (change30d < -20) { score = 68; interpretation = 'Significant drawdown — potential opportunity forming'; direction = 'bullish'; }
  else if (change30d < -5) { score = 72; interpretation = 'Mild pullback — improving conditions'; direction = 'bullish'; }
  else if (change30d <= 15) { score = 82; interpretation = 'Steady positive momentum — ideal zone'; direction = 'bullish'; }
  else if (change30d <= 35) { score = 60; interpretation = 'Strong rally — watch for overextension'; direction = 'neutral'; }
  else if (change30d <= 60) { score = 35; interpretation = 'Rapid advance — overextension risk elevated'; direction = 'bearish'; }
  else { score = 15; interpretation = 'Parabolic move — extreme caution'; direction = 'bearish'; }

  return {
    name: 'Price Momentum', key: 'momentum', score, weight: 0.25,
    interpretation, direction, rawValue: change30d, rawLabel: `30d: ${change30d >= 0 ? '+' : ''}${change30d.toFixed(1)}%`,
  };
}

// ── Signal 3: On-Chain Health (MVRV + Exchange Flows) ──

function scoreOnChain(mvrv: number | null, athChangePct: number | null): SignalResult | null {
  // Use ATH distance as valuation proxy (same as V2) combined with MVRV
  if (mvrv === null && athChangePct === null) return null;

  let score = 50;
  let interpretation = 'Mixed on-chain signals';
  let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';

  // MVRV component (50% of signal)
  let mvrvScore = 50;
  if (mvrv !== null) {
    if (mvrv < 1.0) { mvrvScore = 85; }
    else if (mvrv < 1.5) { mvrvScore = 70; }
    else if (mvrv < 2.5) { mvrvScore = 55; }
    else if (mvrv < 3.5) { mvrvScore = 35; }
    else { mvrvScore = 15; }
  }

  // ATH distance component (50% of signal)
  let athScore = 50;
  if (athChangePct !== null) {
    const pctBelow = Math.abs(athChangePct);
    if (pctBelow < 5) { athScore = 18; }
    else if (pctBelow < 20) { athScore = 30; }
    else if (pctBelow < 40) { athScore = 55; }
    else if (pctBelow < 60) { athScore = 75; }
    else if (pctBelow < 75) { athScore = 88; }
    else { athScore = 95; }
  }

  score = Math.round((mvrvScore + athScore) / 2);

  if (score >= 65) { interpretation = 'Favourable on-chain valuation — accumulation zone'; direction = 'bullish'; }
  else if (score >= 45) { interpretation = 'Neutral on-chain positioning'; direction = 'neutral'; }
  else { interpretation = 'Overheated on-chain metrics — caution warranted'; direction = 'bearish'; }

  return {
    name: 'On-Chain Health', key: 'onchain', score, weight: 0.25,
    interpretation, direction,
    rawValue: mvrv ?? 0,
    rawLabel: `MVRV: ${mvrv?.toFixed(2) ?? 'N/A'} | ATH: ${athChangePct?.toFixed(1) ?? 'N/A'}%`,
  };
}

// ── Signal 4: Macro Environment (Fed Rate) ──

function scoreMacro(fedRate: number | null): SignalResult | null {
  if (fedRate === null) return null;

  let score: number;
  let interpretation: string;
  let direction: 'bullish' | 'bearish' | 'neutral';

  if (fedRate <= 0.5) { score = 92; interpretation = 'Zero rates — maximum monetary tailwind for hard assets'; direction = 'bullish'; }
  else if (fedRate <= 1.5) { score = 80; interpretation = 'Accommodative policy — strong tailwind'; direction = 'bullish'; }
  else if (fedRate <= 2.5) { score = 65; interpretation = 'Mild tightening — moderate headwind'; direction = 'neutral'; }
  else if (fedRate <= 3.5) { score = 48; interpretation = 'Restrictive policy — meaningful headwind'; direction = 'bearish'; }
  else if (fedRate <= 4.5) { score = 32; interpretation = 'Tight policy — significant headwind'; direction = 'bearish'; }
  else if (fedRate <= 5.5) { score = 20; interpretation = 'Highly restrictive — strong headwind'; direction = 'bearish'; }
  else { score = 10; interpretation = 'Extreme tightening — maximum monetary headwind'; direction = 'bearish'; }

  return {
    name: 'Macro Environment', key: 'macro', score, weight: 0.20,
    interpretation, direction, rawValue: fedRate, rawLabel: `Fed: ${fedRate.toFixed(2)}%`,
  };
}

// ── Signal 5: Network Fundamentals (Hashrate Ratio) ──

function scoreNetwork(hashrateRatio: number | null): SignalResult | null {
  if (hashrateRatio === null) return null;

  let score: number;
  let interpretation: string;
  let direction: 'bullish' | 'bearish' | 'neutral';

  if (hashrateRatio >= 1.15) { score = 90; interpretation = 'Hashrate at cycle highs — miner conviction elevated'; direction = 'bullish'; }
  else if (hashrateRatio >= 1.0) { score = 75; interpretation = 'Hashrate above 90d average — network healthy'; direction = 'bullish'; }
  else if (hashrateRatio >= 0.88) { score = 58; interpretation = 'Hashrate near trend — neutral signal'; direction = 'neutral'; }
  else if (hashrateRatio >= 0.75) { score = 38; interpretation = 'Hashrate below trend — miner stress emerging'; direction = 'bearish'; }
  else { score = 20; interpretation = 'Hashrate significantly depressed — capitulation risk'; direction = 'bearish'; }

  return {
    name: 'Network Fundamentals', key: 'network', score, weight: 0.15,
    interpretation, direction, rawValue: hashrateRatio, rawLabel: `HR ratio: ${hashrateRatio.toFixed(2)}x`,
  };
}

// ── Composite ──

function getBand(score: number): { band: string; color: string } {
  if (score >= 80) return { band: 'Maximum Conviction', color: '#2a6e2a' };  // forest green
  if (score >= 65) return { band: 'Strong Conviction', color: '#4a7c59' };   // muted green
  if (score >= 50) return { band: 'Moderate', color: '#b8860b' };            // dark goldenrod
  if (score >= 35) return { band: 'Weak Signal', color: '#c85a2d' };         // burnt orange
  return { band: 'Contra-Conviction', color: '#8b2020' };                    // firebrick
}

export interface ConvictionInputs {
  fearGreed: number | null;
  change30d: number | null;
  mvrv: number | null;
  athChangePct: number | null;
  fedRate: number | null;
  hashrateRatio: number | null;
}

export function calculateConviction(inputs: ConvictionInputs): ConvictionResult {
  const allSignals = [
    scoreSentiment(inputs.fearGreed),
    scoreMomentum(inputs.change30d),
    scoreOnChain(inputs.mvrv, inputs.athChangePct),
    scoreMacro(inputs.fedRate),
    scoreNetwork(inputs.hashrateRatio),
  ];

  const signals = allSignals.filter((s): s is SignalResult => s !== null);
  const totalWeight = signals.reduce((s, sig) => s + sig.weight, 0);
  const weightedSum = signals.reduce((s, sig) => s + sig.score * sig.weight, 0);
  const composite = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
  const { band, color } = getBand(composite);

  return {
    composite,
    band,
    bandColor: color,
    signals,
    signalsAvailable: signals.length,
    signalsTotal: 5,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Apply user overrides — recalculate with user-modified signal scores.
 */
export function calculateWithOverrides(
  base: ConvictionResult,
  overrides: Record<string, number>
): ConvictionResult {
  const signals = base.signals.map((sig) => ({
    ...sig,
    score: overrides[sig.key] !== undefined ? overrides[sig.key] : sig.score,
  }));

  const totalWeight = signals.reduce((s, sig) => s + sig.weight, 0);
  const weightedSum = signals.reduce((s, sig) => s + sig.score * sig.weight, 0);
  const composite = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
  const { band, color } = getBand(composite);

  return { ...base, composite, band, bandColor: color, signals };
}
