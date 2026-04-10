/**
 * bitview.space Puell Multiple series fetcher
 *
 * Fetches the full Puell Multiple history via the /date endpoint.
 * This is a DIFFERENT API shape from the BRK bulk endpoint used by brk.ts:
 *   /date  → calendar-aligned, ISO date params, full positional data array
 *   /bulk  → BRK day1 offset-aligned, used by fetchBrkSeries()
 * Do NOT use fetchBrkSeries() for this series.
 *
 * Cache strategy: 24h file cache at data/puell-series-cache.json
 * with stale-serving fallback (same pattern as brk.ts).
 */

import * as fs from 'fs';
import * as path from 'path';

const SERIES_URL_BASE  = 'https://bitview.space/api/series/puell_multiple/date';
const START_DATE       = '2010-07-18';
const CACHE_FILE       = 'puell-series-cache.json';
const CACHE_TTL        = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT    = 20_000;

export interface PuellSeriesResult {
  /** Daily Puell Multiple values — data[0] corresponds to START_DATE */
  values: number[];
  /** ISO date strings (YYYY-MM-DD) aligned 1:1 with values */
  dates: string[];
  fromCache: boolean;
}

interface BitviewResponse {
  data: number[];
  start?: number;
  end?: number;
  total?: number;
}

interface PuellFileCache {
  result: PuellSeriesResult;
  savedAt: number;
}

// ── File cache helpers ─────────────────────────────────────────────────────────

function cachePath(): string {
  return path.join(process.cwd(), 'data', CACHE_FILE);
}

function readCache(): PuellSeriesResult | null {
  try {
    const raw = fs.readFileSync(cachePath(), 'utf-8');
    const cached = JSON.parse(raw) as PuellFileCache;
    if (Date.now() - cached.savedAt < CACHE_TTL) {
      return { ...cached.result, fromCache: true };
    }
  } catch { /* no file or corrupt */ }
  return null;
}

function readStaleCache(): PuellSeriesResult | null {
  try {
    const raw = fs.readFileSync(cachePath(), 'utf-8');
    const cached = JSON.parse(raw) as PuellFileCache;
    return { ...cached.result, fromCache: true };
  } catch { return null; }
}

function writeCache(result: PuellSeriesResult): void {
  try {
    const dir = path.dirname(cachePath());
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cachePath(), JSON.stringify({ result, savedAt: Date.now() } as PuellFileCache));
  } catch { /* non-fatal */ }
}

// ── Date generation ────────────────────────────────────────────────────────────

function generateDates(count: number): string[] {
  const start = new Date(START_DATE + 'T00:00:00Z').getTime();
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    dates.push(new Date(start + i * 86_400_000).toISOString().slice(0, 10));
  }
  return dates;
}

// ── Main fetcher ───────────────────────────────────────────────────────────────

/**
 * Fetch the full Puell Multiple series from bitview.space.
 * Data[0] corresponds to 2010-07-18; each index is +1 calendar day.
 * Early values (before ~2012) are zero and should be treated as unavailable.
 */
export async function fetchPuellSeries(): Promise<PuellSeriesResult> {
  // 1. Check file cache
  const cached = readCache();
  if (cached) return cached;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const url = `${SERIES_URL_BASE}?start=${START_DATE}&end=${today}&format=json`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    let payload: BitviewResponse;
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`bitview.space HTTP ${res.status}`);
      payload = await res.json() as BitviewResponse;
    } finally {
      clearTimeout(timer);
    }

    const values = payload.data;
    const dates  = generateDates(values.length);

    const result: PuellSeriesResult = { values, dates, fromCache: false };

    writeCache(result);
    return result;

  } catch (err) {
    console.error('[PuellSeries] Fetch failed:', err);

    const stale = readStaleCache();
    if (stale) {
      console.warn('[PuellSeries] Serving stale cache');
      return stale;
    }

    throw err;
  }
}
