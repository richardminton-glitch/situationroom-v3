/**
 * GET /api/pool/status
 * Returns pool balance, position, trade history, and bot signals.
 * Requires Members+ tier. Cached in DB for 60 seconds.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasAccess } from '@/lib/auth/tier';
import { getBotClient } from '@/lib/lnm/client';
import { prisma } from '@/lib/db';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'pool-status';
const CACHE_TTL_MS = 60 * 1000; // 1 minute

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

    // Fetch user account + recent futures (trade history)
    const [userRaw, futuresRaw] = await Promise.all([
      bot.userGet() as Promise<Record<string, unknown>>,
      (bot as any).futuresGetAllClosed?.({ limit: '20' }).catch(() => []) ?? Promise.resolve([]),
    ]);

    const user = userRaw as Record<string, unknown>;

    // Calculate win rate from closed futures
    const trades = (futuresRaw as Record<string, unknown>[]).slice(0, 20);
    const wins = trades.filter((t) => {
      const pl = t.pl as number ?? 0;
      return pl > 0;
    }).length;
    const losses = trades.length - wins;
    const winRate = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0;

    // Last trade
    const lastTrade = trades[0] as Record<string, unknown> | undefined;
    const lastTradeDesc = lastTrade
      ? `${lastTrade.side?.toString().toUpperCase() ?? 'TRADE'} ${
          (lastTrade.pl as number ?? 0) >= 0 ? '+' : ''
        }${((lastTrade.pl as number ?? 0) / 1e8 * 100).toFixed(1)}%`
      : 'No recent trades';

    // Open positions
    const openPositions = (await (bot as any).futuresGetAll?.({ status: 'open' }).catch(() => [])) ?? [];
    const hasOpenLong = openPositions.some((p: Record<string, unknown>) => p.side === 'b');
    const hasOpenShort = openPositions.some((p: Record<string, unknown>) => p.side === 's');
    const position = hasOpenLong ? 'LONG' : hasOpenShort ? 'SHORT' : 'FLAT';

    // Unrealised P&L
    const unrealisedPl = openPositions.reduce(
      (sum: number, p: Record<string, unknown>) => sum + ((p.pl as number) ?? 0),
      0
    );

    const result = {
      balanceSats: Math.round(((user.balance as number) ?? 0) * 1e8),
      position,
      unrealisedPlSats: Math.round(unrealisedPl * 1e8),
      wins,
      losses,
      winRate,
      lastTradeDesc,
      openCount: openPositions.length,
      recentTrades: trades.slice(0, 10).map((t) => ({
        side: t.side === 'b' ? 'LONG' : 'SHORT',
        entryPrice: t.price as number ?? 0,
        exitPrice: t.exit_price as number ?? 0,
        plSats: Math.round(((t.pl as number) ?? 0) * 1e8),
        duration: t.duration as string ?? '—',
        closedAt: t.closed_ts as number ?? 0,
        rationale: t.rationale as string ?? '',
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
