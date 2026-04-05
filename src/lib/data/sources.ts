/**
 * Data source definitions — exact external API endpoints ported from V2.
 * Each source returns typed data for panel consumption.
 */

import { fetchJSON } from './fetcher';
import { trackChange } from './price-tracker';
import { getApiNinjasSnapshot } from './api-ninjas-batch';

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
  feeEconomy: number;
  feeMinimum: number;
  mempoolSizeMB: number;
  mempoolTxCount: number;
  mempoolTotalFeeBTC: number;
  hashrateEH: number;
  difficultyT: number;
  difficulty: number;
  difficultyProgress: number;
  difficultyRemainBlocks: number;
  difficultyEstRetarget: number;
  blocksUntilHalving: number;
  blocksUntilRetarget: number;
  difficultyEpoch: number;
}

export async function fetchBtcNetwork(): Promise<BtcNetworkData> {
  const [tip, fees, mempool, hashrate, diff] = await Promise.all([
    fetchJSON<number>('https://mempool.space/api/blocks/tip/height', { cacheKey: 'tip', cacheDuration: 30_000 }),
    fetchJSON<{ fastestFee: number; halfHourFee: number; hourFee: number; economyFee: number; minimumFee: number }>(
      'https://mempool.space/api/v1/fees/recommended',
      { cacheKey: 'fees', cacheDuration: 30_000 }
    ),
    fetchJSON<{ vsize: number; count: number; total_fee: number }>(
      'https://mempool.space/api/mempool',
      { cacheKey: 'mempool', cacheDuration: 30_000 }
    ),
    fetchJSON<{ currentHashrate: number; currentDifficulty: number }>(
      'https://mempool.space/api/v1/mining/hashrate/1m',
      { cacheKey: 'hashrate', cacheDuration: 60_000 }
    ),
    fetchJSON<{ difficultyChange: number; progressPercent: number; remainingBlocks: number; estimatedRetargetDate: number }>(
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
    feeEconomy: fees.economyFee,
    feeMinimum: fees.minimumFee,
    mempoolSizeMB: mempool.vsize / 1e6,
    mempoolTxCount: mempool.count,
    mempoolTotalFeeBTC: mempool.total_fee / 1e8,
    hashrateEH: hashrate.currentHashrate / 1e18,
    difficultyT: hashrate.currentDifficulty / 1e12,
    difficulty: diff.difficultyChange,
    difficultyProgress: diff.progressPercent,
    difficultyRemainBlocks: diff.remainingBlocks,
    difficultyEstRetarget: diff.estimatedRetargetDate,
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
  torNodes: number;
  clearnetNodes: number;
  avgFeeRate: number;       // ppm
  avgBaseFee: number;       // msats
  medCapacityBTC: number;
}

export async function fetchLightning(): Promise<LightningData> {
  const raw = await fetchJSON<{
    latest: {
      channel_count: number; total_capacity: number; node_count: number;
      tor_nodes: number; clearnet_nodes: number;
      avg_fee_rate: number; avg_base_fee_mtokens: number; med_capacity: number;
    }
  }>(
    'https://mempool.space/api/v1/lightning/statistics/latest',
    { cacheKey: 'lightning', cacheDuration: 60_000 }
  );
  const ln = raw.latest;
  const capBTC = ln.total_capacity / 1e8;
  return {
    channels:       ln.channel_count,
    capacityBTC:    capBTC,
    nodes:          ln.node_count,
    avgChannelSize: ln.channel_count > 0 ? capBTC / ln.channel_count : 0,
    torNodes:       ln.tor_nodes,
    clearnetNodes:  ln.clearnet_nodes,
    avgFeeRate:     ln.avg_fee_rate,
    avgBaseFee:     ln.avg_base_fee_mtokens,
    medCapacityBTC: ln.med_capacity / 1e8,
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
  signal: 'bullish' | 'bearish' | 'neutral';
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

  // Net flow line
  let flowLine = 'Neutral flow — no directional bias';
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (net > 1000)  { flowLine = 'Net outflow — coins leaving exchanges (accumulation)'; signal = 'bullish'; }
  else if (net < -1000) { flowLine = 'Net inflow — coins entering exchanges (distribution)'; signal = 'bearish'; }

  // MVRV line
  let mvrvLine = `MVRV ${mvrvVal.toFixed(2)} — fair value range`;
  if (mvrvVal > 3.5)      mvrvLine = `MVRV ${mvrvVal.toFixed(2)} — market overheated, historically high risk`;
  else if (mvrvVal > 2.4) mvrvLine = `MVRV ${mvrvVal.toFixed(2)} — greed territory, elevated risk`;
  else if (mvrvVal < 1.0) mvrvLine = `MVRV ${mvrvVal.toFixed(2)} — below cost basis, deep value zone`;
  else if (mvrvVal < 1.5) mvrvLine = `MVRV ${mvrvVal.toFixed(2)} — undervalued, accumulation zone`;

  const interpretation = `${flowLine}\n${mvrvLine}`;

  return {
    mvrv: mvrvVal,
    exchangeInflow: inflow,
    exchangeOutflow: outflow,
    exchangeBalance: balance,
    netFlow: net,
    interpretation,
    signal,
  };
}

// ════════════════════════════════════════════════════════
// MARKET INDICES (via API-Ninjas batch manager)
// ════════════════════════════════════════════════════════

export interface TickerData {
  name: string;
  price: number;
  changePct: number;
}

export async function fetchIndices(): Promise<Record<string, TickerData>> {
  const snap = await getApiNinjasSnapshot();
  // Track price changes for % calculation
  const results: Record<string, TickerData> = {};
  for (const [id, data] of Object.entries(snap.indices)) {
    const changePct = await trackChange('indices', id, data.price);
    results[id] = { ...data, changePct: changePct ?? data.changePct };
  }
  return results;
}

// ════════════════════════════════════════════════════════
// COMMODITIES (via API-Ninjas batch manager)
// ════════════════════════════════════════════════════════

export async function fetchCommodities(): Promise<Record<string, TickerData>> {
  const snap = await getApiNinjasSnapshot();
  const results: Record<string, TickerData> = {};
  for (const [id, data] of Object.entries(snap.commodities)) {
    const changePct = await trackChange('commodities', id, data.price);
    results[id] = { ...data, changePct: changePct ?? data.changePct };
  }
  return results;
}

// ════════════════════════════════════════════════════════
// FX PAIRS (via API-Ninjas batch manager)
// ════════════════════════════════════════════════════════

export async function fetchFX(): Promise<Record<string, TickerData>> {
  const snap = await getApiNinjasSnapshot();
  const results: Record<string, TickerData> = {};
  for (const [id, data] of Object.entries(snap.fx)) {
    const changePct = await trackChange('fx', id, data.price);
    results[id] = { ...data, changePct: changePct ?? data.changePct };
  }
  return results;
}

// ════════════════════════════════════════════════════════
// BTC EQUITIES (via API-Ninjas batch manager)
// ════════════════════════════════════════════════════════

export async function fetchBtcEquities(): Promise<Record<string, TickerData>> {
  const snap = await getApiNinjasSnapshot();
  const results: Record<string, TickerData> = {};
  for (const [id, data] of Object.entries(snap.equities)) {
    const changePct = await trackChange('indices', `eq-${id}`, data.price);
    results[id] = { ...data, changePct: changePct ?? data.changePct };
  }
  return results;
}

// ════════════════════════════════════════════════════════
// CENTRAL BANK RATES (via API-Ninjas batch manager)
// ════════════════════════════════════════════════════════

export interface CentralBankRate {
  country: string;
  rate: number;
  lastUpdated: string;
}

export async function fetchCentralBankRates(): Promise<CentralBankRate[]> {
  const snap = await getApiNinjasSnapshot();
  return snap.cbRates;
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
