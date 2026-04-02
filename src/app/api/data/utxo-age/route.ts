import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

// BRK (Bitcoin Research Kit) — bitview.space
// Bulk endpoint: /api/series/bulk?series=s1,s2,...&index=day1&start=YYYYMMDD&limit=N
// Data is positionally indexed from genesis (Jan 3, 2009 = offset 0).
// Values are in BTC (float). Nulls where no data.
// Date reconstruction: Date.UTC(2009,0,3) + offset * 86400_000

const BRK_BASE = 'https://bitview.space/api/series/bulk';
const ONE_HOUR = 60 * 60 * 1000;
const CACHE_FILE = join(process.cwd(), 'data', 'utxo-age-cache.json');

// Genesis timestamp (Jan 3 2009 00:00:00 UTC)
const GENESIS_MS = Date.UTC(2009, 0, 3);

// All 21 source series in fixed order — order is preserved in bulk response
const ALL_SERIES = [
  'utxos_under_1h_old_supply',
  'utxos_1h_to_1d_old_supply',
  'utxos_1d_to_1w_old_supply',
  'utxos_1w_to_1m_old_supply',
  'utxos_1m_to_2m_old_supply',
  'utxos_2m_to_3m_old_supply',
  'utxos_3m_to_4m_old_supply',
  'utxos_4m_to_5m_old_supply',
  'utxos_5m_to_6m_old_supply',
  'utxos_6m_to_1y_old_supply',
  'utxos_1y_to_2y_old_supply',
  'utxos_2y_to_3y_old_supply',
  'utxos_3y_to_4y_old_supply',
  'utxos_4y_to_5y_old_supply',
  'utxos_5y_to_6y_old_supply',
  'utxos_6y_to_7y_old_supply',
  'utxos_7y_to_8y_old_supply',
  'utxos_8y_to_10y_old_supply',
  'utxos_10y_to_12y_old_supply',
  'utxos_12y_to_15y_old_supply',
  'utxos_over_15y_old_supply',
];

// 10 display bands — combined from source series above
export interface AgeBand {
  label: string;
  seriesIndices: number[]; // indices into ALL_SERIES
}

export const AGE_BANDS: AgeBand[] = [
  { label: '<1d',    seriesIndices: [0, 1] },         // under_1h + 1h_to_1d
  { label: '1d–1w',  seriesIndices: [2] },
  { label: '1w–1m',  seriesIndices: [3] },
  { label: '1m–3m',  seriesIndices: [4, 5] },         // 1m_to_2m + 2m_to_3m
  { label: '3m–6m',  seriesIndices: [6, 7, 8] },      // 3m_to_4m + 4m_to_5m + 5m_to_6m
  { label: '6m–1yr', seriesIndices: [9] },
  { label: '1yr–2yr',seriesIndices: [10] },
  { label: '2yr–3yr',seriesIndices: [11] },
  { label: '3yr–5yr',seriesIndices: [12, 13] },       // 3y_to_4y + 4y_to_5y
  { label: '5yr+',   seriesIndices: [14, 15, 16, 17, 18, 19, 20] }, // 5y_to_6y + 6y_to_7y + ... + over_15y
];

export type DayPoint = {
  date: string; // ISO YYYY-MM-DD
  bands: number[]; // BTC values for each of the 10 AGE_BANDS, in order
};

type CacheShape = DayPoint[];

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
    console.warn('[utxo-age] Could not write cache:', e);
  }
}

function offsetToDate(offset: number): string {
  return new Date(GENESIS_MS + offset * 86_400_000).toISOString().slice(0, 10);
}

async function fetchFromBRK(days = 90): Promise<CacheShape> {
  // Step 1: probe the first series with limit=1 (no start) to discover `total`.
  // The BRK API uses zero-based integer offsets from Bitcoin genesis — NOT dates.
  // Without a start param it returns from offset 0; we need total to back-calculate.
  const probeUrl =
    `https://bitview.space/api/series/${ALL_SERIES[0]}/day1?limit=1`;
  const probeRes = await fetch(probeUrl, { signal: AbortSignal.timeout(10_000) });
  if (!probeRes.ok) throw new Error(`BRK probe: HTTP ${probeRes.status}`);
  const probe = (await probeRes.json()) as { total: number };
  const total = probe.total;
  const startOffset = Math.max(0, total - days);

  // Step 2: bulk fetch all 21 series from startOffset
  const url =
    `${BRK_BASE}?series=${ALL_SERIES.join(',')}&index=day1` +
    `&start=${startOffset}&limit=${days}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`BRK bulk fetch: HTTP ${res.status}`);

  // Response is an array in the same order as ALL_SERIES
  const bulk = (await res.json()) as Array<{
    start: number;
    data: (number | null)[];
  }>;

  if (!Array.isArray(bulk) || bulk.length !== ALL_SERIES.length) {
    throw new Error(`BRK bulk: expected ${ALL_SERIES.length} series, got ${bulk?.length}`);
  }

  // Determine the number of data points from the first series
  const numPoints = bulk[0].data.length;
  const dataStartOffset = bulk[0].start;

  const result: CacheShape = [];

  for (let i = 0; i < numPoints; i++) {
    const date = offsetToDate(dataStartOffset + i);

    // For each band, sum the source series values
    const bands = AGE_BANDS.map((band) => {
      let sum = 0;
      for (const si of band.seriesIndices) {
        const v = bulk[si].data[i];
        if (v != null) sum += v;
      }
      // Round to 2 decimal places (BTC)
      return Math.round(sum * 100) / 100;
    });

    result.push({ date, bands });
  }

  console.log(`[utxo-age] Fetched ${result.length} days, latest: ${result.at(-1)?.date}`);
  return result;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(365, Math.max(7, parseInt(searchParams.get('days') ?? '90', 10)));

  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < ONE_HOUR) {
    return NextResponse.json(cached.data);
  }

  try {
    const data = await fetchFromBRK(days);
    writeCache(data);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[utxo-age] Fetch failed:', (err as Error).message);
    if (cached) {
      console.log('[utxo-age] Serving stale cache');
      return NextResponse.json(cached.data);
    }
    return NextResponse.json([], { status: 503 });
  }
}
