/**
 * GET /api/pool/deposit-check?since=<timestamp>
 *
 * Checks for new deposits on the bot account since a given timestamp.
 * Used by the pool donate modal to detect LNURL donations.
 * When a new deposit is found, records it as a confirmed pool_donation in the DB.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getBotClient } from '@/lib/lnm/client';
import { prisma } from '@/lib/db';

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
    const bot = getBotClient();
    const deposits = await bot.getDepositHistory(10);

    // Find deposits settled after the given timestamp
    const sinceDate = new Date(since);
    const newDeposits = deposits.filter((d) => {
      if (!d.settledAt) return false;
      return new Date(d.settledAt) > sinceDate;
    });

    if (newDeposits.length > 0) {
      const latest = newDeposits[0];

      // Record the pool donation in the DB if not already tracked
      const existing = await prisma.subscriptionPayment.findUnique({
        where: { lnmDepositId: latest.id },
      });

      if (!existing) {
        await prisma.subscriptionPayment.create({
          data: {
            userId: user.id,
            tier: 'pool_donation',
            amountSats: latest.amount,
            memo: `POOL-DONATE-${Math.floor(Date.now() / 1000)}`,
            lnmDepositId: latest.id,
            status: 'confirmed',
            activatedAt: new Date(),
          },
        });
        console.log(`[pool/deposit-check] Recorded pool donation: ${latest.amount} sats from ${user.email}`);
      }

      return NextResponse.json({
        found: true,
        amount: latest.amount,
        settledAt: latest.settledAt,
      });
    }

    return NextResponse.json({ found: false });
  } catch (err) {
    console.error('[pool/deposit-check]', err);
    return NextResponse.json({ found: false });
  }
}
