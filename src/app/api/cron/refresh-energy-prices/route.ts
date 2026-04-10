/**
 * POST /api/cron/refresh-energy-prices
 *
 * Weekly cron: fetches electricity prices from EIA (US), Eurostat (EU),
 * and natural gas from API-Ninjas. Merges into data/energy-prices-cache.json.
 *
 * Graceful fallback: if EIA_API_KEY is not set, only refreshes natural gas proxy.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fetchEIAPrices, fetchEurostatPrices, fetchNaturalGasPrice, eurToUsd } from '@/lib/data/energy-prices';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const CRON_SECRET  = process.env.CRON_SECRET || '';
const EIA_API_KEY  = process.env.EIA_API_KEY || '';
const NINJAS_KEY   = process.env.API_NINJAS_KEY || '';
const CACHE_PATH   = join(process.cwd(), 'data', 'energy-prices-cache.json');

interface RegionPrice {
  priceKwh: number;
  currency: string;
  source: string;
  label: string;
  updatedAt: string;
}

interface EnergyCache {
  updatedAt: string;
  source: string;
  regions: Record<string, RegionPrice>;
  naturalGas: {
    priceMMBtu: number;
    impliedKwh: number;
    conversionNote: string;
    updatedAt: string;
  };
  globalWeightedAvg: number;
  efficientMinerJPerTH: number;
  efficientMinerNote: string;
}

function readCache(): EnergyCache | null {
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf-8')) as EnergyCache;
  } catch { return null; }
}

function writeCache(cache: EnergyCache) {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

// US state labels for display
const STATE_LABELS: Record<string, string> = {
  TX: 'Texas', GA: 'Georgia', WY: 'Wyoming', NY: 'New York',
  WA: 'Washington', KY: 'Kentucky', ND: 'North Dakota', OH: 'Ohio',
  PA: 'Pennsylvania', SC: 'South Carolina',
};

export async function POST(req: NextRequest) {
  // Auth
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = readCache();
  const regions: Record<string, RegionPrice> = existing?.regions ?? {};
  const errors: string[] = [];
  const now = new Date().toISOString();

  // ── 1. EIA (US industrial electricity) ──
  if (EIA_API_KEY) {
    try {
      const eiaData = await fetchEIAPrices(EIA_API_KEY);
      for (const [key, val] of Object.entries(eiaData)) {
        const stateCode = key.replace('US-', '');
        regions[key] = {
          priceKwh: val.priceKwh,
          currency: 'USD',
          source: 'eia',
          label: `${STATE_LABELS[stateCode] || stateCode} (industrial)`,
          updatedAt: val.period,
        };
      }
    } catch (e) {
      errors.push(`EIA: ${e}`);
    }
  } else {
    errors.push('EIA: No API key (EIA_API_KEY not set)');
  }

  // ── 2. Eurostat (EU non-household electricity) ──
  try {
    const euroData = await fetchEurostatPrices();
    for (const [geo, val] of Object.entries(euroData)) {
      regions[geo] = {
        priceKwh: eurToUsd(val.priceEurKwh),
        currency: 'USD',
        source: 'eurostat',
        label: `${geo} (non-household)`,
        updatedAt: val.period,
      };
    }
  } catch (e) {
    errors.push(`Eurostat: ${e}`);
  }

  // ── 3. Natural gas proxy ──
  let naturalGas = existing?.naturalGas ?? {
    priceMMBtu: 2.15, impliedKwh: 0.018,
    conversionNote: 'At 40% plant efficiency: $/kWh ≈ $/MMBtu / (293 * 0.4)',
    updatedAt: now,
  };

  if (NINJAS_KEY) {
    try {
      const gasData = await fetchNaturalGasPrice(NINJAS_KEY);
      naturalGas = {
        priceMMBtu: gasData.priceMMBtu,
        impliedKwh: gasData.impliedKwh,
        conversionNote: naturalGas.conversionNote,
        updatedAt: now,
      };
    } catch (e) {
      errors.push(`NaturalGas: ${e}`);
    }
  }

  // ── 4. Write merged cache ──
  const cache: EnergyCache = {
    updatedAt: now,
    source: 'Cron-refreshed: EIA + Eurostat + API-Ninjas + curated estimates',
    regions,
    naturalGas,
    globalWeightedAvg: existing?.globalWeightedAvg ?? 0.05,
    efficientMinerJPerTH: 25,
    efficientMinerNote: 'Modern ASIC benchmark: ~25 J/TH (Antminer S21 class)',
  };

  writeCache(cache);

  return NextResponse.json({
    ok: true,
    regionsUpdated: Object.keys(regions).length,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: now,
  });
}
