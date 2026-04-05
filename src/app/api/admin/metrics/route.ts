/**
 * GET /api/admin/metrics
 * Admin-only endpoint returning user & platform metrics.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/auth/tier';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Run all queries in parallel
  const [
    totalUsers,
    tierCounts,
    activeToday,
    activeWeek,
    activeMonth,
    newUsersWeek,
    newUsersMonth,
    newsletterEnabled,
    newsletterDaily,
    newsletterWeekly,
    revenueMonth,
    revenueAll,
    totalDonations,
    chatMessages24h,
    chatMessagesWeek,
  ] = await Promise.all([
    prisma.user.count(),

    prisma.user.groupBy({
      by: ['tier'],
      _count: true,
    }),

    prisma.user.count({ where: { lastSeenAt: { gte: oneDayAgo } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: thirtyDaysAgo } } }),

    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),

    prisma.user.count({ where: { newsletterEnabled: true } }),
    prisma.user.count({ where: { newsletterEnabled: true, newsletterFrequency: 'daily' } }),
    prisma.user.count({ where: { newsletterEnabled: true, newsletterFrequency: 'weekly' } }),

    prisma.subscriptionPayment.aggregate({
      where: { status: 'confirmed', createdAt: { gte: thirtyDaysAgo }, tier: { not: 'donation' } },
      _sum: { amountSats: true },
      _count: true,
    }),

    prisma.subscriptionPayment.aggregate({
      where: { status: 'confirmed', tier: { not: 'donation' } },
      _sum: { amountSats: true },
      _count: true,
    }),

    prisma.subscriptionPayment.aggregate({
      where: { status: 'confirmed', tier: 'donation' },
      _sum: { amountSats: true },
      _count: true,
    }),

    prisma.chatMessage.count({ where: { createdAt: { gte: oneDayAgo }, isBot: false } }),
    prisma.chatMessage.count({ where: { createdAt: { gte: sevenDaysAgo }, isBot: false } }),
  ]);

  // Build tier breakdown
  const tiers: Record<string, number> = { free: 0, general: 0, members: 0, vip: 0 };
  for (const row of tierCounts) {
    tiers[row.tier] = row._count;
  }

  // Paid users = non-free with active subscription
  const paidUsers = (tiers.general || 0) + (tiers.members || 0) + (tiers.vip || 0);

  return NextResponse.json({
    users: {
      total: totalUsers,
      tiers,
      paid: paidUsers,
      activeToday,
      activeWeek,
      activeMonth,
      newUsersWeek,
      newUsersMonth,
    },
    newsletter: {
      enabled: newsletterEnabled,
      daily: newsletterDaily,
      weekly: newsletterWeekly,
    },
    revenue: {
      monthSats: revenueMonth._sum.amountSats || 0,
      monthCount: revenueMonth._count,
      allTimeSats: revenueAll._sum.amountSats || 0,
      allTimeCount: revenueAll._count,
      donationSats: totalDonations._sum.amountSats || 0,
      donationCount: totalDonations._count,
    },
    chat: {
      messages24h: chatMessages24h,
      messagesWeek: chatMessagesWeek,
    },
  });
}
