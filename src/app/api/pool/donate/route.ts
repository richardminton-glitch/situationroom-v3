/**
 * POST /api/pool/donate
 *
 * Generates a Lightning invoice on the BOT account (the trading pool).
 * Requires authentication (any tier — even free users can donate to the pool).
 *
 * Body: { amountSats: number }
 * Returns: { paymentRequest, paymentId, depositId, amountSats, expiresAt }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getBotClient } from '@/lib/lnm/client';
import { prisma } from '@/lib/db';

const MIN_SATS = 100;
const INVOICE_EXPIRY_MINUTES = 30;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const { amountSats } = await request.json();
    const sats = Number(amountSats);

    if (!sats || sats < MIN_SATS) {
      return NextResponse.json({ error: `Minimum ${MIN_SATS} sats` }, { status: 400 });
    }

    const memo = `POOL-DONATE-${user.id}-${Date.now()}`;
    const bot = getBotClient();
    const deposit = await bot.createDeposit(sats, memo);

    const payment = await prisma.subscriptionPayment.create({
      data: {
        userId:         user.id,
        tier:           'pool_donation',
        amountSats:     sats,
        memo,
        lnmDepositId:   deposit.depositId,
        paymentRequest: deposit.paymentRequest,
        status:         'pending',
      },
    });

    return NextResponse.json({
      paymentRequest: deposit.paymentRequest,
      paymentId:      payment.id,
      depositId:      deposit.depositId,
      amountSats:     sats,
      expiresAt:      new Date(Date.now() + INVOICE_EXPIRY_MINUTES * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('[pool/donate] Invoice generation error:', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}
