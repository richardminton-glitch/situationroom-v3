/**
 * GET /api/funding/status
 *
 * Returns monthly revenue vs running costs breakdown.
 * Queries subscription_payments for current calendar month.
 * Costs are computed dynamically from estimated API/AI usage.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
// USD/GBP rough rate — updated periodically
const USD_TO_GBP = 0.79;
const SATS_PER_GBP = 120_000;

function computeCosts() {
  const aiUsd = estimateAiCostUsd();
  const aiGbp = Math.round(aiUsd * USD_TO_GBP);
  const apiNinjasGbp = Math.round(API_NINJAS_USD * USD_TO_GBP);
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
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const costs = computeCosts();

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
    const coveragePct      = Math.min(100, Math.round((totalRevenueGBP / costs.total) * 100));

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
      runningCostsGBP:  costs.total,
      costsBreakdown:   costs,
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
