/**
 * POST /api/payments/invoice
 *
 * Generates a Lightning invoice for a subscription, trial, or donation.
 * Requires authentication.
 *
 * Body: { tier: 'general' | 'members' | 'vip' | 'trial' | 'donation', targetTier?: string, amountSats?: number }
 * Returns: { paymentRequest, depositId, amountSats, expiresAt }
 *
 * Subscription prices are defined in GBP and converted to sats at live BTC/GBP rate.
 * Trial is a flat 2,100 sats for 7 days at the next tier up.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getOpsClient } from '@/lib/lnm/client';
import { buildSubscriptionMemo, buildTrialMemo, buildDonationMemo } from '@/lib/lnm/payments';
import { TIER_PRICES_GBP, TRIAL_SATS } from '@/lib/auth/tier';
import { getLiveSatsPerGbp, gbpToSats } from '@/lib/lnm/rates';
import { prisma } from '@/lib/db';

const DONATION_DEFAULT_SATS = 10_000;
const INVOICE_EXPIRY_MINUTES = 30;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const { tier, targetTier, amountSats } = await request.json();

    const isDonation = tier === 'donation';
    const isTrial = tier === 'trial';
    const isSubscription = ['general', 'members', 'vip'].includes(tier);

    if (!isDonation && !isTrial && !isSubscription) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Resolve the target tier for trials
    const trialTarget = isTrial ? (targetTier || 'general') : undefined;
    if (isTrial && !['general', 'members', 'vip'].includes(trialTarget!)) {
      return NextResponse.json({ error: 'Invalid trial target tier' }, { status: 400 });
    }

    // Calculate sats amount
    let sats: number;
    if (isDonation) {
      sats = amountSats ?? DONATION_DEFAULT_SATS;
    } else if (isTrial) {
      sats = TRIAL_SATS;
    } else {
      // Subscription: convert GBP price to sats at live rate
      const satsPerGbp = await getLiveSatsPerGbp();
      const gbpPrice = TIER_PRICES_GBP[tier as keyof typeof TIER_PRICES_GBP];
      sats = gbpToSats(gbpPrice, satsPerGbp);
    }

    // Build the memo
    let memo: string;
    let dbTier: string;
    if (isDonation) {
      memo = buildDonationMemo();
      dbTier = 'donation';
    } else if (isTrial) {
      memo = buildTrialMemo(trialTarget as 'general' | 'members' | 'vip', user.id);
      dbTier = 'trial';
    } else {
      memo = buildSubscriptionMemo(tier, user.id);
      dbTier = tier;
    }

    const lnm = getOpsClient();
    const deposit = await lnm.createDeposit(sats, memo);

    const invoiceExpiresAt = new Date(Date.now() + INVOICE_EXPIRY_MINUTES * 60 * 1000);

    const payment = await prisma.subscriptionPayment.create({
      data: {
        userId:         user.id,
        tier:           dbTier,
        amountSats:     sats,
        memo,
        lnmDepositId:   deposit.depositId,
        paymentRequest: deposit.paymentRequest,
        status:         'pending',
      },
    });

    return NextResponse.json({
      paymentRequest: deposit.paymentRequest,
      depositId:      deposit.depositId,
      paymentId:      payment.id,
      amountSats:     sats,
      expiresAt:      invoiceExpiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Invoice generation error:', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}
