/**
 * POST /api/admin/send-dca-draft
 *
 * Sends draft versions of both the member-tier DCA Signal email and the
 * VIP DCA In/Out Signal email to the admin, using live signal data.
 *
 * Auth: admin session OR x-cron-secret header.
 * Body: { destination?: string }  (defaults to admin email)
 */

import { NextRequest, NextResponse } from 'next/server';
import { render }           from '@react-email/components';
import { getCurrentUser }   from '@/lib/auth/session';
import { prisma }           from '@/lib/db';
import { isAdmin }          from '@/lib/auth/tier';
import { getResend, FROM_ADDRESS, SITE_URL } from '@/lib/newsletter/resend';
import { fetchCoinGeckoHistory } from '@/lib/data/coingecko-history';
import { fetchPuellSeries }      from '@/lib/data/puell-series';
import { computeMA200w, computeComposite } from '@/lib/signals/dca-engine';
import {
  computeBacktestSummary,
  computeStackingHistory,
  computeDistributionHistory,
} from '@/lib/data/daily-snapshot';
import { DCA_CROSSOVER, compositeToExitTier, compositeToExcessRate, compositeToSellMult } from '@/lib/signals/dca-exit-utils';
import { DcaSignalEmail,  dcaSignalEmailSubject  } from '@/emails/DcaSignalEmail';
import { DcaVipEmail,     dcaVipEmailSubject      } from '@/emails/DcaVipEmail';
import type { BtcSignalResponse } from '@/app/api/btc-signal/route';

export const dynamic    = 'force-dynamic';
export const maxDuration = 120;

async function getSignalData(): Promise<BtcSignalResponse> {
  // 1. Try DB cache first (avoids external API calls)
  try {
    const row = await prisma.dataCache.findUnique({ where: { key: 'dca-signal-daily' } });
    if (row && row.expiresAt > new Date()) {
      return JSON.parse(row.data) as BtcSignalResponse;
    }
  } catch { /* fall through */ }

  // 2. Compute live
  const [prices, puell] = await Promise.all([
    fetchCoinGeckoHistory(),
    fetchPuellSeries(),
  ]);
  const ma200wPoints    = computeMA200w(prices);
  const compositeRows   = computeComposite(ma200wPoints, puell.values, puell.dates);
  const latest          = compositeRows[compositeRows.length - 1];
  const chartData       = compositeRows.slice(-365);
  const backtestSummary = computeBacktestSummary(compositeRows, latest.price);
  const stackingHistory = computeStackingHistory(compositeRows);
  const distributionHistory = computeDistributionHistory(compositeRows, stackingHistory);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { compositeToTier } = await import('@/lib/signals/dca-engine') as any;

  return {
    composite:       latest.normalisedComposite,
    tier:            compositeToTier(latest.normalisedComposite),
    maRatio:         latest.maRatio,
    maMult:          latest.maMult,
    puellValue:      latest.puellValue,
    puellMult:       latest.puellMult,
    btcPrice:        latest.price,
    timestamp:       new Date().toISOString(),
    chartData,
    backtestSummary,
    stackingHistory,
    distributionHistory,
  };
}

export async function POST(request: NextRequest) {
  // Auth
  const cronSecret  = request.headers.get('x-cron-secret');
  const isCronAuth  = cronSecret && cronSecret === process.env.CRON_SECRET;

  let authedEmail: string | null = null;
  if (!isCronAuth) {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || !isAdmin(sessionUser.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    authedEmail = sessionUser.email;
  }

  let body: { destination?: string; baseAmount?: number };
  try { body = await request.json(); } catch { body = {}; }

  const destination = body.destination ?? authedEmail ?? 'richardminton@gmail.com';
  const baseAmount  = typeof body.baseAmount === 'number' && body.baseAmount > 0
    ? body.baseAmount : 100;

  // Fetch live signal data
  let signal: BtcSignalResponse;
  try {
    signal = await getSignalData();
  } catch (err) {
    console.error('[send-dca-draft] failed to get signal data:', err);
    return NextResponse.json({ error: 'Could not load signal data' }, { status: 503 });
  }

  const {
    composite, tier, maRatio, maMult, puellValue, puellMult,
    btcPrice, backtestSummary, stackingHistory = [], distributionHistory = [],
  } = signal;

  const dateLabel = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });

  const inExitZone    = composite < DCA_CROSSOVER;
  const exitTierLabel = compositeToExitTier(composite);
  const exitRate      = compositeToExcessRate(composite);
  const sellMult      = compositeToSellMult(composite);

  // VIP: compute excess BTC held (at $100/week base)
  const latestStack = stackingHistory.at(-1) ?? null;
  const latestDist  = distributionHistory.at(-1) ?? null;
  const excessBtcHeld = latestStack && latestDist
    ? Math.max(0, latestStack.btcSignal - latestStack.btcVanilla - latestDist.btcSignal)
    : 0;
  const buyScale          = baseAmount / 100;
  const excessScaled      = excessBtcHeld * buyScale;
  const recommendedSellBtc = excessScaled * exitRate;
  const recommendedSell   = recommendedSellBtc * btcPrice;
  const recommendedBuy    = Math.round(baseAmount * composite);

  const dummyUnsub = `${SITE_URL}/api/dca-signal-unsubscribe?token=draft-preview`;
  const results: { template: string; status: 'sent' | 'failed'; error?: string }[] = [];

  // ── Member tier email ──────────────────────────────────────────────────────
  try {
    const html = await render(
      DcaSignalEmail({
        email: destination,
        frequency: 'weekly',
        baseAmount,
        composite,
        tier,
        maRatio,
        maMult,
        puellValue,
        puellMult,
        btcPrice,
        dateLabel,
        backtestSummary,
        siteUrl:  SITE_URL,
        unsubUrl: dummyUnsub,
      })
    );
    await getResend().emails.send({
      from:    FROM_ADDRESS,
      to:      destination,
      subject: `[DRAFT] ${dcaSignalEmailSubject(composite, tier, dateLabel)}`,
      html,
    });
    results.push({ template: 'DCA Signal (member)', status: 'sent' });
  } catch (err) {
    results.push({ template: 'DCA Signal (member)', status: 'failed', error: String(err) });
  }

  // ── VIP email ──────────────────────────────────────────────────────────────
  try {
    const html = await render(
      DcaVipEmail({
        email: destination,
        frequency: 'weekly',
        baseAmount,
        composite,
        tier,
        maRatio,
        maMult,
        puellValue,
        puellMult,
        btcPrice,
        dateLabel,
        inExitZone,
        exitTierLabel,
        recommendedBuy,
        recommendedSell,
        recommendedSellBtc,
        excessBtcHeld: excessScaled,
        exitRatePct: exitRate * 100,
        backtestSummary,
        siteUrl:  SITE_URL,
        unsubUrl: dummyUnsub,
      })
    );
    await getResend().emails.send({
      from:    FROM_ADDRESS,
      to:      destination,
      subject: `[DRAFT] ${dcaVipEmailSubject(composite, inExitZone, dateLabel)}`,
      html,
    });
    results.push({ template: 'DCA Signal VIP', status: 'sent' });
  } catch (err) {
    results.push({ template: 'DCA Signal VIP', status: 'failed', error: String(err) });
  }

  void sellMult; // used implicitly via compositeToSellMult in dca-exit-utils — suppress lint

  return NextResponse.json({
    destination,
    composite: composite.toFixed(3),
    inExitZone,
    results,
  });
}
