/**
 * GET /api/cron/trading-cycle
 *
 * Triggers a full AI trading cycle. Called every 4 hours by system crontab:
 * 00:05, 04:05, 08:05, 12:05, 16:05, 20:05 UTC
 *
 * Protected by CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runTradingCycle } from '@/lib/trading/cycle';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;  // AI call + LNM execution can take a while

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await runTradingCycle();
    return NextResponse.json(result);
  } catch (err) {
    console.error('[cron/trading-cycle]', err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 },
    );
  }
}
