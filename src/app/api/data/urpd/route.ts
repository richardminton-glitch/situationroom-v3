import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

// BRK (Bitcoin Research Kit) — bitview.space
//
// URPD source: /api/series/cost-basis/all/{YYYY-MM-DD}
//   Returns a JSON object: { [price_usd: string]: btc_supply_btc: number }
//   78,096 unique price keys from $0 to $125,670 (current BTC ATH).
//   Keys = exact USD cost basis per BTC of UTXOs last moved at that price.
//   Values = BTC supply with that cost basis.
//   Confirmed: sum of all values = ~20,010,364 BTC (circulating supply).
//   Confirmed: sum of keys below currentPrice = supply_in_profit series value.
//
// Response size is ~1–2 MB. We bin into $2,500 increments (54 bins) to produce
// a chart-friendly payload and cache for 1 hour.
//
// Spot price:       BRK `price` series (day1 latest)
// Realised price:   BRK `realized_price` series (day1 latest — average cost basis of all UTXOs)
//
// inProfit / atLoss are calculated server-side from the binned distribution.

const ONE_HOUR   = 60 * 60 * 1000;
const CACHE_FILE = join(process.cwd(), 'data', 'urpd-cache.json');
const BIN_SIZE   = 2_500;   // USD per bucket
const MAX_PRICE  = 135_000; // cap — above current ATH, captures extreme outliers

export interface URPDBucket {
  price: number;   // lower bound of bin in USD
  supply: number;  // BTC supply in this bin
}

export interface URPDResponse {
  buckets: URPDBucket[];
  currentPrice: number;
  realisedPrice: number;
  inProfit: number;  // percentage of circulating supply in profit
  atLoss: number;    // percentage of circulating supply at a loss
}

type CacheShape = URPDResponse;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayISO(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function readCache(): { data: CacheShape; fetchedAt: number } | null {
  try {
    const stat = statSync(CACHE_FILE);
    const json = JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as CacheShape;
    return { data: json, fetchedAt: stat.mtimeMs };
  } catch {
    return null;
  }
}

function writeCache(data: CacheShape) {
  try {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch (e) {
    console.warn('[urpd] Could not write cache:', e);
  }
}

async function fetchFromBRK(): Promise<CacheShape> {
  // Step 1: probe `price` series to get total day count
  const probeRes = await fetch(
    'https://bitview.space/api/series/price/day1?limit=1',
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!probeRes.ok) throw new Error(`BRK probe: HTTP ${probeRes.status}`);
  const probe = (await probeRes.json()) as { total: number };
  const latestOffset = probe.total - 1;

  // Step 2: fetch spot price, realised price, and URPD distribution in parallel
  // cost-basis endpoint returns a plain { [priceUSD]: btcSupply } object — large (~1–2 MB)
  const today     = todayISO();
  const yesterday = yesterdayISO();

  const [priceRes, rpRes, cbRes] = await Promise.all([
    fetch(
      `https://bitview.space/api/series/price/day1?limit=1&start=${latestOffset}`,
      { signal: AbortSignal.timeout(10_000) },
    ),
    fetch(
      `https://bitview.space/api/series/realized_price/day1?limit=1&start=${latestOffset}`,
      { signal: AbortSignal.timeout(10_000) },
    ),
    // Try today first; fall back to yesterday if not yet published
    fetch(
      `https://bitview.space/api/series/cost-basis/all/${today}`,
      { signal: AbortSignal.timeout(30_000) },
    ).then(r => r.ok ? r : fetch(
      `https://bitview.space/api/series/cost-basis/all/${yesterday}`,
      { signal: AbortSignal.timeout(30_000) },
    )),
  ]);

  if (!priceRes.ok) throw new Error(`BRK price: HTTP ${priceRes.status}`);
  if (!rpRes.ok)    throw new Error(`BRK realised_price: HTTP ${rpRes.status}`);
  if (!cbRes.ok)    throw new Error(`BRK cost-basis: HTTP ${cbRes.status}`);

  const priceData = (await priceRes.json()) as { data: (number | null)[] };
  const rpData    = (await rpRes.json()) as { data: (number | null)[] };
  const rawDist   = (await cbRes.json()) as Record<string, number>;

  const currentPrice  = priceData.data[0]  ?? 0;
  const realisedPrice = rpData.data[0]      ?? 0;

  // Step 3: bin the 78K price points into $2,500 increments
  const bins = new Map<number, number>();
  for (let p = 0; p <= MAX_PRICE; p += BIN_SIZE) {
    bins.set(p, 0);
  }

  let totalSupply = 0;
  let profitSupply = 0;

  for (const [priceStr, supply] of Object.entries(rawDist)) {
    const price = parseFloat(priceStr);
    if (!isFinite(price) || !isFinite(supply)) continue;

    const bin = Math.min(
      Math.floor(price / BIN_SIZE) * BIN_SIZE,
      MAX_PRICE,
    );
    bins.set(bin, (bins.get(bin) ?? 0) + supply);
    totalSupply += supply;
    if (price < currentPrice) profitSupply += supply;
  }

  // Step 4: build sorted buckets, drop empty ones
  const buckets: URPDBucket[] = [];
  for (const [price, supply] of bins) {
    if (supply > 0) buckets.push({ price, supply });
  }
  buckets.sort((a, b) => a.price - b.price);

  const inProfit = totalSupply > 0
    ? Math.round((profitSupply / totalSupply) * 1000) / 10
    : 0;
  const atLoss = Math.round((100 - inProfit) * 10) / 10;

  console.log(
    `[urpd] ${buckets.length} bins | price $${currentPrice.toFixed(0)}` +
    ` | realised $${realisedPrice.toFixed(0)} | in-profit ${inProfit}%`,
  );

  return { buckets, currentPrice, realisedPrice, inProfit, atLoss };
}

export async function GET() {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < ONE_HOUR) {
    return NextResponse.json(cached.data);
  }

  try {
    const payload = await fetchFromBRK();
    writeCache(payload);
    return NextResponse.json(payload);
  } catch (err) {
    console.error('[urpd] Fetch failed:', (err as Error).message);
    if (cached) {
      console.log('[urpd] Serving stale cache');
      return NextResponse.json(cached.data);
    }
    return NextResponse.json(
      { buckets: [], currentPrice: 0, realisedPrice: 0, inProfit: 0, atLoss: 0 },
      { status: 503 },
    );
  }
}
