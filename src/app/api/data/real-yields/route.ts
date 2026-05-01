/**
 * GET /api/data/real-yields
 *
 * 10-Year Treasury Inflation-Protected Securities (TIPS) yield — the market's
 * directly-traded measure of the 10y real interest rate. Source: FRED DFII10,
 * daily, percentage points. Series begins 2003-01.
 *
 * Joined with daily BTC/USD history so the front-end can plot real yield
 * against BTC log price and show the "Jordi claim": the share of Bitcoin's
 * lifetime cumulative return that has accrued during periods of negative
 * real yields.
 *
 * Stat methodology — to avoid lookahead, each day's BTC log-return is paired
 * with the *prior* day's real yield. Sum the daily log returns where prior
 * yield < 0; divide by the total sum to get the share. Total return is
 * computed over the joined window (latest BTC date present in both series),
 * starting from the first BTC date with a real-yield reading.
 *
 * Cache: 24h file-based — DFII10 is a daily series and BTC history is
 * refreshed nightly by cron.
 */

import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { fetchCoinGeckoHistory } from '@/lib/data/coingecko-history';

export const dynamic = 'force-dynamic';

const FRED_BASE  = 'https://api.stlouisfed.org/fred/series/observations';
const SERIES_ID  = 'DFII10';
const CACHE_FILE = join(process.cwd(), 'data', 'real-yields-cache.json');
const ONE_DAY    = 24 * 60 * 60 * 1000;

interface YieldPoint { date: string; value: number }
interface BtcPoint   { date: string; price: number }

interface Stats {
  totalDays:                number;
  daysNegativeYield:        number;
  shareDaysNegative:        number;   // 0..1
  shareReturnNegative:      number;   // 0..1, share of cumulative log return earned during prior-day negative yield
  totalReturnPct:           number;   // simple total return over joined window, %
  returnDuringNegativePct:  number;   // counterfactual: total return restricted to negative-yield days, %
  windowFrom:               string;
  windowTo:                 string;
}

interface CachedPayload {
  realYield:  YieldPoint[];   // daily, forward-filled over BTC window
  btc:        BtcPoint[];     // daily
  latest:     YieldPoint | null;
  stats:      Stats;
  updatedAt:  string;
  windowFrom: string;
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

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
    console.warn('[real-yields] cache write failed:', e);
  }
}

// ── FRED ──────────────────────────────────────────────────────────────────────

async function fetchFredDfii10(apiKey: string): Promise<YieldPoint[]> {
  // DFII10 starts 2003-01-02. Pull the full series — it's small (~6000 rows).
  const url = `${FRED_BASE}?series_id=${SERIES_ID}&observation_start=2003-01-01&api_key=${apiKey}&file_type=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${SERIES_ID}: HTTP ${res.status}`);
  const json = await res.json() as { observations?: { date: string; value: string }[] };
  return (json.observations ?? [])
    .filter((o) => o.value !== '.' && !isNaN(parseFloat(o.value)))
    .map((o) => ({ date: o.date, value: parseFloat(o.value) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Forward-fill a sparse daily series across [from, to]: for each calendar day,
 * carry the most recent observation at-or-before that day. Handles weekends
 * and FRED holidays without inventing zero days.
 */
function forwardFillDaily(sparse: YieldPoint[], from: string, to: string): YieldPoint[] {
  if (sparse.length === 0) return [];
  const sorted = [...sparse].sort((a, b) => a.date.localeCompare(b.date));
  const out: YieldPoint[] = [];
  const start = new Date(from + 'T00:00:00Z').getTime();
  const end   = new Date(to   + 'T00:00:00Z').getTime();
  let i = 0;
  let last = sorted[0].value;
  for (let t = start; t <= end; t += ONE_DAY) {
    const day = new Date(t).toISOString().slice(0, 10);
    while (i < sorted.length && sorted[i].date <= day) {
      last = sorted[i].value;
      i++;
    }
    // Only emit days at-or-after the first sparse observation
    if (day >= sorted[0].date) out.push({ date: day, value: last });
  }
  return out;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function computeStats(btc: BtcPoint[], yld: YieldPoint[]): Stats {
  // Index yields by date for O(1) lookup
  const yldByDate = new Map<string, number>();
  for (const p of yld) yldByDate.set(p.date, p.value);

  // Restrict BTC to days where we have a yield
  const joined = btc.filter((p) => yldByDate.has(p.date));
  if (joined.length < 2) {
    return {
      totalDays: 0, daysNegativeYield: 0,
      shareDaysNegative: 0, shareReturnNegative: 0,
      totalReturnPct: 0, returnDuringNegativePct: 0,
      windowFrom: '', windowTo: '',
    };
  }

  let totalLog = 0;
  let negLog   = 0;
  let totalDays = 0;
  let daysNeg   = 0;

  for (let i = 1; i < joined.length; i++) {
    const prev = joined[i - 1];
    const cur  = joined[i];
    if (prev.price <= 0 || cur.price <= 0) continue;
    const r = Math.log(cur.price / prev.price);
    totalLog += r;
    totalDays++;
    // Pair this return with the PRIOR day's yield (no lookahead)
    const prevYield = yldByDate.get(prev.date);
    if (prevYield !== undefined && prevYield < 0) {
      negLog += r;
      daysNeg++;
    }
  }

  const totalReturnPct          = (Math.exp(totalLog) - 1) * 100;
  const returnDuringNegativePct = (Math.exp(negLog)   - 1) * 100;
  const shareReturnNegative     = totalLog === 0 ? 0 : negLog / totalLog;
  const shareDaysNegative       = totalDays === 0 ? 0 : daysNeg / totalDays;

  return {
    totalDays,
    daysNegativeYield:       daysNeg,
    shareDaysNegative,
    shareReturnNegative,
    totalReturnPct,
    returnDuringNegativePct,
    windowFrom:              joined[0].date,
    windowTo:                joined[joined.length - 1].date,
  };
}

// ── Build ────────────────────────────────────────────────────────────────────

async function buildFresh(): Promise<CachedPayload> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error('FRED_API_KEY not set');

  const [yldRaw, btcAll] = await Promise.all([
    fetchFredDfii10(apiKey),
    fetchCoinGeckoHistory({ full: true }),
  ]);

  if (yldRaw.length === 0) throw new Error('DFII10 series empty');
  if (btcAll.length === 0) throw new Error('BTC history empty');

  // Window: from BTC's first day or DFII10's first day, whichever is later
  // (BTC starts ~2010, DFII10 starts 2003 — so this is BTC's first day).
  const windowFrom = btcAll[0].date > yldRaw[0].date ? btcAll[0].date : yldRaw[0].date;
  const lastBtcDate = btcAll[btcAll.length - 1].date;
  const lastYldDate = yldRaw[yldRaw.length - 1].date;
  const windowTo    = lastBtcDate < lastYldDate ? lastBtcDate : lastYldDate;

  const btcWindow: BtcPoint[] = btcAll.filter((p) => p.date >= windowFrom && p.date <= windowTo);
  const yldDaily              = forwardFillDaily(yldRaw, windowFrom, windowTo);

  const stats = computeStats(btcWindow, yldDaily);

  return {
    realYield:  yldDaily,
    btc:        btcWindow,
    latest:     yldRaw[yldRaw.length - 1],
    stats,
    updatedAt:  new Date().toISOString(),
    windowFrom,
  };
}

// ── Route handler ────────────────────────────────────────────────────────────

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
    console.error('[real-yields] fresh build failed:', err);
    if (cached) {
      return NextResponse.json(cached.data, {
        headers: { 'X-Cache': 'STALE', 'X-Cache-Error': String(err) },
      });
    }
    return NextResponse.json({ error: 'Real yields data unavailable' }, { status: 503 });
  }
}
