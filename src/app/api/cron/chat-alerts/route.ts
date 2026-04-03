/**
 * GET /api/cron/chat-alerts
 * Runs every 5 minutes. Checks threshold events and posts SitRoom AI messages
 * into the Ops Room chat when thresholds are crossed.
 *
 * Checks:
 *  - BTC price ±3% in 1hr (compares latest snapshot to 1hr-old snapshot)
 *  - Conviction score crossing 70/50/30 bands
 *  - Fear & Greed sub-10 (Extreme Fear)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  handleBtcPriceMove,
  handleConvictionBandChange,
  handleFearGreedExtreme,
} from '@/lib/chat/bot';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const events: string[] = [];

  try {
    // ── Latest + ~1hr-ago snapshots ─────────────────────────────────────────
    const [latestSnap, oldSnap] = await Promise.all([
      prisma.dataSnapshot.findFirst({ orderBy: { timestamp: 'desc' } }),
      prisma.dataSnapshot.findFirst({
        where: { timestamp: { lt: new Date(Date.now() - 55 * 60 * 1000) } },
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    if (latestSnap) {
      const latest = JSON.parse(latestSnap.dataJson) as Record<string, number>;

      // BTC price move check (needs old snapshot)
      if (oldSnap) {
        const old = JSON.parse(oldSnap.dataJson) as Record<string, number>;
        if (latest.btcPrice && old.btcPrice) {
          await handleBtcPriceMove(old.btcPrice, latest.btcPrice);
          events.push('btc_price_check');
        }
      }

      // Fear & Greed extreme
      if (latest.fearGreed != null) {
        await handleFearGreedExtreme(latest.fearGreed);
        events.push('fg_check');
      }
    }

    // ── Conviction band check ─────────────────────────────────────────────────
    const [latestConv, prevConv] = await Promise.all([
      prisma.convictionScore.findFirst({ orderBy: { date: 'desc' } }),
      prisma.convictionScore.findFirst({
        where: { date: { lt: new Date(Date.now() - 23 * 60 * 60 * 1000) } },
        orderBy: { date: 'desc' },
      }),
    ]);

    if (latestConv && prevConv) {
      await handleConvictionBandChange(prevConv.compositeScore, latestConv.compositeScore);
      events.push('conviction_check');
    }

  } catch (err) {
    console.error('[chat-alerts]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, events });
}
