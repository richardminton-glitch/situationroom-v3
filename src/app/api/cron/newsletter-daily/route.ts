/**
 * GET /api/cron/newsletter-daily
 * Mon–Sat at 06:15 UTC — sends the daily briefing email to General, Members,
 * and VIP subscribers who have explicitly opted into daily delivery.
 *
 * On Sundays this route no-ops: the weekly digest (`newsletter-digest`) fires
 * at the same 06:15 UTC slot and replaces the daily for everyone, so nobody
 * gets two emails on Sunday.
 *
 * Eligibility:
 *   - newsletterEnabled = true
 *   - tier IN ('general', 'members', 'vip')
 *   - newsletterFrequency = 'daily'  (explicit opt-in)
 *   - newsletterLastSent < 20 hours ago (or null) — prevents double-sends
 *
 * Members/VIP get the pool status block. VIP users get the VipBriefingEmail
 * template with personalised content if a VipBriefing record exists for today;
 * otherwise falls back to GeneralBriefingEmail. Pool status is fetched once
 * per run and included for all members/VIP.
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
import {
  VipBriefingEmail,
  vipBriefingSubject,
} from '@/emails/VipBriefingEmail';
import { normaliseThreatState } from '@/lib/room/threatEngine';

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
    const [account, openPositions, closedTrades] = await Promise.all([
      bot.getAccount(),
      bot.getRunningTrades().catch(() => []),
      bot.getClosedTrades(20).catch(() => []),
    ]);

    const openPos = openPositions[0] as Record<string, unknown> | undefined;
    const position: 'LONG' | 'SHORT' | 'FLAT' = openPos
      ? ((openPos.side === 'buy' || openPos.side === 'b') ? 'LONG' : 'SHORT')
      : 'FLAT';

    const lastTrade = closedTrades[0] as Record<string, unknown> | undefined;
    const lastTradePl = lastTrade ? Math.round((lastTrade.pl as number) ?? 0) : 0;
    const lastTradeDesc = lastTrade
      ? `${(lastTrade.side === 'buy' || lastTrade.side === 'b') ? 'LONG' : 'SHORT'} ${lastTradePl >= 0 ? '+' : ''}${lastTradePl} sats`
      : 'No recent trades';

    const wins = closedTrades.filter((t) => ((t.pl as number) ?? 0) > 0).length;
    const winRatePct = closedTrades.length > 0 ? Math.round((wins / closedTrades.length) * 100) : 0;

    return {
      balanceSats: account.balance ?? 0,
      position,
      lastTradeDesc,
      winRatePct,
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

  // Sunday = weekly digest day; let newsletter-digest handle it so users
  // never get two emails the same morning.
  if (todayUTCDay() === 0) {
    return NextResponse.json({ skipped: true, reason: 'Sunday — weekly digest replaces daily' });
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

  const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000);

  // ── Eligible users ────────────────────────────────────────────────────────
  // Daily email = explicit opt-in. Weekly subscribers receive the Sunday
  // digest, not this email.
  const users = await prisma.user.findMany({
    where: {
      newsletterEnabled: true,
      tier: { in: ['general', 'members', 'vip'] },
      newsletterFrequency: 'daily',
      OR: [{ newsletterLastSent: null }, { newsletterLastSent: { lt: twentyHoursAgo } }],
    },
    select: { id: true, email: true, tier: true },
  });

  if (users.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, skipped: 0 });
  }

  // ── Pool status + alerts (fetched once for members/VIP) ──────────────────
  const hasMembersOrVip = users.some((u) => u.tier === 'members' || u.tier === 'vip');
  const poolStatus = hasMembersOrVip ? await getPoolStatus() : null;
  // Fetch bot alerts for the last 26 hours (covers daily send window with margin)
  const alertsSince = new Date(Date.now() - 26 * 60 * 60 * 1000);
  const memberAlerts = hasMembersOrVip ? await getAlertsForMember(alertsSince) : [];

  // ── Today's date for VIP briefing lookup ─────────────────────────────────
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  const resend = getResend();
  let sent = 0;
  let failed = 0;

  // Shared snapshot values (computed once)
  const snapshotProps = {
    btcPrice:    snapVal(ds, 'btcPrice',    usd),
    btcChange24h: snapVal(ds, 'btc24hPct',  pct),
    fearGreed:   snapVal(ds, 'fearGreed'),
    hashrate:    snapVal(ds, 'hashrateEH',  (n: number) => `${n.toFixed(1)} EH/s`),
    mvrv:        snapVal(ds, 'mvrv',        fixed2),
    blockHeight: snapVal(ds, 'blockHeight', (n: number) => n.toLocaleString()),
    sp500:       snapVal(ds, 'sp500',       usd),
    vix:         snapVal(ds, 'vix',         fixed2),
    gold:        snapVal(ds, 'gold',        (n: number) => `$${n.toFixed(0)}`),
    dxy:         snapVal(ds, 'dxy',         fixed2),
    us10y:       snapVal(ds, 'us10y',       (n: number) => `${n.toFixed(2)}%`),
    oil:         snapVal(ds, 'oil',         (n: number) => `$${n.toFixed(2)}`),
  };

  // ── Send loop ─────────────────────────────────────────────────────────────
  for (const user of users) {
    const unsubToken = createNewsletterToken(user.id, 'unsubscribe', 90 * 86400);
    const unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${unsubToken}`;
    const briefingUrl = `${SITE_URL}/briefing/${dateStr}`;
    const viewInBrowserUrl = briefingUrl;

    const isMembersPlus = user.tier === 'members' || user.tier === 'vip';
    const includePool   = isMembersPlus && poolStatus != null;
    const includeAlerts = isMembersPlus && memberAlerts.length > 0;

    // ── VIP: attempt personalised email ──────────────────────────────────
    let emailHtml: string;
    let subject: string;

    if (user.tier === 'vip') {
      // Look up today's VIP briefing
      const vipBriefing = await (prisma as any).vipBriefing.findUnique({
        where: { userId_date: { userId: user.id, date: todayUTC } },
        select: { contentJson: true, headline: true, topics: true },
      }) as { contentJson: string; headline: string; topics: string } | null;

      if (vipBriefing) {
        // Parse personalised content
        const vipContent = JSON.parse(vipBriefing.contentJson) as {
          market: string; network: string; geo: string; macro: string; outlook: string;
        };
        const vipTopics = JSON.parse(vipBriefing.topics) as string[];

        emailHtml = await render(
          VipBriefingEmail({
            date: dateFormatted,
            headline: vipBriefing.headline,
            threatLevel: normaliseThreatState(briefing.threatLevel),
            convictionScore: score,
            sourcesCount,
            sections: {
              market:  vipContent.market,
              network: vipContent.network,
              geo:     vipContent.geo,
              macro:   vipContent.macro,
              outlook: vipContent.outlook,
            },
            ...snapshotProps,
            briefingUrl,
            unsubscribeUrl,
            viewInBrowserUrl,
            topicNames: vipTopics,
            poolStatus: includePool ? poolStatus! : undefined,
            alerts: includeAlerts ? memberAlerts : undefined,
          })
        );
        subject = vipBriefingSubject(dateFormatted, normaliseThreatState(briefing.threatLevel), vipTopics);
      } else {
        // VIP briefing not ready — fall back to general template
        emailHtml = await render(
          GeneralBriefingEmail({
            date: dateFormatted,
            headline: briefing.headline,
            threatLevel: normaliseThreatState(briefing.threatLevel),
            convictionScore: score,
            sourcesCount,
            sections: {
              market:  briefing.marketSection,
              network: briefing.networkSection,
              geo:     briefing.geopoliticalSection,
              macro:   briefing.macroSection,
              outlook: briefing.outlookSection,
            },
            ...snapshotProps,
            briefingUrl,
            unsubscribeUrl,
            viewInBrowserUrl,
            poolStatus: includePool ? poolStatus! : undefined,
            alerts: includeAlerts ? memberAlerts : undefined,
          })
        );
        subject = generalBriefingSubject(dateFormatted, normaliseThreatState(briefing.threatLevel), briefing.headline);
      }
    } else {
      // ── General / Members: standard template ───────────────────────────
      emailHtml = await render(
        GeneralBriefingEmail({
          date: dateFormatted,
          headline: briefing.headline,
          threatLevel: normaliseThreatState(briefing.threatLevel),
          convictionScore: score,
          sourcesCount,
          sections: {
            market:  briefing.marketSection,
            network: briefing.networkSection,
            geo:     briefing.geopoliticalSection,
            macro:   briefing.macroSection,
            outlook: briefing.outlookSection,
          },
          ...snapshotProps,
          briefingUrl,
          unsubscribeUrl,
          viewInBrowserUrl,
          poolStatus: includePool ? poolStatus! : undefined,
          alerts: includeAlerts ? memberAlerts : undefined,
        })
      );
      subject = generalBriefingSubject(dateFormatted, briefing.threatLevel, briefing.headline);
    }

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
