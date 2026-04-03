/**
 * GET /api/rss/stats
 *
 * Internal classification statistics endpoint.
 * Returns in-process counters — not persisted, resets on process restart.
 * Not public: only useful for debugging and monitoring.
 */

import { NextResponse } from 'next/server';
import { getStats } from '@/lib/rss';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stats = getStats();

  // Count total cached entries from DB (best-effort)
  let totalCached = 0;
  try {
    totalCached = await prisma.classificationCache.count({
      where: { expiresAt: { gte: new Date() } },
    });
  } catch {
    // Table not yet migrated
  }

  const n = stats.last24h.total || 1;
  const aiCalls = stats.last24h.byMethod.ai ?? 0;
  const cacheCalls = stats.last24h.byMethod.cache ?? 0;

  return NextResponse.json({
    totalCached,
    last24h: stats.last24h,
    cacheHitRate:     Math.round((cacheCalls / n) * 100) / 100,
    grokCallRate:     Math.round((aiCalls    / n) * 100) / 100,
    grokCallsLastHour: stats.grokCallsLastHour,
  });
}
