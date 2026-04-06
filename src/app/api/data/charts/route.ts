import { NextResponse } from 'next/server';
import { fetchJSON } from '@/lib/data/fetcher';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface ChartPoint {
  time: number; // unix ms
  value: number;
}

const HIST_FILE = path.join(process.cwd(), 'data', 'btc-price-history.ndjson');
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Read BTC price history from the local NDJSON log file.
 * Returns the last `days` days of data, sorted ascending.
 * Returns [] if the file doesn't exist or has insufficient data.
 */
function readLocalBtcHistory(days = 30): ChartPoint[] {
  try {
    if (!fs.existsSync(HIST_FILE)) return [];
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const lines  = fs.readFileSync(HIST_FILE, 'utf8').trim().split('\n');
    const points: ChartPoint[] = [];
    for (const line of lines) {
      try {
        const { t, v } = JSON.parse(line);
        if (t >= cutoff) points.push({ time: t, value: v });
      } catch { /* skip malformed lines */ }
    }
    return points.sort((a, b) => a.time - b.time);
  } catch {
    return [];
  }
}

/**
 * GET /api/data/charts
 * Returns chart data for 4 dashboard charts:
 * - BTC 30-day price
 * - Hashrate 30-day
 * - MVRV 90-day
 * - Exchange balance 30-day
 */
export async function GET() {
  // Prefer local NDJSON log (15-min granularity, grows over time).
  // Fall back to CoinGecko — omitting &interval forces hourly for days<=90.
  // Only use local data if it's fresh (most recent point within 2 hours) AND
  // has enough points to render a useful chart.
  const localBtc = readLocalBtcHistory(30);
  const latestLocal = localBtc.length > 0 ? localBtc[localBtc.length - 1].time : 0;
  const localFresh  = Date.now() - latestLocal < 2 * 60 * 60 * 1000; // within 2 hours
  const useLocal    = localBtc.length >= 100 && localFresh;

  const results = await Promise.allSettled([
    // BTC price 30d — skip remote fetch if local history is rich enough
    useLocal
      ? Promise.resolve({ prices: localBtc.map((p) => [p.time, p.value] as [number, number]), total_volumes: [] as [number,number][] })
      : fetchJSON<{ prices: [number, number][]; total_volumes: [number, number][] }>(
          'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30',
          { cacheKey: 'chart-btc30d', cacheDuration: 600_000 }
        ),
    // Hashrate 30d from Mempool.space
    fetchJSON<{ hashrates: { avgHashrate: number; timestamp: number }[] }>(
      'https://mempool.space/api/v1/mining/hashrate/1m',
      { cacheKey: 'chart-hashrate', cacheDuration: 600_000 }
    ),
    // MVRV 90d from CoinMetrics
    fetchJSON<{ data: { time: string; CapMVRVCur?: string }[] }>(
      `https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=CapMVRVCur&start_time=${new Date(Date.now() - 90 * 86400_000).toISOString().split('T')[0]}&frequency=1d`,
      { cacheKey: 'chart-mvrv', cacheDuration: 900_000, timeout: 30_000 }
    ),
    // Exchange balance 30d from CoinMetrics
    fetchJSON<{ data: { time: string; SplyExNtv?: string }[] }>(
      `https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=SplyExNtv&start_time=${new Date(Date.now() - 30 * 86400_000).toISOString().split('T')[0]}&frequency=1d`,
      { cacheKey: 'chart-exchange', cacheDuration: 900_000, timeout: 30_000 }
    ),
  ]);

  const btcChart: ChartPoint[] = useLocal
    ? localBtc
    : results[0].status === 'fulfilled'
      ? results[0].value.prices.map(([t, v]) => ({ time: t, value: v }))
      : [];

  const volumeChart: ChartPoint[] = results[0].status === 'fulfilled'
    ? results[0].value.total_volumes.map(([t, v]) => ({ time: t, value: v }))
    : [];

  const hashrateChart: ChartPoint[] = results[1].status === 'fulfilled'
    ? results[1].value.hashrates.map((h) => ({ time: h.timestamp * 1000, value: h.avgHashrate / 1e18 }))
    : [];

  const mvrvChart: ChartPoint[] = results[2].status === 'fulfilled'
    ? results[2].value.data
        .filter((d) => d.CapMVRVCur)
        .map((d) => ({ time: new Date(d.time).getTime(), value: parseFloat(d.CapMVRVCur!) }))
    : [];

  const exchangeChart: ChartPoint[] = results[3].status === 'fulfilled'
    ? results[3].value.data
        .filter((d) => d.SplyExNtv)
        .map((d) => ({ time: new Date(d.time).getTime(), value: parseFloat(d.SplyExNtv!) / 1000 }))
    : [];

  return NextResponse.json({
    btcPrice: btcChart,
    volume: volumeChart,
    hashrate: hashrateChart,
    mvrv: mvrvChart,
    exchange: exchangeChart,
  });
}
