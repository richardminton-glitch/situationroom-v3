/**
 * GET /api/data/global-liquidity
 *
 * Returns a joined dataset for the Global Liquidity tool:
 *  - daily BTC USD prices (from our local CSV+DB history)
 *  - a 4-region Global Liquidity composite (US M2 absolute + EU/UK/JP M3
 *    growth-rate-compounded), equal-weighted, indexed to 100 at the
 *    start of the window
 *
 * The composite is *indexed* (not USD trillions): FRED's free OECD
 * absolute series stops updating in late 2023, so to stay current we
 * compound MoM growth from a fixed base. The shape — which is what
 * matters for the 84-day lead claim — is preserved exactly.
 *
 * Response shape:
 * {
 *   btc:        [{ date: "YYYY-MM-DD", price: number }, ...],
 *   composite:  [{ date: "YYYY-MM-DD", value: number }, ...],   // indexed
 *   regions:    { USA: [...], EU: [...], UK: [...], Japan: [...] },
 *   leadDays:   84,
 *   updatedAt:  ISO string,
 *   windowFrom: "YYYY-MM-DD",
 * }
 *
 * Cache: 24h file-based (FRED updates monthly/weekly anyway).
 */

import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { fetchCoinGeckoHistory } from '@/lib/data/coingecko-history';

export const dynamic = 'force-dynamic';

const FRED_BASE  = 'https://api.stlouisfed.org/fred/series/observations';
const CACHE_FILE = join(process.cwd(), 'data', 'global-liquidity-cache.json');
const ONE_DAY    = 24 * 60 * 60 * 1000;

// 8-year window — covers 2018 through current cycle
const WINDOW_FROM = new Date(Date.now() - 8 * 365.25 * ONE_DAY).toISOString().slice(0, 10);

const LEAD_DAYS = 84;

interface SeriesCfg {
  id:    string;
  key:   'USA' | 'EU' | 'UK' | 'Japan';
  mode:  'absolute' | 'growth';
}

const SERIES: SeriesCfg[] = [
  { id: 'M2SL',             key: 'USA',   mode: 'absolute' },  // billions USD, monthly SA
  { id: 'MABMM301EZM657S',  key: 'EU',    mode: 'growth'   },  // % MoM
  { id: 'MABMM301GBM657S',  key: 'UK',    mode: 'growth'   },
  { id: 'MABMM301JPM657S',  key: 'Japan', mode: 'growth'   },
];

interface Point { date: string; value: number }
interface BtcPoint { date: string; price: number }

interface CachedPayload {
  btc:        BtcPoint[];
  composite:  Point[];
  regions:    Record<string, Point[]>;
  leadDays:   number;
  updatedAt:  string;
  windowFrom: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function readCache(): { data: CachedPayload; mtimeMs: number } | null {
  try {
    const stat = statSync(CACHE_FILE);
    const data = JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as CachedPayload;
    return { data, mtimeMs: stat.mtimeMs };
  } catch { return null; }
}

function writeCache(data: CachedPayload) {
  try {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch (e) {
    console.warn('[global-liquidity] cache write failed:', e);
  }
}

/** Index a series so its first point = 100. */
function indexTo100(points: Point[]): Point[] {
  const baseline = points[0]?.value;
  if (!baseline || baseline === 0) return points;
  return points.map((p) => ({ date: p.date, value: (p.value / baseline) * 100 }));
}

/** Compound MoM growth-rate series (% per month) from a base of 100. */
function compoundFromGrowth(points: Point[]): Point[] {
  if (points.length === 0) return [];
  const out: Point[] = [];
  let level = 100;
  for (const p of points) {
    level = level * (1 + p.value / 100);
    out.push({ date: p.date, value: Math.round(level * 100) / 100 });
  }
  return out;
}

async function fetchFredSeries(id: string, apiKey: string): Promise<Point[]> {
  const url = `${FRED_BASE}?series_id=${id}&observation_start=${WINDOW_FROM}&api_key=${apiKey}&file_type=json&frequency=m`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${id}: HTTP ${res.status}`);
  const json = await res.json() as { observations?: { date: string; value: string }[] };
  const obs = json.observations ?? [];
  return obs
    .filter((o) => o.value !== '.' && !isNaN(parseFloat(o.value)))
    .map((o) => ({ date: o.date, value: parseFloat(o.value) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Forward-fill a monthly series to daily resolution over [from, to].
 * For each calendar day, take the most recent monthly value at or before that day.
 */
function monthlyToDailyForwardFill(monthly: Point[], from: string, to: string): Point[] {
  if (monthly.length === 0) return [];
  const sorted = [...monthly].sort((a, b) => a.date.localeCompare(b.date));
  const out: Point[] = [];
  const start = new Date(from + 'T00:00:00Z').getTime();
  const end   = new Date(to   + 'T00:00:00Z').getTime();
  let mIdx = 0;
  let lastVal = sorted[0].value;
  for (let t = start; t <= end; t += ONE_DAY) {
    const day = new Date(t).toISOString().slice(0, 10);
    while (mIdx < sorted.length && sorted[mIdx].date <= day) {
      lastVal = sorted[mIdx].value;
      mIdx++;
    }
    out.push({ date: day, value: lastVal });
  }
  return out;
}

/** Equal-weight composite of region indexed daily series. */
function composite(daily: Record<string, Point[]>): Point[] {
  const keys = Object.keys(daily);
  if (keys.length === 0) return [];
  const len = daily[keys[0]].length;
  const out: Point[] = [];
  for (let i = 0; i < len; i++) {
    let sum = 0;
    let n = 0;
    for (const k of keys) {
      const p = daily[k][i];
      if (p && Number.isFinite(p.value)) { sum += p.value; n++; }
    }
    if (n > 0) out.push({ date: daily[keys[0]][i].date, value: sum / n });
  }
  return indexTo100(out);
}

// ── Main fetch + assemble ──────────────────────────────────────────────────────

async function buildFresh(): Promise<CachedPayload> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error('FRED_API_KEY not set');

  // Fetch all 4 region series in parallel
  const regionRaw: Record<string, Point[]> = {};
  await Promise.all(
    SERIES.map(async ({ id, key, mode }) => {
      try {
        const raw = await fetchFredSeries(id, apiKey);
        regionRaw[key] = mode === 'absolute' ? indexTo100(raw) : compoundFromGrowth(raw);
      } catch (e) {
        console.warn(`[global-liquidity] region ${key} (${id}) failed:`, e);
        regionRaw[key] = [];
      }
    })
  );

  // BTC daily history
  const btcAll = await fetchCoinGeckoHistory({ full: true });
  const btcWindow: BtcPoint[] = btcAll.filter((p) => p.date >= WINDOW_FROM);
  const lastBtcDate = btcWindow.at(-1)?.date ?? new Date().toISOString().slice(0, 10);

  // Forward-fill each region monthly→daily over the BTC window
  const dailyByRegion: Record<string, Point[]> = {};
  for (const k of Object.keys(regionRaw)) {
    dailyByRegion[k] = monthlyToDailyForwardFill(regionRaw[k], WINDOW_FROM, lastBtcDate);
  }

  // Composite (equal-weighted, re-indexed to 100 at window start)
  const compositeDaily = composite(dailyByRegion);

  return {
    btc:        btcWindow,
    composite:  compositeDaily,
    regions:    regionRaw,                // monthly, indexed
    leadDays:   LEAD_DAYS,
    updatedAt:  new Date().toISOString(),
    windowFrom: WINDOW_FROM,
  };
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function GET() {
  const cached = readCache();
  if (cached && Date.now() - cached.mtimeMs < ONE_DAY) {
    return NextResponse.json(cached.data, {
      headers: {
        'X-Cache':     'HIT',
        'X-Cache-Age': Math.round((Date.now() - cached.mtimeMs) / 3600000) + 'h',
      },
    });
  }

  try {
    const data = await buildFresh();
    writeCache(data);
    return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } });
  } catch (err) {
    console.error('[global-liquidity] fresh build failed:', err);
    if (cached) {
      return NextResponse.json(cached.data, {
        headers: { 'X-Cache': 'STALE', 'X-Cache-Error': String(err) },
      });
    }
    return NextResponse.json({ error: 'Global liquidity data unavailable' }, { status: 503 });
  }
}
