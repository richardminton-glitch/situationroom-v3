/**
 * GET /api/funding/status
 *
 * Returns monthly revenue vs running costs breakdown.
 * Queries subscription_payments for current calendar month.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Running costs — update as costs change
const RUNNING_COSTS_GBP = 146;
const COSTS_BREAKDOWN = {
  apiNinjas: 28,
  hosting:   28,
  claude:    90,
};

// Rough sats/GBP conversion — ideally fetch live, but hardcoded is acceptable
// (this endpoint is for display purposes — not financial precision)
const SATS_PER_GBP = 120_000; // approximate; update periodically

export async function GET() {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const payments = await prisma.subscriptionPayment.findMany({
      where: {
        status:    'confirmed',
        activatedAt: { gte: monthStart },
      },
      select: { tier: true, amountSats: true },
    });

    let subscriptionRevenueSats = 0;
    let donationRevenueSats = 0;
    const breakdown = { general: 0, members: 0, vip: 0, donations: 0 };

    for (const p of payments) {
      if (p.tier === 'donation') {
        donationRevenueSats += p.amountSats;
        breakdown.donations += p.amountSats;
      } else {
        subscriptionRevenueSats += p.amountSats;
        if (p.tier in breakdown) {
          breakdown[p.tier as keyof typeof breakdown] += p.amountSats;
        }
      }
    }

    const totalRevenueSats = subscriptionRevenueSats + donationRevenueSats;
    const totalRevenueGBP  = totalRevenueSats / SATS_PER_GBP;
    const coveragePct      = Math.min(100, Math.round((totalRevenueGBP / RUNNING_COSTS_GBP) * 100));

    // Active member counts
    const [generalCount, membersCount, vipCount] = await Promise.all([
      prisma.user.count({ where: { tier: 'general' } }),
      prisma.user.count({ where: { tier: 'members' } }),
      prisma.user.count({ where: { tier: 'vip' } }),
    ]);

    return NextResponse.json({
      subscriptionRevenueSats,
      donationRevenueSats,
      totalRevenueSats,
      totalRevenueGBP:  Math.round(totalRevenueGBP * 100) / 100,
      runningCostsGBP:  RUNNING_COSTS_GBP,
      costsBreakdown:   COSTS_BREAKDOWN,
      coveragePct,
      memberCount:      generalCount + membersCount + vipCount,
      memberBreakdown:  { general: generalCount, members: membersCount, vip: vipCount },
      breakdown,
    });
  } catch (error) {
    console.error('Funding status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
