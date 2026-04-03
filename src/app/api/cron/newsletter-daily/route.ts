/**
 * GET /api/cron/newsletter-daily
 * Daily at 06:15 UTC — sends briefing emails to General and Members subscribers.
 *
 * Eligibility:
 *   - newsletterEnabled = true
 *   - newsletterConfirmedAt NOT NULL
 *   - tier IN ('general', 'members', 'vip')  [vip gets general template for now; Phase 6 adds personalised]
 *   - (frequency='daily') OR (frequency='weekly' AND today=newsletterDay)
 *   - newsletterLastSent < 20 hours ago (or null) — prevents double-sends
 *
 * Members get the pool status block in their email.
 * Pool status is fetched once per run and included for all members.
 */

import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/components';
import { prisma } from '@/lib/db';
import { getResend, FROM_ADDRESS, SITE_URL } from '@/lib/newsletter/resend';
import { createNewsletterToken } from '@/lib/newsletter/tokens';
import { getBotClient } from '@/lib/lnm/client';
import {
  GeneralBriefingEmail,
  generalBriefingSubject,
  type GeneralBriefingEmailProps,
} from '@/emails/GeneralBriefingEmail';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function snapVal(json: string, key: string, fmt?: (n: number) => string): string {
  try {
    const data = JSON.parse(json);
    const v = data[key];
    if (v == null) return '—';
    if (typeof v === 'number' && fmt) return fmt(v);
    return String(v);
  } catch { return '—'; }
}

function pct(n: number): string { return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`; }
function usd(n: number): string { return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`; }
function fixed2(n: number): string { return n.toFixed(2); }

/** Fetch recent bot alert messages since a given date (Members/VIP only) */
async function getAlertsForMember(since: Date): Promise<string[]> {
  try {
    const messages = await (prisma as any).chatMessage.findMany({
      where: {
        isBot: true,
        eventType: { notIn: ['new_briefing'] },  // skip the daily briefing post itself
        createdAt: { gt: since },
      },
      orderBy: { createdAt: 'asc' },
      take: 8, // max 8 alerts per email
      select: { content: true, createdAt: true },
    });
    return messages.map((m: { content: string; createdAt: Date }) => {
      const time = m.createdAt.toISOString().slice(11, 16) + ' UTC';
      // Trim content to 100 chars for email-safe display
      const text = m.content.length > 100 ? m.content.slice(0, 97) + '…' : m.content;
      return `[${time}] ${text}`;
    });
  } catch {
    return [];
  }
}

/** Fetch pool status from LNM bot account — returns null if unavailable */
async function getPoolStatus(): Promise<GeneralBriefingEmailProps['poolStatus'] | null> {
  try {
    const bot = getBotClient();
    const user = await bot.getUser();
    return {
      balanceSats: Math.round((user.balance ?? 0) * 1e8), // convert BTC to sats if needed
      position: 'FLAT', // TODO Phase 5: pull from open positions
      lastTradeDesc: 'No recent trades',
      winRatePct: 0,
    };
  } catch (err) {
    console.warn('[newsletter-daily] Could not fetch pool status:', err);
    return null;
  }
}

/** Get today's weekday (0=Sunday) in UTC */
function todayUTCDay(): number {
  return new Date().getUTCDay();
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
  if (!briefing) return NextResponse.json({ skipped: true, reason: 'No briefing' });

  const briefingDate = briefing.date;
  const dateStr = briefingDate.toISOString().split('T')[0];
  const dateFormatted = formatDate(briefingDate);
  const score = Math.round(briefing.convictionScore);
  const sourcesCount = (() => {
    try { return (JSON.parse(briefing.sourcesJson) as unknown[]).length; } catch { return 0; }
  })();
  const ds = briefing.dataSnapshotJson;

  const todayDay = todayUTCDay();
  const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000);

  // ── Eligible users ────────────────────────────────────────────────────────
  const users = await prisma.user.findMany({
    where: {
      newsletterEnabled: true,
      newsletterConfirmedAt: { not: null },
      tier: { in: ['general', 'members', 'vip'] },
      OR: [
        { newsletterFrequency: 'daily' },
        { newsletterFrequency: 'weekly', newsletterDay: todayDay },
      ],
      AND: [
        { OR: [{ newsletterLastSent: null }, { newsletterLastSent: { lt: twentyHoursAgo } }] },
      ],
    },
    select: { id: true, email: true, tier: true },
  });

  if (users.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, skipped: 0 });
  }

  // ── Pool status + alerts (fetched once for members) ──────────────────────
  const hasMembersOrVip = users.some((u) => u.tier === 'members' || u.tier === 'vip');
  const poolStatus = hasMembersOrVip ? await getPoolStatus() : null;
  // Fetch bot alerts for the last 26 hours (covers daily send window with margin)
  const alertsSince = new Date(Date.now() - 26 * 60 * 60 * 1000);
  const memberAlerts = hasMembersOrVip ? await getAlertsForMember(alertsSince) : [];

  const resend = getResend();
  let sent = 0;
  let failed = 0;

  // ── Send loop ─────────────────────────────────────────────────────────────
  for (const user of users) {
    const unsubToken = createNewsletterToken(user.id, 'unsubscribe', 90 * 86400);
    const unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${unsubToken}`;
    const briefingUrl = `${SITE_URL}/briefing/${dateStr}`;
    const viewInBrowserUrl = briefingUrl;

    const isMembersPlus = user.tier === 'members' || user.tier === 'vip';
    const includePool   = isMembersPlus && poolStatus != null;
    const includeAlerts = isMembersPlus && memberAlerts.length > 0;

    const emailHtml = await render(
      GeneralBriefingEmail({
        date: dateFormatted,
        headline: briefing.headline,
        threatLevel: briefing.threatLevel,
        convictionScore: score,
        sourcesCount,
        sections: {
          market:  briefing.marketSection,
          network: briefing.networkSection,
          geo:     briefing.geopoliticalSection,
          macro:   briefing.macroSection,
          outlook: briefing.outlookSection,
        },
        btcPrice:    snapVal(ds, 'btcPrice',    usd),
        btcChange24h: snapVal(ds, 'btc24hPct',  pct),
        fearGreed:   snapVal(ds, 'fearGreed'),
        hashrate:    snapVal(ds, 'hashrateEH',  (n) => `${n.toFixed(1)} EH/s`),
        mvrv:        snapVal(ds, 'mvrv',        fixed2),
        blockHeight: snapVal(ds, 'blockHeight', (n) => n.toLocaleString()),
        sp500:       snapVal(ds, 'sp500',       usd),
        vix:         snapVal(ds, 'vix',         fixed2),
        gold:        snapVal(ds, 'gold',        (n) => `$${n.toFixed(0)}`),
        dxy:         snapVal(ds, 'dxy',         fixed2),
        us10y:       snapVal(ds, 'us10y',       (n) => `${n.toFixed(2)}%`),
        oil:         snapVal(ds, 'oil',         (n) => `$${n.toFixed(2)}`),
        briefingUrl,
        unsubscribeUrl,
        viewInBrowserUrl,
        poolStatus: includePool ? poolStatus! : undefined,
        alerts: includeAlerts ? memberAlerts : undefined,
      })
    );

    const subject = generalBriefingSubject(dateFormatted, briefing.threatLevel, briefing.headline);

    let status: 'sent' | 'failed' = 'sent';
    let error: string | undefined;

    try {
      await resend.emails.send({ from: FROM_ADDRESS, to: user.email, subject, html: emailHtml });

      await prisma.user.update({
        where: { id: user.id },
        data: { newsletterLastSent: new Date() },
      });
      sent++;
    } catch (err) {
      status = 'failed';
      error = String(err);
      failed++;
      console.error(`[newsletter-daily] Failed for ${user.id}:`, err);
    }

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
      console.error('[newsletter-daily] Failed to log:', logErr);
    }
  }

  return NextResponse.json({ sent, failed, skipped: 0, total: users.length });
}
