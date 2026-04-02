/**
 * Free-floating layout system — panels positioned by absolute x/y/w/h pixels.
 * All positions, widths and heights must be multiples of 44 (the visual grid).
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
const W = G * 6;        // 264px — data column width (wide enough for "HANG SENG" + price + %)
const CW = G * 18;      // 792px — centre column — fill the viewport
const L = 0;             // left column x
const C = W;             // centre x = 264
const R = C + CW;        // right column x = 1056
const FULL_W = R + W;    // total = 1320 (30 × 44)

/**
 * DEFAULT — fits ~800px viewport height without scrolling.
 * Excludes: btc-mining, lightning, fear-greed, whale-txs (available in other presets)
 *
 * Layout:
 *   [Upcoming bar — full width — 1 row]
 *   [BTC Hero + Market + Network + Conviction | Globe | Intel Feed | Indices + Commodities + FX + Central Bank]
 *   [Wire bar — full width — 1 row]
 *   [Tikr bar — full width — 1 row]
 */
// DEFAULT layout dimensions (wider centre for larger screens)
const D_CW = G * 21;          // 924 — centre column
const D_R  = W + D_CW;        // 1188 — right column x
const TIKR_Y = G * 16;        // 704
const WIRE_Y = TIKR_Y + G;    // 748

export const DEFAULT_LAYOUT: DashboardLayout = {
  id: 'default',
  name: 'Full Overview',
  description: 'The classic Situation Room — everything at a glance',
  panels: [
    // Left column — 2+5+5+6 rows (y=0..792)
    ...stack(L, 0, [
      { id: 'btc-hero',    w: W, h: G * 2 },
      { id: 'btc-market',  w: W, h: G * 5 },
      { id: 'btc-network', w: W, h: G * 5 },
      { id: 'conviction',  w: W, h: G * 6, resizable: true },
    ]),

    // Centre column (924px wide)
    // Globe: 8 rows. Intel (12 cols) + AI (9 cols) side-by-side: 8 rows.
    // Centre total = 704 = TIKR_Y (perfect alignment)
    { panelId: 'globe',       x: W,           y: 0,        w: D_CW,      h: G * 8, collapsed: false, resizable: true },
    { panelId: 'intel-feed',  x: W,           y: G * 8,    w: G * 12,    h: G * 8, collapsed: false, resizable: true },
    { panelId: 'ai-briefing', x: W + G * 12,  y: G * 8,    w: G * 9,     h: G * 8, collapsed: false, resizable: true },

    // Right column — 5+5+3+4 rows, ends at y=748=WIRE_Y
    ...stack(D_R, 0, [
      { id: 'market-indices', w: W, h: G * 5 },
      { id: 'commodities',    w: W, h: G * 5 },
      { id: 'fx-macro',       w: W, h: G * 3 },
      { id: 'central-bank',   w: W, h: G * 4 },
    ]),

    // Bars — w stored but auto-fills canvas width via DashboardGrid
    { panelId: 'tikr', x: 0, y: TIKR_Y, w: D_R + W, h: G, collapsed: false, resizable: true },
    { panelId: 'wire', x: 0, y: WIRE_Y, w: D_R + W, h: G, collapsed: false, resizable: true },
  ],
};

// ══════════════════════════════════════════════════════════
// PRESETS
// ══════════════════════════════════════════════════════════

export const LAYOUT_PRESETS: DashboardLayout[] = [
  DEFAULT_LAYOUT,
  {
    id: 'full-data',
    name: 'Full Data',
    description: 'All panels — Bitcoin, macro, on-chain, AI briefing, whales',
    panels: [
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
      { panelId: 'fx-macro',         x: 1188, y: 440, w: 264, h: 176, collapsed: false, resizable: false },
      { panelId: 'central-bank',      x: 1188, y: 616, w: 264, h: 132, collapsed: false, resizable: false },
      { panelId: 'economic-events',   x: 0,    y: 748, w: 1452, h: 44,  collapsed: false, resizable: true  },
    ],
  },
  {
    id: 'macro-focus',
    name: 'Macro Focus',
    description: 'Markets, commodities, central banks front and center',
    panels: [
      { panelId: 'market-indices', x:   0, y:   0, w: 264, h: 220, collapsed: false, resizable: false },
      { panelId: 'commodities',    x:   0, y: 220, w: 264, h: 220, collapsed: false, resizable: false },
      { panelId: 'fx-macro',       x:   0, y: 440, w: 264, h: 132, collapsed: false, resizable: false },
      { panelId: 'central-bank',   x:   0, y: 572, w: 264, h:  88, collapsed: false, resizable: false },
      { panelId: 'btc-hero',       x: 264, y:   0, w: 260, h: 132, collapsed: false, resizable: false },
      { panelId: 'fear-greed',     x: 528, y:   0, w: 260, h: 132, collapsed: false, resizable: false },
      { panelId: 'cb-asset-chart', x: 264, y: 132, w: 528, h: 660, collapsed: false, resizable: true  },
      { panelId: 'inflation-chart',x: 792, y:   0, w: 660, h: 396, collapsed: false, resizable: true  },
      { panelId: 'cb-rates-chart', x: 792, y: 396, w: 660, h: 396, collapsed: false, resizable: true  },
    ],
  },
  {
    id: 'onchain-deep-dive',
    name: 'On-Chain Deep Dive',
    description: 'Network metrics, on-chain flows, and mining data',
    panels: [
      { panelId: 'utxo-age-dist',  x: 0,   y: 0,   w: 748, h: 396, collapsed: false, resizable: true },
      { panelId: 'lth-sth-supply', x: 0,   y: 396, w: 748, h: 396, collapsed: false, resizable: true },
      { panelId: 'urpd',           x: 748, y: 396, w: 704, h: 396, collapsed: false, resizable: true },
      { panelId: 'cdd',            x: 748, y: 0,   w: 704, h: 396, collapsed: false, resizable: true },
    ],
  },
  {
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
  },
];

export function getPresetById(id: string): DashboardLayout | undefined {
  return LAYOUT_PRESETS.find((p) => p.id === id);
}
