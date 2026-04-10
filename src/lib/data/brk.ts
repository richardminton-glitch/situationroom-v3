/**
 * BRK (Bitcoin Research Kit — bitview.space) Shared Data Fetcher
 *
 * Extracts the common probe → bulk-fetch → file-cache pattern used by
 * 7 data routes: cdd, hash-ribbon, urpd, lth-sth, puell, network-signals, utxo-age.
 *
 * Usage:
 *   const raw = await fetchBrkSeries({
 *     series: ['sopr', 'active_addresses'],
 *     probeSeries: 'sopr',
 *     days: 67,
 *     cacheFile: 'network-signals-cache.json',
 *   });
 *   // raw = { seriesData: { sopr: number[], active_addresses: number[] }, dates: string[], fromCache: boolean }
 */

import * as fs from 'fs';
import * as path from 'path';

const BRK_BASE = 'https://bitview.space/api/series';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const FETCH_TIMEOUT = 15_000;

// ── Types ──────────────────────────────────────────────────────────────────────

export interface BrkFetchOptions {
  /** One or more series names to fetch */
  series: string[];
  /** Which series to use for the probe (total discovery). Defaults to first series. */
  probeSeries?: string;
  /** Total days of data to fetch (display + warmup combined) */
  days: number;
  /** File name within data/ directory (e.g. 'cdd-cache.json') */
  cacheFile: string;
  /** Override cache TTL in ms (default: 1 hour) */
  cacheTtl?: number;
}

export interface BrkSeriesResult {
  /** Map of series name → array of numeric values, aligned by index */
  seriesData: Record<string, number[]>;
  /** ISO date strings (YYYY-MM-DD) corresponding to each data index */
  dates: string[];
  /** Whether this was served from file cache */
  fromCache: boolean;
  /** The total number of data points available on BRK for the probed series */
  totalAvailable: number;
}

interface BrkBulkEntry {
  name?: string;
  start: number;
  data: number[];
}

interface FileCache {
  result: BrkSeriesResult;
  savedAt: number;
}

// ── Date helpers ───────────────────────────────────────────────────────────────

/** BRK day1 index epoch: 2009-01-01 (NOT the genesis block — BRK uses calendar start) */
const BRK_EPOCH = new Date('2009-01-01T00:00:00Z');

/** Convert BRK day1 offset to ISO date string */
export function brkOffsetToDate(offset: number): string {
  const d = new Date(BRK_EPOCH.getTime() + offset * 86_400_000);
  return d.toISOString().split('T')[0];
}

// ── File cache ─────────────────────────────────────────────────────────────────

function cachePath(filename: string): string {
  return path.join(process.cwd(), 'data', filename);
}

function readCache(filename: string, ttl: number): BrkSeriesResult | null {
  try {
    const raw = fs.readFileSync(cachePath(filename), 'utf-8');
    const cached = JSON.parse(raw) as FileCache;
    if (Date.now() - cached.savedAt < ttl) {
      return { ...cached.result, fromCache: true };
    }
  } catch { /* no file or corrupt */ }
  return null;
}

function readStaleCache(filename: string): BrkSeriesResult | null {
  try {
    const raw = fs.readFileSync(cachePath(filename), 'utf-8');
    const cached = JSON.parse(raw) as FileCache;
    return { ...cached.result, fromCache: true };
  } catch { return null; }
}

function writeCache(filename: string, result: BrkSeriesResult): void {
  try {
    const dir = path.dirname(cachePath(filename));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cachePath(filename), JSON.stringify({ result, savedAt: Date.now() } as FileCache));
  } catch { /* non-fatal */ }
}

// ── Fetch helpers ──────────────────────────────────────────────────────────────

async function brkFetch<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`BRK HTTP ${res.status}: ${url}`);
    return await res.json() as T;
  } finally {
    clearTimeout(timer);
  }
}

// ── Main fetcher ───────────────────────────────────────────────────────────────

/**
 * Fetch one or more BRK series with the standard probe → bulk pattern.
 * Returns aligned arrays of values and ISO dates.
 */
export async function fetchBrkSeries(opts: BrkFetchOptions): Promise<BrkSeriesResult> {
  const { series, days, cacheFile, cacheTtl = CACHE_TTL } = opts;

  // 1. Check file cache
  const cached = readCache(cacheFile, cacheTtl);
  if (cached) return cached;

  try {
    // 2. Bulk fetch using relative start offset (BRK supports start=-N for last N days)
    const seriesParam = series.join(',');
    const fetchUrl = `${BRK_BASE}/bulk?series=${seriesParam}&index=day1&start=-${days}`;
    const rawBulk = await brkFetch<BrkBulkEntry | BrkBulkEntry[]>(fetchUrl);

    // BRK returns a single object for 1 series, or an array for multiple
    const bulk: BrkBulkEntry[] = Array.isArray(rawBulk) ? rawBulk : [rawBulk];

    // 3. Parse into aligned arrays
    // BRK bulk entries don't include a 'name' field — map by position to requested series
    const seriesData: Record<string, number[]> = {};
    let maxLen = 0;
    let baseStart = 0;

    for (let idx = 0; idx < bulk.length; idx++) {
      const entry = bulk[idx];
      const seriesName = entry.name ?? series[idx] ?? `unknown_${idx}`;
      seriesData[seriesName] = entry.data;
      if (entry.data.length > maxLen) {
        maxLen = entry.data.length;
        baseStart = entry.start;
      }
    }

    // 4. Generate date array
    const dates: string[] = [];
    for (let i = 0; i < maxLen; i++) {
      dates.push(brkOffsetToDate(baseStart + i));
    }

    const result: BrkSeriesResult = {
      seriesData,
      dates,
      fromCache: false,
      totalAvailable: maxLen,
    };

    // 5. Write cache
    writeCache(cacheFile, result);

    return result;
  } catch (err) {
    console.error(`[BRK] Fetch failed for ${series.join(',')}:`, err);

    // Serve stale cache as fallback
    const stale = readStaleCache(cacheFile);
    if (stale) {
      console.warn(`[BRK] Serving stale cache for ${cacheFile}`);
      return stale;
    }

    throw err;
  }
}
