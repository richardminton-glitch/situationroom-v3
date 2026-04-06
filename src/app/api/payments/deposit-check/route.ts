/**
 * GET /api/payments/deposit-check?since=<timestamp>
 *
 * Checks for new deposits on the ops account since a given timestamp.
 * Used by the donation modal to detect LNURL donations.
 * When a new deposit is found, records it as a confirmed donation in the DB
 * so it appears in the funding bar and revenue tracking.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getOpsClient } from '@/lib/lnm/client';
import { prisma } from '@/lib/db';
import { buildDonationMemo } from '@/lib/lnm/payments';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const since = request.nextUrl.searchParams.get('since');
  if (!since) {
    return NextResponse.json({ error: 'Missing since parameter' }, { status: 400 });
  }

  try {
    const ops = getOpsClient();
    const deposits = await ops.getDepositHistory(10);

    // Find deposits settled after the given timestamp
    const sinceDate = new Date(since);
    const newDeposits = deposits.filter((d) => {
      if (!d.settledAt) return false;
      return new Date(d.settledAt) > sinceDate;
    });

    if (newDeposits.length > 0) {
      const latest = newDeposits[0];

      // Record the donation in the DB if not already tracked.
      // Deposits with a SITROOM- memo are invoice-based payments handled by
      // /api/payments/confirm — skip those to avoid double-counting.
      if (!latest.comment?.startsWith('SITROOM-')) {
        const existing = await prisma.subscriptionPayment.findUnique({
          where: { lnmDepositId: latest.id },
        });

        if (!existing) {
          await prisma.subscriptionPayment.create({
            data: {
              userId: user.id,
              tier: 'donation',
              amountSats: latest.amount,
              memo: buildDonationMemo(),
              lnmDepositId: latest.id,
              status: 'confirmed',
              activatedAt: new Date(),
            },
          });
          console.log(`[payments/deposit-check] Recorded LNURL donation: ${latest.amount} sats`);
        }
      }

      return NextResponse.json({
        found: true,
        amount: latest.amount,
        settledAt: latest.settledAt,
      });
    }

    return NextResponse.json({ found: false });
  } catch (err) {
    console.error('[payments/deposit-check]', err);
    return NextResponse.json({ found: false });
  }
}
