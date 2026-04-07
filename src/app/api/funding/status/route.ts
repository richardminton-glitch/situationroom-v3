/**
 * GET /api/funding/status
 *
 * Returns monthly revenue vs running costs breakdown.
 * Uses a rolling 30-day window for current revenue.
 * Costs are computed dynamically from estimated API/AI usage.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getLiveSatsPerGbp } from '@/lib/lnm/rates';

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

// ── AI cost estimate (xAI Grok) ──────────────────────────────────────────────
// Computed from token usage and current xAI pricing (Apr 2026):
//   grok-4.20 (Responses API): $3.00/M in, $15.00/M out + $5/1K web searches
//   grok-4-1-fast:             $0.20/M in, $0.50/M out
//
// Daily Briefing (grok-4.20): 6 calls/day × $0.030/call = $0.18/day
// VIP Briefings (grok-4-1-fast): ~10 calls/day × $0.0005/call = $0.005/day
// RSS Classifier (grok-4-1-fast): ~75 calls/day × $0.0003/call = $0.023/day
// On-demand analysis (8 routes, grok-4-1-fast): ~45 calls/day × ~$0.0005 = $0.023/day
// Threat Analysis (grok-4-1-fast): ~15 calls/day × $0.0003/call = $0.005/day

function estimateAiCostUsd(): number {
  // Per-day cost estimates by feature
  const dailyCosts = {
    briefing: 6 * 0.030,       // grok-4.20 + web search
    vipBriefings: 10 * 0.0005, // grok-4-1-fast, ~5 VIP users × 2 calls
    rssClassifier: 75 * 0.0003,// grok-4-1-fast
    annotation: 10 * 0.0002,
    signalInterpreter: 5 * 0.0009,
    cohortAnalysis: 4 * 0.0006,
    bitcoinArgument: 2 * 0.0007,
    patternHistorian: 3 * 0.0005,
    briefingSearch: 2 * 0.0026,
    briefingRetro: 3 * 0.0007,
    threatAnalysis: 15 * 0.0003,
    onchainAnalysis: 4 * 0.027,  // grok-3, VIP, 6h cache
  };

  const dailyTotal = Object.values(dailyCosts).reduce((s, v) => s + v, 0);
  return dailyTotal * 30; // monthly
}

// ── GBP conversion ───────────────────────────────────────────────────────────
// Uses shared getLiveSatsPerGbp() from @/lib/lnm/rates
// (CoinGecko BTC/GBP, 5-min cache, 5s timeout, fallback to 1,900 sats/GBP)

function computeCosts(usdToGbp: number) {
  const aiUsd = estimateAiCostUsd();
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
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

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
    let rolling30dSats = 0;
    let subscriptionRevenueSats = 0;
    let donationRevenueSats = 0;
    const breakdown = { general: 0, members: 0, vip: 0, donations: 0 };

    for (const p of allPayments) {
      allTimeSats += p.amountSats;

      const isRecent = p.activatedAt && p.activatedAt >= thirtyDaysAgo;

      if (p.tier === 'donation') {
        donationRevenueSats += p.amountSats;
        breakdown.donations += p.amountSats;
      } else {
        subscriptionRevenueSats += p.amountSats;
        if (p.tier in breakdown) {
          breakdown[p.tier as keyof typeof breakdown] += p.amountSats;
        }
      }

      if (isRecent) rolling30dSats += p.amountSats;
    }

    const rolling30dGBP = rolling30dSats / satsPerGbp;
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
    // Months elapsed since first payment (clamped to ≥ 1 so a single-day
    // project doesn't divide by zero or claim infinite runway).
    const msElapsed = now.getTime() - firstPaymentDate.getTime();
    const monthsElapsed = Math.max(1, msElapsed / (1000 * 60 * 60 * 24 * 30.44));
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
