/**
 * GET /api/payments/status/[paymentId]
 *
 * Client-side poll during the QR-code payment flow. Returns the current
 * payment status. When the payment is still `pending`, this endpoint
 * actively checks LNMarkets for settlement so the user's browser detects
 * the payment within seconds of paying — without waiting for the 5-minute
 * cron. The cron at /api/payments/confirm is now the BACKUP path; the
 * user's own poll is the PRIMARY path.
 *
 * If the LNM check fails (API down, 403, timeout), the endpoint falls
 * back to returning the current DB status. The user's next poll or the
 * cron will pick it up later.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { getOpsClient, getBotClient } from '@/lib/lnm/client';
import { parseMemo, activateTier, recordDonation } from '@/lib/lnm/payments';
import { TIER_BILLING } from '@/lib/auth/tier';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { paymentId } = await params;

  const payment = await prisma.subscriptionPayment.findFirst({
    where: { id: paymentId, userId: user.id },
  });

  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // ── Fast path: already confirmed or expired ────────────────────────────
  if (payment.status !== 'pending') {
    return NextResponse.json({
      status:      payment.status,
      tier:        payment.tier,
      activatedAt: payment.activatedAt?.toISOString() ?? null,
    });
  }

  // ── Active check: payment still pending — query LNM directly ──────────
  if (payment.lnmDepositId) {
    try {
      const isPool = payment.tier === 'pool_donation';
      const client = isPool ? getBotClient() : getOpsClient();
      const deposits = await client.getDepositHistory(20);
      const deposit = deposits.find(
        (d) => d.id === payment.lnmDepositId && d.settledAt != null
      );

      if (deposit) {
        // Deposit settled — run the same activation logic as the cron.
        if (isPool) {
          await prisma.subscriptionPayment.update({
            where: { id: payment.id },
            data:  { status: 'confirmed', activatedAt: new Date() },
          });
        } else {
          const parsed = parseMemo(deposit.comment ?? payment.memo);

          if (parsed.type === 'subscription' && parsed.tier && parsed.userId) {
            const billing = TIER_BILLING[parsed.tier as keyof typeof TIER_BILLING] ?? 'monthly';
            await activateTier(parsed.userId, parsed.tier, payment.id, { duration: billing });
          } else if (parsed.type === 'trial' && parsed.tier && parsed.userId) {
            await activateTier(parsed.userId, parsed.tier, payment.id, { duration: 'trial' });
          } else if (parsed.type === 'donation') {
            await recordDonation(payment.amountSats, payment.id);
          } else {
            // Unknown memo — mark confirmed without tier activation
            await prisma.subscriptionPayment.update({
              where: { id: payment.id },
              data:  { status: 'confirmed', activatedAt: new Date() },
            });
          }
        }

        // Re-read to return the freshly-confirmed state
        const updated = await prisma.subscriptionPayment.findUnique({
          where: { id: payment.id },
          select: { status: true, tier: true, activatedAt: true },
        });

        return NextResponse.json({
          status:      updated?.status ?? 'confirmed',
          tier:        updated?.tier ?? payment.tier,
          activatedAt: updated?.activatedAt?.toISOString() ?? new Date().toISOString(),
        });
      }
    } catch (err) {
      // LNM unavailable — fall through to return current DB status.
      // The user's next poll or the cron will catch it.
      console.warn('[payments/status] LNM check failed (non-fatal):', (err as Error).message);
    }
  }

  // ── Still pending (LNM check found nothing or was skipped) ─────────────
  return NextResponse.json({
    status:      payment.status,
    tier:        payment.tier,
    activatedAt: payment.activatedAt?.toISOString() ?? null,
  });
}
