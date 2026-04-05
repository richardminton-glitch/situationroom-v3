/**
 * GET /api/admin/analytics
 *
 * Proxies Umami analytics API calls server-side.
 * Returns aggregated stats, top pages, referrers, countries, devices,
 * and pageview time series for the admin dashboard.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/tier';

export const dynamic = 'force-dynamic';

const UMAMI_URL = process.env.UMAMI_URL || 'http://127.0.0.1:3002';
const UMAMI_USERNAME = process.env.UMAMI_USERNAME || 'admin';
const UMAMI_PASSWORD = process.env.UMAMI_PASSWORD || '';
const WEBSITE_ID = process.env.UMAMI_WEBSITE_ID || '';

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch(`${UMAMI_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: UMAMI_USERNAME, password: UMAMI_PASSWORD }),
  });

  if (!res.ok) throw new Error('Umami auth failed');
  const data = await res.json();
  cachedToken = data.token;
  tokenExpiry = Date.now() + 3600_000; // 1 hour
  return cachedToken!;
}

async function umamiGet(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const token = await getToken();
  const qs = new URLSearchParams(params).toString();
  const url = `${UMAMI_URL}/api/websites/${WEBSITE_ID}${path}${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    // Token might be expired — retry once
    if (res.status === 401) {
      cachedToken = null;
      const newToken = await getToken();
      const retry = await fetch(url, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      if (retry.ok) return retry.json();
    }
    return null;
  }

  return res.json();
}

// ── Umami v3 → v2 response normalisers ────────────────────────────────────
// v3 returns flat numbers ({ pageviews: 166 }) while the admin page expects
// the v2 shape ({ pageviews: { value: 166 } }).  These helpers bridge both.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeStats(raw: any): any {
  if (!raw) return null;
  // Already v2 format?
  if (raw.pageviews?.value !== undefined) return raw;
  return {
    pageviews: { value: raw.pageviews ?? 0 },
    visitors:  { value: raw.visitors ?? 0 },
    visits:    { value: raw.visits ?? 0 },
    bounces:   { value: raw.bounces ?? 0 },
    totaltime: { value: raw.totaltime ?? 0 },
  };
}

// v3 active-users returns { visitors: N } instead of { x: N }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeActive(raw: any): any {
  if (!raw) return { x: 0 };
  if (raw.x !== undefined) return raw;           // v2
  return { x: raw.visitors ?? 0 };               // v3
}

export async function GET() {
  // Admin-only
  const session = await getSession();
  if (!session || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!WEBSITE_ID) {
    return NextResponse.json({ error: 'Umami not configured' }, { status: 503 });
  }

  try {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const todayMs = String(todayStart.getTime());
    const nowMs = String(now);
    const weekMs = String(weekAgo);
    const monthMs = String(monthAgo);

    // Fetch all data in parallel
    const [
      activeUsers,
      statsToday,
      stats7d,
      stats30d,
      pageviews7d,
      topPages,
      referrers,
      countries,
      devices,
      browsers,
    ] = await Promise.all([
      umamiGet('/active'),
      umamiGet('/stats', { startAt: todayMs, endAt: nowMs }),
      umamiGet('/stats', { startAt: weekMs, endAt: nowMs }),
      umamiGet('/stats', { startAt: monthMs, endAt: nowMs }),
      umamiGet('/pageviews', { startAt: weekMs, endAt: nowMs, unit: 'day', timezone: 'UTC' }),
      umamiGet('/metrics', { startAt: monthMs, endAt: nowMs, type: 'path', limit: '10' }),
      umamiGet('/metrics', { startAt: monthMs, endAt: nowMs, type: 'referrer', limit: '10' }),
      umamiGet('/metrics', { startAt: monthMs, endAt: nowMs, type: 'country', limit: '10' }),
      umamiGet('/metrics', { startAt: monthMs, endAt: nowMs, type: 'device', limit: '5' }),
      umamiGet('/metrics', { startAt: monthMs, endAt: nowMs, type: 'browser', limit: '5' }),
    ]);

    return NextResponse.json({
      activeUsers: normalizeActive(activeUsers),
      statsToday:  normalizeStats(statsToday),
      stats7d:     normalizeStats(stats7d),
      stats30d:    normalizeStats(stats30d),
      pageviews7d,
      topPages,
      referrers,
      countries,
      devices,
      browsers,
    });
  } catch (error) {
    console.error('Analytics proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
