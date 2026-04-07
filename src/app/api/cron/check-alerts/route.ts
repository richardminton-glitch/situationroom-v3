/**
 * GET /api/cron/check-alerts
 * Runs every 5 minutes. Evaluates active user alerts against current data.
 *
 * Supported triggers:
 *   conviction   — composite conviction score above/below threshold
 *   btc_price    — BTC price above/below threshold
 *   fear_greed   — Fear & Greed index above/below threshold
 *   lth_supply   — Long-Term Holder supply % above/below threshold
 *   hash_ribbon  — Hash ribbon signal matches condition (bullish/bearish/neutral)
 *   bot_trade    — Trading bot opens a new position (any/long/short)
 *   new_briefing — handled by daily-briefing cron
 *
 * For each triggered alert:
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

const BASE = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Get current data from DB
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

  if (alerts.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, fired: 0, errors: [] });
  }

  // Check which trigger types are needed so we only fetch data we need
  const triggerTypes = new Set(alerts.map((a) => a.triggerType));

  // Fetch LTH and hash ribbon data only if needed.
  // Use a state object so TypeScript doesn't collapse the closure-assigned
  // values to `never` via control-flow narrowing.
  interface FetchState {
    lthPct: number | null;
    hashRibbonSignal: string | null;
    recentTrades: { decision: string; createdAt: Date }[];
  }
  const state: FetchState = { lthPct: null, hashRibbonSignal: null, recentTrades: [] };

  const fetches: Promise<void>[] = [];

  if (triggerTypes.has('lth_supply')) {
    fetches.push(
      fetchJSON<{ date: string; lth: number; sth: number; lthPct: number }[]>('/api/data/lth-sth')
        .then((data) => {
          if (data && data.length > 0) state.lthPct = data[data.length - 1].lthPct;
        }),
    );
  }

  if (triggerTypes.has('hash_ribbon')) {
    fetches.push(
      fetchJSON<{ signal: string }>('/api/data/hash-ribbon')
        .then((data) => {
          if (data) state.hashRibbonSignal = data.signal;
        }),
    );
  }

  if (triggerTypes.has('bot_trade')) {
    fetches.push(
      prisma.tradingDecision.findMany({
        where: {
          executed: true,
          decision: { in: ['LONG', 'SHORT'] },
          createdAt: { gt: new Date(Date.now() - 6 * 60 * 1000) }, // last 6 min (cron is every 5)
        },
        select: { decision: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }).then((trades) => { state.recentTrades = trades; }),
    );
  }

  await Promise.all(fetches);
  const { lthPct, hashRibbonSignal, recentTrades } = state;

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

      case 'lth_supply':
        if (lthPct != null) {
          if (alert.condition === 'above' && alert.threshold != null && lthPct > alert.threshold) {
            shouldFire = true;
            alertMessage = `LTH supply is ${lthPct.toFixed(1)}% — above your threshold of ${alert.threshold}%`;
          } else if (alert.condition === 'below' && alert.threshold != null && lthPct < alert.threshold) {
            shouldFire = true;
            alertMessage = `LTH supply is ${lthPct.toFixed(1)}% — below your threshold of ${alert.threshold}%`;
          }
        }
        break;

      case 'hash_ribbon':
        if (hashRibbonSignal != null) {
          // condition = 'equals', threshold not used — label stores the target signal
          const targetSignal = (alert.condition || '').toLowerCase();
          if (hashRibbonSignal.toLowerCase() === targetSignal) {
            shouldFire = true;
            alertMessage = `Hash Ribbon signal is ${hashRibbonSignal.toUpperCase()}`;
          }
        }
        break;

      case 'bot_trade':
        if (recentTrades.length > 0) {
          const condition = (alert.condition || 'any').toLowerCase();
          const match = condition === 'any'
            ? recentTrades[0]
            : recentTrades.find((t) => t.decision.toLowerCase() === condition);
          if (match) {
            shouldFire = true;
            alertMessage = `Bot opened a ${match.decision} position`;
          }
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
