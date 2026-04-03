/**
 * GET /api/data/puell
 * Returns 90 days of the Puell Multiple with zone context.
 *
 * Puell Multiple = daily miner revenue (USD) / 365-day MA of daily miner revenue
 *
 * Computation:
 *   daily_revenue = current_block_subsidy × 144 blocks × price_USD
 *   Since April 2024 halving: block_subsidy = 3.125 BTC
 *
 * Data: BRK `price` series (daily, in USD) via bitview.space
 * We fetch 400+ days to warm the 365d MA then return the last 90.
 *
 * Zones (Charles Edwards / Glassnode convention):
 *   < 0.5  — Extreme undervalue (capitulation)
 *   0.5–1  — Undervalue (accumulation)
 *   1–2    — Normal
 *   2–4    — Elevated (caution)
 *   > 4    — Extreme overvalue (euphoria)
 *
 * Cache: file-based, 1-hour TTL.
 */

import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const ONE_HOUR      = 60 * 60 * 1000;
const CACHE_FILE    = join(process.cwd(), 'data', 'puell-cache.json');
const GENESIS_MS    = Date.UTC(2009, 0, 3);
const BRK_BASE      = 'https://bitview.space/api/series/bulk';
const DISPLAY_DAYS  = 90;
const MA_WINDOW     = 365;
const FETCH_DAYS    = DISPLAY_DAYS + MA_WINDOW; // warm-up + display

// Block subsidy per epoch (approximate — halving dates)
// We keep it simple: use 3.125 post-2024 halving for all display days
// (the 365d MA naturally handles the pre/post-halving transition)
const BLOCKS_PER_DAY   = 144;
const BLOCK_SUBSIDY_BTC = 3.125;

export interface PuellPoint {
  date:   string;
  puell:  number;   // Puell Multiple value (2 decimals)
  price:  number;   // BTC price USD at that day
  zone:   'extreme-low' | 'undervalue' | 'normal' | 'elevated' | 'extreme-high';
}

export interface PuellResponse {
  data:         PuellPoint[];
  current:      number;
  currentZone:  PuellPoint['zone'];
  signal:       'bullish' | 'neutral' | 'bearish';
}

function sma365(values: number[]): number[] {
  return values.map((_, i) => {
    if (i < MA_WINDOW - 1) return NaN;
    let s = 0;
    for (let j = i - MA_WINDOW + 1; j <= i; j++) s += values[j];
    return s / MA_WINDOW;
  });
}

function offsetToDate(offset: number): string {
  return new Date(GENESIS_MS + offset * 86_400_000).toISOString().slice(0, 10);
}

function puellZone(v: number): PuellPoint['zone'] {
  if (v < 0.5)  return 'extreme-low';
  if (v < 1.0)  return 'undervalue';
  if (v < 2.0)  return 'normal';
  if (v < 4.0)  return 'elevated';
  return 'extreme-high';
}

async function fetchFromBRK(): Promise<PuellResponse> {
  // Probe to discover total available data points
  const probeUrl = `https://bitview.space/api/series/price/day1?limit=1`;
  const probeRes = await fetch(probeUrl, { signal: AbortSignal.timeout(8_000) });
  if (!probeRes.ok) throw new Error(`BRK probe: HTTP ${probeRes.status}`);
  const probe    = (await probeRes.json()) as { total: number };
  const total    = probe.total;
  const start    = Math.max(0, total - FETCH_DAYS);

  const url = `${BRK_BASE}?series=price&index=day1&start=${start}&limit=${FETCH_DAYS}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`BRK bulk: HTTP ${res.status}`);

  const bulk   = (await res.json()) as Array<{ start: number; data: (number | null)[] }>;
  const series = Array.isArray(bulk) ? bulk[0] : (bulk as unknown as { start: number; data: (number | null)[] });
  if (!series?.data?.length) throw new Error('BRK: empty price series');

  const prices    = series.data.map((v) => v ?? 0);
  const revenues  = prices.map((p) => BLOCK_SUBSIDY_BTC * BLOCKS_PER_DAY * p);
  const ma365vals = sma365(revenues);
  const dataStart = series.start;

  const points: PuellPoint[] = [];
  const startIdx = prices.length - DISPLAY_DAYS;
  for (let i = Math.max(0, startIdx); i < prices.length; i++) {
    const ma = ma365vals[i];
    if (isNaN(ma) || ma === 0) continue;
    const puell = revenues[i] / ma;
    points.push({
      date:  offsetToDate(dataStart + i),
      puell: Math.round(puell * 100) / 100,
      price: Math.round(prices[i]),
      zone:  puellZone(puell),
    });
  }

  if (points.length < 20) throw new Error('BRK: insufficient price data for Puell MA');

  const current     = points[points.length - 1].puell;
  const currentZone = points[points.length - 1].zone;
  const signal      = currentZone === 'extreme-low' || currentZone === 'undervalue'
    ? 'bullish'
    : currentZone === 'extreme-high' || currentZone === 'elevated'
    ? 'bearish'
    : 'neutral';

  return { data: points, current, currentZone, signal };
}

function readCache(): { data: PuellResponse; fetchedAt: number } | null {
  try {
    const stat = statSync(CACHE_FILE);
    const json = JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as PuellResponse;
    return { data: json, fetchedAt: stat.mtimeMs };
  } catch {
    return null;
  }
}

function writeCache(data: PuellResponse) {
  try {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch (e) {
    console.warn('[puell] Could not write cache:', e);
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
    console.error('[puell] Fetch failed:', (err as Error).message);
    if (cached) return NextResponse.json(cached.data);
    return NextResponse.json(
      { data: [], current: 0, currentZone: 'normal', signal: 'neutral' },
      { status: 503 }
    );
  }
}
