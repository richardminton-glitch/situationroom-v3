/**
 * BTC price history for the DCA Signal Engine.
 *
 * Data strategy — CSV-first, zero paid API calls:
 *   1. Read full history from data/btc-price-history.csv (5700+ days back to 2010)
 *   2. Gap-fill any days after the CSV's last entry using CoinGecko free tier (≤365 days)
 *   3. Backfill btc_price_history DB so the nightly cron keeps things current
 *   4. In steady-state the DB will have everything — CSV + CG only used to seed
 *
 * CoinGecko free tier supports days≤365 without an API key.
 */

import * as fs   from 'fs';
import * as path from 'path';
import { fetchJSON } from '@/lib/data/fetcher';
import { prisma }    from '@/lib/db';

export interface DayPrice {
  date:  string;  // YYYY-MM-DD
  price: number;
}

// Candidate paths — checked in order. Primary is src/lib/data/ (git-tracked, deployed
// with the repo). Fallback is data/ (gitignored runtime dir, used during local dev or
// if the CSV was manually scp'd to the server before the tracked version was in place).
const CSV_CANDIDATES = [
  path.join(process.cwd(), 'src', 'lib', 'data', 'btc-price-history.csv'),
  path.join(process.cwd(), 'data', 'btc-price-history.csv'),
];
const CG_CACHE_KEY      = 'cgHistoryRecent';
const CG_CACHE_DURATION = 24 * 60 * 60 * 1000;
const FETCH_DAYS        = 1500;

// ── CSV reader ────────────────────────────────────────────────────────────────

/** Parse btc-price-history.csv → DayPrice[], ascending by date */
function readCsvPrices(): DayPrice[] {
  // Try each candidate path in order
  let raw: string | null = null;
  for (const candidate of CSV_CANDIDATES) {
    try {
      raw = fs.readFileSync(candidate, 'utf-8');
      break;
    } catch { /* try next */ }
  }
  if (!raw) return [];

  try {
    raw = raw.replace(/^\uFEFF/, ''); // strip BOM
    const rows = raw.trim().split('\n');
    const result: DayPrice[] = [];

    for (let i = 1; i < rows.length; i++) {          // skip header
      const [dateStr, priceStr] = rows[i].trim().split(',');
      if (!dateStr || !priceStr) continue;

      // CSV format: DD/MM/YYYY
      const parts = dateStr.split('/');
      if (parts.length !== 3) continue;
      const [dd, mm, yyyy] = parts;
      const date  = `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
      const price = parseFloat(priceStr);
      if (!isNaN(price) && price > 0) result.push({ date, price });
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

// ── CoinGecko gap-fill (free tier only) ───────────────────────────────────────

/**
 * Fetch recent days from CoinGecko's free market_chart endpoint.
 * days ≤ 365 does not require an API key.
 */
async function fetchRecentFromCoinGecko(days: number): Promise<DayPrice[]> {
  const safedays = Math.min(days, 360); // stay well inside free tier
  const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${safedays}&interval=daily`;

  try {
    const raw = await fetchJSON<{ prices: [number, number][] }>(url, {
      cacheKey:      CG_CACHE_KEY,
      cacheDuration: CG_CACHE_DURATION,
      timeout:       30_000,
    });
    const byDate = new Map<string, number>();
    for (const [ts, price] of raw.prices) {
      byDate.set(new Date(ts).toISOString().slice(0, 10), price);
    }
    return Array.from(byDate.entries())
      .map(([date, price]) => ({ date, price }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

// ── DB helpers ────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function readFromDb(): Promise<DayPrice[]> {
  try {
    const rows = await prisma.btcPriceHistory.findMany({ orderBy: { date: 'asc' } });
    return rows.map(r => ({ date: toDateStr(r.date), price: r.close }));
  } catch {
    return [];
  }
}

/** Backfill missing rows into btc_price_history (non-fatal, fire-and-forget) */
async function backfillDb(rows: DayPrice[], existingDates: Set<string>): Promise<void> {
  const toInsert = rows.filter(r => !existingDates.has(r.date));
  if (toInsert.length === 0) return;

  const BATCH = 100;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    await Promise.all(
      batch.map(r =>
        prisma.btcPriceHistory.upsert({
          where:  { date: new Date(r.date) },
          update: { close: r.price },
          create: { date: new Date(r.date), close: r.price },
        }).catch(() => { /* non-fatal */ })
      )
    );
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Return up to FETCH_DAYS of daily BTC/USD prices, sorted ascending.
 *
 * Fast path: DB has ≥ FETCH_DAYS rows → return DB data.
 * Slow path (first run): read CSV + gap-fill with CoinGecko, backfill DB.
 */
export async function fetchCoinGeckoHistory(): Promise<DayPrice[]> {
  // ── Fast path: DB is fully seeded ─────────────────────────────────────────
  const dbRows      = await readFromDb();
  const existingSet = new Set(dbRows.map(r => r.date));
  const today       = toDateStr(new Date());

  if (dbRows.length >= FETCH_DAYS) {
    // Ensure today is present (nightly cron runs at midnight; today's row may be absent)
    if (!existingSet.has(today)) {
      const recent = await fetchRecentFromCoinGecko(5); // just last 5 days
      const todayRow = recent.find(r => r.date === today);
      if (todayRow) dbRows.push(todayRow);
    }
    return dbRows;
  }

  // ── Slow path: seed from CSV + gap-fill ───────────────────────────────────
  const csvRows = readCsvPrices();

  // Find the gap between the CSV's last date and today
  const lastCsvDate  = csvRows.at(-1)?.date ?? '2020-01-01';
  const msPerDay     = 86_400_000;
  const gapDays      = Math.ceil((Date.now() - new Date(lastCsvDate).getTime()) / msPerDay) + 5;

  const recentRows = gapDays > 0
    ? await fetchRecentFromCoinGecko(Math.max(gapDays, 10))
    : [];

  // Merge: CSV first, recent API rows override for same date
  const merged = new Map<string, number>();
  for (const r of csvRows)   merged.set(r.date, r.price);
  for (const r of recentRows) merged.set(r.date, r.price);

  const allRows = Array.from(merged.entries())
    .map(([date, price]) => ({ date, price }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Backfill DB (async, non-fatal) — after this the fast path will be taken
  backfillDb(allRows, existingSet).catch(() => { /* non-fatal */ });

  // Return last FETCH_DAYS rows
  return allRows.slice(-FETCH_DAYS);
}
