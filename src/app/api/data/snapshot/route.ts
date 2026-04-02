import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  fetchBtcMarket,
  fetchBtcNetwork,
  fetchLightning,
  fetchFearGreed,
  fetchOnChain,
  fetchIndices,
  fetchCommodities,
  fetchFX,
  fetchCentralBankRates,
  fetchWhaleTransactions,
  fetchBtcEquities,
} from '@/lib/data/sources';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ── File-based market data cache ──────────────────────────────────────────────
// Persists the last successful indices/commodities/fx/btcEquities responses
// so panels stay populated during API Ninjas outages or rate-limit windows.

const MARKET_CACHE_FILE = join(process.cwd(), 'data', 'market-cache.json');

interface MarketCache {
  indices: Record<string, unknown>;
  commodities: Record<string, unknown>;
  fx: Record<string, unknown>;
  btcEquities: Record<string, unknown>;
  savedAt: number;
}

function readMarketCache(): MarketCache | null {
  try {
    return JSON.parse(readFileSync(MARKET_CACHE_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function writeMarketCache(data: Omit<MarketCache, 'savedAt'>) {
  try {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(MARKET_CACHE_FILE, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch (e) {
    console.warn('[snapshot] Could not write market cache:', e);
  }
}

function isNonEmpty(v: unknown): boolean {
  return v != null && typeof v === 'object' && Object.keys(v).length > 0;
}

/**
 * GET /api/data/snapshot
 * Aggregates all data sources into a single response.
 * Each source is fetched in parallel with independent error handling.
 * Market data (indices/commodities/fx/equities) falls back to last known
 * file-cached values when the API is unavailable.
 */
export async function GET() {
  const results = await Promise.allSettled([
    fetchBtcMarket(),
    fetchBtcNetwork(),
    fetchLightning(),
    fetchFearGreed(),
    fetchOnChain(),
    fetchIndices(),
    fetchCommodities(),
    fetchFX(),
    fetchCentralBankRates(),
    fetchBtcEquities(),
  ]);

  const [btcMarket, btcNetwork, lightning, fearGreed, onchain, indices, commodities, fx, rates, btcEquities] = results.map(
    (r) => (r.status === 'fulfilled' ? r.value : null)
  );

  // Whale txs need btcPrice, so run after btcMarket resolves
  const btcPrice = btcMarket && typeof btcMarket === 'object' && 'price' in btcMarket
    ? (btcMarket as { price: number }).price
    : 0;

  let whales = null;
  try {
    whales = await fetchWhaleTransactions(btcPrice);
  } catch {
    // Whales are non-critical
  }

  // ── Market data persistence ──────────────────────────────────────────────
  const marketCache = readMarketCache();

  // Use fresh data if non-empty, otherwise fall back to file cache
  const resolvedIndices    = isNonEmpty(indices)    ? indices    : marketCache?.indices    ?? indices;
  const resolvedCommodities= isNonEmpty(commodities)? commodities: marketCache?.commodities?? commodities;
  const resolvedFx         = isNonEmpty(fx)         ? fx         : marketCache?.fx         ?? fx;
  const resolvedEquities   = isNonEmpty(btcEquities) ? btcEquities: marketCache?.btcEquities?? btcEquities;

  // Persist any fresh successful data
  const freshMarket = {
    indices:     isNonEmpty(indices)     ? (indices     as Record<string, unknown>) : (marketCache?.indices     ?? {}),
    commodities: isNonEmpty(commodities) ? (commodities as Record<string, unknown>) : (marketCache?.commodities ?? {}),
    fx:          isNonEmpty(fx)          ? (fx          as Record<string, unknown>) : (marketCache?.fx          ?? {}),
    btcEquities: isNonEmpty(btcEquities) ? (btcEquities as Record<string, unknown>) : (marketCache?.btcEquities ?? {}),
  };
  if (
    isNonEmpty(indices) || isNonEmpty(commodities) ||
    isNonEmpty(fx) || isNonEmpty(btcEquities)
  ) {
    writeMarketCache(freshMarket);
  }

  return NextResponse.json({
    btcMarket,
    btcNetwork,
    lightning,
    fearGreed,
    onchain,
    indices:    resolvedIndices,
    commodities:resolvedCommodities,
    fx:         resolvedFx,
    rates,
    whales,
    btcEquities:resolvedEquities,
    timestamp: Date.now(),
  });
}
