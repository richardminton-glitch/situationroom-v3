/**
 * GET /api/data/puell
 * Returns 90 days of the Puell Multiple with zone context.
 *
 * Puell Multiple = daily miner revenue (USD) / 365-day MA of daily miner revenue
 *
 * Computation:
 *   daily_revenue = current_block_subsidy x 144 blocks x price_USD
 *   Since April 2024 halving: block_subsidy = 3.125 BTC
 *
 * Data: BRK `price` series (daily, in USD) via bitview.space
 * We fetch 455 days to warm the 365d MA then return the last 90.
 *
 * Zones (Charles Edwards / Glassnode convention):
 *   < 0.5  -- Extreme undervalue (capitulation)
 *   0.5-1  -- Undervalue (accumulation)
 *   1-2    -- Normal
 *   2-4    -- Elevated (caution)
 *   > 4    -- Extreme overvalue (euphoria)
 *
 * Cache: file-based via shared BRK helper, 1-hour TTL.
 */

import { NextResponse } from 'next/server';
import { fetchBrkSeries, brkOffsetToDate } from '@/lib/data/brk';

export const dynamic = 'force-dynamic';

const DISPLAY_DAYS  = 90;
const MA_WINDOW     = 365;
const FETCH_DAYS    = DISPLAY_DAYS + MA_WINDOW; // warm-up + display

// Block subsidy per epoch (approximate -- halving dates)
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

function puellZone(v: number): PuellPoint['zone'] {
  if (v < 0.5)  return 'extreme-low';
  if (v < 1.0)  return 'undervalue';
  if (v < 2.0)  return 'normal';
  if (v < 4.0)  return 'elevated';
  return 'extreme-high';
}

function processRawData(seriesData: Record<string, number[]>, dates: string[]): PuellResponse {
  const prices    = (seriesData['price'] ?? []).map((v) => v ?? 0);
  if (!prices.length) throw new Error('BRK: empty price series');

  const revenues  = prices.map((p) => BLOCK_SUBSIDY_BTC * BLOCKS_PER_DAY * p);
  const ma365vals = sma365(revenues);

  const points: PuellPoint[] = [];
  const startIdx = prices.length - DISPLAY_DAYS;
  for (let i = Math.max(0, startIdx); i < prices.length; i++) {
    const ma = ma365vals[i];
    if (isNaN(ma) || ma === 0) continue;
    const puell = revenues[i] / ma;
    points.push({
      date:  dates[i] ?? brkOffsetToDate(i),
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

export async function GET() {
  try {
    const raw = await fetchBrkSeries({
      series: ['price'],
      days: FETCH_DAYS,
      cacheFile: 'puell-raw-cache.json',
    });

    const result = processRawData(raw.seriesData, raw.dates);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[puell] Fetch failed:', (err as Error).message);
    return NextResponse.json(
      { data: [], current: 0, currentZone: 'normal', signal: 'neutral' },
      { status: 503 }
    );
  }
}
