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
import { getOpsClient } from '@/lib/lnm/client';
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
    const depositIds = pending.map((p) => p.lnmDepositId).filter(Boolean) as string[];

    // Fetch recent deposit history from LNM
    const history = await lnm.userDepositHistory({ limit: '100' }) as {
      id: string;
      status: string;
      amount: number;
      memo?: string;
    }[];

    const confirmedById = new Map(
      history
        .filter((d) => d.status === 'confirmed')
        .map((d) => [d.id, d]),
    );

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

      // Confirmed — route by memo
      const parsed = parseMemo(deposit.memo ?? payment.memo);

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

    return NextResponse.json({ confirmed, expired, checked: depositIds.length });
  } catch (error) {
    console.error('Payment confirm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
