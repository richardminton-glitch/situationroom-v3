/**
 * POST /api/payments/invoice
 *
 * Generates a Lightning invoice for a subscription or donation.
 * Requires authentication.
 *
 * Body: { tier: 'general' | 'members' | 'vip' | 'donation', amountSats?: number }
 * Returns: { paymentRequest, depositId, amountSats, expiresAt }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getOpsClient } from '@/lib/lnm/client';
import { buildSubscriptionMemo, buildDonationMemo } from '@/lib/lnm/payments';
import { TIER_PRICES } from '@/lib/auth/tier';
import { prisma } from '@/lib/db';

const DONATION_DEFAULT_SATS = 10_000;
const INVOICE_EXPIRY_MINUTES = 30;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const { tier, amountSats } = await request.json();

    const isDonation = tier === 'donation';
    const isSubscription = ['general', 'members', 'vip'].includes(tier);

    if (!isDonation && !isSubscription) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const sats = isDonation
      ? (amountSats ?? DONATION_DEFAULT_SATS)
      : TIER_PRICES[tier as keyof typeof TIER_PRICES];

    const memo = isSubscription
      ? buildSubscriptionMemo(tier, user.id)
      : buildDonationMemo();

    const lnm = getOpsClient();
    const deposit = await lnm.userDeposit({
      amount: sats,
      unit:   'sat',
      memo,
    }) as { id: string; paymentRequest: string };

    const invoiceExpiresAt = new Date(Date.now() + INVOICE_EXPIRY_MINUTES * 60 * 1000);

    const payment = await prisma.subscriptionPayment.create({
      data: {
        userId:         user.id,
        tier:           isDonation ? 'donation' : tier,
        amountSats:     sats,
        memo,
        lnmDepositId:   deposit.id,
        paymentRequest: deposit.paymentRequest,
        status:         'pending',
      },
    });

    return NextResponse.json({
      paymentRequest: deposit.paymentRequest,
      depositId:      deposit.id,
      paymentId:      payment.id,
      amountSats:     sats,
      expiresAt:      invoiceExpiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Invoice generation error:', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}
