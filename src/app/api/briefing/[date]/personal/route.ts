/**
 * GET /api/briefing/[date]/personal
 * Returns the VIP user's personalised context for a specific briefing date.
 * Auth required. VIP only.
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasAccess, isAdmin } from '@/lib/auth/tier';
import { prisma } from '@/lib/db';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ date: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userTier = (session.user.tier as Tier) ?? 'free';
  if (!isAdmin(session.user.email) && !hasAccess(userTier, 'vip')) {
    return NextResponse.json({ error: 'VIP required' }, { status: 403 });
  }

  const { date } = await params;
  const targetDate = new Date(date + 'T00:00:00Z');

  const vipBriefing = await (prisma as any).vipBriefing.findUnique({
    where: { userId_date: { userId: session.user.id, date: targetDate } },
    select: { topics: true, headline: true, contentJson: true },
  }) as { topics: string; headline: string; contentJson: string } | null;

  if (!vipBriefing) return NextResponse.json({ personal: null });

  return NextResponse.json({
    personal: {
      topics: JSON.parse(vipBriefing.topics) as string[],
      outlook: vipBriefing.contentJson
        ? (JSON.parse(vipBriefing.contentJson) as { outlook?: string }).outlook ?? null
        : null,
    },
  });
}
