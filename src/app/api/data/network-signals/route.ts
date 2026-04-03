/**
 * GET /api/data/network-signals
 * Returns SOPR (Spent Output Profit Ratio) and Active Addresses with 7d MAs.
 *
 * Data: BRK (bitview.space) series
 *   sopr             — daily SOPR (ratio of price received vs paid for spent UTXOs)
 *   active_addresses — daily unique active addresses (sending + receiving)
 *
 * SOPR interpretation:
 *   > 1.0  — UTXOs spent at profit (holders in profit, healthy)
 *   = 1.0  — Break-even (support/resistance level)
 *   < 1.0  — UTXOs spent at loss (capitulation signal if sustained)
 *   < 0.97 — Extreme loss-spending (strong capitulation zone)
 *
 * Cache: file-based, 1-hour TTL.
 */

import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const ONE_HOUR      = 60 * 60 * 1000;
const CACHE_FILE    = join(process.cwd(), 'data', 'network-signals-cache.json');
const GENESIS_MS    = Date.UTC(2009, 0, 3);
const BRK_BASE      = 'https://bitview.space/api/series/bulk';
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

function offsetToDate(offset: number): string {
  return new Date(GENESIS_MS + offset * 86_400_000).toISOString().slice(0, 10);
}

async function fetchFromBRK(): Promise<NetworkSignalsResponse> {
  // Probe using sopr series
  const probeUrl = `https://bitview.space/api/series/sopr/day1?limit=1`;
  const probeRes = await fetch(probeUrl, { signal: AbortSignal.timeout(8_000) });
  if (!probeRes.ok) throw new Error(`BRK probe (sopr): HTTP ${probeRes.status}`);
  const probe    = (await probeRes.json()) as { total: number };
  const total    = probe.total;
  const start    = Math.max(0, total - FETCH_DAYS);

  // Fetch SOPR + active_addresses in parallel bulk request
  const url = `${BRK_BASE}?series=sopr,active_addresses&index=day1&start=${start}&limit=${FETCH_DAYS}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`BRK bulk: HTTP ${res.status}`);

  const bulk = (await res.json()) as Array<{ start: number; data: (number | null)[] }>;
  if (!Array.isArray(bulk) || bulk.length < 2) throw new Error('BRK: expected 2 series');

  const soprSeries   = bulk[0];
  const activeSeries = bulk[1];
  const dataStart    = soprSeries.start;

  const soprVals   = soprSeries.data.map((v) => v ?? 1);        // default 1 = neutral
  const activeVals = activeSeries.data.map((v) => v ?? 0);

  const soprMa7vals   = sma7(soprVals);
  const activeMa7vals = sma7(activeVals);

  const points: NetworkSignalPoint[] = [];
  const startIdx = soprVals.length - DISPLAY_DAYS;
  for (let i = Math.max(0, startIdx); i < soprVals.length; i++) {
    const soprMa7   = soprMa7vals[i];
    const activeMa7 = activeMa7vals[i];
    if (isNaN(soprMa7) || isNaN(activeMa7)) continue;
    points.push({
      date:               offsetToDate(dataStart + i),
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

function readCache(): { data: NetworkSignalsResponse; fetchedAt: number } | null {
  try {
    const stat = statSync(CACHE_FILE);
    const json = JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as NetworkSignalsResponse;
    return { data: json, fetchedAt: stat.mtimeMs };
  } catch {
    return null;
  }
}

function writeCache(data: NetworkSignalsResponse) {
  try {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch (e) {
    console.warn('[network-signals] Could not write cache:', e);
  }
}

export async function GET() {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < ONE_HOUR) {
    return NextResponse.json(cached.data);
  }

  try {
    const result = await fetchFromBRK();
    writeCache(result);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[network-signals] Fetch failed:', (err as Error).message);
    if (cached) return NextResponse.json(cached.data);
    return NextResponse.json(
      { data: [], currentSopr: 1, soprSignal: 'neutral', currentActive: 0, activeTrend: 'flat' },
      { status: 503 }
    );
  }
}
