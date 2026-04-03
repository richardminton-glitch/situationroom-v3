/**
 * GET /api/cron/check-alerts
 * Runs every 5 minutes. Evaluates active user alerts against current data.
 *
 * For each triggered alert:
 *   - Nostr DM if user has nostrNpub (stub — log for now)
 *   - Email via Resend if user has email
 *   - Updates lastFiredAt, deduplicates within 24hr window
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getResend, FROM_ADDRESS, SITE_URL } from '@/lib/newsletter/resend';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface AlertRow {
  id: string;
  userId: string;
  triggerType: string;
  condition: string;
  threshold: number | null;
  label: string;
}

interface UserRow {
  id: string;
  email: string;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Get current data
  const [latestConviction, latestSnapshot] = await Promise.all([
    prisma.convictionScore.findFirst({ orderBy: { date: 'desc' } }),
    prisma.dataSnapshot.findFirst({ orderBy: { timestamp: 'desc' } }),
  ]);

  let btcPrice = 0;
  let fearGreed = 0;
  try {
    if (latestSnapshot) {
      const snap = JSON.parse(latestSnapshot.dataJson) as { btcPrice?: number; fearGreed?: number };
      btcPrice = snap.btcPrice ?? 0;
      fearGreed = snap.fearGreed ?? 0;
    }
  } catch { /* malformed snapshot — continue with zeros */ }

  const convictionScore = latestConviction?.compositeScore ?? 0;

  // Get all active alerts where lastFiredAt is null or > 24hr ago
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const alerts: AlertRow[] = await (prisma as any).userAlert.findMany({
    where: {
      isActive: true,
      OR: [{ lastFiredAt: null }, { lastFiredAt: { lt: twentyFourHoursAgo } }],
    },
  });

  // Get user emails for alerts in bulk
  const userIds = [...new Set(alerts.map((a) => a.userId))];
  const users: UserRow[] = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true },
  });
  const userMap: Record<string, UserRow> = Object.fromEntries(users.map((u) => [u.id, u]));

  const resend = getResend();
  const fired: string[] = [];
  const errors: string[] = [];

  for (const alert of alerts) {
    let shouldFire = false;
    let alertMessage = '';

    switch (alert.triggerType) {
      case 'conviction':
        if (alert.condition === 'above' && alert.threshold != null && convictionScore > alert.threshold) {
          shouldFire = true;
          alertMessage = `Conviction score is ${Math.round(convictionScore)}/100 — above your threshold of ${alert.threshold}`;
        } else if (alert.condition === 'below' && alert.threshold != null && convictionScore < alert.threshold) {
          shouldFire = true;
          alertMessage = `Conviction score is ${Math.round(convictionScore)}/100 — below your threshold of ${alert.threshold}`;
        }
        break;

      case 'btc_price':
        if (alert.condition === 'above' && alert.threshold != null && btcPrice > alert.threshold) {
          shouldFire = true;
          alertMessage = `BTC is $${btcPrice.toLocaleString()} — above your target of $${alert.threshold.toLocaleString()}`;
        } else if (alert.condition === 'below' && alert.threshold != null && btcPrice < alert.threshold) {
          shouldFire = true;
          alertMessage = `BTC is $${btcPrice.toLocaleString()} — below your target of $${alert.threshold.toLocaleString()}`;
        }
        break;

      case 'fear_greed':
        if (alert.condition === 'below' && alert.threshold != null && fearGreed < alert.threshold) {
          shouldFire = true;
          alertMessage = `Fear & Greed is ${fearGreed} — below your threshold of ${alert.threshold}`;
        } else if (alert.condition === 'above' && alert.threshold != null && fearGreed > alert.threshold) {
          shouldFire = true;
          alertMessage = `Fear & Greed is ${fearGreed} — above your threshold of ${alert.threshold}`;
        }
        break;

      case 'new_briefing':
        // Handled by daily-briefing cron — skip here
        break;
    }

    if (!shouldFire) continue;

    const user = userMap[alert.userId];
    if (!user) continue;

    // Send email notification
    try {
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: user.email,
        subject: `Situation Room Alert: ${alert.label || alertMessage.slice(0, 50)}`,
        html: `
          <div style="font-family: 'Courier New', monospace; background: #f5f0e8; padding: 24px; max-width: 500px;">
            <p style="font-size: 10px; color: #8b7355; letter-spacing: 0.18em; margin: 0 0 8px;">SITUATION ROOM · ALERT</p>
            <p style="font-size: 14px; color: #2c2416; margin: 0 0 16px;">${alertMessage}</p>
            ${alert.label ? `<p style="font-size: 11px; color: #8b7355; margin: 0 0 16px;">Alert: "${alert.label}"</p>` : ''}
            <a href="${SITE_URL}" style="font-size: 11px; color: #8b6914;">View dashboard &rarr;</a>
          </div>
        `,
      });
      await (prisma as any).userAlert.update({
        where: { id: alert.id },
        data: { lastFiredAt: new Date() },
      });
      fired.push(alert.id);
    } catch (err) {
      errors.push(`${alert.id}: ${String(err)}`);
    }
  }

  return NextResponse.json({ ok: true, checked: alerts.length, fired: fired.length, errors });
}
