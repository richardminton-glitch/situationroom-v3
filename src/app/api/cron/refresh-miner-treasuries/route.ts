/**
 * POST /api/cron/refresh-miner-treasuries
 *
 * Daily cron — recomputes the miner-treasury cache from the curated
 * data/miner-treasuries.json seed file + the latest BTC price/hash-ribbon
 * context found in the mining-intel cache. Writes to the DataCache row
 * `miner-treasuries-daily` with a 24h TTL.
 *
 * This route does NOT call any external API — it is a pure recompute. The
 * underlying disclosure data is updated quarterly by hand in the seed file
 * (10-Q/10-K filings), and BTC price comes from the existing mining-intel
 * pipeline. Run once per 24h is sufficient.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync }              from 'fs';
import { join }                      from 'path';
import { prisma }                    from '@/lib/db';
import {
  deriveMinerTreasuries,
  computeCapitulationProbability,
  type MinerTreasuryRow,
  type MinerTreasurySummary,
} from '@/lib/signals/mining-engine';
import type { MiningIntelResponse } from '@/app/api/mining-intel/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CRON_SECRET = process.env.CRON_SECRET || '';
const CACHE_KEY   = 'miner-treasuries-daily';
const TTL_MS      = 24 * 60 * 60 * 1000;
const SEED_PATH   = join(process.cwd(), 'data', 'miner-treasuries.json');

interface SeedFile {
  updatedAt: string;
  source: string;
  miners: MinerTreasuryRow[];
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let seed: SeedFile;
  try {
    seed = JSON.parse(readFileSync(SEED_PATH, 'utf-8')) as SeedFile;
  } catch (e) {
    return NextResponse.json({ error: 'Seed file unreadable', detail: String(e) }, { status: 500 });
  }

  // Pull latest BTC + hash-ribbon context from mining-intel cache
  let btcPrice = 0;
  let hashRibbonSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let networkMarginPct = 0;
  try {
    const row = await prisma.dataCache.findUnique({ where: { key: 'mining-intel-hourly' } });
    if (row) {
      const intel = JSON.parse(row.data) as MiningIntelResponse;
      btcPrice         = intel.btcPrice ?? 0;
      hashRibbonSignal = intel.hashRibbon?.signal ?? 'neutral';
      networkMarginPct = intel.hashPrice?.marginPct ?? 0;
    }
  } catch { /* fall through */ }

  const { miners, fleet } = deriveMinerTreasuries(seed.miners, btcPrice);
  const capitulation = computeCapitulationProbability({
    hashRibbonSignal,
    networkMarginPct,
    fleetMarginPct: fleet.weightedMarginPct,
    aggregateCoverMonths: fleet.aggregateCoverMonths,
  });

  const payload: MinerTreasurySummary = {
    updatedAt: seed.updatedAt,
    source: seed.source,
    btcPrice,
    miners,
    fleet,
    capitulation,
  };

  try {
    const expires = new Date(Date.now() + TTL_MS);
    await prisma.dataCache.upsert({
      where:  { key: CACHE_KEY },
      update: { data: JSON.stringify(payload), expiresAt: expires, updatedAt: new Date() },
      create: { key: CACHE_KEY, data: JSON.stringify(payload), expiresAt: expires },
    });
  } catch (e) {
    return NextResponse.json({ error: 'Cache write failed', detail: String(e) }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    minersCount: miners.length,
    btcPriceUsed: btcPrice,
    capitulationScore: capitulation.score,
    capitulationBand: capitulation.band,
    timestamp: new Date().toISOString(),
  });
}
