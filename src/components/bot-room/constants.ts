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

// ── Bot state ──────────────────────────────────────────────────────────────────
export interface BotState {
  poolBalance: number;
  position: 'LONG' | 'SHORT' | 'FLAT';
  leverage: number;
  entryPrice: number | null;
  unrealisedPnl: number;    // sats
  tradeCount: number;
  winRate: number;           // 0–1
  totalPnl: number;         // sats — all-time realised P&L
  lastTradePnl: number;     // sats
}

// ── Chat messages ──────────────────────────────────────────────────────────────
export interface BotMessage {
  id: string;
  timestamp: number;
  author: string;
  content: string;
}
