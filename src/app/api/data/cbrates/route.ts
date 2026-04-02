import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

// Warn at startup if FRED_API_KEY is missing so the missing key is visible
// in the dev-server log rather than silently falling back to cached/empty data.
if (!process.env.FRED_API_KEY) {
  console.warn('[cbrates] FRED_API_KEY is not set — policy rate data will use cached or fallback values. Add FRED_API_KEY to .env.local (free at https://fred.stlouisfed.org/docs/api/api_key.html)');
}

// FRED (Federal Reserve Economic Data) — free API, monthly observations
// Series used:
//   FEDFUNDS        — US Federal Funds Effective Rate
//   ECBMRRFR        — ECB Main Refinancing Operations Rate
//   BOERUKM         — Bank of England Base Rate
//   IRSTCB01JPM156N — Bank of Japan policy rate

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const TEN_YEARS_AGO = new Date(Date.now() - 10 * 365.25 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10); // YYYY-MM-DD

const SERIES: { id: string; key: string }[] = [
  { id: 'FEDFUNDS',        key: 'Fed' }, // US effective federal funds rate (monthly)
  { id: 'ECBMRRFR',        key: 'ECB' }, // ECB main refinancing rate (daily → forced monthly)
  { id: 'IUDSOIA',         key: 'BOE' }, // SONIA — tracks BOE base rate, daily → monthly eop
  { id: 'IRSTCI01JPM156N', key: 'BOJ' }, // Japan call money/interbank rate (monthly, through 2026)
];

type RatesData = Record<string, { time: number; value: number }[]>;

const CACHE_FILE = join(process.cwd(), 'data', 'cbrates-cache.json');

function readCache(): { data: RatesData; fetchedAt: number } | null {
  try {
    const stat = statSync(CACHE_FILE);
    const json = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    return { data: json, fetchedAt: stat.mtimeMs };
  } catch {
    return null;
  }
}

function writeCache(data: RatesData) {
  try {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch (e) {
    console.warn('[cbrates] Could not write cache:', e);
  }
}

async function fetchFromFred(): Promise<RatesData> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error('FRED_API_KEY not set');

  const result: RatesData = {};

  await Promise.all(
    SERIES.map(async ({ id, key }) => {
      const url =
        `${FRED_BASE}?series_id=${id}` +
        `&observation_start=${TEN_YEARS_AGO}` +
        `&frequency=m` +
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
        .map((o) => ({ time: new Date(o.date).getTime(), value: parseFloat(o.value) }))
        .sort((a, b) => a.time - b.time);

      console.log(`[cbrates] ${key} (${id}): ${result[key].length} points`);
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
    console.error('[cbrates] Fetch failed:', (err as Error).message);

    if (cached) {
      console.log('[cbrates] Serving stale cache');
      return NextResponse.json(cached.data);
    }

    // Last-resort annual fallback — illustrates the shape even without live data
    function yr(y: number, m = 6) { return new Date(y, m - 1, 1).getTime(); }
    const fallback: RatesData = {
      Fed: [
        { time: yr(2015), value: 0.13 }, { time: yr(2016), value: 0.40 },
        { time: yr(2017), value: 1.00 }, { time: yr(2018), value: 1.83 },
        { time: yr(2019), value: 2.40 }, { time: yr(2020), value: 0.36 },
        { time: yr(2021), value: 0.08 }, { time: yr(2022), value: 1.68 },
        { time: yr(2023), value: 5.02 }, { time: yr(2024, 6), value: 5.33 },
        { time: yr(2024, 10), value: 4.83 }, { time: yr(2025, 1), value: 4.33 },
        { time: yr(2025, 7), value: 4.33 },
      ],
      ECB: [
        { time: yr(2015), value: 0.05 }, { time: yr(2016), value: 0.00 },
        { time: yr(2017), value: 0.00 }, { time: yr(2018), value: 0.00 },
        { time: yr(2019), value: 0.00 }, { time: yr(2020), value: 0.00 },
        { time: yr(2021), value: 0.00 }, { time: yr(2022), value: 0.68 },
        { time: yr(2023), value: 4.00 }, { time: yr(2024, 6), value: 4.25 },
        { time: yr(2024, 10), value: 3.65 }, { time: yr(2025, 1), value: 3.15 },
        { time: yr(2025, 7), value: 2.65 },
      ],
      BOE: [
        { time: yr(2015), value: 0.50 }, { time: yr(2016), value: 0.50 },
        { time: yr(2017), value: 0.50 }, { time: yr(2018), value: 0.63 },
        { time: yr(2019), value: 0.75 }, { time: yr(2020), value: 0.18 },
        { time: yr(2021), value: 0.10 }, { time: yr(2022), value: 1.19 },
        { time: yr(2023), value: 5.00 }, { time: yr(2024, 6), value: 5.25 },
        { time: yr(2024, 10), value: 5.00 }, { time: yr(2025, 1), value: 4.75 },
        { time: yr(2025, 7), value: 4.25 },
      ],
      BOJ: [
        { time: yr(2015), value: 0.07 }, { time: yr(2016), value: -0.04 },
        { time: yr(2017), value: -0.06 }, { time: yr(2018), value: -0.06 },
        { time: yr(2019), value: -0.07 }, { time: yr(2020), value: -0.04 },
        { time: yr(2021), value: -0.05 }, { time: yr(2022), value: -0.03 },
        { time: yr(2023), value: -0.02 }, { time: yr(2024, 6), value: 0.10 },
        { time: yr(2024, 10), value: 0.25 }, { time: yr(2025, 1), value: 0.50 },
        { time: yr(2025, 7), value: 0.50 },
      ],
    };
    return NextResponse.json(fallback);
  }
}
