import { NextRequest, NextResponse } from 'next/server';
import http from 'node:http';
import { handleNewBriefing } from '@/lib/chat/bot';
import { normaliseThreatState } from '@/lib/room/threatEngine';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Calls the briefing generate endpoint via Node's native http module.
 * Next.js 16 patches global `fetch()` inside route handlers and can
 * upgrade `http://` to `https://` based on the incoming request's
 * protocol headers, causing ERR_SSL_WRONG_VERSION_NUMBER on the
 * loopback. Using `http.request()` bypasses this entirely.
 */
function httpPost(url: string, headers: Record<string, string>): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      { hostname: parsed.hostname, port: parsed.port, path: parsed.pathname, method: 'POST', headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode ?? 500, body: Buffer.concat(chunks).toString() }));
      },
    );
    req.on('error', reject);
    req.setTimeout(110_000, () => { req.destroy(new Error('timeout')); });
    req.end();
  });
}

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
    const port = process.env.PORT ?? '3001';
    const url = `http://localhost:${port}/api/briefing/generate`;
    const headers: Record<string, string> = {
      // Tell the HTTPS redirect middleware this is already "secure" so it
      // doesn't 301 the loopback request. Without this, the middleware sees
      // a plain-HTTP connection and redirects to https://localhost:3001.
      'x-forwarded-proto': 'https',
    };
    if (cronSecret) headers['Authorization'] = `Bearer ${cronSecret}`;

    const res = await httpPost(url, headers);
    const data = JSON.parse(res.body);

    // Auto-post into chat on successful briefing generation
    if (res.status === 200 && data.success && data.headline && data.date) {
      try {
        await handleNewBriefing(data.headline, data.date, normaliseThreatState(data.threatLevel));
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
