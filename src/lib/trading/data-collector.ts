/**
 * Trading data collector — assembles a complete market + pool snapshot
 * for the AI trading engine.
 *
 * Reuses the same data source functions as /api/data/snapshot,
 * plus LNM-specific data (pool balance, positions, ticker).
 */

import {
  fetchBtcMarket,
  fetchBtcNetwork,
  fetchLightning,
  fetchFearGreed,
  fetchOnChain,
  fetchIndices,
  fetchCommodities,
  fetchFX,
  fetchCentralBankRates,
  fetchWhaleTransactions,
  fetchBtcEquities,
} from '@/lib/data/sources';
import { getBotClient, LnmV3Client } from '@/lib/lnm/client';
import { prisma } from '@/lib/db';
import type { TradingSnapshot, PoolState } from './types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function safe<T>(val: unknown, fallback: T): T {
  return (val as T) ?? fallback;
}

/** Convert decimal ratio (0.0023) to percentage points (0.23) */
function ratioToPct(r: unknown): number {
  const v = Number(r);
  return isNaN(v) ? 0 : v * 100;
}

/** Extract change % from a market data object, handling various field names */
function extractChangePct(obj: Record<string, unknown> | null | undefined): number {
  if (!obj) return 0;
  // Try common field names — sources use different conventions
  const raw = obj.changePct ?? obj.change_pct ?? obj.change ?? obj.changePercent ?? 0;
  return ratioToPct(raw);
}

function isLong(side: unknown): boolean {
  return side === 'buy' || side === 'b';
}

// ── Pool state fetcher ────────────────────────────────────────────────────────

export async function fetchPoolState(): Promise<PoolState> {
  try {
    const bot = getBotClient();
    const [account, trades] = await Promise.all([
      bot.getAccount(),
      bot.getRunningTrades().catch(() => []),
    ]);

    // v3 returns balance in sats natively
    const balanceSats = safe<number>(account.balance, 0);
    const balanceBtc = balanceSats / 1e8;
    const openPositions = Array.isArray(trades) ? trades : [];
    const pos = openPositions[0] as Record<string, unknown> | undefined;

    return {
      balanceSats,
      balanceBtc,
      hasPosition: !!pos,
      positionSide: pos ? (isLong(pos.side) ? 'long' : 'short') : null,
      entryPrice: safe<number | null>(pos?.price, null),
      unrealisedPnlSats: pos ? Math.round(safe<number>(pos.pl, 0) * 1e8) : 0,
      leverage: safe<number>(pos?.leverage, 0),
      takeProfit: safe<number | null>(pos?.takeprofit, null),
      stopLoss: safe<number | null>(pos?.stoploss, null),
      openTradeLnmId: safe<string | null>(pos?.id, null),
      openPositions,
    };
  } catch (err) {
    console.error('[data-collector] Failed to fetch pool state:', err);
    return {
      balanceSats: 0,
      balanceBtc: 0,
      hasPosition: false,
      positionSide: null,
      entryPrice: null,
      unrealisedPnlSats: 0,
      leverage: 0,
      takeProfit: null,
      stopLoss: null,
      openTradeLnmId: null,
      openPositions: [],
    };
  }
}

// ── LNM ticker (public — current index price + funding) ──────────────────────

async function fetchLnmTicker(): Promise<{ index: number; fundingRate: number | null }> {
  try {
    const ticker = await LnmV3Client.getTicker();
    return {
      index: safe<number>(ticker.index, 0),
      fundingRate: ticker.fundingRate != null ? Number(ticker.fundingRate) : null,
    };
  } catch {
    return { index: 0, fundingRate: null };
  }
}

// ── Recent AI decisions (prevent flip-flopping) ───────────────────────────────

async function fetchRecentDecisions(): Promise<TradingSnapshot['recent_decisions']> {
  try {
    const recent = await prisma.tradingDecision.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        decision: true,
        conviction: true,
        reasoningJson: true,
        chatMessage: true,
        createdAt: true,
      },
    });
    return recent.map((d) => {
      let regime = 'UNKNOWN';
      try {
        const parsed = JSON.parse(d.reasoningJson);
        regime = parsed.regime ?? 'UNKNOWN';
      } catch { /* ignore */ }
      return {
        decision: d.decision,
        conviction: d.conviction,
        regime,
        chat_message: d.chatMessage ?? '',
        created_at: d.createdAt.toISOString(),
      };
    });
  } catch {
    return [];
  }
}

// ── Main assembler ────────────────────────────────────────────────────────────

export async function assembleSnapshot(): Promise<{ snapshot: TradingSnapshot; poolState: PoolState }> {
  // Fetch everything in parallel
  const [
    btcMarket, btcNetwork, lightning, fearGreed, onchain,
    indices, commodities, fx, rates, btcEquities,
    poolState, ticker, recentDecisions,
  ] = await Promise.all([
    fetchBtcMarket().catch(() => null),
    fetchBtcNetwork().catch(() => null),
    fetchLightning().catch(() => null),
    fetchFearGreed().catch(() => null),
    fetchOnChain().catch(() => null),
    fetchIndices().catch(() => null),
    fetchCommodities().catch(() => null),
    fetchFX().catch(() => null),
    fetchCentralBankRates().catch(() => null),
    fetchBtcEquities().catch(() => null),
    fetchPoolState(),
    fetchLnmTicker(),
    fetchRecentDecisions(),
  ]) as [any, any, any, any, any, any, any, any, any, any, PoolState, { index: number; fundingRate: number | null }, TradingSnapshot['recent_decisions']];

  // Whale transactions need btcPrice
  const btcPrice = btcMarket?.price ?? ticker.index ?? 0;
  let whales: any = null;
  try {
    whales = await fetchWhaleTransactions(btcPrice);
  } catch { /* non-critical */ }

  const idx = (indices ?? {}) as Record<string, any>;
  const comm = (commodities ?? {}) as Record<string, any>;
  const fxData = (fx ?? {}) as Record<string, any>;
  const equities = (btcEquities ?? {}) as Record<string, any>;
  const ratesData = (rates ?? {}) as Record<string, any>;

  const snapshot: TradingSnapshot = {
    price: {
      current: btcPrice,
      change_24h_pct: safe<number>(btcMarket?.change24h, 0),
      change_7d_pct: safe<number>(btcMarket?.change7d, 0),
      change_30d_pct: safe<number>(btcMarket?.change30d, 0),
      ath: safe<number>(btcMarket?.ath, 0),
      ath_change_pct: safe<number>(btcMarket?.athChangePct, 0),
      market_cap_b: Math.round(safe<number>(btcMarket?.marketCap, 0) / 1e9),
      volume_24h_b: Math.round(safe<number>(btcMarket?.volume24h, 0) / 1e9),
    },
    macro: {
      fear_greed: safe<number>(fearGreed?.value, 50),
      fear_greed_label: safe<string>(fearGreed?.classification, 'Neutral'),
      spx_change_pct: extractChangePct(idx.SPX ?? idx.spx),
      ndx_change_pct: extractChangePct(idx.NDX ?? idx.ndx),
      dji_change_pct: extractChangePct(idx.DJI ?? idx.dji),
      dxy: safe<number>(fxData.DXY?.price ?? fxData.dxy?.price, 0),
      dxy_change_pct: extractChangePct(fxData.DXY ?? fxData.dxy),
      gold_change_pct: extractChangePct(comm.GOLD ?? comm.gold),
      oil_change_pct: extractChangePct(comm.OIL ?? comm.oil),
      us10y_change_pct: extractChangePct(idx['10Y'] ?? idx['us10y']),
      fed_rate: ratesData?.fed ?? ratesData?.FED ?? null,
    },
    structure: {
      funding_rate: ticker.fundingRate,
      btc_equities: Object.fromEntries(
        ['MSTR', 'COIN', 'RIOT'].map((t) => [
          t,
          { change_pct: extractChangePct(equities[t] ?? equities[t.toLowerCase()]) },
        ]),
      ),
    },
    onchain: {
      hashrate: btcNetwork?.hashrate ?? null,
      difficulty: btcNetwork?.difficulty ?? null,
      block_height: btcNetwork?.blockHeight ?? null,
      mempool_fees: btcNetwork?.mempoolFees ?? null,
      mvrv: onchain?.mvrv ?? null,
      exchange_net_flow: onchain?.exchangeNetFlow ?? null,
      active_addresses: onchain?.activeAddresses ?? null,
      lightning_capacity_btc: lightning?.capacityBtc ?? lightning?.capacity ?? null,
    },
    sentiment: {
      whale_tx_count: Array.isArray(whales) ? whales.length : 0,
      whale_total_usd: Array.isArray(whales)
        ? whales.reduce((s: number, w: any) => s + (w.valueUsd ?? 0), 0)
        : 0,
    },
    pool: {
      balance_sats: poolState.balanceSats,
      balance_btc: poolState.balanceBtc,
      has_position: poolState.hasPosition,
      position_side: poolState.positionSide,
      entry_price: poolState.entryPrice,
      unrealised_pnl_sats: poolState.unrealisedPnlSats,
      leverage: poolState.leverage,
      take_profit: poolState.takeProfit,
      stop_loss: poolState.stopLoss,
      open_trade_lnm_id: poolState.openTradeLnmId,
    },
    recent_decisions: recentDecisions,
    timestamp: Date.now(),
  };

  return { snapshot, poolState };
}

// ── Format snapshot as human-readable prompt for the AI ───────────────────────

export function formatSnapshotPrompt(s: TradingSnapshot): string {
  const lines: string[] = [];

  lines.push('=== MARKET DATA SNAPSHOT ===');
  lines.push(`Timestamp: ${new Date(s.timestamp).toISOString()}`);
  lines.push('');

  // Price
  lines.push('── BTC PRICE ──');
  lines.push(`Current: $${s.price.current.toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
  lines.push(`24h: ${s.price.change_24h_pct >= 0 ? '+' : ''}${s.price.change_24h_pct.toFixed(2)}%`);
  lines.push(`7d: ${s.price.change_7d_pct >= 0 ? '+' : ''}${s.price.change_7d_pct.toFixed(2)}%`);
  lines.push(`30d: ${s.price.change_30d_pct >= 0 ? '+' : ''}${s.price.change_30d_pct.toFixed(2)}%`);
  lines.push(`ATH: $${s.price.ath.toLocaleString()} (${s.price.ath_change_pct.toFixed(1)}% away)`);
  lines.push(`Market Cap: $${s.price.market_cap_b}B | Volume 24h: $${s.price.volume_24h_b}B`);
  lines.push('');

  // Macro
  lines.push('── MACRO ──');
  lines.push(`Fear & Greed: ${s.macro.fear_greed}/100 (${s.macro.fear_greed_label})`);
  lines.push(`SPX: ${s.macro.spx_change_pct >= 0 ? '+' : ''}${s.macro.spx_change_pct.toFixed(2)}% | NDX: ${s.macro.ndx_change_pct >= 0 ? '+' : ''}${s.macro.ndx_change_pct.toFixed(2)}% | DJI: ${s.macro.dji_change_pct >= 0 ? '+' : ''}${s.macro.dji_change_pct.toFixed(2)}%`);
  if (s.macro.dxy) lines.push(`DXY: ${s.macro.dxy.toFixed(2)} (${s.macro.dxy_change_pct >= 0 ? '+' : ''}${s.macro.dxy_change_pct.toFixed(2)}%)`);
  lines.push(`Gold: ${s.macro.gold_change_pct >= 0 ? '+' : ''}${s.macro.gold_change_pct.toFixed(2)}% | Oil: ${s.macro.oil_change_pct >= 0 ? '+' : ''}${s.macro.oil_change_pct.toFixed(2)}%`);
  if (s.macro.us10y_change_pct) lines.push(`US 10Y: ${s.macro.us10y_change_pct >= 0 ? '+' : ''}${s.macro.us10y_change_pct.toFixed(2)}%`);
  if (s.macro.fed_rate != null) lines.push(`Fed Rate: ${s.macro.fed_rate}%`);
  lines.push('');

  // Structure
  lines.push('── MARKET STRUCTURE ──');
  if (s.structure.funding_rate != null) lines.push(`Funding Rate: ${s.structure.funding_rate}`);
  const eqs = Object.entries(s.structure.btc_equities);
  if (eqs.length > 0) {
    lines.push(`BTC Equities: ${eqs.map(([t, v]) => `${t} ${v.change_pct >= 0 ? '+' : ''}${v.change_pct.toFixed(2)}%`).join(' | ')}`);
  }
  lines.push('');

  // On-chain
  lines.push('── ON-CHAIN ──');
  if (s.onchain.mvrv != null) lines.push(`MVRV: ${s.onchain.mvrv}`);
  if (s.onchain.exchange_net_flow != null) lines.push(`Exchange Net Flow: ${s.onchain.exchange_net_flow}`);
  if (s.onchain.active_addresses != null) lines.push(`Active Addresses: ${s.onchain.active_addresses}`);
  if (s.onchain.hashrate) lines.push(`Hashrate: ${s.onchain.hashrate}`);
  if (s.onchain.block_height) lines.push(`Block Height: ${s.onchain.block_height}`);
  if (s.onchain.lightning_capacity_btc != null) lines.push(`Lightning Capacity: ${s.onchain.lightning_capacity_btc} BTC`);
  lines.push('');

  // Sentiment
  lines.push('── SENTIMENT ──');
  lines.push(`Whale Transactions: ${s.sentiment.whale_tx_count} recent (total $${Math.round(s.sentiment.whale_total_usd / 1e6)}M)`);
  lines.push('');

  // Pool
  lines.push('── POOL STATE ──');
  lines.push(`Balance: ${s.pool.balance_sats.toLocaleString()} sats (${s.pool.balance_btc.toFixed(5)} BTC)`);
  if (s.pool.has_position) {
    lines.push(`Position: ${s.pool.position_side?.toUpperCase()} ${s.pool.leverage}× @ $${s.pool.entry_price?.toLocaleString()}`);
    lines.push(`Unrealised P&L: ${s.pool.unrealised_pnl_sats >= 0 ? '+' : ''}${s.pool.unrealised_pnl_sats} sats`);
    if (s.pool.take_profit) lines.push(`Take Profit: $${s.pool.take_profit.toLocaleString()}`);
    if (s.pool.stop_loss) lines.push(`Stop Loss: $${s.pool.stop_loss.toLocaleString()}`);
  } else {
    lines.push('Position: FLAT (no open position)');
  }
  lines.push('');

  // Recent decisions
  if (s.recent_decisions.length > 0) {
    lines.push('── RECENT AI DECISIONS (last 3) ──');
    for (const d of s.recent_decisions) {
      lines.push(`[${d.created_at}] ${d.decision} (conv. ${d.conviction}/10, regime: ${d.regime}) — ${d.chat_message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
