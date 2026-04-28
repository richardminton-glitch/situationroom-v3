'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface SnapshotData {
  btcMarket: {
    price: number;
    change24h: number;
    change7d: number;
    change30d: number;
    change1y: number;
    marketCap: number;
    volume24h: number;
    circulatingSupply: number;
    ath: number;
    athChangePct: number;
    athDate: string;
  } | null;
  btcNetwork: {
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
  } | null;
  lightning: {
    channels: number;
    capacityBTC: number;
    nodes: number;
    avgChannelSize: number;
    torNodes: number;
    clearnetNodes: number;
    avgFeeRate: number;
    avgBaseFee: number;
    medCapacityBTC: number;
  } | null;
  fearGreed: {
    value: number;
    classification: string;
  } | null;
  onchain: {
    mvrv: number;
    exchangeInflow: number;
    exchangeOutflow: number;
    exchangeBalance: number;
    netFlow: number;
    interpretation: string;
    signal: 'bullish' | 'bearish' | 'neutral';
  } | null;
  indices: Record<string, { name: string; price: number; changePct: number }> | null;
  commodities: Record<string, { name: string; price: number; changePct: number }> | null;
  fx: Record<string, { name: string; price: number; changePct: number }> | null;
  rates: { country: string; rate: number; lastUpdated: string }[] | null;
  whales: { txid: string; valueBTC: number; valueUSD: number; time: number }[] | null;
  btcEquities: Record<string, { name: string; price: number; changePct: number }> | null;
  timestamp: number;
}

const REFRESH_INTERVAL = 60_000; // 60 seconds

/**
 * Client-side hook that fetches /api/data/snapshot and auto-refreshes.
 * All panels consume from this single shared state.
 */
export function useSnapshot() {
  const [data, setData] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/data/snapshot', { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      // Keep stale data visible
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  return { data, loading, error, refresh };
}
