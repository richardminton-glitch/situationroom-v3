/**
 * GET /api/data/yield-spread
 *
 * 10-Year Treasury Constant Maturity Minus 3-Month Treasury Bill (T10Y3M)
 * — the yield-curve spread the NY Fed uses for its recession-probability
 * model. Inverted (< 0) historically precedes recession by 6-18 months.
 *
 * Source: FRED series T10Y3M, daily, percentage points.
 * Window: trailing 12 months (rolls forward each refresh).
 * Cache: 24h file-based — FRED only updates once per business day.
 */

import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const SERIES_ID = 'T10Y3M';
const ONE_DAY = 24 * 60 * 60 * 1000;

interface SpreadPoint { time: number; value: number; }
interface SpreadPayload { series: SpreadPoint[]; latest: SpreadPoint | null; }

const CACHE_FILE = join(process.cwd(), 'data', 'yield-spread-cache.json');

function readCache(): { data: SpreadPayload; fetchedAt: number } | null {
  try {
    const stat = statSync(CACHE_FILE);
    const json = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    return { data: json, fetchedAt: stat.mtimeMs };
  } catch { return null; }
}

function writeCache(data: SpreadPayload) {
  try {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch (e) {
    console.warn('[yield-spread] Could not write cache:', e);
  }
}

async function fetchFromFred(): Promise<SpreadPayload> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error('FRED_API_KEY not set');

  const start = new Date(Date.now() - 365 * ONE_DAY).toISOString().slice(0, 10);
  const url = `${FRED_BASE}?series_id=${SERIES_ID}&observation_start=${start}&api_key=${apiKey}&file_type=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${SERIES_ID}: HTTP ${res.status}`);

  const json = await res.json();
  const raw: { date: string; value: string }[] = json.observations ?? [];
  const series: SpreadPoint[] = raw
    .filter((o) => o.value !== '.' && !isNaN(parseFloat(o.value)))
    .map((o) => ({ time: new Date(o.date + 'T00:00:00Z').getTime(), value: parseFloat(o.value) }))
    .sort((a, b) => a.time - b.time);

  return { series, latest: series.at(-1) ?? null };
}

export async function GET() {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < ONE_DAY) {
    return NextResponse.json(cached.data, {
      headers: { 'X-Cache': 'HIT', 'X-Cache-Age': String(Math.round((Date.now() - cached.fetchedAt) / 3600000)) + 'h' },
    });
  }

  try {
    const data = await fetchFromFred();
    writeCache(data);
    return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } });
  } catch (err) {
    console.error('[yield-spread] FRED fetch failed:', err);
    if (cached) {
      return NextResponse.json(cached.data, {
        headers: { 'X-Cache': 'STALE', 'X-Cache-Error': String(err) },
      });
    }
    return NextResponse.json({ error: 'Yield spread data unavailable' }, { status: 503 });
  }
}
