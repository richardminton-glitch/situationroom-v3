/**
 * GET /api/miner-treasuries
 *
 * Returns derived public-miner treasury & stress data + capitulation score.
 *
 * Reads from data/miner-treasuries.json (curated disclosure dataset, refreshed
 * daily by the refresh-miner-treasuries cron). BTC price comes from the existing
 * mining-intel cache, so this endpoint adds no extra live API calls.
 *
 * Cached in DataCache for 24h (low-traffic page).
 */

import { NextResponse }  from 'next/server';
import { readFileSync }  from 'fs';
import { join }          from 'path';
import { prisma }        from '@/lib/db';
import {
  deriveMinerTreasuries,
  computeCapitulationProbability,
  type MinerTreasuryRow,
  type MinerTreasurySummary,
} from '@/lib/signals/mining-engine';
import type { MiningIntelResponse } from '@/app/api/mining-intel/route';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'miner-treasuries-daily';
const TTL_MS    = 24 * 60 * 60 * 1000;

const DATA_DIR = join(process.cwd(), 'data');

interface SeedFile {
  updatedAt: string;
  source: string;
  miners: MinerTreasuryRow[];
}

async function loadBtcContext(): Promise<{
  btcPrice: number;
  hashRibbonSignal: 'bullish' | 'bearish' | 'neutral';
  networkMarginPct: number;
}> {
  // Pull from the cached mining-intel response if present — avoids extra calls.
  try {
    const row = await prisma.dataCache.findUnique({ where: { key: 'mining-intel-hourly' } });
    if (row && row.expiresAt > new Date()) {
      const intel = JSON.parse(row.data) as MiningIntelResponse;
      return {
        btcPrice: intel.btcPrice ?? 0,
        hashRibbonSignal: intel.hashRibbon?.signal ?? 'neutral',
        networkMarginPct: intel.hashPrice?.marginPct ?? 0,
      };
    }
  } catch { /* fall through */ }
  return { btcPrice: 0, hashRibbonSignal: 'neutral', networkMarginPct: 0 };
}

export async function GET() {
  // 1. DataCache
  try {
    const row = await prisma.dataCache.findUnique({ where: { key: CACHE_KEY } });
    if (row && row.expiresAt > new Date()) {
      return NextResponse.json(JSON.parse(row.data) as MinerTreasurySummary, {
        headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200' },
      });
    }
  } catch { /* DB unavailable */ }

  // 2. Load seed + BTC context
  let seed: SeedFile;
  try {
    seed = JSON.parse(readFileSync(join(DATA_DIR, 'miner-treasuries.json'), 'utf-8')) as SeedFile;
  } catch {
    return NextResponse.json({ error: 'Treasury data unavailable' }, { status: 503 });
  }

  const ctx = await loadBtcContext();
  const { miners, fleet } = deriveMinerTreasuries(seed.miners, ctx.btcPrice);
  const capitulation = computeCapitulationProbability({
    hashRibbonSignal: ctx.hashRibbonSignal,
    networkMarginPct: ctx.networkMarginPct,
    fleetMarginPct: fleet.weightedMarginPct,
    aggregateCoverMonths: fleet.aggregateCoverMonths,
  });

  const payload: MinerTreasurySummary = {
    updatedAt: seed.updatedAt,
    source: seed.source,
    btcPrice: ctx.btcPrice,
    miners,
    fleet,
    capitulation,
  };

  // 3. Cache
  try {
    const expires = new Date(Date.now() + TTL_MS);
    await prisma.dataCache.upsert({
      where:  { key: CACHE_KEY },
      update: { data: JSON.stringify(payload), expiresAt: expires, updatedAt: new Date() },
      create: { key: CACHE_KEY, data: JSON.stringify(payload), expiresAt: expires },
    });
  } catch { /* non-fatal */ }

  return NextResponse.json(payload);
}
