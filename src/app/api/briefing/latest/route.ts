import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/briefing/latest
 * Returns the most recent briefing with full content.
 */
export async function GET() {
  try {
    const briefing = await prisma.briefing.findFirst({
      orderBy: { date: 'desc' },
    });

    if (!briefing) {
      return NextResponse.json({ error: 'No briefings yet' }, { status: 404 });
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
  } catch (error) {
    console.error('Latest briefing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
