/**
 * Bot Room — shared constants, design tokens, topology data, and mock state.
 *
 * Theme handling: tokens that map to global theme (background, text, border,
 * accent) are CSS variable references so the same component renders correctly
 * in parchment and dark. BTC orange / gold stay hard-coded since they're
 * brand colours, not theme colours.
 *
 * Inline styles in React components consume these as
 *   `<div style={{ backgroundColor: C.bgPrimary }}>`
 * and the browser resolves the var against whatever data-theme is active.
 *
 * For canvas / SVG drawing where computed RGB strings are required, use
 *   `getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim()`
 * at draw time (see NetworkCanvas2D for an example).
 */

// ── Design tokens ──────────────────────────────────────────────────────────────
export const C = {
  // Surfaces
  bgPrimary:   'var(--bg-primary)',
  bgElevated:  'var(--bg-card)',
  bgOverlay:   'var(--bg-secondary)',

  // Accents — teal/coral in dark, gold/red in parchment. Maps to the room
  // palette (defined in globals.css under `--room-positive` / `--room-negative`)
  // so positive/negative semantics stay consistent across themes.
  teal:        'var(--room-positive)',
  coral:       'var(--room-negative)',

  // Brand colours — kept hard-coded since BTC orange and gold are universal
  btcOrange:   '#f7931a',
  gold:        '#ffd700',

  // Text
  textPrimary: 'var(--text-primary)',
  textMuted:   'var(--text-secondary)',
  textDim:     'var(--text-muted)',

  // Borders
  border:      'var(--border-primary)',
  borderSoft:  'var(--border-subtle)',
};

// ── Heatmap tints ─────────────────────────────────────────────────────────────
// Subtle background washes for the market heatmap. Use semi-transparent
// rgba over the current theme background. Browsers resolve `var()` inside
// `rgb()` / `rgba()` only with the new color-mix() syntax, so we use
// `color-mix(in srgb, ..., transparent)` for theme-awareness.
export const HM = {
  posStrong: 'color-mix(in srgb, var(--room-positive) 12%, transparent)',
  pos:       'color-mix(in srgb, var(--room-positive) 6%, transparent)',
  flat:      'color-mix(in srgb, var(--bg-secondary) 50%, transparent)',
  neg:       'color-mix(in srgb, var(--room-negative) 6%, transparent)',
  negStrong: 'color-mix(in srgb, var(--room-negative) 12%, transparent)',
  btc:       'color-mix(in srgb, #f7931a 6%, transparent)',
  gold:      'color-mix(in srgb, #ffd700 6%, transparent)',
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
