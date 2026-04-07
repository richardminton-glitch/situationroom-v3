/**
 * GET /api/cron/vip-briefings
 * 06:10 UTC daily — generates personalised VIP briefings for all active VIP subscribers.
 * Calls /api/briefing/generate-vip for each VIP user with topics selected.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Find all VIP users with topics selected and active subscriptions
  const vipUsers = await prisma.user.findMany({
    where: {
      tier: 'vip',
      subscriptionExpiresAt: { gt: new Date() },
      newsletterVipTopics: { isEmpty: false },
    },
    select: { id: true },
  });

  // Use HTTP localhost for internal calls — public HTTPS via the same node
  // process can fail with ERR_SSL_WRONG_VERSION_NUMBER on loopback.
  const baseUrl = process.env.INTERNAL_BASE_URL
    ?? `http://localhost:${process.env.PORT ?? '3000'}`;
  const results = { ok: 0, skipped: 0, failed: 0 };

  for (const user of vipUsers) {
    try {
      const res = await fetch(`${baseUrl}/api/briefing/generate-vip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
        },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json() as { ok?: boolean; skipped?: boolean; error?: string };
      if (data.ok) results.ok++;
      else if (data.skipped) results.skipped++;
      else results.failed++;
    } catch {
      results.failed++;
    }
  }

  return NextResponse.json({ ...results, total: vipUsers.length });
}
