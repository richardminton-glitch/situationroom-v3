/**
 * BTC price history for the DCA Signal Engine.
 *
 * Data strategy — DB-first, minimal API calls:
 *   1. Read all available rows from BtcPriceHistory (updated nightly by daily-snapshot.ts cron)
 *   2. If DB has < 1500 days, fetch the missing range from CoinGecko to fill gaps
 *   3. Write any new entries back to BtcPriceHistory so the DB grows over time
 *   4. For today's price (not yet in the midnight cron), use the live market ticker
 *
 * CoinGecko is only called when the DB is insufficient — typically never in
 * steady-state once the DB has been fully backfilled.
 */

import { fetchJSON }  from '@/lib/data/fetcher';
import { prisma }     from '@/lib/db';

export interface DayPrice {
  date: string;  // YYYY-MM-DD
  price: number;
}

const CG_CACHE_KEY      = 'cgHistory1500';
const CG_CACHE_DURATION = 24 * 60 * 60 * 1000;
const FETCH_DAYS        = 1500;

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Fetch raw CoinGecko market_chart — deduplicated, ascending */
async function fetchFromCoinGecko(days: number): Promise<DayPrice[]> {
  const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`;
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
}

/** Backfill missing rows into BtcPriceHistory (non-fatal) */
async function backfillDb(rows: DayPrice[], existingDates: Set<string>): Promise<void> {
  const toInsert = rows.filter(r => !existingDates.has(r.date));
  if (toInsert.length === 0) return;

  // Batch upsert — 100 at a time to avoid huge queries
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
 * DB-first: reads BtcPriceHistory, falls back to CoinGecko for missing data.
 */
export async function fetchCoinGeckoHistory(): Promise<DayPrice[]> {
  // 1. Read all available rows from the DB
  let dbRows: DayPrice[] = [];
  try {
    const rows = await prisma.btcPriceHistory.findMany({
      orderBy: { date: 'asc' },
    });
    dbRows = rows.map(r => ({ date: toDateStr(r.date), price: r.close }));
  } catch {
    // DB unavailable — will fall back to CoinGecko entirely
  }

  const existingDates = new Set(dbRows.map(r => r.date));

  // 2. If DB has enough data, return it (plus today from live ticker if missing)
  if (dbRows.length >= FETCH_DAYS) {
    // Ensure today's price is included (cron runs at midnight, so today may be absent)
    const today = toDateStr(new Date());
    if (!existingDates.has(today)) {
      try {
        const market = await fetchJSON<{ market_data: { current_price: { usd: number } } }>(
          'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false',
          { cacheKey: 'cgBtcCurrent', cacheDuration: 5 * 60 * 1000 }
        );
        const todayPrice = market.market_data.current_price.usd;
        dbRows.push({ date: today, price: todayPrice });
      } catch { /* live price unavailable — last DB entry is good enough */ }
    }
    return dbRows;
  }

  // 3. DB is insufficient — fetch from CoinGecko
  const cgRows = await fetchFromCoinGecko(FETCH_DAYS);

  // 4. Backfill DB with missing entries (fire-and-forget)
  backfillDb(cgRows, existingDates).catch(() => { /* non-fatal */ });

  // 5. Merge: DB rows override CG for same date (DB is ground truth after midnight)
  const merged = new Map<string, number>();
  for (const r of cgRows)  merged.set(r.date, r.price);
  for (const r of dbRows)  merged.set(r.date, r.price); // DB wins on conflicts

  return Array.from(merged.entries())
    .map(([date, price]) => ({ date, price }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
