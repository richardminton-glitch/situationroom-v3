/**
 * API-Ninjas Batch Manager
 *
 * Consolidates all API-Ninjas calls into a single coordinated fetch cycle
 * with file-based persistence and market-hours-aware TTL.
 *
 * Monthly budget: 100,000 calls.
 * Without batching: ~32 calls × 48 cycles/day = 46,080/month
 * With batching:    ~32 calls × 18 cycles/day = 17,280/month (worst case)
 *
 * Call budget breakdown (per cycle = 32 calls):
 *   fetchIndices:          8  (/stockprice × 8 tickers)
 *   fetchCommodities:      8  (5 /commodityprice + 3 /stockprice)
 *   fetchFX:               4  (/exchangerate × 4 pairs)
 *   fetchBtcEquities:     11  (/stockprice × 11 tickers)
 *   fetchCentralBankRates: 1  (/interestrate)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TickerData, CentralBankRate } from './sources';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ApiNinjasSnapshot {
  indices:       Record<string, TickerData>;
  commodities:   Record<string, TickerData>;
  fx:            Record<string, TickerData>;
  equities:      Record<string, TickerData>;
  cbRates:       CentralBankRate[];
  fetchedAt:     number;    // ms timestamp
  callsThisCycle: number;   // how many API calls this batch made
}

interface MonthlyCounter {
  month: string;   // "2026-04"
  calls: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CACHE_FILE     = path.join(process.cwd(), 'data', 'api-ninjas-snapshot.json');
const COUNTER_FILE   = path.join(process.cwd(), 'data', 'api-ninjas-counter.json');
const MONTHLY_BUDGET = 100_000;
const WARN_75        = 75_000;
const WARN_90        = 90_000;

// TTL by market state
const TTL_MARKET_OPEN  = 30 * 60 * 1000;   // 30 min during US market hours
const TTL_MARKET_CLOSE = 2 * 60 * 60 * 1000; // 2 hrs outside market hours
const TTL_WEEKEND      = 6 * 60 * 60 * 1000; // 6 hrs on weekends

// ── State ──────────────────────────────────────────────────────────────────────

let _snapshot: ApiNinjasSnapshot | null = null;
let _loading: Promise<ApiNinjasSnapshot> | null = null;

// ── Market hours helper ────────────────────────────────────────────────────────

function getActiveTTL(): number {
  const now = new Date();
  const day = now.getUTCDay();
  const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;

  // Weekend (Sat/Sun)
  if (day === 0 || day === 6) return TTL_WEEKEND;

  // US market hours: ~14:30–21:00 UTC (Mon–Fri)
  if (utcHour >= 14.5 && utcHour < 21) return TTL_MARKET_OPEN;

  // European overlap: 08:00–14:30 UTC
  if (utcHour >= 8 && utcHour < 14.5) return TTL_MARKET_CLOSE;

  // Off-hours
  return TTL_MARKET_CLOSE;
}

function isMarketHours(): boolean {
  const now = new Date();
  const day = now.getUTCDay();
  const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
  return day >= 1 && day <= 5 && utcHour >= 14.5 && utcHour < 21;
}

// ── Monthly call counter ───────────────────────────────────────────────────────

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "2026-04"
}

function readCounter(): MonthlyCounter {
  try {
    const raw = fs.readFileSync(COUNTER_FILE, 'utf-8');
    const c = JSON.parse(raw) as MonthlyCounter;
    if (c.month === currentMonth()) return c;
  } catch { /* no file or wrong month */ }
  return { month: currentMonth(), calls: 0 };
}

function incrementCounter(calls: number): number {
  const c = readCounter();
  c.calls += calls;
  try {
    fs.mkdirSync(path.dirname(COUNTER_FILE), { recursive: true });
    fs.writeFileSync(COUNTER_FILE, JSON.stringify(c));
  } catch { /* non-fatal */ }

  if (c.calls >= WARN_90) {
    console.error(`[API-Ninjas] ⚠ CRITICAL: ${c.calls.toLocaleString()}/${MONTHLY_BUDGET.toLocaleString()} monthly calls used (${Math.round(c.calls / MONTHLY_BUDGET * 100)}%)`);
  } else if (c.calls >= WARN_75) {
    console.warn(`[API-Ninjas] ⚠ WARNING: ${c.calls.toLocaleString()}/${MONTHLY_BUDGET.toLocaleString()} monthly calls used (${Math.round(c.calls / MONTHLY_BUDGET * 100)}%)`);
  }

  return c.calls;
}

// ── File cache ─────────────────────────────────────────────────────────────────

function readFileCache(): ApiNinjasSnapshot | null {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    return JSON.parse(raw) as ApiNinjasSnapshot;
  } catch { return null; }
}

function writeFileCache(snapshot: ApiNinjasSnapshot): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(snapshot));
  } catch { /* non-fatal */ }
}

// ── Fetch helpers (individual API calls) ───────────────────────────────────────

const API_BASE = 'https://api.api-ninjas.com/v1';

function headers(): Record<string, string> {
  return { 'X-Api-Key': process.env.API_NINJAS_KEY || '' };
}

async function ninjaFetch<T>(endpoint: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { headers: headers(), signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && typeof data === 'object' && 'error' in data) throw new Error(data.error);
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

// ── Batch fetch all data ───────────────────────────────────────────────────────

async function fetchAllApiNinjas(): Promise<ApiNinjasSnapshot> {
  let callCount = 0;

  // ── Indices (8 calls) ────────────────────────────────────────────────
  const INDEX_TICKERS: Record<string, string> = {
    sp500: '^GSPC', nasdaq: '^IXIC', dji: '^DJI', ftse: '^FTSE',
    dax: '^GDAXI', nikkei: '^N225', hsi: '^HSI', vix: '^VIX',
  };
  const indices: Record<string, TickerData> = {};
  const idxResults = await Promise.allSettled(
    Object.entries(INDEX_TICKERS).map(([id, ticker]) => {
      callCount++;
      return ninjaFetch<{ name: string; price: number; change_percent?: number }>(`/stockprice?ticker=${encodeURIComponent(ticker)}`).then(d => ({ id, d }));
    })
  );
  for (const r of idxResults) {
    if (r.status === 'fulfilled') {
      const d = r.value.d;
      indices[r.value.id] = { name: d.name || r.value.id.toUpperCase(), price: d.price, changePct: d.change_percent ?? 0 };
    }
  }

  // ── Commodities (5 + 3 = 8 calls) ────────────────────────────────────
  const COMMODITY_NAMES = ['Gold', 'Silver', 'Crude Oil', 'Natural Gas', 'Copper'];
  const YIELD_TICKERS = [
    { id: 'dxy', ticker: 'DX-Y.NYB', name: 'DXY' },
    { id: 'us10y', ticker: '^TNX', name: 'US 10Y' },
    { id: 'us2y', ticker: '^IRX', name: 'US 2Y' },
  ];
  const commodities: Record<string, TickerData> = {};

  const commResults = await Promise.allSettled(
    COMMODITY_NAMES.map(name => {
      callCount++;
      return ninjaFetch<{ name: string; price: number }>(`/commodityprice?name=${encodeURIComponent(name)}`).then(d => ({
        id: name.toLowerCase().replace(/\s/g, '-'), d,
      }));
    })
  );
  const yieldResults = await Promise.allSettled(
    YIELD_TICKERS.map(({ id, ticker, name }) => {
      callCount++;
      return ninjaFetch<{ price: number; change_percent?: number }>(`/stockprice?ticker=${encodeURIComponent(ticker)}`).then(d => ({ id, name, d }));
    })
  );
  for (const r of commResults) {
    if (r.status === 'fulfilled') {
      commodities[r.value.id] = { name: r.value.d.name, price: r.value.d.price, changePct: 0 };
    }
  }
  for (const r of yieldResults) {
    if (r.status === 'fulfilled') {
      const d = r.value.d;
      commodities[r.value.id] = { name: r.value.name, price: d.price, changePct: d.change_percent ?? 0 };
    }
  }

  // ── FX (4 calls) ─────────────────────────────────────────────────────
  const FX_PAIRS = [
    { id: 'eur', pair: 'USD_EUR', name: 'EUR / USD', invert: true },
    { id: 'gbp', pair: 'USD_GBP', name: 'GBP / USD', invert: true },
    { id: 'jpy', pair: 'USD_JPY', name: 'USD / JPY', invert: false },
    { id: 'cny', pair: 'USD_CNY', name: 'USD / CNY', invert: false },
  ];
  const fx: Record<string, TickerData> = {};
  const fxResults = await Promise.allSettled(
    FX_PAIRS.map(({ id, pair, name, invert }) => {
      callCount++;
      return ninjaFetch<{ exchange_rate: number }>(`/exchangerate?pair=${pair}`).then(d => ({
        id, name, invert, rate: d.exchange_rate,
      }));
    })
  );
  for (const r of fxResults) {
    if (r.status === 'fulfilled') {
      const price = r.value.invert && r.value.rate ? 1 / r.value.rate : r.value.rate;
      fx[r.value.id] = { name: r.value.name, price, changePct: 0 };
    }
  }

  // ── BTC Equities (11 calls, skip if market closed) ────────────────────
  const BTC_EQUITY_TICKERS: Record<string, string> = {
    ibit: 'IBIT', fbtc: 'FBTC', arkb: 'ARKB', bitb: 'BITB', hodl: 'HODL',
    mstr: 'MSTR', coin: 'COIN', mara: 'MARA', riot: 'RIOT', clsk: 'CLSK', hut: 'HUT',
  };
  const equities: Record<string, TickerData> = {};

  // Only fetch equities during market hours or if we have no cached data
  const needEquities = isMarketHours() || !_snapshot?.equities || Object.keys(_snapshot.equities).length === 0;

  if (needEquities) {
    const eqResults = await Promise.allSettled(
      Object.entries(BTC_EQUITY_TICKERS).map(([id, ticker]) => {
        callCount++;
        return ninjaFetch<{ name: string; price: number; change_percent?: number }>(`/stockprice?ticker=${ticker}`).then(d => ({ id, d }));
      })
    );
    for (const r of eqResults) {
      if (r.status === 'fulfilled') {
        const d = r.value.d;
        equities[r.value.id] = { name: d.name || BTC_EQUITY_TICKERS[r.value.id], price: d.price, changePct: d.change_percent ?? 0 };
      }
    }
  } else {
    // Carry forward cached equities without calling API
    Object.assign(equities, _snapshot!.equities);
  }

  // ── Central Bank Rates (1 call) ──────────────────────────────────────
  callCount++;
  let cbRates: CentralBankRate[] = [];
  try {
    const raw = await ninjaFetch<{
      central_bank_rates: { central_bank: string; country: string; rate_pct: number; last_updated: string }[];
    }>('/interestrate');
    const TARGET = [
      { match: 'United_States', label: 'Fed (US)' },
      { match: 'Europe', label: 'ECB (EU)' },
      { match: 'Japan', label: 'BOJ (Japan)' },
      { match: 'United_Kingdom', label: 'BOE (UK)' },
    ];
    cbRates = TARGET
      .map(({ match, label }) => {
        const found = (raw.central_bank_rates || []).find(r => r.country === match);
        return found ? { country: label, rate: found.rate_pct, lastUpdated: found.last_updated } : null;
      })
      .filter((r): r is CentralBankRate => r !== null);
  } catch { /* use empty */ }

  const snapshot: ApiNinjasSnapshot = {
    indices, commodities, fx, equities, cbRates,
    fetchedAt: Date.now(),
    callsThisCycle: callCount,
  };

  // Persist + count
  writeFileCache(snapshot);
  const totalThisMonth = incrementCounter(callCount);
  console.log(`[API-Ninjas] Batch complete: ${callCount} calls this cycle, ${totalThisMonth.toLocaleString()} this month`);

  return snapshot;
}

// ── Public interface ───────────────────────────────────────────────────────────

/**
 * Get the current API-Ninjas data snapshot.
 * Returns cached data if fresh; otherwise triggers a batch refresh.
 * On cold start, serves from file cache while fetching in background.
 */
export async function getApiNinjasSnapshot(): Promise<ApiNinjasSnapshot> {
  const ttl = getActiveTTL();

  // 1. In-memory cache is fresh
  if (_snapshot && (Date.now() - _snapshot.fetchedAt) < ttl) {
    return _snapshot;
  }

  // 2. Already fetching — wait for it
  if (_loading) return _loading;

  // 3. File cache as fallback for cold starts
  if (!_snapshot) {
    const fromFile = readFileCache();
    if (fromFile) {
      _snapshot = fromFile;
      // If file cache is still within TTL, use it directly
      if ((Date.now() - fromFile.fetchedAt) < ttl) {
        return fromFile;
      }
      // Otherwise start background refresh but return stale file data immediately
    }
  }

  // 4. Budget check — hard stop at 95% to preserve buffer
  const counter = readCounter();
  if (counter.calls >= MONTHLY_BUDGET * 0.95) {
    console.error('[API-Ninjas] HARD STOP: Monthly budget nearly exhausted, serving cached data only');
    if (_snapshot) return _snapshot;
    const fromFile = readFileCache();
    if (fromFile) { _snapshot = fromFile; return fromFile; }
    // Return empty snapshot as last resort
    return { indices: {}, commodities: {}, fx: {}, equities: {}, cbRates: [], fetchedAt: 0, callsThisCycle: 0 };
  }

  // 5. Fetch fresh data
  _loading = fetchAllApiNinjas()
    .then(snap => { _snapshot = snap; _loading = null; return snap; })
    .catch(err => {
      console.error('[API-Ninjas] Batch fetch failed:', err);
      _loading = null;
      // Return stale data if available
      if (_snapshot) return _snapshot;
      const fromFile = readFileCache();
      if (fromFile) { _snapshot = fromFile; return fromFile; }
      return { indices: {}, commodities: {}, fx: {}, equities: {}, cbRates: [], fetchedAt: 0, callsThisCycle: 0 } as ApiNinjasSnapshot;
    });

  // If we have stale data, return it immediately while fresh data loads
  if (_snapshot) {
    // Don't await — let it refresh in background
    _loading.catch(() => {}); // prevent unhandled rejection
    return _snapshot;
  }

  return _loading;
}

/**
 * Get estimated monthly call usage.
 */
export function getApiNinjasUsage(): MonthlyCounter {
  return readCounter();
}
