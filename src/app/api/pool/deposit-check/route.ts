/**
 * GET /api/pool/deposit-check?since=<timestamp>
 *
 * Checks for new deposits on the bot account since a given timestamp.
 * Used by the pool donate modal to detect LNURL donations.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getBotClient } from '@/lib/lnm/client';
import { announcePoolDonation } from '@/lib/chat/announcements';

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

      // Announce in the ops room. Best-effort attribution to the polling
      // user — LNURL deposits carry no donor identity, so we credit the
      // person whose modal saw it (still pseudonymous: chatDisplayName or
      // anon-XXXX). Dedup is keyed to the LNM deposit id so the same
      // deposit can't announce twice across multiple polling sessions.
      const name = user.chatDisplayName?.trim();
      const displayName = name && name.length > 0
        ? name
        : `anon-${user.id.slice(0, 4)}`;
      try {
        await announcePoolDonation(latest.amount, latest.id, displayName);
      } catch (err) {
        console.error('[pool/deposit-check] announcePoolDonation failed:', err);
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
