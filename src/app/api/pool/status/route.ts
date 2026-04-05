/**
 * GET /api/pool/status
 * Returns pool balance, position, trade history, and bot signals.
 * Requires Members+ tier. Cached in DB for 60 seconds.
 *
 * Response shape matches the BotState interface used by StatsBar + ChartPanel.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasAccess } from '@/lib/auth/tier';
import { getBotClient } from '@/lib/lnm/client';
import { prisma } from '@/lib/db';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';

const CACHE_KEY   = 'pool-status';
const CACHE_TTL_MS = 60 * 1000; // 1 minute

// ── LNM v3 API side helpers (defensive: supports both 'b'/'s' and 'buy'/'sell') ──

function isLong(side: unknown): boolean {
  return side === 'buy' || side === 'b';
}

function calcTotalPl(trades: Record<string, unknown>[]): number {
  return trades.reduce(
    (sum, t) => sum + Math.round(((t.pl as number) ?? 0) * 1e8),
    0,
  );
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userTier = (session.user.tier as Tier) ?? 'free';
  if (!hasAccess(userTier, 'members')) {
    return NextResponse.json({ error: 'Members tier required' }, { status: 403 });
  }

  // Check DB cache first
  const cached = await prisma.dataCache.findUnique({ where: { key: CACHE_KEY } });
  if (cached && cached.expiresAt > new Date()) {
    return NextResponse.json(JSON.parse(cached.data), { headers: { 'X-Cache': 'HIT' } });
  }

  try {
    const bot = getBotClient();

    // Fetch account + open positions + recent closed trades in parallel
    // NOTE: SDK method is futuresGetTrades (NOT futuresGetAll/futuresGetAllClosed)
    const [userRaw, openRaw, closedRaw] = await Promise.all([
      bot.userGet() as Promise<Record<string, unknown>>,
      (bot as any).futuresGetTrades({ type: 'running' }).catch(() => []),
      (bot as any).futuresGetTrades({ type: 'closed', limit: 20 }).catch(() => []),
    ]);

    const user = userRaw as Record<string, unknown>;
    const openPositions = (openRaw ?? []) as Record<string, unknown>[];
    const closedTrades  = ((closedRaw ?? []) as Record<string, unknown>[]).slice(0, 20);

    // ── Balance ──
    const balanceSats    = Math.round(((user.balance as number) ?? 0) * 1e8);
    const poolBalanceBtc = (user.balance as number) ?? 0;

    // ── Position ──
    const openPos = openPositions[0] as Record<string, unknown> | undefined;
    const position: 'LONG' | 'SHORT' | 'FLAT' = openPos
      ? (isLong(openPos.side) ? 'LONG' : 'SHORT')
      : 'FLAT';
    const leverage   = (openPos?.leverage as number) ?? 0;
    const entryPrice = (openPos?.price as number) ?? null;
    const takeProfit = (openPos?.takeprofit as number) ?? null;
    const stopLoss   = (openPos?.stoploss as number) ?? null;

    // ── Unrealised P&L ──
    const unrealisedPlSats = openPositions.reduce(
      (sum: number, p: Record<string, unknown>) => sum + Math.round(((p.pl as number) ?? 0) * 1e8),
      0,
    );

    // ── Win/loss stats ──
    const wins       = closedTrades.filter((t) => ((t.pl as number) ?? 0) > 0).length;
    const losses     = closedTrades.length - wins;
    const tradeCount = closedTrades.length;
    const winRate    = tradeCount > 0 ? wins / tradeCount : 0;
    const totalPlSats = calcTotalPl(closedTrades);

    // ── Last trade P&L ──
    const lastTrade     = closedTrades[0] as Record<string, unknown> | undefined;
    const lastTradePlSats = lastTrade ? Math.round(((lastTrade.pl as number) ?? 0) * 1e8) : 0;
    const lastTradeDesc = lastTrade
      ? `${isLong(lastTrade.side) ? 'LONG' : 'SHORT'} ${lastTradePlSats >= 0 ? '+' : ''}${lastTradePlSats} sats`
      : 'No recent trades';

    const result = {
      // BotState-compatible fields
      poolBalanceBtc,
      position,
      leverage,
      entryPrice,
      takeProfit,
      stopLoss,
      unrealisedPlSats,
      tradeCount,
      winRate,
      totalPlSats,
      lastTradePlSats,

      // Extended fields for pool page
      balanceSats,
      wins,
      losses,
      lastTradeDesc,
      openCount: openPositions.length,
      recentTrades: closedTrades.slice(0, 10).map((t) => ({
        side: isLong(t.side) ? 'LONG' : 'SHORT',
        entryPrice: (t.price as number) ?? 0,
        exitPrice: (t.exit_price as number) ?? 0,
        plSats: Math.round(((t.pl as number) ?? 0) * 1e8),
        duration: (t.duration as string) ?? '\u2014',
        closedAt: (t.closed_ts as number) ?? 0,
      })),
    };

    // Cache for 60 seconds
    await prisma.dataCache.upsert({
      where: { key: CACHE_KEY },
      create: { key: CACHE_KEY, data: JSON.stringify(result), expiresAt: new Date(Date.now() + CACHE_TTL_MS) },
      update: { data: JSON.stringify(result), expiresAt: new Date(Date.now() + CACHE_TTL_MS), updatedAt: new Date() },
    });

    return NextResponse.json(result, { headers: { 'X-Cache': 'MISS' } });
  } catch (err) {
    console.error('[pool/status]', err);
    // Return stale cache if available
    if (cached) return NextResponse.json(JSON.parse(cached.data), { headers: { 'X-Cache': 'STALE' } });
    return NextResponse.json({ error: 'Pool data unavailable' }, { status: 503 });
  }
}
