import { NextResponse } from 'next/server';
import { calculateConviction, type ConvictionInputs } from '@/lib/conviction/engine';
import { fetchBtcMarket, fetchFearGreed, fetchOnChain, fetchBtcNetwork, fetchCentralBankRates } from '@/lib/data/sources';
import { fetchJSON } from '@/lib/data/fetcher';

export const dynamic = 'force-dynamic';

/**
 * GET /api/data/conviction
 * Calculates the current conviction score from live data.
 */
export async function GET() {
  try {
    const [btcMarket, fearGreed, onchain, rates, hashrateData] = await Promise.allSettled([
      fetchBtcMarket(),
      fetchFearGreed(),
      fetchOnChain(),
      fetchCentralBankRates(),
      fetchJSON<{ currentHashrate: number; hashrates: { avgHashrate: number }[] }>(
        'https://mempool.space/api/v1/mining/hashrate/3m',
        { cacheKey: 'hashrate3m', cacheDuration: 3600_000, timeout: 30_000 }
      ),
    ]);

    // Extract Fed rate
    let fedRate: number | null = null;
    if (rates.status === 'fulfilled' && rates.value.length > 0) {
      const fed = rates.value.find((r) => r.country.includes('Federal') || r.country.includes('Fed'));
      fedRate = fed?.rate ?? null;
    }

    // Calculate hashrate ratio (current vs 90-day average)
    let hashrateRatio: number | null = null;
    if (hashrateData.status === 'fulfilled') {
      const { currentHashrate, hashrates } = hashrateData.value;
      if (hashrates.length > 0 && currentHashrate > 0) {
        const avg = hashrates.reduce((s, h) => s + h.avgHashrate, 0) / hashrates.length;
        hashrateRatio = avg > 0 ? currentHashrate / avg : null;
      }
    }

    const inputs: ConvictionInputs = {
      fearGreed: fearGreed.status === 'fulfilled' ? fearGreed.value.value : null,
      change30d: btcMarket.status === 'fulfilled' ? btcMarket.value.change30d : null,
      mvrv: onchain.status === 'fulfilled' ? onchain.value.mvrv : null,
      athChangePct: btcMarket.status === 'fulfilled' ? btcMarket.value.athChangePct : null,
      fedRate,
      hashrateRatio,
    };

    const result = calculateConviction(inputs);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Conviction calculation error:', error);
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 });
  }
}
