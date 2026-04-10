/**
 * Daily snapshot recorder — writes current cache data to daily_* tables.
 * Called at midnight UTC + 5 minutes via cron.
 * Also updates btc_price_history with today's closing price, and
 * pre-computes the DCA signal so /api/btc-signal is instant on first load.
 */

import { prisma } from '@/lib/db';
import {
  fetchBtcMarket,
  fetchBtcNetwork,
  fetchLightning,
  fetchFearGreed,
  fetchOnChain,
  fetchIndices,
  fetchCommodities,
  fetchFX,
} from './sources';
import { fetchCoinGeckoHistory } from './coingecko-history';
import { fetchPuellSeries }      from './puell-series';
import { computeMA200w, computeComposite, compositeToTier } from '@/lib/signals/dca-engine';

export async function recordDailySnapshot() {
  const today = new Date().toISOString().split('T')[0];
  const dateObj = new Date(today);

  console.log(`[DailySnapshot] Recording snapshot for ${today}`);

  const [btc, net, ln, fg, oc, idx, comm, fx] = await Promise.allSettled([
    fetchBtcMarket(),
    fetchBtcNetwork(),
    fetchLightning(),
    fetchFearGreed(),
    fetchOnChain(),
    fetchIndices(),
    fetchCommodities(),
    fetchFX(),
  ]);

  const btcData = btc.status === 'fulfilled' ? btc.value : null;
  const netData = net.status === 'fulfilled' ? net.value : null;
  const lnData = ln.status === 'fulfilled' ? ln.value : null;
  const fgData = fg.status === 'fulfilled' ? fg.value : null;
  const ocData = oc.status === 'fulfilled' ? oc.value : null;
  const idxData = idx.status === 'fulfilled' ? idx.value : null;
  const commData = comm.status === 'fulfilled' ? comm.value : null;
  const fxData = fx.status === 'fulfilled' ? fx.value : null;

  try {
    // daily_btc
    if (btcData) {
      await prisma.dailyBtc.upsert({
        where: { date: dateObj },
        update: {
          price: btcData.price, marketCap: btcData.marketCap, volume24h: btcData.volume24h,
          change24h: btcData.change24h, change7d: btcData.change7d, change30d: btcData.change30d,
          ath: btcData.ath, athChangePct: btcData.athChangePct, supply: btcData.circulatingSupply,
        },
        create: {
          date: dateObj,
          price: btcData.price, marketCap: btcData.marketCap, volume24h: btcData.volume24h,
          change24h: btcData.change24h, change7d: btcData.change7d, change30d: btcData.change30d,
          ath: btcData.ath, athChangePct: btcData.athChangePct, supply: btcData.circulatingSupply,
        },
      });

      // Also update btc_price_history
      await prisma.btcPriceHistory.upsert({
        where: { date: dateObj },
        update: { close: btcData.price },
        create: { date: dateObj, close: btcData.price },
      });
    }

    // daily_network
    if (netData) {
      await prisma.dailyNetwork.upsert({
        where: { date: dateObj },
        update: {
          hashrateEh: netData.hashrateEH, difficulty: netData.difficulty,
          feeFast: netData.feeFast, feeMedium: netData.feeMed,
          mempoolMb: netData.mempoolSizeMB, blockHeight: netData.blockHeight,
        },
        create: {
          date: dateObj,
          hashrateEh: netData.hashrateEH, difficulty: netData.difficulty,
          feeFast: netData.feeFast, feeMedium: netData.feeMed,
          mempoolMb: netData.mempoolSizeMB, blockHeight: netData.blockHeight,
        },
      });
    }

    // daily_lightning
    if (lnData) {
      await prisma.dailyLightning.upsert({
        where: { date: dateObj },
        update: { channels: lnData.channels, capacityBtc: lnData.capacityBTC, nodes: lnData.nodes },
        create: { date: dateObj, channels: lnData.channels, capacityBtc: lnData.capacityBTC, nodes: lnData.nodes },
      });
    }

    // daily_onchain
    if (ocData) {
      await prisma.dailyOnchain.upsert({
        where: { date: dateObj },
        update: {
          mvrv: ocData.mvrv, exchangeInflow: ocData.exchangeInflow,
          exchangeOutflow: ocData.exchangeOutflow, exchangeBalance: ocData.exchangeBalance,
        },
        create: {
          date: dateObj,
          mvrv: ocData.mvrv, exchangeInflow: ocData.exchangeInflow,
          exchangeOutflow: ocData.exchangeOutflow, exchangeBalance: ocData.exchangeBalance,
        },
      });
    }

    // daily_indices
    if (idxData) {
      await prisma.dailyIndices.upsert({
        where: { date: dateObj },
        update: {
          sp500: idxData.sp500?.price, nasdaq: idxData.nasdaq?.price, dow: idxData.dji?.price,
          ftse: idxData.ftse?.price, dax: idxData.dax?.price, nikkei: idxData.nikkei?.price,
          hangSeng: idxData.hsi?.price, vix: idxData.vix?.price,
          dxy: commData?.dxy?.price, us10y: commData?.us10y?.price, us2y: commData?.us2y?.price,
        },
        create: {
          date: dateObj,
          sp500: idxData.sp500?.price, nasdaq: idxData.nasdaq?.price, dow: idxData.dji?.price,
          ftse: idxData.ftse?.price, dax: idxData.dax?.price, nikkei: idxData.nikkei?.price,
          hangSeng: idxData.hsi?.price, vix: idxData.vix?.price,
          dxy: commData?.dxy?.price, us10y: commData?.us10y?.price, us2y: commData?.us2y?.price,
        },
      });
    }

    // daily_commodities
    if (commData) {
      await prisma.dailyCommodities.upsert({
        where: { date: dateObj },
        update: {
          gold: commData.gold?.price, silver: commData.silver?.price,
          crudeOil: commData['crude-oil']?.price, naturalGas: commData['natural-gas']?.price,
          copper: commData.copper?.price,
        },
        create: {
          date: dateObj,
          gold: commData.gold?.price, silver: commData.silver?.price,
          crudeOil: commData['crude-oil']?.price, naturalGas: commData['natural-gas']?.price,
          copper: commData.copper?.price,
        },
      });
    }

    // daily_fx
    if (fxData) {
      await prisma.dailyFx.upsert({
        where: { date: dateObj },
        update: {
          eurUsd: fxData.eur?.price, gbpUsd: fxData.gbp?.price,
          usdJpy: fxData.jpy?.price, usdCny: fxData.cny?.price,
        },
        create: {
          date: dateObj,
          eurUsd: fxData.eur?.price, gbpUsd: fxData.gbp?.price,
          usdJpy: fxData.jpy?.price, usdCny: fxData.cny?.price,
        },
      });
    }

    // daily_sentiment
    await prisma.dailySentiment.upsert({
      where: { date: dateObj },
      update: { fearGreed: fgData?.value ?? null },
      create: { date: dateObj, fearGreed: fgData?.value ?? null },
    });

    console.log(`[DailySnapshot] Recorded snapshot for ${today}`);
  } catch (error) {
    console.error('[DailySnapshot] Error recording snapshot:', error);
  }

  // ── Pre-compute and cache DCA signal ─────────────────────────────────────
  // Stores the result in DataCache so /api/btc-signal returns instantly (0 API
  // calls) when a user loads the page. Any failure here is non-fatal.
  try {
    const [prices, puell] = await Promise.all([
      fetchCoinGeckoHistory(),
      fetchPuellSeries(),
    ]);

    const ma200wPoints  = computeMA200w(prices);
    const compositeRows = computeComposite(ma200wPoints, puell.values, puell.dates);

    if (compositeRows.length > 0) {
      const latest    = compositeRows[compositeRows.length - 1];
      const chartData = compositeRows.slice(-365);

      // Also compute backtest periods (same logic as API route)
      const backtestSummary = computeBacktestSummary(compositeRows, latest.price);

      const signalResult = {
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

      const expires = new Date(Date.now() + 26 * 60 * 60 * 1000); // 26h — overlap with next cron
      await prisma.dataCache.upsert({
        where:  { key: 'dca-signal-daily' },
        update: { data: JSON.stringify(signalResult), expiresAt: expires, updatedAt: new Date() },
        create: { key: 'dca-signal-daily', data: JSON.stringify(signalResult), expiresAt: expires },
      });

      console.log('[DailySnapshot] DCA signal pre-computed and cached');
    }
  } catch (err) {
    console.error('[DailySnapshot] Failed to pre-compute DCA signal (non-fatal):', err);
  }
}

// ── Backtest helper (shared with API route) ───────────────────────────────────

export interface BacktestPeriod {
  label:           string;
  startDate:       string;
  endDate:         string;
  usdPerWeek:      number;
  btcAccumulated:  number;   // with signal
  btcVanilla:      number;   // without signal
  usdInvested:     number;
  advantagePct:    number;
  portfolioValue:  number;   // btcAccumulated * currentPrice
  vanillaValue:    number;   // btcVanilla * currentPrice
}

import type { CompositeRow } from '@/lib/signals/dca-engine';

/**
 * Run a simplified weekly DCA backtest for a set of standard periods.
 * Uses Fridays as the weekly purchase day (as in the Python backtester).
 * Base: $100/week vanilla. Signal DCA = $100 * normalisedComposite.
 */
export function computeBacktestSummary(
  allRows: CompositeRow[],
  currentPrice: number,
): BacktestPeriod[] {
  const BASE_USD   = 100;
  const DAYS_IN_WEEK = 7;

  // Sample to weekly (pick one row per 7-day window = Friday proxy)
  const weeklyRows: CompositeRow[] = [];
  let lastWeekDate = '';
  for (const row of allRows) {
    const weekKey = getIsoWeek(row.date);
    if (weekKey !== lastWeekDate) {
      weeklyRows.push(row);
      lastWeekDate = weekKey;
    }
  }

  const periods: { label: string; yearsAgo: number | null }[] = [
    { label: '1 year',  yearsAgo: 1 },
    { label: '3 years', yearsAgo: 3 },
    { label: '5 years', yearsAgo: 5 },
    { label: 'All time', yearsAgo: null },
  ];

  const results: BacktestPeriod[] = [];
  const latestDate = allRows[allRows.length - 1].date;

  for (const { label, yearsAgo } of periods) {
    const startDate = yearsAgo
      ? shiftYears(latestDate, -yearsAgo)
      : weeklyRows[0]?.date ?? latestDate;

    const window = weeklyRows.filter(r => r.date >= startDate);
    if (window.length < 4) continue; // skip if not enough data

    let btcSignal  = 0;
    let btcVanilla = 0;
    let usdSpent   = 0;

    for (const row of window) {
      const mult  = Math.max(0.1, Math.min(5.0, row.normalisedComposite));
      const spend = BASE_USD * mult;
      btcSignal  += spend / row.price;
      btcVanilla += BASE_USD / row.price;
      usdSpent   += spend;
    }

    const advantagePct = btcVanilla > 0
      ? ((btcSignal - btcVanilla) / btcVanilla) * 100
      : 0;

    results.push({
      label,
      startDate,
      endDate:        latestDate,
      usdPerWeek:     BASE_USD,
      btcAccumulated: btcSignal,
      btcVanilla,
      usdInvested:    usdSpent,
      advantagePct,
      portfolioValue: btcSignal  * currentPrice,
      vanillaValue:   btcVanilla * currentPrice,
    });
  }

  return results;
}

function getIsoWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay() || 7;
  const thursday = new Date(d);
  thursday.setUTCDate(d.getUTCDate() + (4 - day));
  const year = thursday.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((thursday.getTime() - jan1.getTime()) / 86_400_000) + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function shiftYears(dateStr: string, years: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}
