/**
 * GET /api/funding/status
 *
 * Returns monthly revenue vs running costs breakdown.
 * Uses a cumulative balance model: daily costs are deducted between
 * payments so the funded amount decays smoothly each day.
 * Costs are computed dynamically from estimated API/AI usage.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getLiveSatsPerGbp } from '@/lib/lnm/rates';
import { getMonthlyAiCostUsd } from '@/lib/grok/usageEstimate';

export const dynamic = 'force-dynamic';

// ── Fixed costs (monthly, derived from annual renewals) ──────────────────────
// VPS (KVM 1): £15.99/yr + Business Web Hosting: £167.88/yr = £183.87/yr
const HOSTING_GBP = 15.32;   // £183.87 / 12
// Domain: situationroom.space £26.99/yr
const DOMAINS_GBP = 2.25;    // £26.99 / 12

// ── API-Ninjas cost estimate ─────────────────────────────────────────────────
// Plan: $35/mo (100K calls). Estimated ~15,360 calls/30d at current polling.
// Only charged if over free tier — we're on the paid plan at $35/mo flat.
const API_NINJAS_USD = 35;

// ── xAI / Grok cost ──────────────────────────────────────────────────────────
// Sourced from @/lib/grok/usageEstimate — the same table the admin page
// renders. Editing rows there automatically moves the figure shown in the
// header funding bar and on the /support page.

// ── GBP conversion ───────────────────────────────────────────────────────────
// Uses shared getLiveSatsPerGbp() from @/lib/lnm/rates
// (CoinGecko BTC/GBP, 5-min cache, 5s timeout, fallback to 1,900 sats/GBP)

function computeCosts(usdToGbp: number) {
  const aiUsd = getMonthlyAiCostUsd();
  const aiGbp = Math.round(aiUsd * usdToGbp);
  const apiNinjasGbp = Math.round(API_NINJAS_USD * usdToGbp);
  const hostingRounded = Math.round(HOSTING_GBP);
  const domainsRounded = Math.round(DOMAINS_GBP);

  return {
    hosting: hostingRounded,
    domains: domainsRounded,
    apiNinjas: apiNinjasGbp,
    ai: aiGbp,
    total: hostingRounded + domainsRounded + apiNinjasGbp + aiGbp,
  };
}

export async function GET() {
  try {
    const now = new Date();

    // Live BTC/GBP for sats conversion; USD/GBP is stable enough to hardcode for costs
    const satsPerGbp = await getLiveSatsPerGbp();
    const costs = computeCosts(0.79);

    // Fetch ALL confirmed payments (for all-time totals + runway).
    // Order by createdAt — activatedAt can be backdated on legacy imports
    // (e.g. donations carried over from V1/V2), which would push the runway
    // anchor years into the past and permanently zero out the balance.
    const allPayments = await prisma.subscriptionPayment.findMany({
      where: { status: 'confirmed' },
      select: { tier: true, amountSats: true, activatedAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    let allTimeSats = 0;
    let subscriptionRevenueSats = 0;
    let donationRevenueSats = 0;
    const breakdown = { general: 0, members: 0, vip: 0, donations: 0 };

    for (const p of allPayments) {
      allTimeSats += p.amountSats;

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

    // ── Cumulative balance model ───────────────────────────────────────────────
    // Walk through payments chronologically by activatedAt. Between each pair
    // of payments, deduct dailyCost per elapsed day. This makes the funded
    // amount decrease smoothly each day instead of cliff-dropping at 30 days.
    const dailyCostGBP = costs.total / 30;

    const sortedPayments = [...allPayments].sort((a, b) => {
      const aDate = (a.activatedAt ?? a.createdAt).getTime();
      const bDate = (b.activatedAt ?? b.createdAt).getTime();
      return aDate - bDate;
    });

    let fundedBalance = 0;
    let lastPaymentDate: Date | null = null;

    for (const p of sortedPayments) {
      const paymentDate = p.activatedAt ?? p.createdAt;

      // Deduct daily costs accumulated since the previous payment
      if (lastPaymentDate) {
        const daysBetween = Math.max(0,
          (paymentDate.getTime() - lastPaymentDate.getTime()) / (24 * 60 * 60 * 1000));
        fundedBalance = Math.max(0, fundedBalance - daysBetween * dailyCostGBP);
      }

      fundedBalance += p.amountSats / satsPerGbp;
      lastPaymentDate = paymentDate;
    }

    // Deduct costs from the last payment to now
    if (lastPaymentDate) {
      const daysSinceLast = Math.max(0,
        (now.getTime() - lastPaymentDate.getTime()) / (24 * 60 * 60 * 1000));
      fundedBalance = Math.max(0, fundedBalance - daysSinceLast * dailyCostGBP);
    }

    const rolling30dGBP = fundedBalance;
    const coveragePct  = costs.total > 0 ? Math.min(999, Math.round((rolling30dGBP / costs.total) * 100)) : 0;

    // ── Runway calculation ──────────────────────────────────────────────────
    // Total revenue in GBP (all time)
    const allTimeRevenueGBP = allTimeSats / satsPerGbp;
    // First payment date — when the *earliest* payment row was inserted into
    // our DB. We deliberately use createdAt (not activatedAt) so that legacy
    // imports with backdated activation timestamps don't push the project
    // start years into the past and permanently zero the balance.
    const firstPaymentDate = allPayments.length > 0
      ? allPayments[0].createdAt
      : now;
    // Months elapsed since first payment. Do NOT floor this at 1: the runway
    // end date calculation below relies on `now` cancelling out between
    // `now + runwayMonths` and `-monthsElapsed`. A floor makes the end date
    // drift forward by one day per day whenever elapsed < 1 month.
    const msElapsed = Math.max(0, now.getTime() - firstPaymentDate.getTime());
    const monthsElapsed = msElapsed / (1000 * 60 * 60 * 24 * 30.44);
    // Total costs incurred since first payment
    const costsIncurred = monthsElapsed * costs.total;
    // Remaining balance
    const balanceGBP = allTimeRevenueGBP - costsIncurred;
    // Runway: how many months from now the balance covers
    const runwayMonths = costs.total > 0 ? Math.max(0, balanceGBP / costs.total) : 0;
    // Runway end date — moves forward as revenue increases
    const runwayEndDate = new Date(now.getTime() + runwayMonths * 30.44 * 24 * 60 * 60 * 1000);

    // Active member counts
    const [generalCount, membersCount, vipCount] = await Promise.all([
      prisma.user.count({ where: { tier: 'general' } }),
      prisma.user.count({ where: { tier: 'members' } }),
      prisma.user.count({ where: { tier: 'vip' } }),
    ]);

    return NextResponse.json({
      satsPerGbp,
      subscriptionRevenueSats,
      donationRevenueSats,
      totalRevenueSats: allTimeSats,
      totalRevenueGBP:  Math.round(allTimeRevenueGBP * 100) / 100,
      rolling30dRevenueGBP: Math.round(rolling30dGBP * 100) / 100,
      runningCostsGBP:  costs.total,
      costsBreakdown:   costs,
      coveragePct,
      balanceGBP:       Math.round(balanceGBP * 100) / 100,
      runwayMonths:     Math.round(runwayMonths * 10) / 10,
      runwayEndDate:    runwayEndDate.toISOString(),
      memberCount:      generalCount + membersCount + vipCount,
      memberBreakdown:  { general: generalCount, members: membersCount, vip: vipCount },
      breakdown,
    });
  } catch (error) {
    console.error('Funding status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
