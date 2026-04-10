/**
 * GET /api/cycle-gauge
 *
 * Returns the current Cycle Position composite and all 5 supporting indicators.
 *
 * Caching hierarchy:
 *   1. DataCache table ('cycle-gauge-hourly') — 1h TTL
 *   2. Module-level in-memory cache — 1h TTL
 *   3. Live computation from BRK (realized_price) + Puell + CoinGecko history
 */

import { NextResponse }            from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join }                    from 'path';
import { prisma }                  from '@/lib/db';
import { fetchCoinGeckoHistory }   from '@/lib/data/coingecko-history';
import { fetchPuellSeries }        from '@/lib/data/puell-series';
import {
  calculateCycleComposite,
  computePiCycleRatio,
  computeRainbowBand,
} from '@/lib/signals/cycle-engine';
import type { CycleIndicatorResult, ConfidenceBand } from '@/lib/signals/cycle-engine';

export const dynamic = 'force-dynamic';

export interface CycleGaugeResponse {
  composite:          number;
  phase:              string;
  phaseColor:         string;
  btcPrice:           number;
  mvrv:               number | null;
  puell:              number | null;
  piCycleRatio:       number | null;
  rainbowBand:        number | null;
  realisedPriceRatio: number | null;
  indicators:         CycleIndicatorResult[];
  confidence:         ConfidenceBand;
  timestamp:          string;
}

// Module-level fallback cache
let memCache: { data: CycleGaugeResponse; cachedAt: number } | null = null;
const MEM_CACHE_TTL = 60 * 60 * 1000; // 1 hour

const CACHE_KEY      = 'cycle-gauge-hourly';
const BRK_CACHE_FILE = join(process.cwd(), 'data', 'cycle-gauge-brk-cache.json');
const ONE_HOUR       = 60 * 60 * 1000;

function readBrkCache(): { realisedPrice: number; fetchedAt: number } | null {
  try {
    const stat = statSync(BRK_CACHE_FILE);
    const json = JSON.parse(readFileSync(BRK_CACHE_FILE, 'utf-8')) as { realisedPrice: number };
    return { realisedPrice: json.realisedPrice, fetchedAt: stat.mtimeMs };
  } catch { return null; }
}

function writeBrkCache(realisedPrice: number) {
  try {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(BRK_CACHE_FILE, JSON.stringify({ realisedPrice }));
  } catch (e) { console.warn('[CycleGauge] Could not write BRK cache:', e); }
}

async function fetchRealisedPriceBrk(): Promise<number> {
  // Check file cache first (1h TTL)
  const cached = readBrkCache();
  if (cached && Date.now() - cached.fetchedAt < ONE_HOUR) return cached.realisedPrice;

  // Probe to get latest offset
  const probeRes = await fetch(
    'https://bitview.space/api/series/price/day1?limit=1',
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!probeRes.ok) throw new Error(`BRK probe: HTTP ${probeRes.status}`);
  const probe = (await probeRes.json()) as { total: number };
  const latestOffset = probe.total - 1;

  // Fetch realized_price at latest offset
  const rpRes = await fetch(
    `https://bitview.space/api/series/realized_price/day1?limit=1&start=${latestOffset}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!rpRes.ok) throw new Error(`BRK realized_price: HTTP ${rpRes.status}`);
  const rpData = (await rpRes.json()) as { data: (number | null)[] };
  const realisedPrice = rpData.data[0] ?? 0;

  writeBrkCache(realisedPrice);
  return realisedPrice;
}

export async function GET() {
  // ── 1. Try DataCache ──────────────────────────────────────────────────────
  try {
    const row = await prisma.dataCache.findUnique({ where: { key: CACHE_KEY } });
    if (row && row.expiresAt > new Date()) {
      return NextResponse.json(JSON.parse(row.data) as CycleGaugeResponse);
    }
  } catch { /* DB unavailable */ }

  // ── 2. Try in-memory cache ────────────────────────────────────────────────
  if (memCache && Date.now() - memCache.cachedAt < MEM_CACHE_TTL) {
    return NextResponse.json(memCache.data);
  }

  // ── 3. Compute fresh ──────────────────────────────────────────────────────
  try {
    const [brkResult, puellResult, pricesResult] = await Promise.allSettled([
      // BRK: realized_price (file-cached, 1h TTL)
      fetchRealisedPriceBrk(),
      // Puell Multiple via existing 24h-cached fetcher
      fetchPuellSeries(),
      // Price history (1500 days, CSV+DB backed) — Pi Cycle + Rainbow + BTC price
      fetchCoinGeckoHistory(),
    ]);

    // ── Parse BRK realised price ──
    let mvrv: number | null = null;
    let realisedPriceRatio: number | null = null;
    let brkRealisedPrice: number | null = null;

    if (brkResult.status === 'fulfilled' && brkResult.value > 0) {
      brkRealisedPrice = brkResult.value;
    }

    // ── Parse Puell ──
    let puell: number | null = null;
    if (puellResult.status === 'fulfilled') {
      const values = puellResult.value.values;
      // Walk backwards to find last non-zero value
      for (let i = values.length - 1; i >= 0; i--) {
        if (values[i] > 0) { puell = values[i]; break; }
      }
    }

    // ── Parse price history → BTC price + Pi Cycle + Rainbow ──
    let btcPrice: number = 0;
    let piCycleRatio: number | null = null;
    let rainbowBand: number | null = null;

    if (pricesResult.status === 'fulfilled') {
      const prices = pricesResult.value;
      if (prices.length > 0) {
        btcPrice      = prices[prices.length - 1].price;
        piCycleRatio  = computePiCycleRatio(prices);
        rainbowBand   = btcPrice > 0 ? computeRainbowBand(btcPrice) : null;
      }
    }

    // ── Compute MVRV + realised price ratio from BRK ──
    if (brkRealisedPrice && brkRealisedPrice > 0 && btcPrice > 0) {
      realisedPriceRatio = btcPrice / brkRealisedPrice;
      mvrv               = realisedPriceRatio; // price / realised_price = MVRV proxy
    }

    // ── Compute composite ──
    const result = calculateCycleComposite({
      mvrv,
      realisedPriceRatio,
      puellMultiple: puell,
      piCycleRatio,
      rainbowBand,
    });

    const response: CycleGaugeResponse = {
      composite:          result.composite,
      phase:              result.phase,
      phaseColor:         result.phaseColor,
      btcPrice,
      mvrv,
      puell,
      piCycleRatio,
      rainbowBand,
      realisedPriceRatio,
      indicators:         result.indicators,
      confidence:         result.confidence,
      timestamp:          new Date().toISOString(),
    };

    // Cache in memory
    memCache = { data: response, cachedAt: Date.now() };

    // Cache in DB
    try {
      const expires = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.dataCache.upsert({
        where:  { key: CACHE_KEY },
        update: { data: JSON.stringify(response), expiresAt: expires, updatedAt: new Date() },
        create: { key: CACHE_KEY, data: JSON.stringify(response), expiresAt: expires },
      });
    } catch { /* non-fatal */ }

    return NextResponse.json(response);

  } catch (err) {
    console.error('[CycleGauge] Computation failed:', err);

    // Return stale memCache if available
    if (memCache) return NextResponse.json(memCache.data);

    return NextResponse.json({ error: 'Cycle gauge data unavailable' }, { status: 503 });
  }
}
