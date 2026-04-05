/**
 * GET /api/data/m2
 * M2 money supply — 3-year window, indexed to 100 at the earliest common point.
 *
 * FRED series:
 *   M2SL              — USA M2 (seasonally adjusted, monthly, billions USD) — absolute
 *   MABMM301EZM657S   — Euro Area M3 (monthly, growth rate previous period %)
 *   MABMM301GBM657S   — UK M3 (monthly, growth rate previous period %)
 *   MABMM301JPM657S   — Japan M3 (monthly, growth rate previous period %)
 *
 * The OECD absolute-value series (MABMM301*M189S) stopped updating after Nov 2023.
 * The growth-rate variants (M657S) remain current. For EU/UK/Japan we reconstruct
 * an indexed series by compounding MoM growth from a base of 100, which is exactly
 * what we display anyway.
 *
 * Cache: 7 days (file-based)
 */

import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const THREE_YEARS_AGO = new Date(Date.now() - 3 * 365.25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

// Series config: 'absolute' series get indexed to 100; 'growth' series get compounded from 100
interface SeriesCfg {
  id: string;
  key: string;
  mode: 'absolute' | 'growth';
}

const SERIES: SeriesCfg[] = [
  { id: 'M2SL',              key: 'USA',   mode: 'absolute' },
  { id: 'MABMM301EZM657S',  key: 'EU',    mode: 'growth'   },
  { id: 'MABMM301GBM657S',  key: 'UK',    mode: 'growth'   },
  { id: 'MABMM301JPM657S',  key: 'Japan', mode: 'growth'   },
];

type M2Data = Record<string, { time: number; value: number }[]>;

const CACHE_FILE = join(process.cwd(), 'data', 'm2-cache.json');

function readCache(): { data: M2Data; fetchedAt: number } | null {
  try {
    const stat = statSync(CACHE_FILE);
    const json = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    return { data: json, fetchedAt: stat.mtimeMs };
  } catch { return null; }
}

function writeCache(data: M2Data) {
  try {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch (e) {
    console.warn('[m2] Could not write cache:', e);
  }
}

/** Index an absolute-value series so first non-null point = 100 */
function indexTo100(points: { time: number; value: number }[]): { time: number; value: number }[] {
  const baseline = points[0]?.value;
  if (!baseline) return points;
  return points.map((p) => ({ time: p.time, value: (p.value / baseline) * 100 }));
}

/**
 * Reconstruct indexed series from month-over-month growth rates.
 * Each value is a percentage (e.g. 0.167 means +0.167% that month).
 * Start at 100 and compound forward.
 */
function compoundFromGrowth(points: { time: number; value: number }[]): { time: number; value: number }[] {
  if (points.length === 0) return [];
  const result: { time: number; value: number }[] = [];
  let level = 100;
  for (const p of points) {
    level = level * (1 + p.value / 100);
    result.push({ time: p.time, value: Math.round(level * 100) / 100 });
  }
  return result;
}

async function fetchFromFred(): Promise<M2Data> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error('FRED_API_KEY not set');

  const result: M2Data = {};

  await Promise.all(
    SERIES.map(async ({ id, key, mode }) => {
      const url = `${FRED_BASE}?series_id=${id}&observation_start=${THREE_YEARS_AGO}&api_key=${apiKey}&file_type=json&frequency=m`;
      const res = await fetch(url);
      if (!res.ok) { console.warn(`[m2] FRED ${id} returned ${res.status}`); return; }

      const json = await res.json();
      const raw: { date: string; value: string }[] = json.observations ?? [];

      const points = raw
        .filter((o) => o.value !== '.' && !isNaN(parseFloat(o.value)))
        .map((o) => ({ time: new Date(o.date).getTime(), value: parseFloat(o.value) }))
        .sort((a, b) => a.time - b.time);

      if (mode === 'absolute') {
        result[key] = indexTo100(points);
      } else {
        result[key] = compoundFromGrowth(points);
      }
    })
  );

  return result;
}

export async function GET() {
  // Try cache first
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < SEVEN_DAYS) {
    return NextResponse.json(cached.data, {
      headers: { 'X-Cache': 'HIT', 'X-Cache-Age': String(Math.round((Date.now() - cached.fetchedAt) / 3600000)) + 'h' },
    });
  }

  try {
    const data = await fetchFromFred();
    writeCache(data);
    return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } });
  } catch (err) {
    console.error('[m2] FRED fetch failed:', err);
    if (cached) {
      return NextResponse.json(cached.data, {
        headers: { 'X-Cache': 'STALE', 'X-Cache-Error': String(err) },
      });
    }
    return NextResponse.json({ error: 'M2 data unavailable' }, { status: 503 });
  }
}
