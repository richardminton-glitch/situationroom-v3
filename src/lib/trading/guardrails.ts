/**
 * Trading guardrails — risk validation + mechanical overrides.
 *
 * Two layers of protection:
 * 1. Signal-based overrides: mechanical rules based on the AI's own signal scores
 * 2. Risk-based validation: hard limits on leverage, position size, R:R ratio
 *
 * The AI can suggest whatever it wants — guardrails have final say.
 */

import type { AIDecision, PoolState, GuardrailResult } from './types';

// ── Risk limits ───────────────────────────────────────────────────────────────

const MAX_LEVERAGE        = 5;
const MAX_MARGIN_PCT      = 0.10;   // 10% of balance
const MIN_MARGIN_PCT      = 0.01;   // 1% minimum to avoid dust trades
const MIN_REWARD_RISK     = 1.5;    // minimum R:R ratio
const MAX_OPEN_TRADES     = 1;      // one position at a time
const MIN_BALANCE_SATS    = 10_000; // don't trade below 10k sats
const MIN_CONFLUENCE      = 3;      // need 3/5 layers agreeing to open
const VOLATILE_MIN_CONV   = 7;      // higher bar in volatile regime

// ── Main validation ───────────────────────────────────────────────────────────

export function validateDecision(
  decision: AIDecision,
  pool: PoolState,
  btcPrice: number,
  openTradeCount: number,
): GuardrailResult {
  const d = decision.decision;

  // ── Non-trade decisions always pass ──
  if (d === 'HOLD' || d === 'FLAT') {
    return { pass: true };
  }

  // ── CLOSE is always allowed (risk reduction) ──
  if (d === 'CLOSE') {
    if (!pool.hasPosition) {
      return { pass: false, reason: 'CLOSE requested but no open position' };
    }
    return { pass: true };
  }

  // ── ADJUST — just validate TP/SL makes sense ──
  if (d === 'ADJUST') {
    if (!pool.hasPosition) {
      return { pass: false, reason: 'ADJUST requested but no open position' };
    }
    // Allow adjustments — the new levels will be validated by the executor
    return { pass: true };
  }

  // ── OPEN_LONG / OPEN_SHORT — full validation ──

  if (!decision.trade) {
    return { pass: false, reason: 'Trade decision without trade parameters' };
  }

  const t = decision.trade;

  // 1. Don't open if already in a position
  if (openTradeCount >= MAX_OPEN_TRADES) {
    return { pass: false, reason: `Already have ${openTradeCount} open trade(s), max is ${MAX_OPEN_TRADES}` };
  }

  // 2. Balance check
  if (pool.balanceSats < MIN_BALANCE_SATS) {
    return { pass: false, reason: `Pool balance ${pool.balanceSats} sats below minimum ${MIN_BALANCE_SATS}` };
  }

  // 3. Leverage check
  if (t.leverage < 1 || t.leverage > MAX_LEVERAGE) {
    return { pass: false, reason: `Leverage ${t.leverage}x outside range [1, ${MAX_LEVERAGE}]` };
  }

  // 4. Margin check
  if (t.margin_pct < MIN_MARGIN_PCT || t.margin_pct > MAX_MARGIN_PCT) {
    return { pass: false, reason: `Margin ${(t.margin_pct * 100).toFixed(1)}% outside range [${MIN_MARGIN_PCT * 100}%, ${MAX_MARGIN_PCT * 100}%]` };
  }

  // 5. SL/TP required
  if (!t.stop_loss || t.stop_loss <= 0) {
    return { pass: false, reason: 'Stop-loss is required' };
  }
  if (!t.take_profit || t.take_profit <= 0) {
    return { pass: false, reason: 'Take-profit is required' };
  }

  // 6. SL/TP sanity for direction
  if (d === 'OPEN_LONG') {
    if (t.stop_loss >= btcPrice) {
      return { pass: false, reason: `Long SL ($${t.stop_loss}) must be below current price ($${btcPrice})` };
    }
    if (t.take_profit <= btcPrice) {
      return { pass: false, reason: `Long TP ($${t.take_profit}) must be above current price ($${btcPrice})` };
    }
  }
  if (d === 'OPEN_SHORT') {
    if (t.stop_loss <= btcPrice) {
      return { pass: false, reason: `Short SL ($${t.stop_loss}) must be above current price ($${btcPrice})` };
    }
    if (t.take_profit >= btcPrice) {
      return { pass: false, reason: `Short TP ($${t.take_profit}) must be below current price ($${btcPrice})` };
    }
  }

  // 7. Reward:Risk ratio
  const risk   = Math.abs(btcPrice - t.stop_loss);
  const reward = Math.abs(t.take_profit - btcPrice);
  if (risk === 0) {
    return { pass: false, reason: 'Stop-loss is at current price (zero risk)' };
  }
  const rr = reward / risk;
  if (rr < MIN_REWARD_RISK) {
    return { pass: false, reason: `R:R ratio ${rr.toFixed(2)} below minimum ${MIN_REWARD_RISK}` };
  }

  // 8. Max risk per trade (margin that could be lost via SL)
  const marginSats = Math.round(pool.balanceSats * t.margin_pct);
  const slPct = (risk / btcPrice) * t.leverage;  // % of margin at risk
  const riskSats = Math.round(marginSats * slPct);
  const maxRiskSats = Math.round(pool.balanceSats * 0.05); // 5% of balance
  if (riskSats > maxRiskSats) {
    return { pass: false, reason: `Risk ${riskSats} sats exceeds 5% max (${maxRiskSats} sats)` };
  }

  // ── Signal-based mechanical overrides ──

  // 9. Confluence check: need MIN_CONFLUENCE layers agreeing
  const dirBias = d === 'OPEN_LONG' ? 'bullish' : 'bearish';
  const agreeCount = dirBias === 'bullish'
    ? decision.confluence.bullish_count
    : decision.confluence.bearish_count;

  if (agreeCount < MIN_CONFLUENCE) {
    return {
      pass: false,
      reason: `Only ${agreeCount}/5 layers ${dirBias} — need at least ${MIN_CONFLUENCE} for confluence`,
    };
  }

  // 10. Volatile regime needs higher conviction
  if (decision.regime === 'VOLATILE' && decision.conviction < VOLATILE_MIN_CONV) {
    return {
      pass: false,
      reason: `Conviction ${decision.conviction}/10 too low for VOLATILE regime (need ${VOLATILE_MIN_CONV}+)`,
    };
  }

  // 11. Direction must match regime
  if (d === 'OPEN_LONG' && decision.regime === 'TRENDING_BEARISH') {
    return { pass: false, reason: 'Cannot open LONG in TRENDING_BEARISH regime' };
  }
  if (d === 'OPEN_SHORT' && decision.regime === 'TRENDING_BULLISH') {
    return { pass: false, reason: 'Cannot open SHORT in TRENDING_BULLISH regime' };
  }

  return { pass: true };
}
