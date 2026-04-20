import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/shared/mine
 *
 * Dashboards shared WITH the current signed-in user. Filtered live so VIP
 * revocation or owner-tier lapse removes entries on the next fetch without
 * needing a cron.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const shares = await prisma.dashboardShare.findMany({
    where: {
      boundUserId: session.user.id,
      revokedAt: null,
      owner: { tier: 'vip' },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      layout: {
        select: { id: true, name: true, theme: true, layoutJson: true },
      },
      owner: {
        select: { displayName: true, email: true },
      },
    },
  });

  const result = shares.map((s) => ({
    shareId: s.id,
    layoutId: s.layout.id,
    name: s.layout.name,
    theme: s.layout.theme,
    panels: JSON.parse(s.layout.layoutJson) as unknown[],
    ownerDisplay: s.owner.displayName || s.owner.email.split('@')[0],
  }));

  return NextResponse.json(result);
}
