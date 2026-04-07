/**
 * Trading engine — shared types.
 */

// ── AI Signal Assessment ──────────────────────────────────────────────────────

export interface SignalScore {
  score: number;       // -10 (extremely bearish) to +10 (extremely bullish)
  bias: 'bullish' | 'bearish' | 'neutral';
  key_factor: string;  // one-line summary of dominant signal
}

export type MarketRegime =
  | 'TRENDING_BULLISH'
  | 'TRENDING_BEARISH'
  | 'RANGING'
  | 'VOLATILE';

export type TradeDecision =
  | 'OPEN_LONG'
  | 'OPEN_SHORT'
  | 'CLOSE'
  | 'HOLD'
  | 'FLAT'
  | 'ADJUST';

export interface AIDecision {
  regime: MarketRegime;
  signals: {
    macro: SignalScore;
    structure: SignalScore;
    onchain: SignalScore;
    price_action: SignalScore;
    sentiment: SignalScore;
  };
  confluence: {
    bullish_count: number;
    bearish_count: number;
    neutral_count: number;
  };
  decision: TradeDecision;
  conviction: number;  // 1-10
  reasoning: {
    primary: string;
    supporting: string[];
    risks: string[];
  };
  trade: {
    side: 'long' | 'short';
    margin_pct: number;    // 0.03-0.10
    leverage: number;      // 1-5
    take_profit: number;   // USD price
    stop_loss: number;     // USD price
    tp_rationale: string;
    sl_rationale: string;
  } | null;
  chat_message: string;
}

// ── Data Snapshot ─────────────────────────────────────────────────────────────

export interface TradingSnapshot {
  price: {
    current: number;
    change_24h_pct: number;
    change_7d_pct: number;
    change_30d_pct: number;
    ath: number;
    ath_change_pct: number;
    market_cap_b: number;     // billions
    volume_24h_b: number;     // billions
  };
  macro: {
    fear_greed: number;
    fear_greed_label: string;
    spx_change_pct: number;
    ndx_change_pct: number;
    dji_change_pct: number;
    dxy: number;
    dxy_change_pct: number;
    gold_change_pct: number;
    oil_change_pct: number;
    us10y_change_pct: number;
    fed_rate: number | null;
  };
  structure: {
    funding_rate: number | null;
    btc_equities: Record<string, { change_pct: number }>;
  };
  onchain: {
    hashrate: string | null;
    difficulty: string | null;
    block_height: number | null;
    mempool_fees: string | null;
    mvrv: number | null;
    exchange_net_flow: string | null;
    active_addresses: string | null;
    lightning_capacity_btc: number | null;
  };
  sentiment: {
    whale_tx_count: number;
    whale_total_usd: number;
  };
  pool: {
    balance_sats: number;
    balance_btc: number;
    has_position: boolean;
    position_side: 'long' | 'short' | null;
    entry_price: number | null;
    unrealised_pnl_sats: number;
    leverage: number;
    take_profit: number | null;
    stop_loss: number | null;
    open_trade_lnm_id: string | null;
  };
  recent_decisions: {
    decision: string;
    conviction: number;
    regime: string;
    chat_message: string;
    created_at: string;
  }[];
  timestamp: number;
}

// ── Pool State ────────────────────────────────────────────────────────────────

export interface PoolState {
  balanceSats: number;
  balanceBtc: number;
  hasPosition: boolean;
  positionSide: 'long' | 'short' | null;
  entryPrice: number | null;
  unrealisedPnlSats: number;
  leverage: number;
  takeProfit: number | null;
  stopLoss: number | null;
  openTradeLnmId: string | null;
  /** Raw open positions from LNM v3 (array of trade objects) */
  openPositions?: Record<string, unknown>[];
}

// ── Execution ─────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  success: boolean;
  action: 'opened' | 'closed' | 'adjusted' | 'none';
  tradeId?: string;
  lnmTradeId?: string;
  error?: string;
  details?: Record<string, unknown>;
}

export interface GuardrailResult {
  pass: boolean;
  reason?: string;
}
