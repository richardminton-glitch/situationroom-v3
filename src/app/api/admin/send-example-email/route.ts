/**
 * POST /api/admin/send-example-email
 *
 * Admin-only utility for previewing every lifecycle / briefing email
 * template. Sends a batch of emails for one tier per request so you can
 * walk through the entire pipeline in your inbox.
 *
 * Auth: requires either an admin session OR x-cron-secret header (so the
 *       route can be invoked from a script without a browser session).
 *
 * Body: { tier: 'free' | 'general' | 'members' | 'vip', destination?: string }
 *
 * Free tier batch:    PIN email, Welcome email, Free weekly digest
 * General/Members/VIP batch: tier upgrade confirmation, daily briefing, expiry warning
 *
 * Briefing emails pull the most recent real Briefing row from the DB so the
 * preview reflects current content. If no briefing exists, mock data is used.
 */

import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/components';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { isAdmin, TIER_LABELS } from '@/lib/auth/tier';
import { FROM_ADDRESS, SITE_URL, getResend } from '@/lib/newsletter/resend';
import { createNewsletterToken } from '@/lib/newsletter/tokens';
import {
  sendWelcomeEmail,
  sendUpgradeConfirmationEmail,
  sendExpiryWarningEmail,
} from '@/lib/newsletter/lifecycle';
import { FreeDigestEmail, freeDigestSubject } from '@/emails/FreeDigestEmail';
import { GeneralBriefingEmail, generalBriefingSubject } from '@/emails/GeneralBriefingEmail';
import { VipBriefingEmail, vipBriefingSubject } from '@/emails/VipBriefingEmail';
import {
  MigrationAnnouncementEmail,
  migrationAnnouncementSubject,
} from '@/emails/MigrationAnnouncementEmail';
import type { Tier } from '@/types';

// Same constant as the import / broadcast routes — every imported user expires here.
const MIGRATION_GRANDFATHER_END = new Date('2026-07-14T00:00:00.000Z');
const MIGRATION_LEGACY_URL = 'https://legacy.situationroom.space';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface SendResult {
  template: string;
  subject?: string;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
}

// ── Mock data fallbacks ────────────────────────────────────────────────────────

const MOCK_SNAPSHOT = {
  btcPrice:    '$68,605',
  btcChange24h: '+1.42%',
  fearGreed:   '54 (Greed)',
  hashrate:    '742.3 EH/s',
  mvrv:        '2.31',
  blockHeight: '892,471',
  sp500:       '$5,742',
  vix:         '14.82',
  gold:        '$2,651',
  dxy:         '104.21',
  us10y:       '4.18%',
  oil:         '$73.45',
};

const MOCK_SECTIONS = {
  market:  'Bitcoin held the $68k zone overnight on muted spot volume, with derivatives positioning slightly long-biased and funding still neutral. The 24h range compressed to under 2% as participants waited on US CPI later this week. Spot ETF flows turned positive again yesterday after two days of mild outflows, suggesting institutional accumulation continues at the lower end of the recent range.',
  network: 'Hashrate posted a fresh ATH overnight at 742 EH/s as the difficulty adjustment due in 4 days currently projects +3.1%. Mempool sits at 4.2 vMB with median fees at 22 sat/vB — below the 30-day average but elevated relative to last week. LTH supply ticked up 0.3% w/w, the strongest accumulation signal in six weeks. Hash ribbons remain bullish.',
  geo:     'Iran-Israel ceasefire negotiations entered a sixth day in Doha with reports of meaningful progress on the prisoner exchange framework. Russian oil exports to India through the eastern corridor hit a new monthly high. Taiwan strait tensions eased after the PLA Navy stood down its largest exercise of the year. Brent crude unchanged on the day at $73.45.',
  macro:   'Fed swap markets now price 62% odds of a 25bp cut at the next FOMC, up from 48% last week, after softer-than-expected jobless claims and a weaker ISM services print. The 2s10s curve steepened 4bp on the session. ECB minutes showed broader divergence on the rate path, with hawks pushing back against a March cut. PBOC liquidity injection of ¥800bn was the largest in five months.',
  outlook: 'The setup into CPI is constructive: positioning is neutral, funding is healthy, and on-chain accumulation has resumed. Conviction remains 7/10 for further upside, but a hot CPI print would likely test the $66.5k support zone before any continuation. Watch the LTH supply trend — five more days of net accumulation would be the strongest signal of this leg.',
};

const MOCK_HEADLINE = 'Hashrate ATH coincides with renewed LTH accumulation as CPI looms';
const MOCK_THREAT_LEVEL = 'ELEVATED';
const MOCK_CONVICTION = 7.2;
const MOCK_SOURCES_COUNT = 47;

const MOCK_VIP_TOPICS = ['btc-network', 'macro-banks', 'onchain'];
const MOCK_VIP_TOPIC_NAMES = ['Bitcoin Network', 'Macro & Central Banks', 'On-Chain Analytics'];

const MOCK_POOL = {
  balanceSats: 2_847_300,
  position: 'LONG' as const,
  lastTradeDesc: 'LONG +1,420 sats',
  winRatePct: 68,
};

const MOCK_ALERTS = [
  '[06:02 UTC] [trade_open] LONG 3× @ $68,605 — conviction 9/10, regime: RANGING',
  '[09:14 UTC] [hash_ribbon_flip] Hashrate 30d MA crossed above 60d — bullish flip confirmed',
  '[14:47 UTC] [whale_alert] 4,200 BTC moved off Coinbase Pro to cold storage',
  '[18:33 UTC] [lth_milestone] LTH supply crossed 14.8M BTC for the first time',
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatLongDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

async function resolveBriefing() {
  try {
    const briefing = await prisma.briefing.findFirst({
      orderBy: { date: 'desc' },
    });
    if (!briefing) return null;
    return {
      headline:        briefing.headline ?? MOCK_HEADLINE,
      threatLevel:     briefing.threatLevel ?? MOCK_THREAT_LEVEL,
      convictionScore: briefing.convictionScore ?? MOCK_CONVICTION,
      sections: {
        market:  briefing.marketSection      || MOCK_SECTIONS.market,
        network: briefing.networkSection     || MOCK_SECTIONS.network,
        geo:     briefing.geopoliticalSection || MOCK_SECTIONS.geo,
        macro:   briefing.macroSection       || MOCK_SECTIONS.macro,
        outlook: briefing.outlookSection     || MOCK_SECTIONS.outlook,
      },
      sourcesCount: (() => {
        try {
          const arr = JSON.parse(briefing.sourcesJson);
          return Array.isArray(arr) ? arr.length : MOCK_SOURCES_COUNT;
        } catch { return MOCK_SOURCES_COUNT; }
      })(),
      snapshot: (() => {
        try {
          const ds = JSON.parse(briefing.dataSnapshotJson);
          return {
            btcPrice:    ds.btcPrice    ? `$${Number(ds.btcPrice).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : MOCK_SNAPSHOT.btcPrice,
            btcChange24h: ds.btc24hPct != null ? `${ds.btc24hPct >= 0 ? '+' : ''}${Number(ds.btc24hPct).toFixed(2)}%` : MOCK_SNAPSHOT.btcChange24h,
            fearGreed:   ds.fearGreed   != null ? String(ds.fearGreed) : MOCK_SNAPSHOT.fearGreed,
            hashrate:    ds.hashrateEH  != null ? `${Number(ds.hashrateEH).toFixed(1)} EH/s` : MOCK_SNAPSHOT.hashrate,
            mvrv:        ds.mvrv        != null ? Number(ds.mvrv).toFixed(2) : MOCK_SNAPSHOT.mvrv,
            blockHeight: ds.blockHeight != null ? Number(ds.blockHeight).toLocaleString() : MOCK_SNAPSHOT.blockHeight,
            sp500:       ds.sp500       != null ? `$${Number(ds.sp500).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : MOCK_SNAPSHOT.sp500,
            vix:         ds.vix         != null ? Number(ds.vix).toFixed(2) : MOCK_SNAPSHOT.vix,
            gold:        ds.gold        != null ? `$${Number(ds.gold).toFixed(0)}` : MOCK_SNAPSHOT.gold,
            dxy:         ds.dxy         != null ? Number(ds.dxy).toFixed(2) : MOCK_SNAPSHOT.dxy,
            us10y:       ds.us10y       != null ? `${Number(ds.us10y).toFixed(2)}%` : MOCK_SNAPSHOT.us10y,
            oil:         ds.oil         != null ? `$${Number(ds.oil).toFixed(2)}` : MOCK_SNAPSHOT.oil,
          };
        } catch { return MOCK_SNAPSHOT; }
      })(),
    };
  } catch (err) {
    console.warn('[example-email] could not fetch real briefing:', err);
    return null;
  }
}

async function safeSend(template: string, subject: string, html: string, to: string): Promise<SendResult> {
  try {
    await getResend().emails.send({ from: FROM_ADDRESS, to, subject, html });
    console.log(`[example-email] sent ${template} → ${to}`);
    return { template, subject, status: 'sent' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[example-email] FAILED ${template}:`, msg);
    return { template, subject, status: 'failed', error: msg };
  }
}

// ── Per-tier batches ───────────────────────────────────────────────────────────

async function sendFreeBatch(to: string, userId: string): Promise<SendResult[]> {
  const results: SendResult[] = [];

  // 1. PIN sign-in email — replicates the inline template in send-pin/route.ts
  const fakePin = '4271';
  const pinHtml = `
    <div style="font-family: 'Courier New', monospace; max-width: 400px; margin: 0 auto; padding: 32px 24px; background: #f5f0e8; color: #2c2416;">
      <div style="font-size: 10px; letter-spacing: 0.16em; color: #8b7355; margin-bottom: 4px;">SITUATION ROOM</div>
      <div style="font-size: 14px; letter-spacing: 0.08em; margin-bottom: 24px;">SIGN-IN PIN [EXAMPLE]</div>
      <div style="font-size: 36px; letter-spacing: 0.5em; font-weight: bold; text-align: center; padding: 16px; background: #fff; border: 1px solid #c8b89a; margin-bottom: 16px;">
        ${fakePin}
      </div>
      <div style="font-size: 11px; color: #8b7355; line-height: 1.6;">
        This is your permanent sign-in PIN.<br>
        Keep it safe — it stays the same every time you log in.
      </div>
    </div>
  `;
  results.push(await safeSend('PIN sign-in', '[Example] Situation Room — Your Sign-In PIN', pinHtml, to));

  // 2. Welcome email — uses the real lifecycle helper so it's identical to production
  const welcomeOk = await sendWelcomeEmail(userId, to, '482956');
  results.push({
    template: 'Welcome',
    subject:  '[Example] Welcome to Situation Room',
    status:   welcomeOk ? 'sent' : 'failed',
  });

  // 3. Free weekly digest
  const briefing = await resolveBriefing();
  const snap = briefing?.snapshot ?? MOCK_SNAPSHOT;
  const outlook = briefing?.sections.outlook ?? MOCK_SECTIONS.outlook;
  const threatLevel = briefing?.threatLevel ?? MOCK_THREAT_LEVEL;
  const conviction  = briefing?.convictionScore ?? MOCK_CONVICTION;
  const weekOf = formatLongDate(new Date());
  const unsubToken = createNewsletterToken(userId, 'unsubscribe', 90 * 86400);
  const unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${unsubToken}`;
  const viewInBrowserUrl = `${SITE_URL}/briefings`;

  const digestHtml = await render(
    FreeDigestEmail({
      weekOf,
      threatLevel,
      outlook,
      unsubscribeUrl,
      viewInBrowserUrl,
      btcPrice:    snap.btcPrice,
      btcChange24h: snap.btcChange24h,
      fearGreed:   snap.fearGreed,
      hashrate:    snap.hashrate,
      mvrv:        snap.mvrv,
      blockHeight: snap.blockHeight,
      sp500:       snap.sp500,
      vix:         snap.vix,
      gold:        snap.gold,
      dxy:         snap.dxy,
      us10y:       snap.us10y,
      oil:         snap.oil,
      convictionScore: Math.round(conviction * 10) / 10,
      convictionLabel: conviction >= 7 ? 'BULLISH' : conviction >= 4 ? 'NEUTRAL' : 'CAUTIOUS',
      generalSatsPrice: '5,681',
    }),
  );
  results.push(
    await safeSend(
      'Free weekly digest',
      `[Example] ${freeDigestSubject(weekOf, threatLevel)}`,
      digestHtml,
      to,
    ),
  );

  return results;
}

async function sendPaidBatch(to: string, userId: string, tier: Exclude<Tier, 'free'>): Promise<SendResult[]> {
  const results: SendResult[] = [];
  const now = new Date();

  // 1. Upgrade confirmation
  const monthlyExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiresAt = tier === 'vip' ? null : monthlyExpiry;
  const upgradeOk = await sendUpgradeConfirmationEmail(to, tier, {
    duration:   tier === 'vip' ? 'lifetime' : 'monthly',
    expiresAt,
    amountSats: tier === 'general' ? 5_681 : tier === 'members' ? 11_400 : 95_000,
  });
  results.push({
    template: `Upgrade confirmation (${TIER_LABELS[tier]})`,
    subject:  `[Example] Situation Room · ${TIER_LABELS[tier]} access activated`,
    status:   upgradeOk ? 'sent' : 'failed',
  });

  // 2. Daily briefing email
  const briefing = await resolveBriefing();
  const snap     = briefing?.snapshot ?? MOCK_SNAPSHOT;
  const sections = briefing?.sections ?? MOCK_SECTIONS;
  const headline = briefing?.headline ?? MOCK_HEADLINE;
  const threatLevel = briefing?.threatLevel ?? MOCK_THREAT_LEVEL;
  const conviction  = briefing?.convictionScore ?? MOCK_CONVICTION;
  const sourcesCount = briefing?.sourcesCount ?? MOCK_SOURCES_COUNT;
  const dateFormatted = formatLongDate(now);
  const dateStr = now.toISOString().slice(0, 10);

  const unsubToken = createNewsletterToken(userId, 'unsubscribe', 90 * 86400);
  const unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${unsubToken}`;
  const briefingUrl = `${SITE_URL}/briefing/${dateStr}`;
  const viewInBrowserUrl = briefingUrl;

  const includePool   = tier === 'members' || tier === 'vip';
  const includeAlerts = tier === 'members' || tier === 'vip';

  if (tier === 'vip') {
    const vipHtml = await render(
      VipBriefingEmail({
        date: dateFormatted,
        headline,
        threatLevel,
        convictionScore: conviction,
        sourcesCount,
        sections,
        ...snap,
        briefingUrl,
        unsubscribeUrl,
        viewInBrowserUrl,
        topicNames: MOCK_VIP_TOPIC_NAMES,
        poolStatus: includePool ? MOCK_POOL : undefined,
        alerts:     includeAlerts ? MOCK_ALERTS : undefined,
      }),
    );
    results.push(
      await safeSend(
        'VIP personalised briefing',
        `[Example] ${vipBriefingSubject(dateFormatted, threatLevel, MOCK_VIP_TOPICS)}`,
        vipHtml,
        to,
      ),
    );
  } else {
    const briefingHtml = await render(
      GeneralBriefingEmail({
        date: dateFormatted,
        headline,
        threatLevel,
        convictionScore: conviction,
        sourcesCount,
        sections,
        ...snap,
        briefingUrl,
        unsubscribeUrl,
        viewInBrowserUrl,
        poolStatus: includePool ? MOCK_POOL : undefined,
        alerts:     includeAlerts ? MOCK_ALERTS : undefined,
      }),
    );
    results.push(
      await safeSend(
        `${TIER_LABELS[tier]} daily briefing`,
        `[Example] ${generalBriefingSubject(dateFormatted, threatLevel, headline)}`,
        briefingHtml,
        to,
      ),
    );
  }

  // 3. Expiry warning
  const expiryDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const expiryOk = await sendExpiryWarningEmail(to, tier, expiryDate);
  results.push({
    template: `Expiry warning (${TIER_LABELS[tier]})`,
    subject:  `[Example] Situation Room · ${TIER_LABELS[tier]} expires ${formatLongDate(expiryDate)}`,
    status:   expiryOk ? 'sent' : 'failed',
  });

  return results;
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth: admin session OR cron secret
  const cronSecret = request.headers.get('x-cron-secret');
  const isCronAuth = cronSecret && cronSecret === process.env.CRON_SECRET;

  let authedUserId: string | null = null;
  if (!isCronAuth) {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || !isAdmin(sessionUser.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    authedUserId = sessionUser.id;
  }

  let body: { tier?: string; destination?: string; template?: string; variant?: string };
  try { body = await request.json(); } catch { body = {}; }

  const tier = body.tier as Tier | undefined;
  if (!tier || !['free', 'general', 'members', 'vip'].includes(tier)) {
    return NextResponse.json({ error: 'tier must be free|general|members|vip' }, { status: 400 });
  }
  // Migration announcement preview only valid for the two grandfather tiers.
  if (body.template === 'migration' && tier !== 'general' && tier !== 'members') {
    return NextResponse.json(
      { error: 'template=migration requires tier=general or tier=members' },
      { status: 400 },
    );
  }

  // Resolve destination + the userId we sign tokens with.
  // If admin session, default to admin email + admin id.
  // If cron auth, destination is required.
  let destination = body.destination;
  let userId = authedUserId;

  if (!destination) {
    if (authedUserId) {
      const u = await prisma.user.findUnique({ where: { id: authedUserId } });
      destination = u?.email ?? undefined;
    }
  }
  if (!destination) {
    return NextResponse.json({ error: 'destination required when no admin session' }, { status: 400 });
  }
  if (!userId) {
    // Cron-secret path: find an existing user with this email so token gen has a real id
    const u = await prisma.user.findUnique({ where: { email: destination.toLowerCase() } });
    userId = u?.id ?? null;
  }
  if (!userId) {
    return NextResponse.json({ error: `no user record found for ${destination}` }, { status: 404 });
  }

  let results: SendResult[];
  try {
    if (body.template === 'migration') {
      // Single-template preview path: only the migration announcement email,
      // no full per-tier batch. Used in the days leading up to the v2 → v3
      // cutover to validate copy + links before broadcasting via
      // /api/admin/broadcast-migration.
      const variant: 'main' | 'reminder' = body.variant === 'reminder' ? 'reminder' : 'main';
      const unsubToken = createNewsletterToken(userId, 'unsubscribe', 30 * 86400);
      const html = await render(
        MigrationAnnouncementEmail({
          email:          destination,
          tier:           tier as 'general' | 'members',
          expiresAt:      MIGRATION_GRANDFATHER_END,
          loginUrl:       `${SITE_URL}/login`,
          legacyUrl:      MIGRATION_LEGACY_URL,
          unsubscribeUrl: `${SITE_URL}/api/newsletter/unsubscribe?token=${unsubToken}`,
          siteUrl:        SITE_URL,
          variant,
        }),
      );
      results = [
        await safeSend(
          `Migration announcement (${variant})`,
          `[Example] ${migrationAnnouncementSubject[variant]}`,
          html,
          destination,
        ),
      ];
    } else if (tier === 'free') {
      results = await sendFreeBatch(destination, userId);
    } else {
      results = await sendPaidBatch(destination, userId, tier);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[example-email] batch failed:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    tier,
    destination,
    sent: results.filter((r) => r.status === 'sent').length,
    failed: results.filter((r) => r.status === 'failed').length,
    results,
  });
}
