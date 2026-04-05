/**
 * Free-floating layout system — panels positioned by absolute x/y/w/h pixels.
 * All positions, widths and heights must be multiples of 44 (the visual grid).
 *
 * Layouts are theme-scoped: parchment and dark each have their own preset list.
 * Use getPresetsForTheme() / getDefaultForTheme() everywhere instead of the
 * raw LAYOUT_PRESETS / DEFAULT_LAYOUT exports (kept for backward compat).
 */

export interface LayoutPanelItem {
  panelId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  collapsed: boolean;
  resizable: boolean;
}

export interface DashboardLayout {
  id: string;
  name: string;
  description: string;
  panels: LayoutPanelItem[];
}

const GAP = 0;

function stack(startX: number, startY: number, panels: { id: string; w: number; h: number; resizable?: boolean }[]): LayoutPanelItem[] {
  let y = startY;
  return panels.map((p) => {
    const item: LayoutPanelItem = {
      panelId: p.id,
      x: startX,
      y,
      w: p.w,
      h: p.h,
      collapsed: false,
      resizable: p.resizable ?? false,
    };
    y += p.h + GAP;
    return item;
  });
}

// ══════════════════════════════════════════════════════════
// GRID CONSTANTS — all multiples of 44
// ══════════════════════════════════════════════════════════
const G = 44;           // grid unit
const W = G * 6;        // 264px — data column width
const CW = G * 18;      // 792px — centre column (minimal preset)
const L = 0;             // left column x
const C = W;             // centre x = 264
const R = C + CW;        // right column x = 1056

// ══════════════════════════════════════════════════════════
// SHARED PRESETS (identical in both themes)
// ══════════════════════════════════════════════════════════

// Core panels shared by both themes for the Full Data preset
const FULL_DATA_PANELS = [
  { panelId: 'btc-hero',          x: 0,    y: 0,   w: 264, h: 132, collapsed: false, resizable: false },
  { panelId: 'btc-market',        x: 0,    y: 132, w: 264, h: 264, collapsed: false, resizable: false },
  { panelId: 'btc-network',       x: 0,    y: 352, w: 264, h: 220, collapsed: false, resizable: false },
  { panelId: 'btc-mining',        x: 0,    y: 572, w: 264, h: 132, collapsed: false, resizable: false },
  { panelId: 'fear-greed',        x: 264,  y: 0,   w: 264, h: 132, collapsed: false, resizable: false },
  { panelId: 'lightning',         x: 264,  y: 132, w: 264, h: 220, collapsed: false, resizable: false },
  { panelId: 'onchain-sentiment', x: 264,  y: 352, w: 264, h: 220, collapsed: false, resizable: false },
  { panelId: 'conviction',        x: 264,  y: 572, w: 264, h: 176, collapsed: false, resizable: true  },
  { panelId: 'intel-feed',        x: 528,  y: 0,   w: 660, h: 352, collapsed: false, resizable: true  },
  { panelId: 'btc-charts',        x: 528,  y: 352, w: 660, h: 396, collapsed: false, resizable: true  },
  { panelId: 'market-indices',    x: 1188, y: 0,   w: 264, h: 220, collapsed: false, resizable: false },
  { panelId: 'commodities',       x: 1188, y: 220, w: 264, h: 220, collapsed: false, resizable: false },
  { panelId: 'fx-macro',          x: 1188, y: 440, w: 264, h: 176, collapsed: false, resizable: false },
  { panelId: 'central-bank',      x: 1188, y: 616, w: 264, h: 132, collapsed: false, resizable: false },
  { panelId: 'economic-events',   x: 0,    y: 748, w: 1452, h: 44,  collapsed: false, resizable: true  },
] satisfies LayoutPanelItem[];

// Parchment Full Data — includes separator panels
const FULL_DATA_PARCHMENT: DashboardLayout = {
  id: 'full-data',
  name: 'Full Data',
  description: 'All panels — Bitcoin, macro, on-chain, AI briefing, whales',
  panels: [
    ...FULL_DATA_PANELS,
    { panelId: 'v-separator-1775223296023', x:  242, y:   0, w:  44, h: 748, collapsed: false, resizable: true },
    { panelId: 'v-separator-1775223309898', x:  506, y:   0, w:  44, h: 748, collapsed: false, resizable: true },
    { panelId: 'v-separator-1775223323571', x: 1166, y:   0, w:  44, h: 748, collapsed: false, resizable: true },
    { panelId: 'h-separator-1775223352235', x:    0, y: 110, w:  528, h:  44, collapsed: false, resizable: true },
  ],
};

// Dark Full Data — same panels, no separators
const FULL_DATA_DARK: DashboardLayout = {
  id: 'full-data',
  name: 'Full Data',
  description: 'All panels — Bitcoin, macro, on-chain, AI briefing, whales',
  panels: FULL_DATA_PANELS,
};

const MACRO_FOCUS_PRESET: DashboardLayout = {
  id: 'macro-focus',
  name: 'Macro Focus',
  description: 'Markets, commodities, central banks front and center',
  panels: [
    { panelId: 'market-indices', x:   0, y:   0, w: 264, h: 220, collapsed: false, resizable: false },
    { panelId: 'commodities',    x:   0, y: 220, w: 264, h: 220, collapsed: false, resizable: false },
    { panelId: 'fx-macro',       x:   0, y: 484, w: 264, h: 132, collapsed: false, resizable: false },
    { panelId: 'central-bank',   x:   0, y: 616, w: 264, h:  88, collapsed: false, resizable: false },
    { panelId: 'btc-hero',       x: 264, y:   0, w: 260, h: 132, collapsed: false, resizable: false },
    { panelId: 'fear-greed',     x: 528, y:   0, w: 260, h: 132, collapsed: false, resizable: false },
    { panelId: 'cb-asset-chart', x: 264, y: 132, w: 528, h: 660, collapsed: false, resizable: true  },
    { panelId: 'inflation-chart',x: 792, y:   0, w: 660, h: 420, collapsed: false, resizable: true  },
    { panelId: 'cb-rates-chart', x: 792, y: 420, w: 660, h: 420, collapsed: false, resizable: true  },
    { panelId: 'm2-chart',       x: 792, y: 840, w: 660, h: 420, collapsed: false, resizable: true  },
  ],
};

const ONCHAIN_PRESET: DashboardLayout = {
  id: 'onchain-deep-dive',
  name: 'On-Chain Deep Dive',
  description: 'Network metrics, on-chain flows, hash ribbon, Puell, SOPR and more',
  panels: [
    // Row 1 — Supply distribution
    { panelId: 'cdd',             x: 0,   y:   0, w: 748, h: 396, collapsed: false, resizable: true },
    { panelId: 'urpd',            x: 748, y:   0, w: 704, h: 396, collapsed: false, resizable: true },
    // Row 2 — Holder behavior
    { panelId: 'lth-sth-supply',  x: 0,   y: 396, w: 748, h: 396, collapsed: false, resizable: true },
    { panelId: 'utxo-age-dist',   x: 748, y: 396, w: 704, h: 396, collapsed: false, resizable: true },
    // Row 3 — Miners
    { panelId: 'hash-ribbon',     x: 0,   y: 792, w: 748, h: 396, collapsed: false, resizable: true },
    { panelId: 'puell-multiple',  x: 748, y: 792, w: 704, h: 396, collapsed: false, resizable: true },
    // Row 4 — Network (full width)
    { panelId: 'network-signals', x: 0,   y: 1188, w: 1452, h: 528, collapsed: false, resizable: true },
  ],
};

const AI_PRESET: DashboardLayout = {
  id: 'ai',
  name: 'AI Analysis',
  description: 'AI-powered signal synthesis, cohort analysis, and structured market argument',
  panels: [
    { panelId: 'bitcoin-argument',   x: 0,   y: 0,   w: 748, h: 528, collapsed: false, resizable: true },
    { panelId: 'cohort-analysis',    x: 0,   y: 528, w: 748, h: 220, collapsed: false, resizable: true },
    { panelId: 'signal-interpreter', x: 748, y: 0,   w: 704, h: 748, collapsed: false, resizable: true },
  ],
};

// ══════════════════════════════════════════════════════════
// PARCHMENT PRESETS
// ══════════════════════════════════════════════════════════

/**
 * Parchment default — includes separator panels styled to the parchment theme.
 * Separators sit at half-grid (22px) offsets between columns/rows.
 */
export const PARCHMENT_DEFAULT_LAYOUT: DashboardLayout = {
  id: 'default',
  name: 'Full Overview',
  description: 'The classic Situation Room — everything at a glance',
  panels: [
    { panelId: 'btc-hero',                    x:    0, y:   0, w: 264, h:  88, collapsed: false, resizable: false },
    { panelId: 'btc-market',                  x:    0, y:  88, w: 264, h: 220, collapsed: false, resizable: false },
    { panelId: 'btc-network',                 x:    0, y: 308, w: 264, h: 220, collapsed: false, resizable: false },
    { panelId: 'btc-mining',                  x:    0, y: 528, w: 264, h: 220, collapsed: false, resizable: false },
    { panelId: 'globe',                       x:  264, y:   0, w: 924, h: 352, collapsed: false, resizable: true  },
    { panelId: 'intel-feed',                  x:  264, y: 352, w: 528, h: 352, collapsed: false, resizable: true  },
    { panelId: 'ai-briefing',                 x:  792, y: 352, w: 396, h: 352, collapsed: false, resizable: true  },
    { panelId: 'market-indices',              x: 1188, y:   0, w: 264, h: 220, collapsed: false, resizable: false },
    { panelId: 'commodities',                 x: 1188, y: 220, w: 264, h: 220, collapsed: false, resizable: false },
    { panelId: 'fx-macro',                    x: 1188, y: 440, w: 264, h: 132, collapsed: false, resizable: false },
    { panelId: 'central-bank',                x: 1188, y: 572, w: 264, h: 176, collapsed: false, resizable: false },
    { panelId: 'tikr',                        x:    0, y: 704, w: 1452, h: 44, collapsed: false, resizable: true  },
    { panelId: 'wire',                        x:    0, y: 748, w: 1452, h: 44, collapsed: false, resizable: true  },
    // Separators — parchment brown lines between columns/rows
    { panelId: 'v-separator-1775215862655',   x:  242, y:   0, w:  44, h: 704, collapsed: false, resizable: true  },
    { panelId: 'v-separator-1775215874353',   x: 1166, y:   0, w:  44, h: 704, collapsed: false, resizable: true  },
    { panelId: 'h-separator-1775215892113',   x:  264, y: 330, w: 924, h:  44, collapsed: false, resizable: true  },
    { panelId: 'v-separator-1775262436521',   x:  770, y: 352, w:  44, h: 352, collapsed: false, resizable: true  },
  ],
};

const PARCHMENT_MINIMAL_PRESET: DashboardLayout = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Just the essentials — price, conviction, and briefing',
  panels: [
    ...stack(L, 0, [
      { id: 'btc-hero', w: W, h: G },
      { id: 'conviction', w: W, h: G * 5, resizable: true },
      { id: 'fear-greed', w: W, h: G * 2 },
    ]),
    ...stack(C, 0, [
      { id: 'ai-briefing', w: CW, h: G * 12, resizable: true },
    ]),
    ...stack(R, 0, [
      { id: 'market-indices', w: W, h: G * 5 },
    ]),
  ],
};

export const PARCHMENT_PRESETS: DashboardLayout[] = [
  PARCHMENT_DEFAULT_LAYOUT,
  FULL_DATA_PARCHMENT,
  MACRO_FOCUS_PRESET,
  ONCHAIN_PRESET,
  AI_PRESET,
  PARCHMENT_MINIMAL_PRESET,
];

// ══════════════════════════════════════════════════════════
// DARK PRESETS
// ══════════════════════════════════════════════════════════

/**
 * Dark default — same column structure as parchment but without brown
 * separator panels (they don't suit the dark theme).
 */
export const DARK_DEFAULT_LAYOUT: DashboardLayout = {
  id: 'default',
  name: 'Full Overview',
  description: 'The classic Situation Room — everything at a glance',
  panels: [
    { panelId: 'btc-hero',        x:    0, y:   0, w: 264, h:  88, collapsed: false, resizable: false },
    { panelId: 'btc-market',      x:    0, y:  88, w: 264, h: 220, collapsed: false, resizable: false },
    { panelId: 'btc-network',     x:    0, y: 308, w: 264, h: 220, collapsed: false, resizable: false },
    { panelId: 'btc-mining',      x:    0, y: 528, w: 264, h: 220, collapsed: false, resizable: false },
    { panelId: 'globe',           x:  264, y:   0, w: 924, h: 352, collapsed: false, resizable: true  },
    { panelId: 'intel-feed',      x:  264, y: 352, w: 528, h: 352, collapsed: false, resizable: true  },
    { panelId: 'ai-briefing',     x:  792, y: 352, w: 396, h: 352, collapsed: false, resizable: true  },
    { panelId: 'market-indices',  x: 1188, y:   0, w: 264, h: 220, collapsed: false, resizable: false },
    { panelId: 'commodities',     x: 1188, y: 220, w: 264, h: 220, collapsed: false, resizable: false },
    { panelId: 'fx-macro',        x: 1188, y: 440, w: 264, h: 132, collapsed: false, resizable: false },
    { panelId: 'central-bank',    x: 1188, y: 572, w: 264, h: 176, collapsed: false, resizable: false },
    { panelId: 'tikr',            x:    0, y: 704, w: 1452, h: 44, collapsed: false, resizable: true  },
    { panelId: 'wire',            x:    0, y: 748, w: 1452, h: 44, collapsed: false, resizable: true  },
  ],
};

const DARK_MINIMAL_PRESET: DashboardLayout = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Just the essentials — price, conviction, and briefing',
  panels: [
    ...stack(L, 0, [
      { id: 'btc-hero', w: W, h: G },
      { id: 'conviction', w: W, h: G * 5, resizable: true },
      { id: 'fear-greed', w: W, h: G * 2 },
    ]),
    ...stack(C, 0, [
      { id: 'ai-briefing', w: CW, h: G * 12, resizable: true },
    ]),
    ...stack(R, 0, [
      { id: 'market-indices', w: W, h: G * 5 },
    ]),
  ],
};

export const DARK_PRESETS: DashboardLayout[] = [
  DARK_DEFAULT_LAYOUT,
  FULL_DATA_DARK,
  MACRO_FOCUS_PRESET,
  ONCHAIN_PRESET,
  AI_PRESET,
  DARK_MINIMAL_PRESET,
];

// ══════════════════════════════════════════════════════════
// THEME-AWARE HELPERS
// ══════════════════════════════════════════════════════════

const PRESETS_BY_THEME: Record<string, DashboardLayout[]> = {
  parchment: PARCHMENT_PRESETS,
  dark:      DARK_PRESETS,
};

export function getPresetsForTheme(theme: string): DashboardLayout[] {
  return PRESETS_BY_THEME[theme] ?? PARCHMENT_PRESETS;
}

export function getDefaultForTheme(theme: string): DashboardLayout {
  const presets = getPresetsForTheme(theme);
  return presets.find((p) => p.id === 'default') ?? presets[0];
}

export function getPresetByIdForTheme(id: string, theme: string): DashboardLayout | undefined {
  return getPresetsForTheme(theme).find((p) => p.id === id);
}

// ── Backward-compat exports ────────────────────────────────
/** @deprecated Use getPresetsForTheme(theme) */
export const LAYOUT_PRESETS = PARCHMENT_PRESETS;
/** @deprecated Use getDefaultForTheme(theme) */
export const DEFAULT_LAYOUT = PARCHMENT_DEFAULT_LAYOUT;
/** @deprecated Use getPresetByIdForTheme(id, theme) */
export function getPresetById(id: string): DashboardLayout | undefined {
  return PARCHMENT_PRESETS.find((p) => p.id === id);
}
