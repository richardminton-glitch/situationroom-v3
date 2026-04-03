/**
 * GET /api/data/hash-ribbon
 * Returns 90 days of Bitcoin hash rate history with 30d/60d moving averages.
 * Hash Ribbon signal: 30d MA crossing above 60d MA = miner capitulation recovery.
 *
 * Data sources (in priority order):
 *  1. BRK (bitview.space) — `hashrate` series (H/s, daily)
 *  2. Blockchain.info charts API — fallback
 *
 * Cache: file-based via shared BRK helper, 1-hour TTL.
 */

import { NextResponse } from 'next/server';
import { fetchBrkSeries, brkOffsetToDate } from '@/lib/data/brk';

export const dynamic = 'force-dynamic';

const DISPLAY_DAYS = 90;
const FETCH_DAYS   = DISPLAY_DAYS + 60; // 60d warm-up for MA

export interface HashRibbonPoint {
  date: string;
  hashrate: number;  // EH/s
  ma30:     number;  // 30d simple MA
  ma60:     number;  // 60d simple MA
}

export interface HashRibbonResponse {
  data:             HashRibbonPoint[];
  signal:           'bullish' | 'bearish' | 'neutral';
  currentHashrate:  number;  // EH/s
  currentMa30:      number;
  currentMa60:      number;
}

function sma(values: number[], window: number): number[] {
  return values.map((_, i) => {
    if (i < window - 1) return NaN;
    let s = 0;
    for (let j = i - window + 1; j <= i; j++) s += values[j];
    return s / window;
  });
}

// ── BRK fetch ─────────────────────────────────────────────────────────────────

function processHashrateData(seriesData: Record<string, number[]>, dates: string[]): HashRibbonResponse {
  const rawData = seriesData['hashrate'] ?? [];
  if (!rawData.length) throw new Error('BRK: empty hashrate series');

  const rawEH    = rawData.map((v) => (v ?? 0) / 1e18);
  const ma30vals = sma(rawEH, 30);
  const ma60vals = sma(rawEH, 60);

  const points: HashRibbonPoint[] = [];
  const startIdx = rawEH.length - DISPLAY_DAYS;
  for (let i = Math.max(0, startIdx); i < rawEH.length; i++) {
    const ma30 = ma30vals[i];
    const ma60 = ma60vals[i];
    if (isNaN(ma30) || isNaN(ma60)) continue;
    points.push({
      date:     dates[i] ?? brkOffsetToDate(i),
      hashrate: Math.round(rawEH[i] * 10) / 10,
      ma30:     Math.round(ma30 * 10) / 10,
      ma60:     Math.round(ma60 * 10) / 10,
    });
  }

  if (points.length < 20) throw new Error('BRK: insufficient hashrate points');

  const last   = points[points.length - 1];
  const signal = last.ma30 > last.ma60 ? 'bullish' : last.ma30 < last.ma60 ? 'bearish' : 'neutral';

  return { data: points, signal, currentHashrate: last.hashrate, currentMa30: last.ma30, currentMa60: last.ma60 };
}

async function fetchFromBRK(): Promise<HashRibbonResponse> {
  const raw = await fetchBrkSeries({
    series: ['hashrate'],
    days: FETCH_DAYS,
    cacheFile: 'hash-ribbon-raw-cache.json',
  });

  return processHashrateData(raw.seriesData, raw.dates);
}

// ── Blockchain.info fallback ──────────────────────────────────────────────────

async function fetchFromBlockchainInfo(): Promise<HashRibbonResponse> {
  const url = `https://api.blockchain.info/charts/hash-rate?timespan=180days&format=json&cors=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`blockchain.info: HTTP ${res.status}`);

  const json = (await res.json()) as { values: { x: number; y: number }[] };
  const vals  = json.values;
  // blockchain.info returns GH/s historically
  const rawEH    = vals.map((v) => v.y / 1e9);   // GH/s → EH/s
  const ma30vals = sma(rawEH, 30);
  const ma60vals = sma(rawEH, 60);

  const points: HashRibbonPoint[] = vals
    .map((v, i) => ({
      date:     new Date(v.x * 1000).toISOString().slice(0, 10),
      hashrate: Math.round(rawEH[i] * 10) / 10,
      ma30:     Math.round((ma30vals[i] ?? 0) * 10) / 10,
      ma60:     Math.round((ma60vals[i] ?? 0) * 10) / 10,
    }))
    .filter((p) => p.ma30 > 0 && p.ma60 > 0)
    .slice(-DISPLAY_DAYS);

  const last   = points[points.length - 1];
  const signal = last?.ma30 > last?.ma60 ? 'bullish' : last?.ma30 < last?.ma60 ? 'bearish' : 'neutral';

  return {
    data: points,
    signal,
    currentHashrate: last?.hashrate ?? 0,
    currentMa30: last?.ma30 ?? 0,
    currentMa60: last?.ma60 ?? 0,
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET() {
  let result: HashRibbonResponse;
  try {
    result = await fetchFromBRK();
  } catch (brkErr) {
    console.warn('[hash-ribbon] BRK failed, trying fallback:', (brkErr as Error).message);
    try {
      result = await fetchFromBlockchainInfo();
    } catch (fbErr) {
      console.error('[hash-ribbon] Both sources failed:', (fbErr as Error).message);
      return NextResponse.json(
        { data: [], signal: 'neutral', currentHashrate: 0, currentMa30: 0, currentMa60: 0 },
        { status: 503 }
      );
    }
  }

  return NextResponse.json(result);
}
