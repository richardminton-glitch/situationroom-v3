/**
 * GET /api/cron/position-sync
 *
 * Polls LN Markets for externally closed trades (TP/SL hits, liquidations).
 * Called every 60 seconds by system crontab.
 *
 * Protected by CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncPositions } from '@/lib/trading/position-sync';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await syncPositions();
    return NextResponse.json(result);
  } catch (err) {
    console.error('[cron/position-sync]', err);
    return NextResponse.json(
      { synced: 0, errors: [String(err)] },
      { status: 500 },
    );
  }
}
