/**
 * GET /api/data/network-signals
 * Returns SOPR (Spent Output Profit Ratio) and Active Addresses with 7d MAs.
 *
 * Data: BRK (bitview.space) series
 *   sopr_24h         — daily SOPR (ratio of price received vs paid for spent UTXOs)
 *   addr_count_24h   — daily unique active addresses (sending + receiving)
 *
 * SOPR interpretation:
 *   > 1.0  — UTXOs spent at profit (holders in profit, healthy)
 *   = 1.0  — Break-even (support/resistance level)
 *   < 1.0  — UTXOs spent at loss (capitulation signal if sustained)
 *   < 0.97 — Extreme loss-spending (strong capitulation zone)
 *
 * Cache: file-based via shared BRK helper, 1-hour TTL.
 */

import { NextResponse } from 'next/server';
import { fetchBrkSeries, brkOffsetToDate } from '@/lib/data/brk';

export const dynamic = 'force-dynamic';

const DISPLAY_DAYS  = 60;
const FETCH_DAYS    = DISPLAY_DAYS + 7; // 7d MA warm-up

export interface NetworkSignalPoint {
  date:              string;
  sopr:              number;
  soprMa7:           number;
  activeAddresses:   number;
  activeAddressesMa7: number;
}

export interface NetworkSignalsResponse {
  data:              NetworkSignalPoint[];
  currentSopr:       number;
  soprSignal:        'bullish' | 'bearish' | 'neutral';
  currentActive:     number;
  activeTrend:       'rising' | 'falling' | 'flat';
}

function sma7(values: number[]): number[] {
  return values.map((_, i) => {
    if (i < 6) return NaN;
    let s = 0;
    for (let j = i - 6; j <= i; j++) s += values[j];
    return s / 7;
  });
}

function processRawData(seriesData: Record<string, number[]>, dates: string[]): NetworkSignalsResponse {
  const soprVals   = (seriesData['sopr_24h'] ?? []).map((v) => v ?? 1);            // default 1 = neutral
  const activeVals = (seriesData['addr_count_24h'] ?? []).map((v) => v ?? 0);

  const soprMa7vals   = sma7(soprVals);
  const activeMa7vals = sma7(activeVals);

  const points: NetworkSignalPoint[] = [];
  const startIdx = soprVals.length - DISPLAY_DAYS;
  for (let i = Math.max(0, startIdx); i < soprVals.length; i++) {
    const soprMa7   = soprMa7vals[i];
    const activeMa7 = activeMa7vals[i];
    if (isNaN(soprMa7) || isNaN(activeMa7)) continue;
    points.push({
      date:               dates[i] ?? brkOffsetToDate(i),
      sopr:               Math.round(soprVals[i] * 10000) / 10000,
      soprMa7:            Math.round(soprMa7 * 10000) / 10000,
      activeAddresses:    Math.round(activeVals[i]),
      activeAddressesMa7: Math.round(activeMa7),
    });
  }

  if (points.length < 10) throw new Error('BRK: insufficient data points');

  const last          = points[points.length - 1];
  const prev          = points[Math.max(0, points.length - 8)];

  const soprSignal    = last.soprMa7 >= 1.02
    ? 'bullish'
    : last.soprMa7 <= 0.98
    ? 'bearish'
    : 'neutral';

  const activeDiff    = last.activeAddressesMa7 - prev.activeAddressesMa7;
  const activeTrend   = activeDiff > prev.activeAddressesMa7 * 0.02
    ? 'rising'
    : activeDiff < -(prev.activeAddressesMa7 * 0.02)
    ? 'falling'
    : 'flat';

  return {
    data:          points,
    currentSopr:   last.sopr,
    soprSignal,
    currentActive: last.activeAddresses,
    activeTrend,
  };
}

export async function GET() {
  try {
    const raw = await fetchBrkSeries({
      series: ['sopr_24h', 'addr_count_24h'],
      probeSeries: 'sopr_24h',
      days: FETCH_DAYS,
      cacheFile: 'network-signals-raw-cache.json',
    });

    const result = processRawData(raw.seriesData, raw.dates);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[network-signals] Fetch failed:', (err as Error).message);
    return NextResponse.json(
      { data: [], currentSopr: 1, soprSignal: 'neutral', currentActive: 0, activeTrend: 'flat' },
      { status: 503 }
    );
  }
}
