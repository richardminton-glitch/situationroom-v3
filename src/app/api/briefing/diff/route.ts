import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/briefing/diff?date=2026-03-29
 * Returns the briefing for the given date (or latest) plus the previous briefing,
 * with a computed diff of key metrics.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date');

  try {
    // Get the target briefing
    let current;
    if (dateStr) {
      current = await prisma.briefing.findUnique({ where: { date: new Date(dateStr) } });
    } else {
      current = await prisma.briefing.findFirst({ orderBy: { date: 'desc' } });
    }

    if (!current) {
      return NextResponse.json({ error: 'Briefing not found' }, { status: 404 });
    }

    // Get the previous briefing
    const previous = await prisma.briefing.findFirst({
      where: { date: { lt: current.date } },
      orderBy: { date: 'desc' },
    });

    const currentSnap = JSON.parse(current.dataSnapshotJson);
    const previousSnap = previous ? JSON.parse(previous.dataSnapshotJson) : null;

    // Compute diff
    const diff: Record<string, unknown> = {};

    if (previousSnap && previous) {
      const daysBetween = Math.round((current.date.getTime() - previous.date.getTime()) / 86400000);

      diff.daysBetween = daysBetween;
      diff.priceFrom = previousSnap.btcPrice;
      diff.priceTo = currentSnap.btcPrice;
      diff.priceChange = currentSnap.btcPrice - previousSnap.btcPrice;
      diff.priceChangePct = previousSnap.btcPrice ? ((currentSnap.btcPrice - previousSnap.btcPrice) / previousSnap.btcPrice) * 100 : 0;
      diff.threatFrom = previous.threatLevel;
      diff.threatTo = current.threatLevel;
      diff.threatChanged = previous.threatLevel !== current.threatLevel;
      diff.fearGreedFrom = previousSnap.fearGreed;
      diff.fearGreedTo = currentSnap.fearGreed;
      diff.fearGreedChange = currentSnap.fearGreed - previousSnap.fearGreed;
      diff.hashrateFrom = previousSnap.hashrateEH;
      diff.hashrateTo = currentSnap.hashrateEH;
      diff.convictionFrom = previous.convictionScore;
      diff.convictionTo = current.convictionScore;
    }

    return NextResponse.json({
      current: {
        date: current.date.toISOString().split('T')[0],
        headline: current.headline,
        threatLevel: current.threatLevel,
        convictionScore: current.convictionScore,
      },
      previous: previous ? {
        date: previous.date.toISOString().split('T')[0],
        headline: previous.headline,
        threatLevel: previous.threatLevel,
        convictionScore: previous.convictionScore,
      } : null,
      diff,
    });
  } catch (error) {
    console.error('Briefing diff error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
