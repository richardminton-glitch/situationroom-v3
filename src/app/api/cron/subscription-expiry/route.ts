/**
 * GET /api/cron/subscription-expiry
 * Daily at 07:00 UTC — warns expiring users + downgrades expired ones.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processExpiredSubscriptions } from '@/lib/lnm/payments';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    await processExpiredSubscriptions();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[subscription-expiry]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
