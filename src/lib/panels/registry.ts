import type { PanelCategory } from '@/types';

export interface PanelRegistryEntry {
  id: string;
  name: string;
  category: PanelCategory;
  defaultW: number;
  defaultH: number;
  minW: number;
  minH: number;
  resizable: boolean;
  noHeader?: boolean; // full-width bars don't need panel chrome
  refreshInterval: number;
  dataSources: string[];
  description: string;
  icon: string;
}

export const PANEL_REGISTRY: PanelRegistryEntry[] = [
  // ── Bitcoin Core ──
  {
    id: 'btc-hero',
    name: 'Bitcoin — 24hr',
    category: 'bitcoin',
    defaultW: 260, defaultH: 120, minW: 200, minH: 100,
    resizable: false,
    refreshInterval: 60,
    dataSources: ['btcMarket'],
    description: 'Current BTC price with 24-hour change',
    icon: 'bitcoin',
  },
  {
    id: 'btc-market',
    name: 'Bitcoin — Market',
    category: 'bitcoin',
    defaultW: 260, defaultH: 260, minW: 200, minH: 200,
    resizable: false,
    refreshInterval: 60,
    dataSources: ['btcMarket'],
    description: '7d/30d change, market cap, volume, supply, ATH',
    icon: 'chart',
  },
  {
    id: 'btc-network',
    name: 'Bitcoin — Network',
    category: 'bitcoin',
    defaultW: 260, defaultH: 280, minW: 200, minH: 200,
    resizable: false,
    refreshInterval: 60,
    dataSources: ['btcNetwork'],
    description: 'Block height, fees, mempool, hashrate, difficulty, halving',
    icon: 'network',
  },
  {
    id: 'btc-mining',
    name: 'Bitcoin — Mining',
    category: 'bitcoin',
    defaultW: 264, defaultH: 220, minW: 220, minH: 176,
    resizable: false,
    refreshInterval: 60,
    dataSources: ['btcNetwork'],
    description: 'Block reward, blocks today, revenue, epoch, retarget',
    icon: 'mining',
  },
  {
    id: 'lightning',
    name: 'Lightning Network',
    category: 'bitcoin',
    defaultW: 260, defaultH: 180, minW: 200, minH: 140,
    resizable: false,
    refreshInterval: 60,
    dataSources: ['lightning'],
    description: 'Channels, capacity, nodes, fees',
    icon: 'lightning',
  },
  {
    id: 'conviction',
    name: 'Conviction Score',
    category: 'bitcoin',
    defaultW: 264, defaultH: 176, minW: 220, minH: 132,
    resizable: true,
    refreshInterval: 60,
    dataSources: ['convictionScore'],
    description: '5-signal weighted conviction gauge with interactive breakdown',
    icon: 'conviction',
  },
  {
    id: 'btc-charts',
    name: 'Bitcoin Charts',
    category: 'bitcoin',
    defaultW: 660, defaultH: 396, minW: 440, minH: 308,
    resizable: true,
    refreshInterval: 300,
    dataSources: ['charts'],
    description: '30-day price, hashrate, MVRV, exchange balance charts',
    icon: 'chart',
  },

  // ── On-Chain ──
  {
    id: 'onchain-sentiment',
    name: 'On-Chain Sentiment',
    category: 'onchain',
    defaultW: 260, defaultH: 280, minW: 200, minH: 200,
    resizable: false,
    refreshInterval: 900,
    dataSources: ['onchainFlows', 'onchainMvrv'],
    description: 'MVRV, exchange flows, net flow, interpretation',
    icon: 'onchain',
  },
  {
    id: 'whale-txs',
    name: 'Whale Transactions',
    category: 'onchain',
    defaultW: 264, defaultH: 264, minW: 220, minH: 176,
    resizable: true,
    refreshInterval: 120,
    dataSources: ['whales'],
    description: 'Large BTC transactions (>100 BTC)',
    icon: 'whale',
  },

  {
    id: 'utxo-age-dist',
    name: 'THE HOLDERS — UTXO Age Distribution',
    category: 'onchain',
    defaultW: 792, defaultH: 352, minW: 528, minH: 220,
    resizable: true,
    refreshInterval: 3600,
    dataSources: ['brk'],
    description: '90-day stacked bar chart of Bitcoin supply by coin age — 10 bands from <1d to 5yr+',
    icon: 'onchain',
  },

  // ── Macro ──
  {
    id: 'market-indices',
    name: 'Market Indices — 24hr',
    category: 'macro',
    defaultW: 260, defaultH: 300, minW: 200, minH: 200,
    resizable: false,
    refreshInterval: 1800,
    dataSources: ['indices'],
    description: 'S&P 500, NASDAQ, DJI, FTSE, DAX, Nikkei, HSI, VIX',
    icon: 'indices',
  },
  {
    id: 'commodities',
    name: 'Commodities — 24hr',
    category: 'macro',
    defaultW: 260, defaultH: 300, minW: 200, minH: 200,
    resizable: false,
    refreshInterval: 1800,
    dataSources: ['commodities'],
    description: 'Gold, Silver, Oil, NatGas, Copper, DXY, US10Y, US2Y',
    icon: 'commodities',
  },
  {
    id: 'fx-macro',
    name: 'FX & Macro — 24hr',
    category: 'macro',
    defaultW: 260, defaultH: 200, minW: 200, minH: 140,
    resizable: false,
    refreshInterval: 1800,
    dataSources: ['fx'],
    description: 'EUR/USD, GBP/USD, USD/JPY, USD/CNY',
    icon: 'fx',
  },
  {
    id: 'central-bank',
    name: 'Central Bank Watch',
    category: 'macro',
    defaultW: 260, defaultH: 200, minW: 200, minH: 140,
    resizable: false,
    refreshInterval: 21600,
    dataSources: ['rates'],
    description: 'Fed, ECB, BOJ, BOE policy rates and next decisions',
    icon: 'bank',
  },

  // ── Geopolitical ──
  {
    id: 'globe',
    name: 'Global Situation Map',
    category: 'geopolitical',
    defaultW: 528, defaultH: 396, minW: 352, minH: 264,
    resizable: true,
    refreshInterval: 300,
    dataSources: ['news'],
    description: 'Interactive globe with filtered event markers and country overlays',
    icon: 'globe',
  },
  {
    id: 'intel-feed',
    name: 'Intelligence Briefing',
    category: 'geopolitical',
    defaultW: 528, defaultH: 352, minW: 352, minH: 220,
    resizable: true,
    refreshInterval: 300,
    dataSources: ['news'],
    description: 'Category-filtered RSS intelligence feed (18 sources)',
    icon: 'briefing',
  },
  {
    id: 'ai-briefing',
    name: 'AI Intelligence',
    category: 'geopolitical',
    defaultW: 528, defaultH: 352, minW: 352, minH: 220,
    resizable: true,
    refreshInterval: 60,
    dataSources: ['briefing'],
    description: 'Grok multi-agent synthesis briefing',
    icon: 'ai',
  },
  {
    id: 'fear-greed',
    name: 'Fear & Greed Index',
    category: 'bitcoin',
    defaultW: 260, defaultH: 160, minW: 200, minH: 120,
    resizable: false,
    refreshInterval: 3600,
    dataSources: ['fearGreed'],
    description: 'Current Fear & Greed reading with 7-day trend',
    icon: 'sentiment',
  },

  {
    id: 'cb-asset-chart',
    name: 'Central Bank Balance Sheets',
    category: 'macro',
    defaultW: 528, defaultH: 660, minW: 440, minH: 484,
    resizable: true,
    refreshInterval: 604800,
    dataSources: ['cbAssets'],
    description: 'Donut composition + 10-year timeline for Fed, ECB, BOJ, BOE, PBoC balance sheets',
    icon: 'chart',
  },
  {
    id: 'cb-rates-chart',
    name: 'Central Bank Rates',
    category: 'macro',
    defaultW: 660, defaultH: 396, minW: 440, minH: 264,
    resizable: true,
    refreshInterval: 604800, // 7 days
    dataSources: ['cbRates'],
    description: '10-year Fed, ECB, BOE, BOJ policy rate chart — the 2022 hiking cycle in context',
    icon: 'chart',
  },
  {
    id: 'inflation-chart',
    name: 'Inflation Monitor',
    category: 'macro',
    defaultW: 660, defaultH: 396, minW: 440, minH: 264,
    resizable: true,
    refreshInterval: 604800, // 7 days — monthly statistic
    dataSources: ['inflation'],
    description: 'G7 vs extreme inflation — multi-line CPI chart with log scale toggle',
    icon: 'chart',
  },

  // ── Full-width bars ──
  {
    id: 'wire',
    name: 'Wire',
    category: 'geopolitical',
    defaultW: 1140, defaultH: 44, minW: 440, minH: 44,
    resizable: true,
    noHeader: true,
    refreshInterval: 300,
    dataSources: ['news'],
    description: 'Scrolling news ticker — top headlines from 17 RSS sources',
    icon: 'wire',
  },
  {
    id: 'tikr',
    name: 'Tikr',
    category: 'bitcoin',
    defaultW: 1140, defaultH: 44, minW: 440, minH: 44,
    resizable: true,
    noHeader: true,
    refreshInterval: 60,
    dataSources: ['btcEquities'],
    description: 'BTC equities ticker — ETFs, miners, and proxy stocks',
    icon: 'tikr',
  },
  {
    id: 'economic-events',
    name: 'Upcoming',
    category: 'macro',
    defaultW: 1140, defaultH: 44, minW: 440, minH: 44,
    resizable: true,
    noHeader: true,
    refreshInterval: 3600,
    dataSources: ['events'],
    description: 'Upcoming economic events — FOMC, CPI, central bank decisions',
    icon: 'calendar',
  },
];

export function getPanelById(id: string): PanelRegistryEntry | undefined {
  return PANEL_REGISTRY.find((p) => p.id === id);
}

export function getPanelsByCategory(category: PanelCategory): PanelRegistryEntry[] {
  return PANEL_REGISTRY.filter((p) => p.category === category);
}

export function getAllPanelIds(): string[] {
  return PANEL_REGISTRY.map((p) => p.id);
}
