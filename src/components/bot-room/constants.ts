/**
 * Bot Room — shared constants, design tokens, topology data, and mock state.
 * All colours/tokens mirror the BOT-ROOM-SPEC design system.
 */

// ── Design tokens ──────────────────────────────────────────────────────────────
export const C = {
  bgPrimary:   '#060a0d',
  bgElevated:  '#080e14',
  bgOverlay:   '#0d1e28',
  teal:        '#00d4aa',
  coral:       '#ff6b4a',
  btcOrange:   '#f7931a',
  gold:        '#ffd700',
  textPrimary: '#e8edf2',
  textMuted:   '#8494a7',
  textDim:     '#5e7080',
  border:      '#0d1e28',
  borderSoft:  '#1a2e3a',
};

export const HM = {
  posStrong: '#00d4aa14',
  pos:       '#00d4aa07',
  flat:      '#090f14',
  neg:       '#ff6b4a07',
  negStrong: '#ff6b4a14',
  btc:       '#f7931a0a',
  gold:      '#ffd7000a',
};

export const FONT = "'Courier New', Courier, monospace";

// ── Topology ───────────────────────────────────────────────────────────────────
export interface TopoNode {
  id: string;
  label: string;
  color: string;
  ring: 'center' | 'inner' | 'outer';
  angle: number;   // degrees from top
  baseR: number;   // px
}

export interface TopoEdge {
  from: number;
  to: number;
  correlation: number; // -1 → 1
}

export const TOPO_NODES: TopoNode[] = [
  // Centre
  { id: 'BTC',  label: 'BTC',  color: C.btcOrange, ring: 'center', angle: 0,   baseR: 8 },
  // Inner ring — 5 nodes
  { id: 'MSTR', label: 'MSTR', color: C.btcOrange, ring: 'inner',  angle: 0,   baseR: 5 },
  { id: 'COIN', label: 'COIN', color: C.btcOrange, ring: 'inner',  angle: 72,  baseR: 5 },
  { id: 'SPX',  label: 'SPX',  color: C.teal,      ring: 'inner',  angle: 144, baseR: 5 },
  { id: 'GOLD', label: 'GOLD', color: C.gold,      ring: 'inner',  angle: 216, baseR: 5 },
  { id: 'DXY',  label: 'DXY',  color: C.coral,     ring: 'inner',  angle: 288, baseR: 5 },
  // Outer ring — 8 nodes, offset 18° from inner
  { id: 'NVDA', label: 'NVDA', color: C.teal,      ring: 'outer',  angle: 18,  baseR: 4 },
  { id: 'NDX',  label: 'NDX',  color: C.teal,      ring: 'outer',  angle: 63,  baseR: 4 },
  { id: '10Y',  label: '10Y',  color: C.coral,     ring: 'outer',  angle: 108, baseR: 4 },
  { id: 'EUR',  label: 'EUR',  color: C.teal,      ring: 'outer',  angle: 153, baseR: 4 },
  { id: 'TSLA', label: 'TSLA', color: C.coral,     ring: 'outer',  angle: 198, baseR: 4 },
  { id: 'OIL',  label: 'OIL',  color: C.coral,     ring: 'outer',  angle: 243, baseR: 4 },
  { id: 'JPY',  label: 'JPY',  color: C.teal,      ring: 'outer',  angle: 288, baseR: 4 },
  { id: 'NGAS', label: 'NGAS', color: C.teal,      ring: 'outer',  angle: 333, baseR: 4 },
];

export const TOPO_EDGES: TopoEdge[] = [
  { from: 0, to: 1,  correlation:  0.92 },  // BTC  → MSTR
  { from: 0, to: 2,  correlation:  0.70 },  // BTC  → COIN
  { from: 0, to: 3,  correlation:  0.42 },  // BTC  → SPX
  { from: 0, to: 4,  correlation: -0.18 },  // BTC  → GOLD
  { from: 0, to: 5,  correlation: -0.65 },  // BTC  → DXY
  { from: 0, to: 6,  correlation:  0.38 },  // BTC  → NVDA
  { from: 0, to: 8,  correlation: -0.40 },  // BTC  → 10Y
  { from: 0, to: 9,  correlation:  0.50 },  // BTC  → EUR
  { from: 1, to: 6,  correlation:  0.55 },  // MSTR → NVDA
  { from: 3, to: 6,  correlation:  0.78 },  // SPX  → NVDA
  { from: 3, to: 8,  correlation: -0.52 },  // SPX  → 10Y
  { from: 5, to: 9,  correlation: -0.88 },  // DXY  → EUR
  { from: 4, to: 11, correlation:  0.30 },  // GOLD → OIL
  { from: 2, to: 1,  correlation:  0.80 },  // COIN → MSTR
];

// ── Bot state ──────────────────────────────────────────────────────────────────
export interface BotState {
  poolBalance: number;
  position: 'LONG' | 'SHORT' | 'FLAT';
  leverage: number;
  entryPrice: number | null;
  unrealisedPnl: number;    // sats
  tradeCount: number;
  winRate: number;           // 0–1
  streak: number;            // positive = wins, negative = losses
  lastTradePnl: number;     // sats
}

export const MOCK_BOT_STATE: BotState = {
  poolBalance: 0.08430,
  position: 'LONG',
  leverage: 3,
  entryPrice: 66791.50,
  unrealisedPnl: 34,
  tradeCount: 12,
  winRate: 0.667,
  streak: 3,
  lastTradePnl: 12,
};

// ── Chat messages ──────────────────────────────────────────────────────────────
export interface BotMessage {
  id: string;
  timestamp: number;
  author: string;
  content: string;
}

export const MOCK_MESSAGES: BotMessage[] = [
  { id: '1', timestamp: Date.now() - 7200_000, author: 'SitRoom AI', content: '‖ SCANNING — All signals nominal. Fear & Greed at 11, extreme fear zone. Watching for entry setup.' },
  { id: '2', timestamp: Date.now() - 5400_000, author: 'SitRoom AI', content: '‖ OPENED LONG 3× @ $66,791.50 | Conv. 7/10 — BTC broke 50-day MA with volume. Contrarian buy signal confirmed.' },
  { id: '3', timestamp: Date.now() - 3600_000, author: 'SitRoom AI', content: '‖ HOLDING LONG 3× @ $66,791.50 | P&L: +12 sats | Conv. 6/10 — Price consolidating above entry. Support at $66,500.' },
  { id: '4', timestamp: Date.now() - 1800_000, author: 'SitRoom AI', content: '‖ HOLDING LONG 3× @ $66,791.50 | P&L: +34 sats | Conv. 7/10 TP: $67,200 — Momentum building. RSI 52, room to run.' },
  { id: '5', timestamp: Date.now() -  600_000, author: 'SitRoom AI', content: '‖ ALERT — DXY weakening (-0.3%). Positive for BTC correlation thesis. Maintaining position.' },
];

// ── Heatmap tickers ────────────────────────────────────────────────────────────
export interface HeatmapTick {
  ticker: string;
  change: number;    // decimal, e.g. 0.0023 = +0.23 %
  type: 'btc' | 'gold' | 'standard';
}

export const HEATMAP_ROW1: HeatmapTick[] = [
  { ticker: 'BTC',  change:  0.0023, type: 'btc' },
  { ticker: 'MSTR', change:  0.0045, type: 'btc' },
  { ticker: 'COIN', change: -0.0012, type: 'btc' },
  { ticker: 'NDX',  change:  0.0008, type: 'standard' },
  { ticker: 'SPX',  change:  0.0003, type: 'standard' },
  { ticker: 'NVDA', change:  0.0031, type: 'standard' },
  { ticker: 'MSFT', change:  0.0006, type: 'standard' },
  { ticker: 'AAPL', change: -0.0002, type: 'standard' },
  { ticker: 'GOOG', change:  0.0011, type: 'standard' },
  { ticker: 'AMZN', change:  0.0019, type: 'standard' },
  { ticker: 'TSLA', change: -0.0038, type: 'standard' },
  { ticker: 'META', change:  0.0007, type: 'standard' },
  { ticker: 'PLTR', change:  0.0055, type: 'standard' },
  { ticker: 'AMD',  change: -0.0009, type: 'standard' },
  { ticker: 'RIOT', change:  0.0067, type: 'btc' },
  { ticker: 'LMT',  change:  0.0001, type: 'standard' },
  { ticker: 'RTX',  change:  0.0004, type: 'standard' },
];

export const HEATMAP_ROW2: HeatmapTick[] = [
  { ticker: 'DJI',  change:  0.0005, type: 'standard' },
  { ticker: 'FTSE', change: -0.0003, type: 'standard' },
  { ticker: 'DAX',  change:  0.0012, type: 'standard' },
  { ticker: 'N225', change:  0.0028, type: 'standard' },
  { ticker: 'HSI',  change: -0.0015, type: 'standard' },
  { ticker: 'DXY',  change: -0.0006, type: 'standard' },
  { ticker: 'EUR',  change:  0.0004, type: 'standard' },
  { ticker: 'JPY',  change: -0.0022, type: 'standard' },
  { ticker: 'GBP',  change:  0.0001, type: 'standard' },
  { ticker: 'CNY',  change:  0.0000, type: 'standard' },
  { ticker: 'GOLD', change:  0.0018, type: 'gold' },
  { ticker: 'OIL',  change: -0.0031, type: 'standard' },
  { ticker: 'NGAS', change:  0.0044, type: 'standard' },
  { ticker: '10Y',  change: -0.0008, type: 'standard' },
  { ticker: '2Y',   change: -0.0005, type: 'standard' },
  { ticker: 'SLVR', change:  0.0021, type: 'gold' },
  { ticker: 'XOM',  change:  0.0009, type: 'standard' },
];
