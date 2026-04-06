/**
 * GET /api/payments/deposit-check?since=<timestamp>
 *
 * Checks for new deposits on the ops account since a given timestamp.
 * Used by the donation modal to detect LNURL donations.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getOpsClient } from '@/lib/lnm/client';

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
