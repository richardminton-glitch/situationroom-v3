/**
 * GET /api/data/gilt-spread
 *
 * UK gilt curve spread — 10-year gilt yield minus 3-month sterling
 * interbank rate. The UK analog of the NY Fed's recession-probability
 * T10Y3M series. Inversion (< 0) historically precedes UK recession.
 *
 * Sources (both FRED, monthly, OECD-curated):
 *   - IRLTLT01GBM156N — UK 10-year government bond yield, %
 *   - IR3TIB01GBM156N — UK 3-month interbank rate, %
 *
 * NB: UK 3-month T-bill series (IR3TTS01GBM156N) stopped updating in
 * 2017, so we use 3-month sterling interbank as the short-end proxy.
 * It tracks BOE Bank Rate closely.
 *
 * Window: trailing 24 months (rolls forward each refresh).
 * Cache: 24h file-based — series are monthly, daily refresh is plenty.
 */

import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const TEN_Y_ID  = 'IRLTLT01GBM156N';
const THREE_M_ID = 'IR3TIB01GBM156N';
const ONE_DAY = 24 * 60 * 60 * 1000;

interface SpreadPoint { time: number; value: number; }
interface SpreadPayload { series: SpreadPoint[]; latest: SpreadPoint | null; }

const CACHE_FILE = join(process.cwd(), 'data', 'gilt-spread-cache.json');

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
    console.warn('[gilt-spread] Could not write cache:', e);
  }
}

interface FredObs { date: string; value: string }

async function fetchSeries(seriesId: string, apiKey: string, start: string): Promise<Map<string, number>> {
  const url = `${FRED_BASE}?series_id=${seriesId}&observation_start=${start}&api_key=${apiKey}&file_type=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${seriesId}: HTTP ${res.status}`);
  const json = await res.json();
  const raw: FredObs[] = json.observations ?? [];
  const map = new Map<string, number>();
  for (const o of raw) {
    if (o.value === '.' || isNaN(parseFloat(o.value))) continue;
    map.set(o.date, parseFloat(o.value));
  }
  return map;
}

async function fetchFromFred(): Promise<SpreadPayload> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error('FRED_API_KEY not set');

  const start = new Date(Date.now() - 730 * ONE_DAY).toISOString().slice(0, 10);
  const [tenY, threeM] = await Promise.all([
    fetchSeries(TEN_Y_ID, apiKey, start),
    fetchSeries(THREE_M_ID, apiKey, start),
  ]);

  // Inner join on date — only emit a point where both series have an
  // observation (FRED can lag one series a month behind the other).
  const series: SpreadPoint[] = [];
  for (const [date, tenYVal] of tenY) {
    const threeMVal = threeM.get(date);
    if (threeMVal == null) continue;
    series.push({ time: new Date(date + 'T00:00:00Z').getTime(), value: tenYVal - threeMVal });
  }
  series.sort((a, b) => a.time - b.time);

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
    console.error('[gilt-spread] FRED fetch failed:', err);
    if (cached) {
      return NextResponse.json(cached.data, {
        headers: { 'X-Cache': 'STALE', 'X-Cache-Error': String(err) },
      });
    }
    return NextResponse.json({ error: 'Gilt spread data unavailable' }, { status: 503 });
  }
}
