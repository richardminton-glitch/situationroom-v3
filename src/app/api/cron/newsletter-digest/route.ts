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
 *     re-runs only.
 *
 * Per-tier templates:
 *   - free               → FreeDigestEmail (data snapshot + outlook + upgrade CTA)
 *   - general / members  → GeneralBriefingEmail (full 5 sections, weekly framing)
 *   - vip                → VipBriefingEmail with personalised content if a
 *                          VipBriefing record exists for today, otherwise
 *                          GeneralBriefingEmail with members-style add-ons.
 *
 * Members & VIP also get the pool status block and recent bot alerts in the
 * email body, matching the daily briefing flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/components';
import { prisma } from '@/lib/db';
import { getResend, FROM_ADDRESS, SITE_URL } from '@/lib/newsletter/resend';
import { createNewsletterToken } from '@/lib/newsletter/tokens';
import { FreeDigestEmail, freeDigestSubject } from '@/emails/FreeDigestEmail';
import {
  GeneralBriefingEmail,
  generalBriefingSubject,
  type GeneralBriefingEmailProps,
} from '@/emails/GeneralBriefingEmail';
import {
  VipBriefingEmail,
  vipBriefingSubject,
} from '@/emails/VipBriefingEmail';
import { getBotClient } from '@/lib/lnm/client';
import { getLiveSatsPerGbp, gbpToSats } from '@/lib/lnm/rates';
import { TIER_PRICES_GBP } from '@/lib/auth/tier';
import { normaliseThreatState } from '@/lib/room/threatEngine';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ── Formatting helpers ────────────────────────────────────────────────────────

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

function pct(n: number): string { return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`; }
function usd(n: number): string { return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`; }
function fixed2(n: number): string { return n.toFixed(2); }

/** Read a snapshot field with type-aware formatting. */
function snapVal(json: string, key: string, fmt?: (n: number) => string, fallback = '—'): string {
  try {
    const data = JSON.parse(json);
    const v = data[key];
    if (v == null) return fallback;
    if (typeof v === 'number' && fmt) return fmt(v);
    return String(v);
  } catch { return fallback; }
}

// ── Pool status + alerts (Members/VIP only) — same shape as newsletter-daily ─

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
    console.warn('[newsletter-digest] Could not fetch pool status:', err);
    return null;
  }
}

async function getAlertsForMember(since: Date): Promise<string[]> {
  try {
    const messages = await (prisma as any).chatMessage.findMany({
      where: {
        isBot: true,
        eventType: { notIn: ['new_briefing'] },
        createdAt: { gt: since },
      },
      orderBy: { createdAt: 'asc' },
      take: 8,
      select: { content: true, createdAt: true },
    });
    return messages.map((m: { content: string; createdAt: Date }) => {
      const time = m.createdAt.toISOString().slice(11, 16) + ' UTC';
      const text = m.content.length > 100 ? m.content.slice(0, 97) + '…' : m.content;
      return `[${time}] ${text}`;
    });
  } catch {
    return [];
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
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
  const dateStr = briefingDate.toISOString().split('T')[0];
  const dateFormatted = formatDate(briefingDate);
  const weekOf = dateFormatted;
  const score = Math.round(briefing.convictionScore);
  const label = convictionLabel(score);
  const ds = briefing.dataSnapshotJson;
  const sourcesCount = (() => {
    try { return (JSON.parse(briefing.sourcesJson) as unknown[]).length; } catch { return 0; }
  })();

  // ── Eligible users ────────────────────────────────────────────────────────
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

  // ── Shared values fetched once per run ────────────────────────────────────
  const satsPerGbp = await getLiveSatsPerGbp();
  const generalSatsPrice = gbpToSats(TIER_PRICES_GBP.general, satsPerGbp).toLocaleString();

  const hasMembersOrVip = users.some((u) => u.tier === 'members' || u.tier === 'vip');
  const poolStatus = hasMembersOrVip ? await getPoolStatus() : null;
  const memberAlerts = hasMembersOrVip
    ? await getAlertsForMember(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    : [];

  // Data snapshot props for paid-tier briefing emails — keys MUST match
  // DashboardSnapshot in src/lib/grok/prompts.ts: btc24hPct, hashrateEH, etc.
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

  // VIP personalised content lookup window
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  // ── Send loop ─────────────────────────────────────────────────────────────
  const resend = getResend();
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    if (!user.email || user.email.startsWith('nostr:') || !user.email.includes('@')) {
      continue;
    }

    const unsubToken = createNewsletterToken(user.id, 'unsubscribe', 90 * 86400);
    const unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${unsubToken}`;
    const briefingUrl = `${SITE_URL}/briefing/${dateStr}`;
    const viewInBrowserUrl = briefingUrl;

    const isMembersPlus = user.tier === 'members' || user.tier === 'vip';
    const includePool   = isMembersPlus && poolStatus != null;
    const includeAlerts = isMembersPlus && memberAlerts.length > 0;

    let emailHtml: string;
    let subject: string;

    console.log(`[newsletter-digest] dispatch: user=${user.id} email=${user.email} tier=${user.tier}`);

    if (user.tier === 'free') {
      // ── Free: outlook-only digest with upgrade CTA ─────────────────────
      emailHtml = await render(
        FreeDigestEmail({
          weekOf,
          threatLevel: normaliseThreatState(briefing.threatLevel),
          outlook: briefing.outlookSection,
          unsubscribeUrl,
          viewInBrowserUrl,
          siteUrl: SITE_URL,
          ...snapshotProps,
          convictionScore: score,
          convictionLabel: label,
          generalSatsPrice,
        })
      );
      subject = freeDigestSubject(weekOf, normaliseThreatState(briefing.threatLevel));

    } else if (user.tier === 'vip') {
      // ── VIP: personalised briefing if available, else full general fallback ─
      const vipBriefing = await (prisma as any).vipBriefing.findUnique({
        where: { userId_date: { userId: user.id, date: todayUTC } },
        select: { contentJson: true, headline: true, topics: true },
      }) as { contentJson: string; headline: string; topics: string } | null;

      if (vipBriefing) {
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
      // ── General + Members: full 5-section briefing template ────────────
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

    let status: 'sent' | 'failed' = 'sent';
    let error: string | undefined;

    try {
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: user.email,
        subject,
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
