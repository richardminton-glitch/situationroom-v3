import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

// BRK (Bitcoin Research Kit) — bitview.space
// Series used:
//   vocdd            — Value of Coin Days Destroyed (CDD × USD price at time of spend)
//   vocdd_average_1m — 30-day rolling average of VOCDD, pre-computed by BRK
//
// VOCDD answers: "how much economic dormancy was destroyed today?" rather than the raw
// chain-mechanic count of classic CDD. More legible for a macro-intelligence audience.
//
// The 30-day MA is fetched directly — NOT calculated server-side — because BRK provides
// vocdd_average_1m as a first-class series. This keeps the route lean and the MA accurate.
//
// supplyAdjusted is hardcoded false — BRK does not expose a supply-adjusted CDD variant.

const BRK_BASE  = 'https://bitview.space/api/series/bulk';
const ONE_HOUR  = 60 * 60 * 1000;
const CACHE_FILE = join(process.cwd(), 'data', 'cdd-cache.json');
const GENESIS_MS = Date.UTC(2009, 0, 3);

const SERIES = ['vocdd', 'vocdd_average_1m'] as const;

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

async function fetchFromBRK(days = 90): Promise<CacheShape> {
  // Probe to discover total data points available (same pattern as utxo-age / lth-sth routes)
  const probeUrl = `https://bitview.space/api/series/${SERIES[0]}/day1?limit=1`;
  const probeRes = await fetch(probeUrl, { signal: AbortSignal.timeout(10_000) });
  if (!probeRes.ok) throw new Error(`BRK probe: HTTP ${probeRes.status}`);
  const probe = (await probeRes.json()) as { total: number };
  const total       = probe.total;
  const startOffset = Math.max(0, total - days);

  const url =
    `${BRK_BASE}?series=${SERIES.join(',')}&index=day1` +
    `&start=${startOffset}&limit=${days}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`BRK bulk: HTTP ${res.status}`);

  const bulk = (await res.json()) as Array<{ start: number; data: (number | null)[] }>;

  if (!Array.isArray(bulk) || bulk.length !== SERIES.length) {
    throw new Error(`BRK bulk: expected ${SERIES.length} series, got ${bulk?.length}`);
  }

  const numPoints       = bulk[0].data.length;
  const dataStartOffset = bulk[0].start;
  const points: CDDPoint[] = [];

  for (let i = 0; i < numPoints; i++) {
    const vocdd = bulk[0].data[i] ?? 0;
    const ma30  = bulk[1].data[i] ?? 0;
    // Skip days where both values are zero/null (sparse early data)
    if (vocdd === 0 && ma30 === 0) continue;
    points.push({ date: offsetToDate(dataStartOffset + i), vocdd, ma30 });
  }

  console.log(`[cdd] Fetched ${points.length} days, latest: ${points.at(-1)?.date}`);
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
