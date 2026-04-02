/**
 * Daily snapshot recorder — writes current cache data to daily_* tables.
 * Called at midnight UTC + 5 minutes via cron.
 * Also updates btc_price_history with today's closing price.
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
}
