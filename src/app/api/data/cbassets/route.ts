import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

// Warn at startup if FRED_API_KEY is missing so the missing key is visible
// in the dev-server log rather than silently falling back to cached/empty data.
if (!process.env.FRED_API_KEY) {
  console.warn('[cbassets] FRED_API_KEY is not set — balance sheet timeline data will use cached or fallback values. Add FRED_API_KEY to .env.local (free at https://fred.stlouisfed.org/docs/api/api_key.html)');
}

// FRED (Federal Reserve Economic Data) — free API, annual end-of-period observations
//
// Series used:
//   WALCL         — Fed total assets (weekly, millions USD)
//   ECBASSETSW    — ECB total assets (weekly, millions EUR)
//   JPNASSETS     — BOJ total assets (weekly, 100M JPY / 億円)
//
// Returned units after scaling:
//   Fed: $T  (÷ 1,000,000)
//   ECB: €T  (÷ 1,000,000)
//   BOJ: ¥T  (÷ 10,000)   — note: 100M JPY × 10,000 = 1T JPY
//
// Bank of England and PBoC are not available on FRED in a usable form;
// those banks use corrected static data in the front-end component.

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const START = '2014-01-01';

const SERIES: { id: string; key: string; divisor: number }[] = [
  { id: 'WALCL',      key: 'Fed', divisor: 1_000_000 }, // millions USD → $T
  { id: 'ECBASSETSW', key: 'ECB', divisor: 1_000_000 }, // millions EUR → €T
  { id: 'JPNASSETS',  key: 'BOJ', divisor: 10_000    }, // 100M JPY → ¥T
];

type TimelinePoint = { year: number; value: number };
type AssetsData = Record<string, TimelinePoint[]>;

const CACHE_FILE = join(process.cwd(), 'data', 'cbassets-cache.json');

function readCache(): { data: AssetsData; fetchedAt: number } | null {
  try {
    const stat = statSync(CACHE_FILE);
    const json = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    return { data: json, fetchedAt: stat.mtimeMs };
  } catch {
    return null;
  }
}

function writeCache(data: AssetsData) {
  try {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch (e) {
    console.warn('[cbassets] Could not write cache:', e);
  }
}

async function fetchFromFred(): Promise<AssetsData> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error('FRED_API_KEY not set');

  const result: AssetsData = {};

  await Promise.all(
    SERIES.map(async ({ id, key, divisor }) => {
      const url =
        `${FRED_BASE}?series_id=${id}` +
        `&observation_start=${START}` +
        `&frequency=a` +
        `&aggregation_method=eop` +
        `&api_key=${apiKey}` +
        `&file_type=json`;

      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`FRED ${id}: HTTP ${res.status}`);

      const json = await res.json() as {
        observations: { date: string; value: string }[];
      };

      result[key] = (json.observations ?? [])
        .filter((o) => o.value !== '.' && o.value !== '')
        .map((o) => ({
          year: new Date(o.date).getFullYear(),
          value: Math.round((parseFloat(o.value) / divisor) * 100) / 100,
        }))
        .sort((a, b) => a.year - b.year);

      console.log(`[cbassets] ${key} (${id}): ${result[key].length} annual points, latest ${result[key].at(-1)?.year} = ${result[key].at(-1)?.value}`);
    })
  );

  return result;
}

export async function GET() {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < SEVEN_DAYS) {
    return NextResponse.json(cached.data);
  }

  try {
    const data = await fetchFromFred();
    writeCache(data);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[cbassets] Fetch failed:', (err as Error).message);
    if (cached) {
      console.log('[cbassets] Serving stale cache');
      return NextResponse.json(cached.data);
    }
    // Empty fallback — component uses its own corrected static data
    return NextResponse.json({});
  }
}
