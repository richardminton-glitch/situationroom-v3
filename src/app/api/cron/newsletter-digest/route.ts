/**
 * GET /api/cron/newsletter-digest
 *
 * Weekly digest — Sunday 06:15 UTC. Replaces the daily briefing on Sundays
 * for every subscriber from the free tier upwards. Registering is consent;
 * no double opt-in. Users can opt out from their Account page.
 *
 * Eligibility:
 *   - newsletterEnabled = true
 *   - any tier (free → vip)
 *   - newsletterLastSent < 12 hours ago (or null) — guards against same-day
 *     re-runs only. The previous 6-day cutoff was too tight: it excluded
 *     anyone whose last send had drifted by even half a day (e.g. a backfill
 *     done Monday afternoon would block the next Sunday morning), and it
 *     permanently excluded daily-opt-in users since their Saturday daily
 *     left a fresh timestamp in the field. 12h covers cron jitter while
 *     still preventing duplicate-fire double sends.
 *
 * Template:
 *   - All tiers currently receive the FreeDigestEmail template. It summarises
 *     the week via the outlook section and the current data snapshot, and
 *     carries the right CTA per reader (upgrade prompt for free; standing
 *     subscriber footer for paid tiers). We can specialise later.
 */

import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/components';
import { prisma } from '@/lib/db';
import { getResend, FROM_ADDRESS, SITE_URL } from '@/lib/newsletter/resend';
import { createNewsletterToken } from '@/lib/newsletter/tokens';
import { FreeDigestEmail, freeDigestSubject } from '@/emails/FreeDigestEmail';
import { getLiveSatsPerGbp, gbpToSats } from '@/lib/lnm/rates';
import { TIER_PRICES_GBP } from '@/lib/auth/tier';
import { normaliseThreatState } from '@/lib/room/threatEngine';

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

  // ── Eligible users — every enabled subscriber, any tier ──────────────────
  // 12-hour cutoff: only blocks users who already received the digest in this
  // same Sunday window. Anything older than 12h gets sent (covers daily-opt-in
  // users whose Saturday daily left a ~24h-old timestamp).
  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: {
      newsletterEnabled: true,
      OR: [
        { newsletterLastSent: null },
        { newsletterLastSent: { lt: cutoff } },
      ],
    },
    select: { id: true, email: true, tier: true },
  });

  if (users.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, failed: 0 });
  }

  // ── Live sats price for upgrade CTA ────────────────────────────────────────
  const satsPerGbp = await getLiveSatsPerGbp();
  const generalSatsPrice = gbpToSats(TIER_PRICES_GBP.general, satsPerGbp).toLocaleString();

  // ── Send loop ─────────────────────────────────────────────────────────────
  const resend = getResend();
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    // Skip placeholder email addresses (NIP-07 sign-ins). The lifecycle
    // helper does the same check for other flows.
    if (!user.email || user.email.startsWith('nostr:') || !user.email.includes('@')) {
      continue;
    }

    const unsubscribeToken = createNewsletterToken(user.id, 'unsubscribe', 90 * 86400);
    const unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;
    const viewInBrowserUrl = `${SITE_URL}/briefing/${briefingDate.toISOString().split('T')[0]}`;

    const emailHtml = await render(
      FreeDigestEmail({
        weekOf,
        threatLevel: normaliseThreatState(briefing.threatLevel),
        outlook: briefing.outlookSection,
        unsubscribeUrl,
        viewInBrowserUrl,
        siteUrl: SITE_URL,
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
        generalSatsPrice,
      })
    );

    let status: 'sent' | 'failed' = 'sent';
    let error: string | undefined;

    try {
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: user.email,
        subject: freeDigestSubject(weekOf, normaliseThreatState(briefing.threatLevel)),
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
          tier: user.tier,
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
