/**
 * GET /api/mining-intel
 *
 * Returns all data for the Energy & Mining Intelligence page.
 *
 * Caching hierarchy:
 *   1. DataCache table ('mining-intel-hourly') — 1h TTL
 *   2. Module-level in-memory cache — 1h TTL
 *   3. Live computation from BRK + Mempool + curated data files
 */

import { NextResponse }  from 'next/server';
import { readFileSync }  from 'fs';
import { join }          from 'path';
import { prisma }        from '@/lib/db';
import { fetchBrkSeries } from '@/lib/data/brk';
import { fetchJSON }     from '@/lib/data/fetcher';
import {
  computeHashPriceSeries,
  computeMarginSignal,
  computeSecurityBudgetScenarios,
  computeBreakevenBtcPrice,
  computeEnergyValue,
} from '@/lib/signals/mining-engine';
import type { HashPricePoint, MarginSignal, SecurityBudgetProjection, EnergyValueResult } from '@/lib/signals/mining-engine';

export const dynamic = 'force-dynamic';

// ── Response Type ───────────────────────────────────────────────────────────

export interface MiningIntelResponse {
  // Section 1: Geographic hashrate
  hashrateGeo: {
    regions: {
      id: string;
      name: string;
      share: number;
      hashrate: number;
      trend: string;
      trendVsPrev: number;
      notes: string;
      countries?: string[];
    }[];
    totalHashrateEH: number;
    updatedAt: string;
  };

  // Section 2: Geographic shift alerts
  geoAlerts: {
    headline: string;
    detail: string;
    region: string;
    severity: string;
    date: string;
  }[];

  // Section 3: Hash price & energy
  hashPrice: {
    current: number;
    history: HashPricePoint[];
    signal: MarginSignal;
    breakevenHashPrice: number;
    marginPct: number;
    breakevenBtcPrice: number;
  };

  // Section 3b: Energy prices
  energyPrices: {
    regions: Record<string, { priceKwh: number; source: string; label: string; updatedAt: string }>;
    naturalGas: { priceMMBtu: number; impliedKwh: number };
    globalWeightedAvg: number;
    efficientMinerJPerTH: number;
  };

  // Section 4: Gas mining projects
  gasMining: {
    projects: {
      name: string;
      lat: number;
      lng: number;
      country: string;
      region: string;
      energySource: string;
      description: string;
      capacityMW: number | null;
      status: string;
    }[];
    narrativeHook: string;
    stats: {
      totalFlaredGasBcm: number;
      activeMiningOperations: number;
      countriesWithOperations: number;
    };
  };

  // Section 4b: Flare data
  flareSites: {
    topCountries: {
      country: string;
      name: string;
      flaredBcm: number;
      pctGlobal: number;
      trend: string;
    }[];
    totalFlaredBcm: number;
    year: number;
  };

  // Section 5: Security budget
  securityBudget: {
    current: SecurityBudgetProjection;
    conservative: SecurityBudgetProjection[];
    base: SecurityBudgetProjection[];
    optimistic: SecurityBudgetProjection[];
  };

  // Section 6: Editorial
  editorial: {
    title: string;
    body: string;
    updatedAt: string;
  };

  // Energy Value Model (Capriole / Fidelity)
  energyValue: EnergyValueResult;

  // Common
  btcPrice: number;
  hashrateEH: number;
  difficultyT: number;
  circulatingSupply: number;
  timestamp: string;
}

// ── Module-level Cache ──────────────────────────────────────────────────────

let memCache: { data: MiningIntelResponse; cachedAt: number } | null = null;
const MEM_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const CACHE_KEY = 'mining-intel-hourly';
const DATA_DIR = join(process.cwd(), 'data');

// ── File readers ────────────────────────────────────────────────────────────

function readJSON<T>(filename: string): T | null {
  try {
    return JSON.parse(readFileSync(join(DATA_DIR, filename), 'utf-8')) as T;
  } catch { return null; }
}

// ── Mempool fetchers ────────────────────────────────────────────────────────

interface MempoolHashrate {
  currentHashrate: number;
  currentDifficulty: number;
}

interface MempoolDifficulty {
  progressPercent: number;
  difficultyChange: number;
  remainingBlocks: number;
  remainingTime: number;
  nextRetargetHeight: number;
}

// ── Route Handler ───────────────────────────────────────────────────────────

export async function GET() {
  // ── 1. Try DataCache ──
  try {
    const row = await prisma.dataCache.findUnique({ where: { key: CACHE_KEY } });
    if (row && row.expiresAt > new Date()) {
      return NextResponse.json(JSON.parse(row.data) as MiningIntelResponse, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800' },
      });
    }
  } catch { /* DB unavailable */ }

  // ── 2. Try in-memory cache ──
  if (memCache && Date.now() - memCache.cachedAt < MEM_CACHE_TTL) {
    return NextResponse.json(memCache.data);
  }

  // ── 3. Compute fresh ──
  try {
    // Parallel fetch: BRK series + mempool + curated files
    const [brkResult, hashrateResult, diffResult] = await Promise.allSettled([
      fetchBrkSeries({
        series: ['hash_rate', 'price'],
        days: 120,
        cacheFile: 'mining-intel-brk-cache.json',
      }),
      fetchJSON<MempoolHashrate>(
        'https://mempool.space/api/v1/mining/hashrate/1m',
        { cacheKey: 'mempoolHashrate', cacheDuration: 300_000 },
      ),
      fetchJSON<MempoolDifficulty>(
        'https://mempool.space/api/v1/difficulty-adjustment',
        { cacheKey: 'mempoolDiff', cacheDuration: 300_000 },
      ),
    ]);

    // Parse BRK data
    let prices: number[] = [];
    let hashrates: number[] = [];
    let dates: string[] = [];

    if (brkResult.status === 'fulfilled') {
      prices = brkResult.value.seriesData.price ?? [];
      // BRK hash_rate is in H/s — convert to EH/s (same as hash-ribbon route)
      hashrates = (brkResult.value.seriesData.hash_rate ?? []).map(v => (v ?? 0) / 1e18);
      dates = brkResult.value.dates;
    }

    // Current hashrate + difficulty from Mempool
    let hashrateEH = 0;
    let difficultyT = 0;
    if (hashrateResult.status === 'fulfilled') {
      hashrateEH = hashrateResult.value.currentHashrate / 1e18;
      difficultyT = hashrateResult.value.currentDifficulty / 1e12;
    }

    // BTC price — use latest from BRK series, or 0
    const btcPrice = prices.length > 0 ? prices[prices.length - 1] : 0;

    // ── Read curated data files ──
    const geoData = readJSON<{
      updatedAt: string;
      regions: { id: string; name: string; share: number; trendVsPrev: number; trend: string; notes: string; countries?: string[] }[];
      alerts: { headline: string; detail: string; region: string; severity: string; date: string }[];
    }>('hashrate-geo.json');

    const energyData = readJSON<{
      regions: Record<string, { priceKwh: number; source: string; label: string; updatedAt: string }>;
      naturalGas: { priceMMBtu: number; impliedKwh: number };
      globalWeightedAvg: number;
      efficientMinerJPerTH: number;
      fleetEfficiencyJPerTH?: number;
    }>('energy-prices-cache.json');

    const gasData = readJSON<{
      narrativeHook: string;
      stats: { totalFlaredGasBcm: number; activeMiningOperations: number; countriesWithOperations: number };
      projects: { name: string; lat: number; lng: number; country: string; region: string; energySource: string; description: string; capacityMW: number | null; status: string }[];
    }>('gas-mining-projects.json');

    const flareData = readJSON<{
      totalFlaredBcm: number;
      year: number;
      topFlaringCountries: { country: string; name: string; flaredBcm: number; pctGlobal: number; trend: string }[];
    }>('flare-sites-summary.json');

    const editorialData = readJSON<{
      title: string;
      body: string;
      updatedAt: string;
    }>('mining-editorial.json');

    // ── Compute hash price series ──
    const hashPriceHistory = computeHashPriceSeries(prices, hashrates, dates);
    const currentHashPrice = hashPriceHistory.length > 0
      ? hashPriceHistory[hashPriceHistory.length - 1].hashPrice
      : 0;

    const globalAvgEnergy = energyData?.globalWeightedAvg ?? 0.05;
    const efficiency = energyData?.efficientMinerJPerTH ?? 25;
    const marginResult = computeMarginSignal(currentHashPrice, globalAvgEnergy, efficiency);

    // Breakeven BTC price
    const breakevenBtcPrice = computeBreakevenBtcPrice(
      hashrateEH, globalAvgEnergy, efficiency,
    );

    // ── Compute Energy Value (Capriole model) ──
    // Circulating supply: ~19.85M in Apr 2026, grows ~900/day. Updated quarterly is fine.
    const circulatingSupply = 19_850_000;
    const fleetEfficiency = energyData?.fleetEfficiencyJPerTH ?? 30;
    const energyValueResult = computeEnergyValue(
      hashrateEH, fleetEfficiency, circulatingSupply, btcPrice,
    );

    // ── Compute security budget ──
    // Estimate daily fees from recent mempool data (rough: ~50 BTC/day in fees)
    const estimatedDailyFeesUsd = 50 * btcPrice; // conservative estimate
    const budgetScenarios = computeSecurityBudgetScenarios(btcPrice, estimatedDailyFeesUsd);

    // ── Compute geographic hashrate absolute values ──
    const geoRegions = (geoData?.regions ?? []).map(r => ({
      ...r,
      hashrate: r.share * hashrateEH,
    }));

    // ── Assemble response ──
    const response: MiningIntelResponse = {
      hashrateGeo: {
        regions: geoRegions,
        totalHashrateEH: hashrateEH,
        updatedAt: geoData?.updatedAt ?? 'unknown',
      },
      geoAlerts: geoData?.alerts ?? [],
      hashPrice: {
        current: currentHashPrice,
        history: hashPriceHistory,
        signal: marginResult.signal,
        breakevenHashPrice: marginResult.breakevenHashPrice,
        marginPct: marginResult.marginPct,
        breakevenBtcPrice,
      },
      energyPrices: {
        regions: energyData?.regions ?? {},
        naturalGas: energyData?.naturalGas ?? { priceMMBtu: 0, impliedKwh: 0 },
        globalWeightedAvg: globalAvgEnergy,
        efficientMinerJPerTH: efficiency,
      },
      gasMining: {
        projects: gasData?.projects ?? [],
        narrativeHook: gasData?.narrativeHook ?? '',
        stats: gasData?.stats ?? { totalFlaredGasBcm: 0, activeMiningOperations: 0, countriesWithOperations: 0 },
      },
      flareSites: {
        topCountries: flareData?.topFlaringCountries ?? [],
        totalFlaredBcm: flareData?.totalFlaredBcm ?? 0,
        year: flareData?.year ?? 0,
      },
      securityBudget: budgetScenarios,
      editorial: editorialData ?? { title: '', body: '', updatedAt: '' },
      energyValue: energyValueResult,
      btcPrice,
      hashrateEH,
      difficultyT,
      circulatingSupply,
      timestamp: new Date().toISOString(),
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
    console.error('[MiningIntel] Computation failed:', err);
    if (memCache) return NextResponse.json(memCache.data);
    return NextResponse.json({ error: 'Mining intel data unavailable' }, { status: 503 });
  }
}
