/**
 * Trade executor — sends orders to LN Markets and records in DB.
 *
 * Handles: OPEN_LONG, OPEN_SHORT, CLOSE, ADJUST
 * Converts margin percentage to USD quantity for LNM v3 API.
 */

import { getBotClient } from '@/lib/lnm/client';
import { prisma } from '@/lib/db';
import {
  announceTradeOpen,
  announceTradeClose,
} from './bot-messages';
// Brief ops-room mirrors of the verbose bot-room trade posts. Every
// open / close is cross-posted so members-facing awareness of
// trading activity is not gated behind the dedicated bot-room page.
import {
  announceTradeOpen as opsAnnounceTradeOpen,
  announceTradeClose as opsAnnounceTradeClose,
} from '@/lib/chat/announcements';
import type { AIDecision, PoolState, ExecutionResult } from './types';

// ── Main executor ─────────────────────────────────────────────────────────────

export async function executeTrade(
  decision: AIDecision,
  pool: PoolState,
  btcPrice: number,
  decisionId: string,
): Promise<ExecutionResult> {
  const d = decision.decision;

  try {
    if (d === 'OPEN_LONG' || d === 'OPEN_SHORT') {
      return await executeOpen(decision, pool, btcPrice, decisionId);
    }
    if (d === 'CLOSE') {
      return await executeClose(pool, decisionId, decision.chat_message);
    }
    if (d === 'ADJUST') {
      return await executeAdjust(decision, pool);
    }

    // HOLD / FLAT — no execution needed
    return { success: true, action: 'none' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[executor] Trade execution failed:', msg);
    return { success: false, action: 'none', error: msg };
  }
}

// ── Open a new position ───────────────────────────────────────────────────────

async function executeOpen(
  decision: AIDecision,
  pool: PoolState,
  btcPrice: number,
  decisionId: string,
): Promise<ExecutionResult> {
  const t = decision.trade!;
  const bot = getBotClient();

  // Convert margin % → USD quantity
  // quantity = (marginSats / 1e8) * btcPrice * leverage
  const marginSats = Math.round(pool.balanceSats * t.margin_pct);
  const marginBtc = marginSats / 1e8;
  const marginUsd = marginBtc * btcPrice;
  const quantityUsd = Math.round(marginUsd * t.leverage);

  if (quantityUsd < 1) {
    return { success: false, action: 'none', error: `Quantity too small: $${quantityUsd}` };
  }

  console.log(`[executor] Opening ${t.side} — qty=$${quantityUsd} lev=${t.leverage}x margin=${marginSats}sats TP=$${t.take_profit} SL=$${t.stop_loss}`);

  const result = await bot.openTrade({
    side: t.side === 'long' ? 'buy' : 'sell',
    quantity: quantityUsd,
    leverage: t.leverage,
    type: 'market',
    takeprofit: t.take_profit,
    stoploss: t.stop_loss,
  });
  const lnmTradeId = String(result.id ?? '');
  const entryPrice = Number(result.price ?? btcPrice);

  // Record trade in DB
  const trade = await prisma.trade.create({
    data: {
      decisionId,
      lnmTradeId,
      side: t.side,
      entryPrice,
      marginSats,
      leverage: t.leverage,
      takeProfit: t.take_profit,
      stopLoss: t.stop_loss,
      status: 'running',
    },
  });

  // Announce in bot room (detailed telemetry) + ops room (brief one-liner)
  await announceTradeOpen(
    t.side,
    t.leverage,
    entryPrice,
    decision.conviction,
    decision.chat_message,
  );
  await opsAnnounceTradeOpen(t.side, t.leverage, entryPrice, decision.conviction);

  // Mark decision as executed
  await prisma.tradingDecision.update({
    where: { id: decisionId },
    data: {
      executed: true,
      executionJson: JSON.stringify(result),
    },
  });

  return {
    success: true,
    action: 'opened',
    tradeId: trade.id,
    lnmTradeId,
    details: result,
  };
}

// ── Close current position ────────────────────────────────────────────────────

async function executeClose(
  pool: PoolState,
  decisionId: string,
  chatMessage: string,
): Promise<ExecutionResult> {
  if (!pool.openTradeLnmId) {
    return { success: false, action: 'none', error: 'No LNM trade ID to close' };
  }

  const bot = getBotClient();

  console.log(`[executor] Closing trade ${pool.openTradeLnmId}`);

  const result = await bot.closeTrade(pool.openTradeLnmId);
  const exitPrice = Number(result.exitPrice ?? result.exit_price ?? result.price ?? 0);
  const pnlSats = Math.round(Number(result.pl ?? 0));

  // Update local trade record
  const localTrade = await prisma.trade.findFirst({
    where: { lnmTradeId: pool.openTradeLnmId, status: 'running' },
  });

  if (localTrade) {
    await prisma.trade.update({
      where: { id: localTrade.id },
      data: {
        exitPrice,
        pnlSats,
        pnlPct: pool.entryPrice ? ((exitPrice - pool.entryPrice) / pool.entryPrice) * 100 : null,
        status: 'closed',
        closeReason: 'ai_decision',
        closedAt: new Date(),
      },
    });

    await announceTradeClose(
      pool.positionSide!,
      pool.entryPrice ?? 0,
      exitPrice,
      pnlSats,
      chatMessage,
    );
    await opsAnnounceTradeClose(pool.positionSide!, exitPrice, pnlSats, 'ai_decision');
  }

  // Mark decision as executed
  await prisma.tradingDecision.update({
    where: { id: decisionId },
    data: {
      executed: true,
      executionJson: JSON.stringify(result),
    },
  });

  return {
    success: true,
    action: 'closed',
    lnmTradeId: pool.openTradeLnmId,
    details: result,
  };
}

// ── Adjust TP/SL on existing position ─────────────────────────────────────────

async function executeAdjust(
  decision: AIDecision,
  pool: PoolState,
): Promise<ExecutionResult> {
  if (!pool.openTradeLnmId) {
    return { success: false, action: 'none', error: 'No LNM trade ID to adjust' };
  }

  const t = decision.trade;
  if (!t) {
    return { success: false, action: 'none', error: 'ADJUST decision without trade parameters' };
  }

  const bot = getBotClient();

  console.log(`[executor] Adjusting trade ${pool.openTradeLnmId}: TP=${t.take_profit} SL=${t.stop_loss}`);

  // v3 has separate endpoints for TP and SL updates
  const promises: Promise<Record<string, unknown>>[] = [];
  if (t.take_profit) promises.push(bot.updateTakeProfit(pool.openTradeLnmId, t.take_profit));
  if (t.stop_loss)   promises.push(bot.updateStopLoss(pool.openTradeLnmId, t.stop_loss));

  const results = await Promise.all(promises);
  const result = results[results.length - 1] ?? {};

  // Update local trade record
  const localTrade = await prisma.trade.findFirst({
    where: { lnmTradeId: pool.openTradeLnmId, status: 'running' },
  });
  if (localTrade) {
    await prisma.trade.update({
      where: { id: localTrade.id },
      data: {
        ...(t.take_profit ? { takeProfit: t.take_profit } : {}),
        ...(t.stop_loss ? { stopLoss: t.stop_loss } : {}),
      },
    });
  }

  return {
    success: true,
    action: 'adjusted',
    lnmTradeId: pool.openTradeLnmId,
    details: result,
  };
}
