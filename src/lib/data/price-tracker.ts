/**
 * Price tracker — tracks previous day baselines for 24h % change calculations.
 * Ported from V2 data-aggregator.js trackChange()/rollover logic.
 *
 * In-memory during runtime, persisted to DataCache (PostgreSQL) at midnight rollover.
 *
 * Bootstrap strategy (on startup when no baselines exist):
 *   1. Try DataCache DB (prev_day_prices key)
 *   2. Try daily_* snapshot tables (yesterday or last trading day)
 *   3. Try file caches (market-cache.json, api-ninjas-snapshot.json)
 *   4. Seed from first incoming prices (changes will be 0 until next fetch cycle)
 */

import { prisma } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

const PRICE_CATEGORIES = ['indices', 'commodities', 'fx'] as const;
type PriceCategory = (typeof PRICE_CATEGORIES)[number];

const prevDayPrices: Record<PriceCategory, Record<string, number>> = {
  indices: {},
  commodities: {},
  fx: {},
};

const todayPrices: Record<PriceCategory, Record<string, number>> = {
  indices: {},
  commodities: {},
  fx: {},
};

let priceDate: string | null = null;
let loaded = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function countBaselines(): number {
  return PRICE_CATEGORIES.reduce((s, c) => s + Object.keys(prevDayPrices[c]).length, 0);
}

/** Debounced save — batches multiple new baselines into one DB write */
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    await savePrevPrices();
  }, 5_000);
}

// ── Persistence ───────────────────────────────────────────────────────────────

async function savePrevPrices() {
  try {
    const data = JSON.stringify(prevDayPrices);
    await prisma.dataCache.upsert({
      where: { key: 'prev_day_prices' },
      update: { data, updatedAt: new Date() },
      create: { key: 'prev_day_prices', data, expiresAt: new Date('2099-01-01'), updatedAt: new Date() },
    });
    console.log('[PriceTracker] Saved previous day prices to DB');
  } catch (e) {
    console.warn('[PriceTracker] Could not save prev prices:', e);
  }
}

// ── Bootstrap: load from DataCache ────────────────────────────────────────────

async function loadFromDB(): Promise<boolean> {
  try {
    const row = await prisma.dataCache.findUnique({ where: { key: 'prev_day_prices' } });
    if (row) {
      const saved = JSON.parse(row.data);
      let count = 0;
      for (const cat of PRICE_CATEGORIES) {
        if (saved[cat] && typeof saved[cat] === 'object') {
          Object.assign(prevDayPrices[cat], saved[cat]);
          count += Object.keys(saved[cat]).length;
        }
      }
      if (count > 0) {
        console.log(`[PriceTracker] Loaded ${count} baselines from DB`);
        return true;
      }
    }
  } catch (e) {
    console.warn('[PriceTracker] DB load failed:', e);
  }
  return false;
}

// ── Bootstrap: seed from daily_* tables ───────────────────────────────────────

async function seedFromDailyTables(): Promise<boolean> {
  try {
    // Look back up to 4 days to find the most recent daily record (covers weekends)
    for (let daysBack = 1; daysBack <= 4; daysBack++) {
      const date = new Date(Date.now() - daysBack * 86_400_000);
      date.setUTCHours(0, 0, 0, 0);

      const [idx, comm, fxResult] = await Promise.allSettled([
        prisma.dailyIndices.findUnique({ where: { date } }),
        prisma.dailyCommodities.findUnique({ where: { date } }),
        prisma.dailyFx.findUnique({ where: { date } }),
      ]);

      let seeded = 0;

      if (idx.status === 'fulfilled' && idx.value) {
        const d = idx.value;
        const map: Record<string, number | null> = {
          sp500: d.sp500, nasdaq: d.nasdaq, dji: d.dow, ftse: d.ftse,
          dax: d.dax, nikkei: d.nikkei, hsi: d.hangSeng, vix: d.vix,
        };
        for (const [key, val] of Object.entries(map)) {
          if (val != null) { prevDayPrices.indices[key] = val; seeded++; }
        }
        // DXY, US 10Y, US 2Y stored in daily_indices
        if (d.dxy != null) { prevDayPrices.commodities.dxy = d.dxy; seeded++; }
        if (d.us10y != null) { prevDayPrices.commodities.us10y = d.us10y; seeded++; }
        if (d.us2y != null) { prevDayPrices.commodities.us2y = d.us2y; seeded++; }
      }

      if (comm.status === 'fulfilled' && comm.value) {
        const d = comm.value;
        const map: Record<string, number | null> = {
          gold: d.gold, silver: d.silver, 'crude-oil': d.crudeOil,
          'natural-gas': d.naturalGas, copper: d.copper,
        };
        for (const [key, val] of Object.entries(map)) {
          if (val != null) { prevDayPrices.commodities[key] = val; seeded++; }
        }
      }

      if (fxResult.status === 'fulfilled' && fxResult.value) {
        const d = fxResult.value;
        const map: Record<string, number | null> = {
          eur: d.eurUsd, gbp: d.gbpUsd, jpy: d.usdJpy, cny: d.usdCny,
        };
        for (const [key, val] of Object.entries(map)) {
          if (val != null) { prevDayPrices.fx[key] = val; seeded++; }
        }
      }

      if (seeded > 0) {
        console.log(`[PriceTracker] Seeded ${seeded} baselines from daily tables (${daysBack}d back)`);
        return true;
      }
    }
  } catch (e) {
    console.warn('[PriceTracker] Daily table seed failed:', e);
  }
  return false;
}

// ── Bootstrap: seed from file caches ──────────────────────────────────────────

function seedFromFileCaches(): boolean {
  const files = [
    path.join(process.cwd(), 'data', 'market-cache.json'),
    path.join(process.cwd(), 'data', 'api-ninjas-snapshot.json'),
  ];

  let totalSeeded = 0;

  for (const file of files) {
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const cache = JSON.parse(raw);

      for (const cat of PRICE_CATEGORIES) {
        const section = cache[cat];
        if (!section || typeof section !== 'object') continue;
        for (const [key, val] of Object.entries(section)) {
          if (
            val && typeof val === 'object' && 'price' in (val as Record<string, unknown>) &&
            typeof (val as Record<string, unknown>).price === 'number' &&
            (val as Record<string, unknown>).price! > 0 &&
            !prevDayPrices[cat][key]
          ) {
            prevDayPrices[cat][key] = (val as Record<string, unknown>).price as number;
            totalSeeded++;
          }
        }
      }
    } catch {
      // File doesn't exist or is corrupt — try next
    }
  }

  if (totalSeeded > 0) {
    console.log(`[PriceTracker] Seeded ${totalSeeded} baselines from file caches`);
    return true;
  }
  return false;
}

// ── Main load ─────────────────────────────────────────────────────────────────

async function ensureLoaded() {
  if (loaded) return;
  loaded = true;

  // Strategy 1: DataCache DB (prev_day_prices)
  if (await loadFromDB()) return;

  // Strategy 2: Daily snapshot tables (yesterday / last trading day)
  if (await seedFromDailyTables()) {
    await savePrevPrices(); // persist so Strategy 1 works next restart
    return;
  }

  // Strategy 3: File caches (market-cache.json / api-ninjas-snapshot.json)
  if (seedFromFileCaches()) {
    await savePrevPrices();
    return;
  }

  console.warn('[PriceTracker] No baselines found — will seed from first incoming prices');
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Track a price and return the % change vs the last known baseline.
 * Handles midnight rollover automatically.
 *
 * Weekend/holiday logic: if prevDayPrices has no entry for this id
 * (because markets were closed and no price was recorded yesterday),
 * the baseline persists from the last trading day. The rollover only
 * overwrites prevDayPrices when todayPrices has actual data for that
 * category — so Friday's closing prices survive through the weekend.
 */
export async function trackChange(
  category: PriceCategory,
  id: string,
  currentPrice: number | null | undefined
): Promise<number | null> {
  await ensureLoaded();

  const today = new Date().toISOString().slice(0, 10);

  // Midnight rollover detection
  if (priceDate && priceDate !== today) {
    console.log(`[PriceTracker] Midnight rollover: ${priceDate} → ${today}`);
    for (const cat of PRICE_CATEGORIES) {
      // Only overwrite prev with today's prices if we actually got fresh data.
      // This preserves the last trading day baseline through weekends/holidays.
      const todayEntries = todayPrices[cat];
      if (Object.keys(todayEntries).length > 0) {
        for (const [key, val] of Object.entries(todayEntries)) {
          // Only update baseline if the price actually changed (not a stale repeat)
          if (val !== prevDayPrices[cat][key]) {
            prevDayPrices[cat][key] = val;
          }
        }
      }
      todayPrices[cat] = {};
    }
    await savePrevPrices();
  }
  priceDate = today;

  // Track today's latest price
  if (currentPrice != null) {
    todayPrices[category][id] = currentPrice;
  }

  // Calculate % change vs last known baseline
  const prev = prevDayPrices[category][id];
  if (prev != null && prev !== 0 && currentPrice != null) {
    return ((currentPrice - prev) / prev) * 100;
  }

  // No baseline yet for this ticker — seed it (covers new tickers added later)
  if (currentPrice != null && prev == null) {
    prevDayPrices[category][id] = currentPrice;
    scheduleSave();
  }

  return null;
}

/**
 * Get all tracked prices for a category (for daily snapshot recording).
 */
export function getTodayPrices(category: PriceCategory): Record<string, number> {
  return { ...todayPrices[category] };
}

export function getPrevDayPrices(category: PriceCategory): Record<string, number> {
  return { ...prevDayPrices[category] };
}
