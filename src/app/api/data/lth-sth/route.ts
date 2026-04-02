import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

// BRK (Bitcoin Research Kit) — bitview.space
// Series used:
//   lth_supply  — BTC held by Long-Term Holders (coins unmoved > ~155 days, BRK convention)
//   sth_supply  — BTC held by Short-Term Holders (coins moved within ~155 days)
//   supply      — Total circulating supply in BTC
//
// LTH threshold: The 155-day convention is the Bitcoin analytics industry standard.
// BRK's lth_supply / sth_supply series use this threshold (confirmed by series naming
// consistent with Glassnode / Checkmate definitions).
//
// Data is positionally indexed from genesis (Jan 3 2009 = offset 0).
// Probe first series to discover total length, then back-calculate start offset.

const BRK_BASE = 'https://bitview.space/api/series/bulk';
const ONE_HOUR  = 60 * 60 * 1000;
const CACHE_FILE = join(process.cwd(), 'data', 'lth-sth-cache.json');
const GENESIS_MS = Date.UTC(2009, 0, 3);

const SERIES = ['lth_supply', 'sth_supply', 'supply'] as const;

export interface LTHSTHPoint {
  date: string;
  lth: number;
  sth: number;
  lthPct: number;
  sthPct: number;
  totalSupply: number;
}

type CacheShape = LTHSTHPoint[];

function offsetToDate(offset: number): string {
  return new Date(GENESIS_MS + offset * 86_400_000).toISOString().slice(0, 10);
}

function readCache(): { data: CacheShape; fetchedAt: number } | null {
  try {
    const stat = statSync(CACHE_FILE);
    const json = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
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
    console.warn('[lth-sth] Could not write cache:', e);
  }
}

async function fetchFromBRK(days = 365): Promise<CacheShape> {
  // Step 1: probe to discover total data points (same pattern as utxo-age route)
  const probeUrl = `https://bitview.space/api/series/${SERIES[0]}/day1?limit=1`;
  const probeRes = await fetch(probeUrl, { signal: AbortSignal.timeout(10_000) });
  if (!probeRes.ok) throw new Error(`BRK probe: HTTP ${probeRes.status}`);
  const probe = (await probeRes.json()) as { total: number };
  const total = probe.total;
  const startOffset = Math.max(0, total - days);

  // Step 2: bulk fetch all three series from startOffset
  const url =
    `${BRK_BASE}?series=${SERIES.join(',')}&index=day1` +
    `&start=${startOffset}&limit=${days}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`BRK bulk: HTTP ${res.status}`);

  const bulk = (await res.json()) as Array<{ start: number; data: (number | null)[] }>;

  if (!Array.isArray(bulk) || bulk.length !== SERIES.length) {
    throw new Error(`BRK bulk: expected ${SERIES.length} series, got ${bulk?.length}`);
  }

  const numPoints      = bulk[0].data.length;
  const dataStartOffset = bulk[0].start;
  const result: CacheShape = [];

  for (let i = 0; i < numPoints; i++) {
    const date        = offsetToDate(dataStartOffset + i);
    const lth         = bulk[0].data[i] ?? 0;
    const sth         = bulk[1].data[i] ?? 0;
    // Fall back to lth+sth if supply series has a null (shouldn't happen, but safe)
    const totalSupply = bulk[2].data[i] ?? (lth + sth);

    const lthPct = totalSupply > 0
      ? Math.round((lth / totalSupply) * 10_000) / 100
      : 0;
    const sthPct = totalSupply > 0
      ? Math.round((sth / totalSupply) * 10_000) / 100
      : 0;

    result.push({ date, lth, sth, lthPct, sthPct, totalSupply });
  }

  console.log(`[lth-sth] Fetched ${result.length} days, latest: ${result.at(-1)?.date}`);
  return result;
}

export async function GET() {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < ONE_HOUR) {
    return NextResponse.json(cached.data);
  }

  try {
    const data = await fetchFromBRK(365);
    writeCache(data);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[lth-sth] Fetch failed:', (err as Error).message);
    if (cached) {
      console.log('[lth-sth] Serving stale cache');
      return NextResponse.json(cached.data);
    }
    return NextResponse.json([], { status: 503 });
  }
}
