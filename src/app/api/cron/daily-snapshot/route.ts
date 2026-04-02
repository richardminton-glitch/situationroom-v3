import { NextRequest, NextResponse } from 'next/server';
import { recordDailySnapshot } from '@/lib/data/daily-snapshot';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/daily-snapshot
 * Records all current data to daily_* tables.
 * Called at midnight UTC + 5 minutes via cron.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    await recordDailySnapshot();
    return NextResponse.json({ success: true, date: new Date().toISOString().split('T')[0] });
  } catch (error) {
    console.error('[Cron] Daily snapshot failed:', error);
    return NextResponse.json({ error: 'Snapshot failed' }, { status: 500 });
  }
}
