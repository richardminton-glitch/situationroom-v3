/**
 * POST /api/payments/confirm
 *
 * Polls LNMarkets for confirmed deposits and activates tiers.
 * Called by the cron job every 5 minutes (CRON_SECRET required).
 *
 * Also runs processExpiredSubscriptions() for renewal checks.
 *
 * Robustness guarantees (added after a VIP payment was lost during an
 * LNM API outage):
 *
 *   1. Ops and bot deposit histories are fetched independently — one
 *      client failing doesn't block the other.
 *   2. If BOTH LNM clients fail, the expiry loop is skipped entirely.
 *      Payments stay `pending` until LNM recovers. No deposits are
 *      auto-expired when we can't verify settlement state.
 *   3. Expiry timeout increased from 2 hours → 24 hours — outlasts
 *      any reasonable API outage.
 *   4. The user's browser now actively checks LNM in the /status/
 *      [paymentId] poll endpoint too, so cron is the BACKUP path.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOpsClient, getBotClient } from '@/lib/lnm/client';
import { parseMemo, activateTier, recordDonation, processExpiredSubscriptions } from '@/lib/lnm/payments';
import { TIER_BILLING } from '@/lib/auth/tier';

export const dynamic = 'force-dynamic';

const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours (was 2 hours — too aggressive)

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    // ── 1. Process expired subscriptions ─────────────────────────────────
    await processExpiredSubscriptions();

    // ── 2. Check pending payments ────────────────────────────────────────
    const pending = await prisma.subscriptionPayment.findMany({
      where: { status: 'pending', lnmDepositId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (pending.length === 0) {
      return NextResponse.json({ confirmed: 0, expired: 0 });
    }

    // Pool donations use the bot client; subscriptions use ops client
    const poolPending = pending.filter((p) => p.tier === 'pool_donation');
    const opsPending  = pending.filter((p) => p.tier !== 'pool_donation');

    // ── 3. Fetch deposit histories — each in its own try/catch ──────────
    //    One client's API failure must not block the other or prevent
    //    the route from returning useful results.
    type LnmDeposit = { id: string; amount: number; settledAt: string | null; comment: string; createdAt: string };
    let opsHistory: LnmDeposit[] = [];
    let botHistory: LnmDeposit[] = [];
    let opsOk = false;
    let botOk = false;

    if (opsPending.length > 0) {
      try {
        opsHistory = await getOpsClient().getDepositHistory(100);
        opsOk = true;
      } catch (err) {
        console.error('[confirm] ops deposit fetch failed:', (err as Error).message);
      }
    } else {
      opsOk = true; // nothing to check — treat as "available"
    }

    if (poolPending.length > 0) {
      try {
        botHistory = await getBotClient().getDepositHistory(100);
        botOk = true;
      } catch (err) {
        console.error('[confirm] bot deposit fetch failed:', (err as Error).message);
      }
    } else {
      botOk = true;
    }

    // v3: settled deposits have a non-null settledAt field
    const confirmedById = new Map([
      ...opsHistory.filter((d) => d.settledAt != null).map((d) => [d.id, d] as const),
      ...botHistory.filter((d) => d.settledAt != null).map((d) => [d.id, d] as const),
    ]);

    let confirmed = 0;
    let expired   = 0;

    for (const payment of pending) {
      if (!payment.lnmDepositId) continue;

      const deposit = confirmedById.get(payment.lnmDepositId);
      if (!deposit) {
        // ── Expiry check ────────────────────────────────────────────────
        // Only expire if the RELEVANT LNM client was reachable this tick.
        // If it wasn't, we can't know whether the deposit is settled —
        // leave it pending until the next tick when the client is back.
        const clientAvailable = payment.tier === 'pool_donation' ? botOk : opsOk;
        const ageMs = Date.now() - payment.createdAt.getTime();

        if (clientAvailable && ageMs > EXPIRY_MS) {
          await prisma.subscriptionPayment.update({
            where: { id: payment.id },
            data:  { status: 'expired' },
          });
          expired++;
        }
        continue;
      }

      // Pool donations — just mark confirmed (funds go directly to trading pool)
      if (payment.tier === 'pool_donation') {
        await prisma.subscriptionPayment.update({
          where: { id: payment.id },
          data:  { status: 'confirmed', activatedAt: new Date() },
        });
        confirmed++;
        continue;
      }

      // Confirmed — route by memo (v3 uses 'comment' field)
      const parsed = parseMemo(deposit.comment ?? payment.memo);

      if (parsed.type === 'subscription' && parsed.tier && parsed.userId) {
        const billing = TIER_BILLING[parsed.tier as keyof typeof TIER_BILLING] ?? 'monthly';
        await activateTier(parsed.userId, parsed.tier, payment.id, { duration: billing });
        confirmed++;
      } else if (parsed.type === 'trial' && parsed.tier && parsed.userId) {
        await activateTier(parsed.userId, parsed.tier, payment.id, { duration: 'trial' });
        confirmed++;
      } else if (parsed.type === 'donation') {
        await recordDonation(payment.amountSats, payment.id);
        confirmed++;
      } else {
        // Unknown memo — mark confirmed without tier activation
        await prisma.subscriptionPayment.update({
          where: { id: payment.id },
          data:  { status: 'confirmed', activatedAt: new Date() },
        });
        confirmed++;
      }
    }

    return NextResponse.json({
      confirmed,
      expired,
      checked: pending.length,
      lnm: { opsOk, botOk },
    });
  } catch (error) {
    console.error('Payment confirm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
