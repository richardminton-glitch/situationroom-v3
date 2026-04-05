/**
 * GET /api/admin/users
 * Admin-only paginated user list with search/filter.
 *
 * Query params:
 *   q        — search by email or display name (partial match)
 *   tier     — filter by tier (free|general|members|vip)
 *   page     — page number (1-based, default 1)
 *   limit    — items per page (default 50, max 200)
 *   sort     — field to sort by (default: createdAt)
 *   order    — asc|desc (default: desc)
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/auth/tier';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';
  const tierFilter = searchParams.get('tier') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const sort = searchParams.get('sort') || 'createdAt';
  const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { displayName: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (tierFilter && ['free', 'general', 'members', 'vip', 'admin'].includes(tierFilter)) {
    where.tier = tierFilter;
  }

  // Validate sort field
  const allowedSorts = ['createdAt', 'lastSeenAt', 'email', 'tier'];
  const sortField = allowedSorts.includes(sort) ? sort : 'createdAt';

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        displayName: true,
        tier: true,
        createdAt: true,
        lastSeenAt: true,
        newsletterEnabled: true,
        newsletterFrequency: true,
        subscriptionExpiresAt: true,
        subscriptionActivatedAt: true,
        nostrNpub: true,
        chatDisplayName: true,
        payments: {
          where: { status: 'confirmed' },
          select: {
            tier: true,
            amountSats: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { [sortField]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  // Compute per-user aggregates
  const enriched = users.map((u) => {
    const subscriptionPayments = u.payments.filter((p) => p.tier !== 'donation');
    const donations = u.payments.filter((p) => p.tier === 'donation');
    const totalPaidSats = subscriptionPayments.reduce((sum, p) => sum + p.amountSats, 0);
    const totalDonatedSats = donations.reduce((sum, p) => sum + p.amountSats, 0);

    return {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      tier: u.tier,
      createdAt: u.createdAt,
      lastSeenAt: u.lastSeenAt,
      newsletterEnabled: u.newsletterEnabled,
      newsletterFrequency: u.newsletterFrequency,
      subscriptionExpiresAt: u.subscriptionExpiresAt,
      subscriptionActivatedAt: u.subscriptionActivatedAt,
      hasNostr: !!u.nostrNpub,
      chatDisplayName: u.chatDisplayName || null,
      totalPaidSats,
      totalDonatedSats,
      paymentCount: u.payments.length,
    };
  });

  return NextResponse.json({
    users: enriched,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  });
}
