/**
 * Data source definitions — exact external API endpoints ported from V2.
 * Each source returns typed data for panel consumption.
 */

import { fetchJSON, fetchApiNinjas } from './fetcher';
import { trackChange } from './price-tracker';

// ════════════════════════════════════════════════════════
// BITCOIN MARKET (CoinGecko — free, no key)
// ════════════════════════════════════════════════════════

export interface BtcMarketData {
  price: number;
  change24h: number;
  change7d: number;
  change30d: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  ath: number;
  athChangePct: number;
}

export async function fetchBtcMarket(): Promise<BtcMarketData> {
  const raw = await fetchJSON<{ market_data: Record<string, Record<string, number>> }>(
    'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false',
    { cacheKey: 'btcMarket', cacheDuration: 60_000 }
  );
  const md = raw.market_data;
  return {
    price: md.current_price.usd,
    change24h: md.price_change_percentage_24h as unknown as number,
    change7d: md.price_change_percentage_7d_in_currency?.usd ?? 0,
    change30d: md.price_change_percentage_30d_in_currency?.usd ?? 0,
    marketCap: md.market_cap.usd,
    volume24h: md.total_volume.usd,
    circulatingSupply: md.circulating_supply as unknown as number,
    ath: md.ath.usd,
    athChangePct: md.ath_change_percentage.usd,
  };
}

// ════════════════════════════════════════════════════════
// BITCOIN NETWORK (Mempool.space — free, no key)
// ════════════════════════════════════════════════════════

export interface BtcNetworkData {
  blockHeight: number;
  feeFast: number;
  feeMed: number;
  feeSlow: number;
  mempoolSizeMB: number;
  mempoolTxCount: number;
  hashrateEH: number;
  difficulty: number;
  blocksUntilHalving: number;
  blocksUntilRetarget: number;
  difficultyEpoch: number;
}

export async function fetchBtcNetwork(): Promise<BtcNetworkData> {
  const [tip, fees, mempool, hashrate, diff] = await Promise.all([
    fetchJSON<number>('https://mempool.space/api/blocks/tip/height', { cacheKey: 'tip', cacheDuration: 30_000 }),
    fetchJSON<{ fastestFee: number; halfHourFee: number; hourFee: number }>(
      'https://mempool.space/api/v1/fees/recommended',
      { cacheKey: 'fees', cacheDuration: 30_000 }
    ),
    fetchJSON<{ vsize: number; count: number }>(
      'https://mempool.space/api/mempool',
      { cacheKey: 'mempool', cacheDuration: 30_000 }
    ),
    fetchJSON<{ currentHashrate: number }>(
      'https://mempool.space/api/v1/mining/hashrate/1m',
      { cacheKey: 'hashrate', cacheDuration: 60_000 }
    ),
    fetchJSON<{ difficultyChange: number }>(
      'https://mempool.space/api/v1/difficulty-adjustment',
      { cacheKey: 'diff', cacheDuration: 60_000 }
    ),
  ]);

  const nextHalving = Math.ceil(tip / 210_000) * 210_000;
  const retargetInterval = 2016;
  const currentEpoch = Math.floor(tip / retargetInterval);
  const nextRetarget = (currentEpoch + 1) * retargetInterval;

  return {
    blockHeight: tip,
    feeFast: fees.fastestFee,
    feeMed: fees.halfHourFee,
    feeSlow: fees.hourFee,
    mempoolSizeMB: mempool.vsize / 1e6,
    mempoolTxCount: mempool.count,
    hashrateEH: hashrate.currentHashrate / 1e18,
    difficulty: diff.difficultyChange,
    blocksUntilHalving: nextHalving - tip,
    blocksUntilRetarget: nextRetarget - tip,
    difficultyEpoch: currentEpoch,
  };
}

// ════════════════════════════════════════════════════════
// LIGHTNING NETWORK (Mempool.space — free, no key)
// ════════════════════════════════════════════════════════

export interface LightningData {
  channels: number;
  capacityBTC: number;
  nodes: number;
  avgChannelSize: number;
}

export async function fetchLightning(): Promise<LightningData> {
  const raw = await fetchJSON<{ latest: { channel_count: number; total_capacity: number; node_count: number } }>(
    'https://mempool.space/api/v1/lightning/statistics/latest',
    { cacheKey: 'lightning', cacheDuration: 60_000 }
  );
  const ln = raw.latest;
  const capBTC = ln.total_capacity / 1e8;
  return {
    channels: ln.channel_count,
    capacityBTC: capBTC,
    nodes: ln.node_count,
    avgChannelSize: ln.channel_count > 0 ? capBTC / ln.channel_count : 0,
  };
}

// ════════════════════════════════════════════════════════
// FEAR & GREED (Alternative.me — free, no key)
// ════════════════════════════════════════════════════════

export interface FearGreedData {
  value: number;
  classification: string;
}

export async function fetchFearGreed(): Promise<FearGreedData> {
  const raw = await fetchJSON<{ data: { value: string; value_classification: string }[] }>(
    'https://api.alternative.me/fng/?limit=1&format=json',
    { cacheKey: 'fearGreed', cacheDuration: 300_000 }
  );
  return {
    value: parseInt(raw.data[0].value, 10),
    classification: raw.data[0].value_classification,
  };
}

// ════════════════════════════════════════════════════════
// ON-CHAIN (CoinMetrics Community — free, no key)
// ════════════════════════════════════════════════════════

export interface OnChainData {
  mvrv: number;
  exchangeInflow: number;
  exchangeOutflow: number;
  exchangeBalance: number;
  netFlow: number;
  interpretation: string;
}

export async function fetchOnChain(): Promise<OnChainData> {
  const end = new Date().toISOString().split('T')[0];
  const start = new Date(Date.now() - 3 * 86400_000).toISOString().split('T')[0];

  const [flows, mvrv] = await Promise.all([
    fetchJSON<{ data: { FlowInExNtv?: string; FlowOutExNtv?: string; SplyExNtv?: string }[] }>(
      `https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=FlowInExNtv,FlowOutExNtv,SplyExNtv&start_time=${start}&end_time=${end}&frequency=1d`,
      { cacheKey: 'onchainFlows', cacheDuration: 900_000, timeout: 30_000 }
    ),
    fetchJSON<{ data: { CapMVRVCur?: string }[] }>(
      `https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=CapMVRVCur&start_time=${start}&end_time=${end}&frequency=1d`,
      { cacheKey: 'onchainMvrv', cacheDuration: 900_000, timeout: 30_000 }
    ),
  ]);

  const latestFlow = flows.data[flows.data.length - 1] || {};
  const latestMvrv = mvrv.data[mvrv.data.length - 1] || {};

  const inflow = parseFloat(latestFlow.FlowInExNtv || '0');
  const outflow = parseFloat(latestFlow.FlowOutExNtv || '0');
  const balance = parseFloat(latestFlow.SplyExNtv || '0');
  const net = outflow - inflow;
  const mvrvVal = parseFloat(latestMvrv.CapMVRVCur || '0');

  let interpretation = 'Neutral flow';
  if (net > 1000) interpretation = 'Net outflow — accumulation signal';
  else if (net < -1000) interpretation = 'Net inflow — distribution signal';

  return {
    mvrv: mvrvVal,
    exchangeInflow: inflow,
    exchangeOutflow: outflow,
    exchangeBalance: balance,
    netFlow: net,
    interpretation,
  };
}

// ════════════════════════════════════════════════════════
// MARKET INDICES (API Ninjas — paid key required)
// ════════════════════════════════════════════════════════

export interface TickerData {
  name: string;
  price: number;
  changePct: number;
}

const INDEX_TICKERS: Record<string, string> = {
  sp500: '^GSPC',
  nasdaq: '^IXIC',
  dji: '^DJI',
  ftse: '^FTSE',
  dax: '^GDAXI',
  nikkei: '^N225',
  hsi: '^HSI',
  vix: '^VIX',
};

export async function fetchIndices(): Promise<Record<string, TickerData>> {
  const results: Record<string, TickerData> = {};
  const entries = Object.entries(INDEX_TICKERS);

  const data = await Promise.allSettled(
    entries.map(([id, ticker]) =>
      fetchApiNinjas<{ ticker: string; name: string; price: number }>(
        `/stockprice?ticker=${encodeURIComponent(ticker)}`,
        `idx-${id}`,
        1_800_000
      ).then((d) => ({ id, data: d }))
    )
  );

  for (const result of data) {
    if (result.status === 'fulfilled') {
      const { id, data: d } = result.value;
      const changePct = await trackChange('indices', id, d.price);
      results[id] = { name: d.name || id.toUpperCase(), price: d.price, changePct: changePct ?? 0 };
    }
  }

  return results;
}

// ════════════════════════════════════════════════════════
// COMMODITIES (API Ninjas — paid key required)
// ════════════════════════════════════════════════════════

const COMMODITY_NAMES = ['Gold', 'Silver', 'Crude Oil', 'Natural Gas', 'Copper'];

export async function fetchCommodities(): Promise<Record<string, TickerData>> {
  const results: Record<string, TickerData> = {};

  const data = await Promise.allSettled(
    COMMODITY_NAMES.map((name) =>
      fetchApiNinjas<{ name: string; price: number }>(
        `/commodityprice?name=${encodeURIComponent(name)}`,
        `commodity-${name.toLowerCase().replace(/\s/g, '-')}`,
        1_800_000
      ).then((d) => ({ id: name.toLowerCase().replace(/\s/g, '-'), data: d }))
    )
  );

  // Also fetch DXY, US10Y, US2Y via stock endpoint
  const yieldTickers = [
    { id: 'dxy', ticker: 'DX-Y.NYB', name: 'DXY' },
    { id: 'us10y', ticker: '^TNX', name: 'US 10Y' },
    { id: 'us2y', ticker: '^IRX', name: 'US 2Y' },
  ];

  const yieldData = await Promise.allSettled(
    yieldTickers.map(({ id, ticker, name }) =>
      fetchApiNinjas<{ price: number }>(
        `/stockprice?ticker=${encodeURIComponent(ticker)}`,
        `yield-${id}`,
        1_800_000
      ).then((d) => ({ id, name, data: d }))
    )
  );

  for (const result of data) {
    if (result.status === 'fulfilled') {
      const { id, data: d } = result.value;
      const changePct = await trackChange('commodities', id, d.price);
      results[id] = { name: d.name, price: d.price, changePct: changePct ?? 0 };
    }
  }

  for (const result of yieldData) {
    if (result.status === 'fulfilled') {
      const { id, name, data: d } = result.value;
      const changePct = await trackChange('commodities', id, d.price);
      results[id] = { name, price: d.price, changePct: changePct ?? 0 };
    }
  }

  return results;
}

// ════════════════════════════════════════════════════════
// FX PAIRS (API Ninjas — paid key required)
// ════════════════════════════════════════════════════════

const FX_PAIRS = [
  { id: 'eur', pair: 'USD_EUR', name: 'EUR/USD' },
  { id: 'gbp', pair: 'USD_GBP', name: 'GBP/USD' },
  { id: 'jpy', pair: 'USD_JPY', name: 'USD/JPY' },
  { id: 'cny', pair: 'USD_CNY', name: 'USD/CNY' },
];

export async function fetchFX(): Promise<Record<string, TickerData>> {
  const results: Record<string, TickerData> = {};

  const data = await Promise.allSettled(
    FX_PAIRS.map(({ id, pair, name }) =>
      fetchApiNinjas<{ exchange_rate: number }>(
        `/exchangerate?pair=${pair}`,
        `fx-${id}`,
        1_800_000
      ).then((d) => ({ id, name, data: d }))
    )
  );

  for (const result of data) {
    if (result.status === 'fulfilled') {
      const { id, name, data: d } = result.value;
      const changePct = await trackChange('fx', id, d.exchange_rate);
      results[id] = { name, price: d.exchange_rate, changePct: changePct ?? 0 };
    }
  }

  return results;
}

// ════════════════════════════════════════════════════════
// BTC EQUITIES (API Ninjas — paid key required)
// ════════════════════════════════════════════════════════

const BTC_EQUITY_TICKERS: Record<string, string> = {
  ibit: 'IBIT', fbtc: 'FBTC', arkb: 'ARKB', bitb: 'BITB', hodl: 'HODL',
  mstr: 'MSTR', coin: 'COIN', mara: 'MARA', riot: 'RIOT', clsk: 'CLSK', hut: 'HUT',
};

export async function fetchBtcEquities(): Promise<Record<string, TickerData>> {
  const results: Record<string, TickerData> = {};

  // Only fetch during US market hours (14:30-21:00 UTC, Mon-Fri)
  const now = new Date();
  const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
  const day = now.getUTCDay();
  const isMarketHours = day >= 1 && day <= 5 && utcHour >= 14.5 && utcHour < 21;

  const entries = Object.entries(BTC_EQUITY_TICKERS);

  const data = await Promise.allSettled(
    entries.map(([id, ticker]) =>
      fetchApiNinjas<{ ticker: string; name: string; price: number }>(
        `/stockprice?ticker=${ticker}`,
        `eq-${id}`,
        isMarketHours ? 1_800_000 : 86_400_000 // 30min during market, 24h otherwise
      ).then((d) => ({ id, data: d }))
    )
  );

  for (const result of data) {
    if (result.status === 'fulfilled') {
      const { id, data: d } = result.value;
      const changePct = await trackChange('indices', `eq-${id}`, d.price);
      results[id] = { name: d.name || BTC_EQUITY_TICKERS[id], price: d.price, changePct: changePct ?? 0 };
    }
  }

  return results;
}

// ════════════════════════════════════════════════════════
// CENTRAL BANK RATES (API Ninjas — paid key required)
// ════════════════════════════════════════════════════════

export interface CentralBankRate {
  country: string;
  rate: number;
  lastUpdated: string;
}

export async function fetchCentralBankRates(): Promise<CentralBankRate[]> {
  const raw = await fetchApiNinjas<{
    central_bank_rates: { central_bank: string; country: string; rate_pct: number; last_updated: string }[];
  }>(
    '/interestrate',
    'rates',
    21_600_000
  );

  const rates = raw.central_bank_rates || [];

  const TARGET_COUNTRIES = [
    { match: 'United_States', label: 'Fed (US)' },
    { match: 'Europe', label: 'ECB (EU)' },
    { match: 'Japan', label: 'BOJ (Japan)' },
    { match: 'United_Kingdom', label: 'BOE (UK)' },
  ];

  return TARGET_COUNTRIES
    .map(({ match, label }) => {
      const found = rates.find((r) => r.country === match);
      if (!found) return null;
      return { country: label, rate: found.rate_pct, lastUpdated: found.last_updated };
    })
    .filter((r): r is CentralBankRate => r !== null);
}

// ════════════════════════════════════════════════════════
// WHALE TRANSACTIONS (Mempool.space — free, no key)
// ════════════════════════════════════════════════════════

export interface WhaleTransaction {
  txid: string;
  valueBTC: number;
  valueUSD: number;
  time: number;
}

export async function fetchWhaleTransactions(btcPrice: number): Promise<WhaleTransaction[]> {
  const THRESHOLD_SATS = 10_000_000_000; // 100 BTC

  try {
    const recent = await fetchJSON<{ txid: string; value: number; time?: number }[]>(
      'https://mempool.space/api/mempool/recent',
      { cacheKey: 'whaleMempool', cacheDuration: 120_000 }
    );

    const whales = recent
      .filter((tx) => tx.value >= THRESHOLD_SATS)
      .slice(0, 10)
      .map((tx) => ({
        txid: tx.txid,
        valueBTC: tx.value / 1e8,
        valueUSD: (tx.value / 1e8) * btcPrice,
        time: tx.time || Math.floor(Date.now() / 1000),
      }));

    if (whales.length > 0) return whales;
  } catch {
    // Fall through to block-based lookup
  }

  // Fallback: check latest blocks
  try {
    const blocks = await fetchJSON<{ id: string }[]>(
      'https://mempool.space/api/v1/blocks',
      { cacheKey: 'latestBlocks', cacheDuration: 60_000 }
    );

    if (blocks.length > 0) {
      const txs = await fetchJSON<{ txid: string; vout: { value: number }[] }[]>(
        `https://mempool.space/api/block/${blocks[0].id}/txs`,
        { cacheKey: 'blockTxs', cacheDuration: 60_000 }
      );

      return txs
        .map((tx) => {
          const total = tx.vout.reduce((s, o) => s + o.value, 0);
          return { txid: tx.txid, valueBTC: total / 1e8, valueUSD: (total / 1e8) * btcPrice, time: Math.floor(Date.now() / 1000) };
        })
        .filter((tx) => tx.valueBTC >= 100)
        .slice(0, 10);
    }
  } catch {
    // Return empty
  }

  return [];
}
