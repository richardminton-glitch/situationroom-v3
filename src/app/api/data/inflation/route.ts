import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

// API-Ninjas historical inflation endpoint — monthly CPI data
// Supported: USA, UK, Germany, Japan, Turkey
// Not in API-Ninjas (38-country list): Argentina — kept as static annual (World Bank)

const NINJA_BASE = 'https://api.api-ninjas.com/v1/inflationhistorical';
// G7 countries: 3-year window (recent granularity is what matters)
const THREE_YEARS_AGO = Math.floor((Date.now() - 3 * 365.25 * 24 * 60 * 60 * 1000) / 1000);
// Turkey: full history from 2019 — the complete arc (20% → 85.5% peak → 35% now) is the story
const JAN_2019 = 1546300800;
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

const NINJA_G7: { code: string; key: string; start: number }[] = [
  { code: 'US', key: 'USA',     start: THREE_YEARS_AGO },
  { code: 'GB', key: 'UK',      start: THREE_YEARS_AGO },
  { code: 'DE', key: 'Germany', start: THREE_YEARS_AGO },
  { code: 'JP', key: 'Japan',   start: THREE_YEARS_AGO },
];

const NINJA_EXTREME: { code: string; key: string; start: number }[] = [
  { code: 'TR', key: 'Turkey', start: JAN_2019 },
];

// Static annual data for countries not in API-Ninjas
// World Bank FP.CPI.TOTL.ZG, mid-year timestamps
function yr(y: number) { return new Date(y, 6, 1).getTime(); }

// Argentina: World Bank annual CPI — only reliable from 2018 (pre-2018 nulled due to INDEC dispute)
const STATIC_ANNUAL: Record<string, { time: number; value: number }[]> = {
  Argentina: [
    { time: yr(2018), value: 34.28 },
    { time: yr(2019), value: 53.55 },
    { time: yr(2020), value: 42.02 },
    { time: yr(2021), value: 48.41 },
    { time: yr(2022), value: 72.43 },
    { time: yr(2023), value: 133.49 },
    { time: yr(2024), value: 219.88 },
  ],
};

type InflationData = Record<string, { time: number; value: number }[]>;

const CACHE_FILE = join(process.cwd(), 'data', 'inflation-cache.json');

function readCache(): { data: InflationData; fetchedAt: number } | null {
  try {
    const stat = statSync(CACHE_FILE);
    const json = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    return { data: json, fetchedAt: stat.mtimeMs };
  } catch {
    return null;
  }
}

function writeCache(data: InflationData) {
  try {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch (e) {
    console.warn('[inflation] Could not write cache file:', e);
  }
}

async function fetchFromNinjas(): Promise<InflationData> {
  const apiKey = process.env.API_NINJAS_KEY;
  if (!apiKey) throw new Error('API_NINJAS_KEY not set');

  const result: InflationData = {};
  const allCountries = [...NINJA_G7, ...NINJA_EXTREME];

  await Promise.all(
    allCountries.map(async ({ code, key: label, start }) => {
      const url = `${NINJA_BASE}?country=${code}&start_time=${start}`;
      const res = await fetch(url, {
        headers: { 'X-Api-Key': apiKey },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`API-Ninjas ${code}: HTTP ${res.status}`);
      const json = await res.json() as { data: { timestamp: number; rate_pct: number }[] };
      result[label] = (json.data ?? [])
        .map(p => ({ time: p.timestamp * 1000, value: p.rate_pct }))
        .sort((a, b) => a.time - b.time);
      console.log(`[inflation] ${label}: ${result[label].length} points`);
    })
  );

  // Merge static annual countries
  Object.assign(result, STATIC_ANNUAL);

  return result;
}

export async function GET() {
  // Check file cache first — serve if < 30 days old
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < THIRTY_DAYS) {
    return NextResponse.json(cached.data);
  }

  try {
    const data = await fetchFromNinjas();
    writeCache(data);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[inflation] Fetch failed:', (err as Error).message);

    // Serve stale cache if available, otherwise static fallback
    if (cached) {
      console.log('[inflation] Serving stale cache');
      return NextResponse.json(cached.data);
    }

    // Last-resort hardcoded fallback (static annual for all countries)
    const fallback: InflationData = {
      USA: [
        { time: yr(2021), value: 4.70 }, { time: yr(2022), value: 8.00 },
        { time: yr(2023), value: 4.12 }, { time: yr(2024), value: 2.95 },
      ],
      UK: [
        { time: yr(2021), value: 2.52 }, { time: yr(2022), value: 7.92 },
        { time: yr(2023), value: 6.79 }, { time: yr(2024), value: 3.27 },
      ],
      Germany: [
        { time: yr(2021), value: 3.14 }, { time: yr(2022), value: 8.71 },
        { time: yr(2023), value: 5.95 }, { time: yr(2024), value: 2.50 },
      ],
      Japan: [
        { time: yr(2021), value: -0.23 }, { time: yr(2022), value: 2.50 },
        { time: yr(2023), value: 3.27 },  { time: yr(2024), value: 2.74 },
      ],
      Turkey: [
        { time: yr(2019), value: 15.18 }, { time: yr(2020), value: 12.28 },
        { time: yr(2021), value: 19.60 }, { time: yr(2022), value: 72.31 },
        { time: yr(2023), value: 53.86 }, { time: yr(2024), value: 58.51 },
      ],
      ...STATIC_ANNUAL,
    };
    return NextResponse.json(fallback);
  }
}
