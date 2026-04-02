import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

// BRK (Bitcoin Research Kit) — bitview.space
// Series used:
//   vocdd_sum_24h — 24-hour rolling sum of VOCDD per day (supports day1 index).
//                   This is the effective "daily VOCDD" value.
//                   Note: the bare `vocdd` series only supports the `height` (per-block)
//                   index; vocdd_sum_24h is the correct daily equivalent.
//
// NOTE on vocdd_average_1m: Although BRK pre-computes this series, it is the rolling
// average of per-block VOCDD values — NOT the 30-day average of daily VOCDD sums.
// The two series operate at different resolutions (~144 blocks/day), making
// vocdd_average_1m ~140× smaller than the daily sum. The 30-day MA is therefore
// calculated server-side from vocdd_sum_24h values, which is also what the original
// spec called for.
//
// We fetch 120 days (90 display + 30 warm-up) so the MA is fully populated from
// day 1 of the returned window.
//
// supplyAdjusted is hardcoded false — BRK does not expose a supply-adjusted CDD variant.

const BRK_BASE  = 'https://bitview.space/api/series/bulk';
const ONE_HOUR  = 60 * 60 * 1000;
const CACHE_FILE = join(process.cwd(), 'data', 'cdd-cache.json');
const GENESIS_MS = Date.UTC(2009, 0, 3);

const SERIES = ['vocdd_sum_24h'] as const;

export interface CDDPoint {
  date: string;
  vocdd: number;
  ma30: number;
}

export interface CDDResponse {
  data: CDDPoint[];
  supplyAdjusted: false;
}

type CacheShape = CDDResponse;

function offsetToDate(offset: number): string {
  return new Date(GENESIS_MS + offset * 86_400_000).toISOString().slice(0, 10);
}

function readCache(): { data: CacheShape; fetchedAt: number } | null {
  try {
    const stat = statSync(CACHE_FILE);
    const json = JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as CacheShape;
    return { data: json, fetchedAt: stat.mtimeMs };
  } catch {
    return null;
  }
}

function writeCache(data: CacheShape) {
  try {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch (e) {
    console.warn('[cdd] Could not write cache:', e);
  }
}

/** 30-day simple moving average. Returns NaN for the first 29 positions. */
function ma30(values: number[]): number[] {
  return values.map((_, i) => {
    if (i < 29) return NaN;
    let sum = 0;
    for (let j = i - 29; j <= i; j++) sum += values[j];
    return sum / 30;
  });
}

async function fetchFromBRK(displayDays = 90): Promise<CacheShape> {
  // Fetch 30 extra days as MA warm-up so the first display day has a full 30-day window
  const fetchDays = displayDays + 30;

  // Probe to discover total data points available (same pattern as utxo-age / lth-sth routes)
  const probeUrl = `https://bitview.space/api/series/${SERIES[0]}/day1?limit=1`;
  const probeRes = await fetch(probeUrl, { signal: AbortSignal.timeout(10_000) });
  if (!probeRes.ok) throw new Error(`BRK probe: HTTP ${probeRes.status}`);
  const probe = (await probeRes.json()) as { total: number };
  const total       = probe.total;
  const startOffset = Math.max(0, total - fetchDays);

  const url =
    `${BRK_BASE}?series=${SERIES[0]}&index=day1` +
    `&start=${startOffset}&limit=${fetchDays}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`BRK bulk: HTTP ${res.status}`);

  // Single-series bulk returns an array with one element
  const bulk = (await res.json()) as Array<{ start: number; data: (number | null)[] }>;
  const series = Array.isArray(bulk) ? bulk[0] : (bulk as unknown as { start: number; data: (number | null)[] });

  const rawValues = series.data.map((v) => v ?? 0);
  const maValues  = ma30(rawValues);
  const dataStartOffset = series.start;

  // Only return the last `displayDays` rows (skip the 30-day warm-up)
  const points: CDDPoint[] = [];
  const startIdx = rawValues.length - displayDays;

  for (let i = startIdx; i < rawValues.length; i++) {
    const vocdd = rawValues[i];
    const ma    = maValues[i];
    if (vocdd === 0 && (isNaN(ma) || ma === 0)) continue;
    points.push({
      date:  offsetToDate(dataStartOffset + i),
      vocdd,
      ma30:  isNaN(ma) ? 0 : Math.round(ma),
    });
  }

  console.log(`[cdd] Fetched ${points.length} display days, latest: ${points.at(-1)?.date}`);
  return { data: points, supplyAdjusted: false };
}

export async function GET() {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < ONE_HOUR) {
    return NextResponse.json(cached.data);
  }

  try {
    const payload = await fetchFromBRK(90);
    writeCache(payload);
    return NextResponse.json(payload);
  } catch (err) {
    console.error('[cdd] Fetch failed:', (err as Error).message);
    if (cached) {
      console.log('[cdd] Serving stale cache');
      return NextResponse.json(cached.data);
    }
    return NextResponse.json({ data: [], supplyAdjusted: false }, { status: 503 });
  }
}
