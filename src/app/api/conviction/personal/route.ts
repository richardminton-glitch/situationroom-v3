import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasAccess, isAdmin } from '@/lib/auth/tier';
import { prisma } from '@/lib/db';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';

function scoreLabel(score: number): string {
  if (score >= 75) return 'STRONG CONVICTION';
  if (score >= 60) return 'MODERATE CONVICTION';
  if (score >= 45) return 'NEUTRAL';
  if (score >= 30) return 'LOW CONVICTION';
  return 'WEAK SIGNAL';
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userTier = (session.user.tier as Tier) ?? 'free';
  if (!isAdmin(session.user.email) && !hasAccess(userTier, 'vip')) return NextResponse.json({ error: 'VIP required' }, { status: 403 });

  const [latestConviction, latestSnapshot] = await Promise.all([
    prisma.convictionScore.findFirst({ orderBy: { date: 'desc' } }),
    prisma.dataSnapshot.findFirst({ orderBy: { timestamp: 'desc' } }),
  ]);

  if (!latestConviction) return NextResponse.json({ error: 'No conviction data' }, { status: 404 });

  const siteScore = Math.round(latestConviction.compositeScore);
  const user = session.user as { portfolioCostBasis?: number | null; portfolioHoldingsBtc?: number | null };
  const costBasis = user.portfolioCostBasis ?? null;
  const holdings = user.portfolioHoldingsBtc ?? null;

  let currentPrice = 0;
  try {
    if (latestSnapshot) {
      const snap = JSON.parse(latestSnapshot.dataJson) as { btcPrice?: number };
      currentPrice = snap.btcPrice ?? 0;
    }
  } catch {}

  let personalScore = siteScore;
  let profitPct: number | null = null;
  let positionStatus: 'in_profit' | 'underwater' | 'no_data' = 'no_data';

  if (costBasis && costBasis > 0 && holdings && holdings > 0 && currentPrice > 0) {
    profitPct = ((currentPrice - costBasis) / costBasis) * 100;
    if (profitPct > 20) {
      positionStatus = 'in_profit';
      personalScore = Math.max(0, siteScore - Math.min(5, Math.floor(profitPct / 20)));
    } else if (profitPct < -20) {
      positionStatus = 'underwater';
      personalScore = Math.min(100, siteScore + Math.min(5, Math.floor(Math.abs(profitPct) / 20)));
    } else {
      positionStatus = profitPct >= 0 ? 'in_profit' : 'underwater';
    }
  }

  return NextResponse.json({
    siteScore,
    personalScore,
    siteLabel: scoreLabel(siteScore),
    personalLabel: scoreLabel(personalScore),
    positionStatus,
    profitPct: profitPct !== null ? Math.round(profitPct * 10) / 10 : null,
    currentPrice,
    costBasis,
    holdings,
  });
}
