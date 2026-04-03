/**
 * POST /api/admin/send-test-emails
 *
 * One-off admin endpoint: sends example of every automated email to a specified address.
 * Protected by CRON_SECRET. Not for production use.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getResend, FROM_ADDRESS, SITE_URL } from '@/lib/newsletter/resend';
import { render } from '@react-email/components';
import { FreeDigestEmail } from '@/emails/FreeDigestEmail';
import { GeneralBriefingEmail } from '@/emails/GeneralBriefingEmail';
import { VipBriefingEmail } from '@/emails/VipBriefingEmail';

export const dynamic = 'force-dynamic';

// Sample data snapshot for all templates
const SAMPLE_DATA = {
  btcPrice: '$67,412',
  btcChange24h: '+2.4%',
  fearGreed: '38',
  hashrate: '812 EH/s',
  mvrv: '1.24',
  blockHeight: '892,417',
  sp500: '5,218',
  vix: '22.4',
  gold: '$3,312',
  dxy: '99.8',
  us10y: '4.21%',
  oil: '$78.50',
};

const SAMPLE_SECTIONS = {
  market: 'Bitcoin reclaimed $67,000 after a brief dip to $64,800, with spot volume rising 18% — the first meaningful bid since late March. ETF inflows turned positive for a third consecutive session, led by IBIT (+$142M). The move aligns with a weakening DXY and dovish FOMC rhetoric, though weekend liquidity remains thin.',
  network: 'Hashrate hit a new all-time high at 812 EH/s as post-halving miners consolidate. The 30-day hash ribbon is bullish — the 30D MA crossed above the 60D MA for the first time since February. Mempool is clearing steadily at 4.2 vMB with median fees at 8 sat/vB.',
  geo: 'Strait of Hormuz tensions eased after diplomatic progress between Iran and Gulf states. European energy markets rallied on the news, with Dutch TTF gas futures dropping 6%. Meanwhile, the BRICS bloc announced a new gold-backed trade settlement pilot involving 12 nations.',
  macro: 'Fed minutes revealed a divided committee — three members pushed for an immediate 25bp cut, while the majority favoured holding through Q3. UK CPI surprised to the upside at 4.2%, complicating BOE rate path expectations. Japan intervened in FX markets for the third time this year as USD/JPY breached 158.',
  outlook: 'The convergence of declining DXY, positive ETF flows, and bullish hash ribbon creates a constructive short-term backdrop for Bitcoin. However, elevated VIX and UK inflation surprises suggest macro headwinds remain. The key level to watch is $68,500 — a weekly close above this would confirm the breakout from the 3-week consolidation range.',
};

export async function POST(request: NextRequest) {
  // Auth check
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const { to } = await request.json();
  if (!to || typeof to !== 'string') {
    return NextResponse.json({ error: 'Missing "to" email address' }, { status: 400 });
  }

  const resend = getResend();
  const results: { name: string; status: string; error?: string }[] = [];

  // ── 1. PIN Code Email ──────────────────────────────────────────────────────
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: '[EXAMPLE — All Tiers] Situation Room — Your Sign-In PIN',
      html: `
<div style="font-family:'Courier New',monospace;max-width:400px;margin:0 auto;padding:32px 24px;background:#f5f0e8;color:#2c2416;">
  <div style="font-size:10px;letter-spacing:0.16em;color:#8b7355;margin-bottom:4px;">SITUATION ROOM</div>
  <div style="font-size:14px;letter-spacing:0.08em;margin-bottom:24px;">SIGN-IN PIN</div>
  <div style="font-size:32px;letter-spacing:0.5em;font-weight:bold;text-align:center;padding:16px;background:#fff;border:1px solid #c8b89a;margin-bottom:16px;">
    847291
  </div>
  <div style="font-size:11px;color:#8b7355;line-height:1.6;">
    This PIN expires in 10 minutes.<br>
    If you did not request this, ignore this email.
  </div>
</div>`.trim(),
    });
    results.push({ name: 'PIN Code Email', status: 'sent' });
  } catch (err) {
    results.push({ name: 'PIN Code Email', status: 'failed', error: String(err) });
  }

  // ── 2. Newsletter Confirmation Email ───────────────────────────────────────
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: '[EXAMPLE — All Tiers] Confirm your Situation Room newsletter',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#f5f0e8;font-family:Georgia,serif;margin:0;padding:40px 20px">
  <div style="max-width:520px;margin:0 auto;background:#ede8dc;border:1px solid #c8b89a;padding:32px">
    <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.18em;color:#8b7355;margin-bottom:20px">
      SITUATION ROOM · CONFIRM SUBSCRIPTION
    </div>
    <p style="font-size:15px;color:#2c2416;line-height:1.6;margin:0 0 20px">
      Click below to confirm your newsletter subscription and start receiving
      Bitcoin &amp; macro intelligence briefings.
    </p>
    <a href="${SITE_URL}/support"
       style="display:inline-block;padding:12px 28px;background:#8b6914;color:#f5f0e8;
              text-decoration:none;font-family:'Courier New',monospace;font-size:12px;
              letter-spacing:0.12em;font-weight:bold">
      CONFIRM SUBSCRIPTION
    </a>
    <p style="font-size:11px;color:#8b7355;margin-top:20px;line-height:1.5">
      This link expires in 24 hours. If you did not request this, ignore this email.
    </p>
    <hr style="border:none;border-top:1px solid #c8b89a;margin:24px 0">
    <p style="font-size:10px;color:#8b7355;font-family:'Courier New',monospace;margin:0">
      Situation Room · <a href="${SITE_URL}" style="color:#8b6914">situationroom.space</a>
    </p>
  </div>
</body>
</html>`.trim(),
    });
    results.push({ name: 'Newsletter Confirmation', status: 'sent' });
  } catch (err) {
    results.push({ name: 'Newsletter Confirmation', status: 'failed', error: String(err) });
  }

  // ── 3. Free Weekly Digest ──────────────────────────────────────────────────
  try {
    const html = await render(FreeDigestEmail({
      weekOf: '3 April 2026',
      threatLevel: 'ELEVATED',
      outlook: SAMPLE_SECTIONS.outlook,
      unsubscribeUrl: `${SITE_URL}/support`,
      viewInBrowserUrl: `${SITE_URL}/briefings`,
      ...SAMPLE_DATA,
      convictionScore: 65,
      convictionLabel: 'MODERATE CONVICTION',
    }));
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: '[EXAMPLE — Free Tier] Situation Room · ELEVATED · Week of 3 April 2026',
      html,
    });
    results.push({ name: 'Free Weekly Digest', status: 'sent' });
  } catch (err) {
    results.push({ name: 'Free Weekly Digest', status: 'failed', error: String(err) });
  }

  // ── 4. General Daily Briefing ──────────────────────────────────────────────
  try {
    const html = await render(GeneralBriefingEmail({
      date: '3 April 2026',
      headline: 'Hash Ribbon Flips Bullish as DXY Breaks Below 100',
      threatLevel: 'ELEVATED',
      convictionScore: 65,
      sourcesCount: 18,
      sections: SAMPLE_SECTIONS,
      ...SAMPLE_DATA,
      briefingUrl: `${SITE_URL}/briefing/2026-04-03`,
      unsubscribeUrl: `${SITE_URL}/support`,
      viewInBrowserUrl: `${SITE_URL}/briefings`,
    }));
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: '[EXAMPLE — General Tier] Situation Room · ELEVATED · 3 April 2026 · Hash Ribbon Flips Bullish',
      html,
    });
    results.push({ name: 'General Daily Briefing', status: 'sent' });
  } catch (err) {
    results.push({ name: 'General Daily Briefing', status: 'failed', error: String(err) });
  }

  // ── 5. Members Daily Briefing (General + Pool Status + Alerts) ─────────────
  try {
    const html = await render(GeneralBriefingEmail({
      date: '3 April 2026',
      headline: 'Hash Ribbon Flips Bullish as DXY Breaks Below 100',
      threatLevel: 'ELEVATED',
      convictionScore: 65,
      sourcesCount: 18,
      sections: SAMPLE_SECTIONS,
      ...SAMPLE_DATA,
      briefingUrl: `${SITE_URL}/briefing/2026-04-03`,
      unsubscribeUrl: `${SITE_URL}/support`,
      viewInBrowserUrl: `${SITE_URL}/briefings`,
      poolStatus: {
        balanceSats: 16124,
        position: 'FLAT',
        lastTradeDesc: 'LONG +8.8% — closed after hash ribbon confirmation',
        winRatePct: 56,
      },
      alerts: [
        '[14:32 UTC] Conviction score crossed 70 (was 65)',
        '[09:18 UTC] BTC crossed $67,000 — your price alert triggered',
      ],
    }));
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: '[EXAMPLE — Members Tier] Situation Room · ELEVATED · 3 April 2026 · Hash Ribbon Flips Bullish',
      html,
    });
    results.push({ name: 'Members Daily Briefing', status: 'sent' });
  } catch (err) {
    results.push({ name: 'Members Daily Briefing', status: 'failed', error: String(err) });
  }

  // ── 6. VIP Personalised Briefing ───────────────────────────────────────────
  try {
    const html = await render(VipBriefingEmail({
      date: '3 April 2026',
      headline: 'Hash Ribbon Flips Bullish as DXY Breaks Below 100',
      threatLevel: 'ELEVATED',
      convictionScore: 65,
      personalScore: 71,
      sourcesCount: 18,
      sections: SAMPLE_SECTIONS,
      ...SAMPLE_DATA,
      briefingUrl: `${SITE_URL}/briefing/2026-04-03`,
      unsubscribeUrl: `${SITE_URL}/support`,
      viewInBrowserUrl: `${SITE_URL}/briefings`,
      topicNames: ['Bitcoin Network', 'On-Chain Analytics', 'Macro & Central Banks'],
      portfolioContext: 'Your cost basis of $42,000 puts you at +60% unrealised profit. The current MVRV of 1.24 and bullish hash ribbon signal suggest this is not yet overheated territory — historically, MVRV above 2.4 has marked profit-taking zones. Your long-term horizon aligns with the accumulation thesis supported by LTH supply at 74.7%.',
      poolStatus: {
        balanceSats: 16124,
        position: 'FLAT',
        lastTradeDesc: 'LONG +8.8% — closed after hash ribbon confirmation',
        winRatePct: 56,
      },
      alerts: [
        '[14:32 UTC] Conviction score crossed 70 (was 65)',
        '[06:05 UTC] LTH supply dropped below 74%',
      ],
    }));
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: '[EXAMPLE — VIP Tier] Situation Room · VIP · ELEVATED · 3 April 2026 · Bitcoin Network · On-Chain Analytics',
      html,
    });
    results.push({ name: 'VIP Personalised Briefing', status: 'sent' });
  } catch (err) {
    results.push({ name: 'VIP Personalised Briefing', status: 'failed', error: String(err) });
  }

  // ── 7. Alert Notification Email ────────────────────────────────────────────
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: '[EXAMPLE — VIP Tier] Situation Room Alert: Conviction score crossed 70',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#f5f0e8;font-family:'Courier New',monospace;margin:0;padding:40px 20px">
  <div style="max-width:520px;margin:0 auto;background:#ede8dc;border:1px solid #c8b89a;padding:32px">
    <div style="font-size:10px;letter-spacing:0.18em;color:#8b7355;margin-bottom:20px">
      SITUATION ROOM · ALERT
    </div>
    <div style="font-size:16px;color:#8b6914;font-weight:bold;margin-bottom:16px;letter-spacing:0.04em">
      Conviction Score Alert
    </div>
    <p style="font-size:13px;color:#2c2416;line-height:1.6;margin:0 0 20px">
      Conviction score is <strong>71/100</strong> — above your threshold of 70.
    </p>
    <p style="font-size:11px;color:#8b7355;margin-bottom:20px">
      This alert was triggered at 14:32 UTC on 3 April 2026.
    </p>
    <a href="${SITE_URL}"
       style="display:inline-block;padding:10px 24px;background:#8b6914;color:#f5f0e8;
              text-decoration:none;font-size:12px;letter-spacing:0.12em;font-weight:bold">
      VIEW DASHBOARD
    </a>
    <hr style="border:none;border-top:1px solid #c8b89a;margin:24px 0">
    <p style="font-size:10px;color:#8b7355;margin:0">
      Situation Room · <a href="${SITE_URL}" style="color:#8b6914">Manage alerts</a>
    </p>
  </div>
</body>
</html>`.trim(),
    });
    results.push({ name: 'Alert Notification', status: 'sent' });
  } catch (err) {
    results.push({ name: 'Alert Notification', status: 'failed', error: String(err) });
  }

  return NextResponse.json({ sent: results.filter(r => r.status === 'sent').length, total: results.length, results });
}
