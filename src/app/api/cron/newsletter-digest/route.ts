/**
 * GET /api/cron/newsletter-digest
 *
 * Free tier weekly digest — runs Sunday 18:00 UTC via cron.
 *
 * Logic:
 *  1. Verify CRON_SECRET (Authorization: Bearer [secret])
 *  2. Query free-tier users with:
 *       newsletterEnabled=true, newsletterConfirmedAt NOT NULL,
 *       tier='free', newsletterDay=0 (Sunday)
 *       AND (newsletterLastSent is null OR newsletterLastSent < 6 days ago)
 *  3. Pull most recent Briefing from DB
 *  4. Build email from FreeDigestEmail template
 *  5. Send via Resend
 *  6. Update newsletterLastSent, log to newsletter_sends
 *
 * Error handling: log failures, do not retry, do not surface to user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/components';
import { prisma } from '@/lib/db';
import { getResend, FROM_ADDRESS, SITE_URL } from '@/lib/newsletter/resend';
import { createNewsletterToken } from '@/lib/newsletter/tokens';
import { FreeDigestEmail, freeDigestSubject } from '@/emails/FreeDigestEmail';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min — batch sends can be slow

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function convictionLabel(score: number): string {
  if (score >= 80) return 'EXTREME CONVICTION';
  if (score >= 65) return 'HIGH CONVICTION';
  if (score >= 50) return 'MODERATE CONVICTION';
  if (score >= 35) return 'LOW CONVICTION';
  return 'VERY LOW CONVICTION';
}

/** Parse a data snapshot JSON field safely. */
function snap(json: string, key: string, fallback = '—'): string {
  try {
    const data = JSON.parse(json);
    const val = data[key];
    if (val == null) return fallback;
    if (typeof val === 'number') {
      if (key.includes('change') || key.includes('Change')) {
        return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
      }
      if (key === 'btcPrice' || key === 'sp500' || key === 'gold') {
        return `$${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      }
      return String(val);
    }
    return String(val);
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // ── Latest briefing ───────────────────────────────────────────────────────
  const briefing = await prisma.briefing.findFirst({ orderBy: { date: 'desc' } });
  if (!briefing) {
    return NextResponse.json({ skipped: true, reason: 'No briefing available' });
  }

  const briefingDate = briefing.date;
  const weekOf = formatDate(briefingDate);
  const score = Math.round(briefing.convictionScore);
  const label = convictionLabel(score);
  const ds = briefing.dataSnapshotJson;

  // ── Eligible users ────────────────────────────────────────────────────────
  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: {
      newsletterEnabled: true,
      newsletterConfirmedAt: { not: null },
      tier: 'free',
      newsletterDay: 0, // Sunday
      OR: [
        { newsletterLastSent: null },
        { newsletterLastSent: { lt: sixDaysAgo } },
      ],
    },
    select: { id: true, email: true },
  });

  if (users.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, failed: 0 });
  }

  // ── Send loop ─────────────────────────────────────────────────────────────
  const resend = getResend();
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    const unsubscribeToken = createNewsletterToken(user.id, 'unsubscribe', 90 * 86400);
    const unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;
    const viewInBrowserUrl = `${SITE_URL}/briefing/${briefingDate.toISOString().split('T')[0]}`;

    const emailHtml = await render(
      FreeDigestEmail({
        weekOf,
        threatLevel: briefing.threatLevel,
        outlook: briefing.outlookSection,
        unsubscribeUrl,
        viewInBrowserUrl,
        btcPrice:    snap(ds, 'btcPrice'),
        btcChange24h: snap(ds, 'btcChange24h'),
        fearGreed:   snap(ds, 'fearGreed', '—'),
        hashrate:    snap(ds, 'hashrate', '—'),
        mvrv:        snap(ds, 'mvrv', '—'),
        blockHeight: snap(ds, 'blockHeight', '—'),
        sp500:       snap(ds, 'sp500', '—'),
        vix:         snap(ds, 'vix', '—'),
        gold:        snap(ds, 'gold', '—'),
        dxy:         snap(ds, 'dxy', '—'),
        us10y:       snap(ds, 'us10y', '—'),
        oil:         snap(ds, 'oil', '—'),
        convictionScore: score,
        convictionLabel: label,
      })
    );

    let status: 'sent' | 'failed' = 'sent';
    let error: string | undefined;

    try {
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: user.email,
        subject: freeDigestSubject(weekOf, briefing.threatLevel),
        html: emailHtml,
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { newsletterLastSent: new Date() },
      });

      sent++;
    } catch (err) {
      status = 'failed';
      error = String(err);
      failed++;
      console.error(`[newsletter-digest] Failed to send to ${user.id}:`, err);
    }

    // Log the send attempt
    try {
      await (prisma as any).newsletterSend.create({
        data: {
          userId: user.id,
          briefingDate,
          tier: 'free',
          status,
          error: error ?? null,
          sentAt: new Date(),
        },
      });
    } catch (logErr) {
      console.error('[newsletter-digest] Failed to log send:', logErr);
    }
  }

  return NextResponse.json({ sent, failed, skipped: 0, total: users.length });
}
