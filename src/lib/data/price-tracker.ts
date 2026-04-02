/**
 * Price tracker — tracks previous day baselines for 24h % change calculations.
 * Ported from V2 data-aggregator.js trackChange()/rollover logic.
 *
 * In-memory during runtime, persisted to DataCache (PostgreSQL) at midnight rollover.
 */

import { prisma } from '@/lib/db';

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

/**
 * Load previous day prices from DataCache on first call.
 */
async function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const row = await prisma.dataCache.findUnique({ where: { key: 'prev_day_prices' } });
    if (row) {
      const saved = JSON.parse(row.data);
      for (const cat of PRICE_CATEGORIES) {
        if (saved[cat]) Object.assign(prevDayPrices[cat], saved[cat]);
      }
      console.log('[PriceTracker] Loaded previous day prices from DB');
    }
  } catch (e) {
    console.warn('[PriceTracker] Could not load prev prices:', e);
  }
}

/**
 * Save previous day prices to DataCache.
 */
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

  // Calculate % change vs last known baseline (could be Friday close on a weekend)
  const prev = prevDayPrices[category][id];
  if (prev && currentPrice != null && prev !== 0) {
    return ((currentPrice - prev) / prev) * 100;
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
