/**
 * GET /api/btc-signal
 *
 * Returns the current DCA Signal Engine v3 composite and all supporting data.
 *
 * Caching hierarchy (0 API calls in steady state):
 *   1. DataCache table ('dca-signal-daily') — pre-computed by the midnight cron
 *   2. Module-level in-memory cache — computed on first request if cron hasn't run
 *   3. Live computation from CoinGecko + bitview.space — last resort
 *
 * The midnight cron in daily-snapshot.ts refreshes the DataCache entry with
 * a 26-hour TTL, so it's always available between cron runs.
 */

import { NextResponse } from 'next/server';
import { prisma }                from '@/lib/db';
import { fetchCoinGeckoHistory } from '@/lib/data/coingecko-history';
import { fetchPuellSeries }      from '@/lib/data/puell-series';
import { computeMA200w, computeComposite, compositeToTier } from '@/lib/signals/dca-engine';
import { computeBacktestSummary } from '@/lib/data/daily-snapshot';
import type { CompositeRow } from '@/lib/signals/dca-engine';
import type { BacktestPeriod }   from '@/lib/data/daily-snapshot';

export const dynamic = 'force-dynamic';

export interface BtcSignalResponse {
  composite:       number;
  tier:            string;
  maRatio:         number;
  maMult:          number;
  puellValue:      number;
  puellMult:       number;
  btcPrice:        number;
  timestamp:       string;
  chartData:       CompositeRow[];   // last 365 entries for the 12-month chart
  backtestSummary: BacktestPeriod[]; // 1yr / 3yr / 5yr / all-time DCA comparison
}

// Module-level fallback cache — used if DB cache isn't populated yet
let memCache: { data: BtcSignalResponse; cachedAt: number } | null = null;
const MEM_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET() {
  // ── 1. Try DataCache (pre-computed by cron) ────────────────────────────────
  try {
    const row = await prisma.dataCache.findUnique({ where: { key: 'dca-signal-daily' } });
    if (row && row.expiresAt > new Date()) {
      return NextResponse.json(JSON.parse(row.data) as BtcSignalResponse);
    }
  } catch {
    // DB unavailable — fall through to in-memory cache
  }

  // ── 2. Try in-memory cache ────────────────────────────────────────────────
  if (memCache && Date.now() - memCache.cachedAt < MEM_CACHE_TTL) {
    return NextResponse.json(memCache.data);
  }

  // ── 3. Compute fresh ──────────────────────────────────────────────────────
  try {
    const [prices, puell] = await Promise.all([
      fetchCoinGeckoHistory(),
      fetchPuellSeries(),
    ]);

    const ma200wPoints  = computeMA200w(prices);
    const compositeRows = computeComposite(ma200wPoints, puell.values, puell.dates);

    if (compositeRows.length === 0) {
      return NextResponse.json({ error: 'Insufficient data to compute signal' }, { status: 503 });
    }

    const latest    = compositeRows[compositeRows.length - 1];
    const chartData = compositeRows.slice(-365);
    const backtestSummary = computeBacktestSummary(compositeRows, latest.price);

    const response: BtcSignalResponse = {
      composite:       latest.normalisedComposite,
      tier:            compositeToTier(latest.normalisedComposite),
      maRatio:         latest.maRatio,
      maMult:          latest.maMult,
      puellValue:      latest.puellValue,
      puellMult:       latest.puellMult,
      btcPrice:        latest.price,
      timestamp:       new Date().toISOString(),
      chartData,
      backtestSummary,
    };

    // Store in memory cache
    memCache = { data: response, cachedAt: Date.now() };

    // Also write to DataCache for next request
    try {
      const expires = new Date(Date.now() + 26 * 60 * 60 * 1000);
      await prisma.dataCache.upsert({
        where:  { key: 'dca-signal-daily' },
        update: { data: JSON.stringify(response), expiresAt: expires, updatedAt: new Date() },
        create: { key: 'dca-signal-daily', data: JSON.stringify(response), expiresAt: expires },
      });
    } catch { /* non-fatal — in-memory cache still works */ }

    return NextResponse.json(response);

  } catch (err) {
    console.error('[btc-signal] Failed to compute signal:', err);

    // Return stale in-memory cache if available
    if (memCache) {
      console.warn('[btc-signal] Returning stale cached signal');
      return NextResponse.json(memCache.data);
    }

    return NextResponse.json({ error: 'Signal data unavailable' }, { status: 503 });
  }
}
