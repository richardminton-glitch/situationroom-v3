import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/briefing?date=2026-03-29
 * Returns a specific briefing, or today's if no date specified.
 *
 * GET /api/briefing?archive=true&limit=30
 * Returns briefing summaries for the archive browser.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const archive = searchParams.get('archive');

  if (archive === 'true') {
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const briefings = await prisma.briefing.findMany({
      select: {
        date: true,
        headline: true,
        threatLevel: true,
        convictionScore: true,
        generatedAt: true,
      },
      orderBy: { date: 'desc' },
      take: Math.min(limit, 100),
    });

    return NextResponse.json({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      briefings: briefings.map((b: any) => ({
        date: new Date(b.date).toISOString().split('T')[0],
        headline: b.headline,
        threatLevel: b.threatLevel,
        convictionScore: b.convictionScore,
        generatedAt: new Date(b.generatedAt).toISOString(),
      })),
    });
  }

  // Single briefing
  const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const briefing = await prisma.briefing.findUnique({
    where: { date: new Date(dateStr) },
  });

  if (!briefing) {
    return NextResponse.json({ error: 'Briefing not found' }, { status: 404 });
  }

  return NextResponse.json({
    date: briefing.date.toISOString().split('T')[0],
    headline: briefing.headline,
    threatLevel: briefing.threatLevel,
    convictionScore: briefing.convictionScore,
    generatedAt: briefing.generatedAt.toISOString(),
    sections: {
      market: briefing.marketSection,
      network: briefing.networkSection,
      geopolitical: briefing.geopoliticalSection,
      macro: briefing.macroSection,
      outlook: briefing.outlookSection,
    },
    sources: JSON.parse(briefing.sourcesJson),
    headlines: JSON.parse(briefing.headlinesJson),
    dataSnapshot: JSON.parse(briefing.dataSnapshotJson),
  });
}
