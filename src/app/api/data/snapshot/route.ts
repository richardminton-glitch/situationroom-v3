import { NextResponse } from 'next/server';
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

/**
 * GET /api/data/snapshot
 * Aggregates all data sources into a single response.
 * Each source is fetched in parallel with independent error handling.
 * Failed sources return null — the client renders whatever succeeded.
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

  return NextResponse.json({
    btcMarket,
    btcNetwork,
    lightning,
    fearGreed,
    onchain,
    indices,
    commodities,
    fx,
    rates,
    whales,
    btcEquities,
    timestamp: Date.now(),
  });
}
