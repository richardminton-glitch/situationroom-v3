/**
 * Position sync — detects trades closed externally (TP hit, SL hit, liquidation).
 *
 * Runs every 60 seconds via cron. Compares local DB "running" trades against
 * LN Markets closed trades to detect and record external closures.
 */

import { getBotClient } from '@/lib/lnm/client';
import { prisma } from '@/lib/db';
import { announceExternalClose } from './bot-messages';

export async function syncPositions(): Promise<{
  synced: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let synced = 0;

  try {
    // 1. Find all locally-running trades
    const runningTrades = await prisma.trade.findMany({
      where: { status: 'running' },
    });

    if (runningTrades.length === 0) {
      return { synced: 0, errors: [] };
    }

    // 2. Fetch recent closed trades from LNM (v3 API)
    const bot = getBotClient();
    let closedTrades: Record<string, unknown>[] = [];
    try {
      closedTrades = await bot.getClosedTrades(20);
    } catch (err) {
      errors.push(`Failed to fetch closed trades: ${err}`);
      return { synced: 0, errors };
    }

    // 3. Build lookup of closed trade IDs
    const closedMap = new Map<string, Record<string, unknown>>();
    for (const ct of closedTrades) {
      if (ct.id) closedMap.set(String(ct.id), ct);
    }

    // 4. Check each running trade
    for (const local of runningTrades) {
      if (!local.lnmTradeId) continue;

      const closed = closedMap.get(local.lnmTradeId);
      if (!closed) {
        // Also check if the trade still exists as running on LNM
        // If it's not in closed list, it might still be running or the ID doesn't match
        continue;
      }

      // Trade was closed externally!
      const exitPrice = Number(closed.exitPrice ?? closed.exit_price ?? closed.price ?? 0);
      // v3 returns P&L in sats
      const pnlSats = Math.round(Number(closed.pl ?? 0));

      // Determine close reason
      const closeReason = detectCloseReason(closed, local);
      const side = local.side as 'long' | 'short';

      try {
        // Update local DB
        await prisma.trade.update({
          where: { id: local.id },
          data: {
            exitPrice,
            pnlSats,
            pnlPct: local.entryPrice ? ((exitPrice - local.entryPrice) / local.entryPrice) * 100 : null,
            status: 'closed',
            closeReason,
            closedAt: new Date(),
          },
        });

        // Announce in bot room
        const syncReason = closeReason === 'tp_hit' ? 'tp_hit'
          : closeReason === 'sl_hit' ? 'sl_hit'
          : closeReason === 'liquidation' ? 'liquidation'
          : 'unknown';

        await announceExternalClose(side, syncReason, pnlSats, exitPrice);
        synced++;

        console.log(`[position-sync] Trade ${local.lnmTradeId} closed externally: ${closeReason} P&L: ${pnlSats} sats`);
      } catch (err) {
        errors.push(`Failed to sync trade ${local.lnmTradeId}: ${err}`);
      }
    }

    return { synced, errors };
  } catch (err) {
    errors.push(`Position sync failed: ${err}`);
    return { synced: 0, errors };
  }
}

// ── Detect why a trade was closed ─────────────────────────────────────────────

function detectCloseReason(
  closed: Record<string, unknown>,
  local: { side: string; takeProfit: number | null; stopLoss: number | null; entryPrice: number },
): string {
  const exitPrice = Number(closed.exit_price ?? closed.price ?? 0);
  if (!exitPrice) return 'unknown';

  const tp = local.takeProfit;
  const sl = local.stopLoss;
  const isLongSide = local.side === 'long';

  // Check TP hit — exit price near TP level (within 0.1%)
  if (tp && Math.abs(exitPrice - tp) / tp < 0.001) {
    return 'tp_hit';
  }

  // Check SL hit — exit price near SL level (within 0.1%)
  if (sl && Math.abs(exitPrice - sl) / sl < 0.001) {
    return 'sl_hit';
  }

  // Check liquidation — very large loss relative to entry
  const pnlPct = ((exitPrice - local.entryPrice) / local.entryPrice) * (isLongSide ? 1 : -1);
  if (pnlPct < -0.8) {
    return 'liquidation';
  }

  // Check if SL was breached (slippage scenario)
  if (sl) {
    if (isLongSide && exitPrice <= sl) return 'sl_hit';
    if (!isLongSide && exitPrice >= sl) return 'sl_hit';
  }

  // Check if TP was breached
  if (tp) {
    if (isLongSide && exitPrice >= tp) return 'tp_hit';
    if (!isLongSide && exitPrice <= tp) return 'tp_hit';
  }

  return 'unknown';
}
