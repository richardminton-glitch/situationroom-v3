import { NextResponse } from 'next/server';
import { fetchJSON } from '@/lib/data/fetcher';

export const dynamic = 'force-dynamic';

interface ChartPoint {
  time: number; // unix ms
  value: number;
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
  const results = await Promise.allSettled([
    // BTC price 30d from CoinGecko
    fetchJSON<{ prices: [number, number][]; total_volumes: [number, number][] }>(
      'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily',
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

  const btcChart: ChartPoint[] = results[0].status === 'fulfilled'
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
