import { NextRequest, NextResponse } from 'next/server';
import { handleNewBriefing } from '@/lib/chat/bot';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/cron/daily-briefing
 * Thin wrapper that triggers briefing generation.
 * Called by system crontab or external scheduler at 06:00 UTC.
 * Delegates to /api/briefing/generate with the cron secret.
 * On success, posts a SitRoom AI auto-message into the Ops Room chat.
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
    const baseUrl = request.nextUrl.origin;
    const res = await fetch(`${baseUrl}/api/briefing/generate`, {
      method: 'POST',
      headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
    });

    const data = await res.json();

    // Auto-post into chat on successful briefing generation
    if (res.ok && data.success && data.headline && data.date) {
      try {
        await handleNewBriefing(data.headline, data.date, data.threatLevel ?? 'UNKNOWN');
      } catch (botErr) {
        console.warn('[daily-briefing] Bot post failed (non-fatal):', botErr);
      }
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Cron] Daily briefing trigger failed:', error);
    return NextResponse.json({ error: 'Trigger failed' }, { status: 500 });
  }
}
