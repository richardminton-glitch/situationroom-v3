/**
 * POST /api/payments/confirm
 *
 * Polls LNMarkets for confirmed deposits and activates tiers.
 * Called by the cron job (CRON_SECRET required).
 *
 * Also runs processExpiredSubscriptions() for renewal checks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOpsClient, getBotClient } from '@/lib/lnm/client';
import { parseMemo, activateTier, recordDonation, processExpiredSubscriptions } from '@/lib/lnm/payments';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    // ── 1. Process expired subscriptions ─────────────────────────────────────
    await processExpiredSubscriptions();

    // ── 2. Check pending payments ─────────────────────────────────────────────
    const pending = await prisma.subscriptionPayment.findMany({
      where: { status: 'pending', lnmDepositId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (pending.length === 0) {
      return NextResponse.json({ confirmed: 0, expired: 0 });
    }

    const lnm = getOpsClient();

    // Pool donations use the bot client; subscriptions use ops client
    const poolPending = pending.filter((p) => p.tier === 'pool_donation');
    const opsPending  = pending.filter((p) => p.tier !== 'pool_donation');

    // Fetch deposit history from both clients as needed
    const opsHistory  = opsPending.length > 0 ? await lnm.getDepositHistory(100) : [];
    const botHistory  = poolPending.length > 0 ? await getBotClient().getDepositHistory(100) : [];

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
        // Mark old pending payments (>2 hours) as expired
        const ageMs = Date.now() - payment.createdAt.getTime();
        if (ageMs > 2 * 60 * 60 * 1000) {
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
        await activateTier(parsed.userId, parsed.tier, payment.id);
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

    return NextResponse.json({ confirmed, expired, checked: pending.length });
  } catch (error) {
    console.error('Payment confirm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
