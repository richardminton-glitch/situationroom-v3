import { NextResponse } from 'next/server';
import { generateBriefing } from '@/lib/grok/pipeline';
import { computeThreatLevel } from '@/lib/grok/quality';
import { calculateConviction } from '@/lib/conviction/engine';
import type { DashboardSnapshot } from '@/lib/grok/prompts';
import {
  fetchBtcMarket,
  fetchBtcNetwork,
  fetchLightning,
  fetchFearGreed,
  fetchOnChain,
  fetchIndices,
  fetchCommodities,
  fetchCentralBankRates,
} from '@/lib/data/sources';
import { fetchJSON } from '@/lib/data/fetcher';
import { fetchRSSHeadlines } from '@/lib/data/rss';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/briefing/trigger
 * UI-callable briefing generation — no CRON_SECRET required.
 * Intended for manual triggering from the /briefings page.
 */
export async function POST() {
  try {
    const [btcMarket, btcNetwork, lightning, fearGreed, onchain, indices, commodities, headlines, cbRates, hashrateData] =
      await Promise.allSettled([
        fetchBtcMarket(),
        fetchBtcNetwork(),
        fetchLightning(),
        fetchFearGreed(),
        fetchOnChain(),
        fetchIndices(),
        fetchCommodities(),
        fetchRSSHeadlines(),
        fetchCentralBankRates(),
        fetchJSON<{ currentHashrate: number; hashrates: { avgHashrate: number }[] }>(
          'https://mempool.space/api/v1/mining/hashrate/3m',
          { cacheKey: 'hashrate3m', cacheDuration: 3600_000, timeout: 30_000 }
        ),
      ]);

    const btc  = btcMarket.status   === 'fulfilled' ? btcMarket.value   : null;
    const net  = btcNetwork.status  === 'fulfilled' ? btcNetwork.value  : null;
    const ln   = lightning.status   === 'fulfilled' ? lightning.value   : null;
    const fg   = fearGreed.status   === 'fulfilled' ? fearGreed.value   : null;
    const oc   = onchain.status     === 'fulfilled' ? onchain.value     : null;
    const idx  = indices.status     === 'fulfilled' ? indices.value     : null;
    const comm = commodities.status === 'fulfilled' ? commodities.value : null;
    const headlineItems = headlines.status === 'fulfilled' ? headlines.value : [];

    const threat = computeThreatLevel(headlineItems.map((h) => h.title));

    // Compute conviction score from live 5-signal engine
    let fedRate: number | null = null;
    if (cbRates.status === 'fulfilled' && cbRates.value.length > 0) {
      const fed = cbRates.value.find((r) => r.country.includes('Federal') || r.country.includes('Fed'));
      fedRate = fed?.rate ?? null;
    }

    let hashrateRatio: number | null = null;
    if (hashrateData.status === 'fulfilled') {
      const { currentHashrate, hashrates } = hashrateData.value;
      if (hashrates.length > 0 && currentHashrate > 0) {
        const avg = hashrates.reduce((s, h) => s + h.avgHashrate, 0) / hashrates.length;
        hashrateRatio = avg > 0 ? currentHashrate / avg : null;
      }
    }

    const conviction = calculateConviction({
      fearGreed: fg?.value ?? null,
      change30d: btc?.change30d ?? null,
      mvrv: oc?.mvrv ?? null,
      athChangePct: btc?.athChangePct ?? null,
      fedRate,
      hashrateRatio,
    });
    const convictionScore = conviction.composite;

    const snapshot: DashboardSnapshot = {
      btcPrice:         btc?.price           ?? 0,
      btc24hPct:        btc?.change24h        ?? 0,
      marketCap:        btc?.marketCap        ?? 0,
      volume24h:        btc?.volume24h        ?? 0,
      fearGreed:        fg?.value             ?? 50,
      fearGreedLabel:   fg?.classification    ?? 'Neutral',
      mvrv:             oc?.mvrv              ?? 0,
      exchangeNetFlow:  oc?.netFlow           ?? 0,
      exchangeBalance:  oc?.exchangeBalance   ?? 0,
      hashrateEH:       net?.hashrateEH       ?? 0,
      blockHeight:      net?.blockHeight      ?? 0,
      mempoolMB:        net?.mempoolSizeMB    ?? 0,
      feeFast:          net?.feeFast          ?? 0,
      feeMed:           net?.feeMed           ?? 0,
      lnCapacity:       ln?.capacityBTC       ?? 0,
      lnChannels:       ln?.channels          ?? 0,
      dxy:              comm?.dxy?.price      ?? 0,
      us10y:            comm?.us10y?.price    ?? 0,
      us2y:             comm?.us2y?.price     ?? 0,
      gold:             comm?.gold?.price     ?? 0,
      oil:              comm?.['crude-oil']?.price ?? 0,
      sp500:            idx?.sp500?.price     ?? 0,
      sp500Pct:         idx?.sp500?.changePct ?? 0,
      vix:              idx?.vix?.price       ?? 0,
      convictionScore,
      threatLevel: threat.level,
    };

    const result = await generateBriefing(snapshot, headlineItems);

    return NextResponse.json({
      success:      true,
      date:         result.date,
      headline:     result.headline,
      threatLevel:  result.threatLevel,
      sourcesCount: result.sources.length,
      quality:      result.quality,
      generatedAt:  result.generatedAt,
    });
  } catch (error) {
    console.error('[Briefing Trigger] Failed:', error);
    return NextResponse.json({ error: 'Generation failed', detail: String(error) }, { status: 500 });
  }
}
