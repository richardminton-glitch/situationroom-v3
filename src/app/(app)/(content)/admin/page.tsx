'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { useRouter } from 'next/navigation';
import { ADMIN_EMAILS } from '@/lib/auth/tier';
import {
  AI_USAGE_DATA,
  AI_TOTAL_7D_USD as AI_TOTAL_7D,
  AI_TOTAL_30D_USD as AI_TOTAL_30D,
} from '@/lib/grok/usageEstimate';

// ── Types ────────────────────────────────────────────────────────────────────

interface Metrics {
  users: {
    total: number;
    tiers: Record<string, number>;
    paid: number;
    activeToday: number;
    activeWeek: number;
    activeMonth: number;
    newUsersWeek: number;
    newUsersMonth: number;
  };
  newsletter: { enabled: number; daily: number; weekly: number };
  revenue: {
    monthSats: number;
    monthCount: number;
    allTimeSats: number;
    allTimeCount: number;
    donationSats: number;
    donationCount: number;
  };
  chat: { messages24h: number; messagesWeek: number };
}

interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  tier: string;
  createdAt: string;
  lastSeenAt: string;
  newsletterEnabled: boolean;
  newsletterFrequency: string;
  subscriptionExpiresAt: string | null;
  subscriptionActivatedAt: string | null;
  hasNostr: boolean;
  chatDisplayName: string | null;
  totalPaidSats: number;
  totalDonatedSats: number;
  paymentCount: number;
}

interface AnalyticsData {
  activeUsers: { x: number } | null;
  statsToday: { pageviews: { value: number }; visitors: { value: number }; visits: { value: number }; bounces: { value: number }; totaltime: { value: number } } | null;
  stats7d: { pageviews: { value: number }; visitors: { value: number }; visits: { value: number }; bounces: { value: number }; totaltime: { value: number } } | null;
  stats30d: { pageviews: { value: number }; visitors: { value: number }; visits: { value: number }; bounces: { value: number }; totaltime: { value: number } } | null;
  pageviews7d: { pageviews: { x: string; y: number }[]; sessions: { x: string; y: number }[] } | null;
  topPages: { x: string; y: number }[] | null;
  referrers: { x: string; y: number }[] | null;
  countries: { x: string; y: number }[] | null;
  devices: { x: string; y: number }[] | null;
  browsers: { x: string; y: number }[] | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtSats(sats: number): string {
  if (sats >= 1_000_000) return `${(sats / 1_000_000).toFixed(2)}M`;
  if (sats >= 1_000) return `${(sats / 1_000).toFixed(1)}K`;
  return String(sats);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const TIER_COLORS: Record<string, string> = {
  free: '#8b7355',
  general: '#8b6914',
  members: '#4a6fa5',
  vip: '#7c5cbf',
  admin: '#e03030',
};

// ── Styles ───────────────────────────────────────────────────────────────────

const FONT = "Georgia, 'Times New Roman', serif";
const MONO = "'IBM Plex Mono', 'SF Mono', monospace";

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-primary)',
  padding: '16px',
  flex: 1,
  minWidth: 160,
};

const labelStyle: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: '9px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 4,
};

const valueStyle: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: '22px',
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const smallValueStyle: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: '11px',
  color: 'var(--text-secondary)',
};

// ── AI / LLM Cost Estimates ──────────────────────────────────────────────────
// AI_USAGE_DATA + totals are imported from @/lib/grok/usageEstimate so that
// this admin table and the /support page funding bar can never drift apart.
// Edit rows there, not here.

const MODEL_COLORS: Record<string, string> = {
  'grok-4.20': '#7c5cbf',
  'grok-4-1-fast': '#00c9a7',
  'grok-3': '#f0a500',
  'grok-3-mini-fast': '#4a9eff',
};

// ── API Usage Estimates ──────────────────────────────────────────────────────
// Calculated from cache TTLs, polling intervals, and cron schedules.
// Assumes continuous uptime with active traffic refreshing caches.

interface ApiUsageRow {
  service: string;
  endpoints: string;
  refresh: string;
  est7d: number;
  est30d: number;
  monthlyLimit: number | null;
  envVar: string | null;
}

const API_USAGE_DATA: ApiUsageRow[] = [
  {
    service: 'API-Ninjas',
    endpoints: '32 batch (indices, commodities, FX, equities, yields, rates) + monthly country refresh',
    refresh: '30m / 2h / 6h batch (market-aware) + 1× monthly cron',
    // Batch manager: ~32 calls/cycle, market-aware TTL.
    //   Mon–Fri market hours (6.5 h, 30 min TTL):  13 cycles × 32 = 416/day
    //   Mon–Fri other      (17.5 h, 2 h TTL):     ~9 cycles × 32 = 280/day
    //   Sat–Sun            (24 h, 6 h TTL):        4 cycles × 31 = 124/day (no equities)
    // Weekday avg ≈ 696/day, weekend ≈ 124/day
    // Weekly batch ≈ (696 × 5) + (124 × 2) = 3,728
    // Monthly batch ≈ 3,728 × 4.345 ≈ 16,200
    // + Country refresh cron: 4 endpoints × 173 countries = ~692 calls, runs 1×/month
    // Total monthly ≈ 16,200 + 692 ≈ 16,900 (~17% of 100K budget)
    est7d: 3_900,
    est30d: 16_900,
    monthlyLimit: 100_000,
    envVar: 'API_NINJAS_KEY',
  },
  {
    service: 'CoinGecko',
    endpoints: '3 (BTC market, 30d chart, BTC/GBP rate)',
    refresh: '90s / 30m / 5m cache',
    // BTC market 90 s TTL = 960/day
    // 30d chart   30 min TTL = 48/day
    // BTC/GBP      5 min TTL = 288/day
    // Total ≈ 1,296/day = 38,880/month
    est7d: 9_072,
    est30d: 38_880,
    monthlyLimit: null,
    envVar: null,
  },
  {
    service: 'Mempool.space',
    endpoints: '9 (fees, hashrate, mempool, blocks, lightning, whale)',
    refresh: '60s–10m cache (extended)',
    // 3 endpoints × 60 s   = 4,320/day  (tip, fees, mempool)
    // 2 endpoints × 5 min  =   576/day  (hashrate, difficulty)
    // 1 endpoint  × 10 min =   144/day  (lightning stats)
    // 1 endpoint  × 5 min  =   288/day  (whale)
    // 2 endpoints × 5 min  =   576/day  (latest blocks fallback, block txs)
    // 1 endpoint  × 30 min =    48/day  (chart hashrate)
    // Total ≈ 5,952/day = ~178K/month
    est7d: 41_664,
    est30d: 178_560,
    monthlyLimit: null,
    envVar: null,
  },
  {
    service: 'CoinMetrics',
    endpoints: '4 (MVRV, exchange flows, chart MVRV, chart exchange)',
    refresh: '1h cache (extended from 15m)',
    // 4 series × 24 refreshes/day = 96/day = 2,880/month
    est7d: 672,
    est30d: 2_880,
    monthlyLimit: null,
    envVar: null,
  },
  {
    service: 'BRK / Bitview',
    endpoints: '8 routes (CDD, hash ribbon, LTH/STH, URPD, Puell, UTXO, signals)',
    refresh: '1h file cache + daily cron',
    // 8 routes × ~2 calls × 24 refreshes = 384/day worst case (continuous traffic)
    // Realistic with intermittent traffic ≈ 200/day
    est7d: 2_352,
    est30d: 10_080,
    monthlyLimit: null,
    envVar: null,
  },
  {
    service: 'FRED',
    endpoints: '11 series (CB assets, rates, M2)',
    refresh: '7d cache + weekly cron',
    // ~11 calls/week worst case, mostly served from 7-day file cache
    est7d: 14,
    est30d: 60,
    monthlyLimit: null,
    envVar: 'FRED_API_KEY',
  },
  {
    service: 'RSS Feeds',
    endpoints: '17 feeds (Reuters, BBC, BTC Mag, CoinDesk, etc.)',
    refresh: '5min module cache',
    // 12 cache refreshes/hr × 24 h × 17 feeds = 4,896/day = ~147K/month (free)
    est7d: 34_272,
    est30d: 146_880,
    monthlyLimit: null,
    envVar: null,
  },
  {
    service: 'Alternative.me',
    endpoints: '1 (Fear & Greed)',
    refresh: '1h cache (extended from 5m)',
    // F&G publishes once per day; 1 call/hr = 24/day = 720/month
    est7d: 168,
    est30d: 720,
    monthlyLimit: null,
    envVar: null,
  },
  {
    service: 'Grok (xAI)',
    endpoints: '18 features (briefing pipeline, RSS classifier, on-demand member/VIP analysis, trading AI, ISM auto-update)',
    refresh: 'Daily cron + on-demand (cached) + hourly trading + per-headline classifier',
    // Sum of callsPerDay across AI_USAGE_DATA (single source of truth):
    //   Daily briefing pipeline (5 agents):         6/day
    //   VIP briefings:                             10/day
    //   RSS classifier:                            75/day
    //   Threat analysis:                           15/day
    //   Trading AI (hourly cron):                  24/day
    //   On-demand Members+/VIP analysis (~9 features, cached): ~46/day
    //   ≈ 176/day → ~5,300/month at current subscriber traffic.
    // grok-4.20 multi-agent (daily briefing) now dominates the dollar
    // cost — the on-chain + macro analyses migrated off grok-3 on
    // 2026-04-25 for ~95% reduction on those rows.
    est7d: 1_232,
    est30d: 5_280,
    monthlyLimit: null,
    envVar: 'GROK_API_KEY',
  },
  {
    service: 'Resend',
    endpoints: '1 (email delivery — Pro plan, $20/mo flat)',
    refresh: 'Daily newsletter + weekly digest + transactional',
    // Daily newsletter to ~320 paid users + weekly digest ~180 free + ~5/day txn
    // ≈ 320 + 25 + 5 = 350/day = ~10,500/month (subscriber-dependent).
    // Pro plan ceiling: 50K/mo. Free tier (3K) is well below our volume,
    // so we're paying $20/mo flat regardless of exact send count.
    est7d: 2_450,
    est30d: 10_500,
    monthlyLimit: 50_000,
    envVar: 'RESEND_API_KEY',
  },
  {
    service: 'LNMarkets',
    endpoints: '7 (invoices, pool, trading, position sync, ticker)',
    refresh: 'On-demand + 60s position-sync cron + hourly trading',
    // Position sync runs every 60 s but only calls LNM if running trades exist (else 0 calls)
    // Worst case (always running): 1,440/day = 43,200/month
    // Realistic with intermittent positions ≈ 800/day = 24,000/month
    // + Trading cycle (hourly): ~5 calls × 24 = 120/day
    // + Pool status (newsletter cron): 3/day
    // + Invoices: ~10/month
    est7d: 6_500,
    est30d: 28_000,
    monthlyLimit: null,
    envVar: 'LNM_OPS_KEY',
  },
  {
    service: 'Open-Notify',
    endpoints: '1 (ISS position)',
    refresh: '30s server cache (was 5s, no server cache)',
    // Single in-memory cache, max 2,880 upstream calls/day regardless of viewers
    // Realistic with continuous globe viewers ≈ 86,400/month
    est7d: 20_160,
    est30d: 86_400,
    monthlyLimit: null,
    envVar: null,
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Redirect non-admin
  useEffect(() => {
    if (!authLoading && (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase()))) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  // Fetch metrics
  useEffect(() => {
    fetch('/api/admin/metrics')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setMetrics(d); })
      .catch(() => {});
  }, []);

  // Fetch analytics (Umami)
  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d && !d.error) setAnalytics(d); })
      .catch(() => {});
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (search) params.set('q', search);
    if (tierFilter) params.set('tier', tierFilter);

    try {
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotal(data.total);
        setPages(data.pages);
      }
    } catch { /* */ }
    setLoading(false);
  }, [page, search, tierFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Update user field
  const updateUser = async (id: string, field: string, value: unknown) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        // Update local state
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, [field]: value } : u))
        );
      }
    } catch { /* */ }
    setSaving(false);
  };

  if (authLoading || !user) return null;
  if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) return null;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px', fontFamily: FONT }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: FONT, fontSize: '24px', fontWeight: 400,
          color: 'var(--text-primary)', letterSpacing: '0.04em', marginBottom: 4,
        }}>
          Admin Dashboard
        </h1>
        <p style={{ fontFamily: MONO, fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          PLATFORM METRICS & USER MANAGEMENT
        </p>
      </div>

      {/* ── Metrics Cards ── */}
      {metrics && (
        <div style={{ marginBottom: 32 }}>
          {/* Row 1: User counts */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={cardStyle}>
              <div style={labelStyle}>Total Users</div>
              <div style={valueStyle}>{metrics.users.total}</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>Active Today</div>
              <div style={valueStyle}>{metrics.users.activeToday}</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>Active 7d</div>
              <div style={valueStyle}>{metrics.users.activeWeek}</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>Active 30d</div>
              <div style={valueStyle}>{metrics.users.activeMonth}</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>Paid Users</div>
              <div style={valueStyle}>{metrics.users.paid}</div>
            </div>
          </div>

          {/* Row 2: Tier breakdown */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            {(['free', 'general', 'members', 'vip'] as const).map((t) => (
              <div key={t} style={cardStyle}>
                <div style={labelStyle}>{t.toUpperCase()}</div>
                <div style={{ ...valueStyle, color: TIER_COLORS[t] }}>
                  {metrics.users.tiers[t] || 0}
                </div>
              </div>
            ))}
            <div style={cardStyle}>
              <div style={labelStyle}>New (7d / 30d)</div>
              <div style={valueStyle}>
                {metrics.users.newUsersWeek}
                <span style={{ ...smallValueStyle, marginLeft: 6 }}>/ {metrics.users.newUsersMonth}</span>
              </div>
            </div>
          </div>

          {/* Row 3: Revenue + Newsletter + Chat */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={cardStyle}>
              <div style={labelStyle}>Revenue (30d)</div>
              <div style={valueStyle}>{fmtSats(metrics.revenue.monthSats)} <span style={smallValueStyle}>sats</span></div>
              <div style={smallValueStyle}>{metrics.revenue.monthCount} payments</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>Revenue (All Time)</div>
              <div style={valueStyle}>{fmtSats(metrics.revenue.allTimeSats)} <span style={smallValueStyle}>sats</span></div>
              <div style={smallValueStyle}>{metrics.revenue.allTimeCount} payments</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>Donations</div>
              <div style={valueStyle}>{fmtSats(metrics.revenue.donationSats)} <span style={smallValueStyle}>sats</span></div>
              <div style={smallValueStyle}>{metrics.revenue.donationCount} donations</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>Newsletter</div>
              <div style={valueStyle}>{metrics.newsletter.enabled}</div>
              <div style={smallValueStyle}>{metrics.newsletter.daily} daily / {metrics.newsletter.weekly} weekly</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>Chat (24h / 7d)</div>
              <div style={valueStyle}>{metrics.chat.messages24h}</div>
              <div style={smallValueStyle}>{metrics.chat.messagesWeek} this week</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Site Analytics (Umami) ── */}
      {analytics && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
          padding: '16px', marginBottom: 12,
        }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontFamily: FONT, fontSize: '16px', color: 'var(--text-primary)', fontWeight: 400 }}>
              Site Analytics
            </h2>
            <p style={{ fontFamily: MONO, fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: 2 }}>
              LIVE TRAFFIC DATA VIA UMAMI · PRIVACY-FIRST · NO COOKIES
            </p>
          </div>

          {/* Summary row */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={cardStyle}>
              <div style={labelStyle}>Active Now</div>
              <div style={{ ...valueStyle, color: '#2a6e2a' }}>
                {(analytics.activeUsers as Record<string, number>)?.x ?? 0}
              </div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>Visitors Today</div>
              <div style={valueStyle}>{analytics.statsToday?.visitors?.value ?? 0}</div>
              <div style={smallValueStyle}>{analytics.statsToday?.pageviews?.value ?? 0} pageviews</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>Visitors 7d</div>
              <div style={valueStyle}>{analytics.stats7d?.visitors?.value ?? 0}</div>
              <div style={smallValueStyle}>{analytics.stats7d?.pageviews?.value ?? 0} pageviews</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>Visitors 30d</div>
              <div style={valueStyle}>{analytics.stats30d?.visitors?.value ?? 0}</div>
              <div style={smallValueStyle}>{analytics.stats30d?.pageviews?.value ?? 0} pageviews</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>Bounce Rate (30d)</div>
              <div style={valueStyle}>
                {analytics.stats30d && analytics.stats30d.visits?.value > 0
                  ? `${Math.round((analytics.stats30d.bounces.value / analytics.stats30d.visits.value) * 100)}%`
                  : '—'}
              </div>
              <div style={smallValueStyle}>
                Avg: {analytics.stats30d && analytics.stats30d.visits?.value > 0
                  ? `${Math.round(analytics.stats30d.totaltime.value / analytics.stats30d.visits.value / 1000)}s`
                  : '—'}
              </div>
            </div>
          </div>

          {/* 7-day pageview chart (ASCII-style bar chart) */}
          {analytics.pageviews7d?.pageviews && analytics.pageviews7d.pageviews.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...labelStyle, marginBottom: 8 }}>Pageviews — Last 7 Days</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
                {analytics.pageviews7d.pageviews.map((point, i) => {
                  const max = Math.max(...analytics.pageviews7d!.pageviews.map((p) => p.y), 1);
                  const height = Math.max(2, (point.y / max) * 56);
                  const dayLabel = new Date(point.x).toLocaleDateString('en-GB', { weekday: 'short' });
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontFamily: MONO, fontSize: '9px', color: 'var(--text-muted)' }}>{point.y}</span>
                      <div style={{
                        width: '100%', height, maxWidth: 40,
                        backgroundColor: 'var(--accent-primary)', opacity: 0.8,
                        transition: 'height 0.3s ease',
                      }} />
                      <span style={{ fontFamily: MONO, fontSize: '8px', color: 'var(--text-muted)' }}>{dayLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom row: Top Pages, Referrers, Countries, Devices */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {/* Top Pages */}
            <div style={{ ...cardStyle, minWidth: 200 }}>
              <div style={{ ...labelStyle, marginBottom: 8 }}>Top Pages (30d)</div>
              {(analytics.topPages || []).slice(0, 8).map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: MONO, fontSize: '10px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                    {p.x || '/'}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
                    {p.y}
                  </span>
                </div>
              ))}
              {(!analytics.topPages || analytics.topPages.length === 0) && (
                <span style={{ fontFamily: MONO, fontSize: '10px', color: 'var(--text-muted)' }}>No data yet</span>
              )}
            </div>

            {/* Referrers */}
            <div style={{ ...cardStyle, minWidth: 180 }}>
              <div style={{ ...labelStyle, marginBottom: 8 }}>Referrers (30d)</div>
              {(analytics.referrers || []).slice(0, 8).map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: MONO, fontSize: '10px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>
                    {r.x || 'Direct'}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
                    {r.y}
                  </span>
                </div>
              ))}
              {(!analytics.referrers || analytics.referrers.length === 0) && (
                <span style={{ fontFamily: MONO, fontSize: '10px', color: 'var(--text-muted)' }}>No data yet</span>
              )}
            </div>

            {/* Countries */}
            <div style={{ ...cardStyle, minWidth: 140 }}>
              <div style={{ ...labelStyle, marginBottom: 8 }}>Countries (30d)</div>
              {(analytics.countries || []).slice(0, 8).map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: MONO, fontSize: '10px', color: 'var(--text-secondary)' }}>
                    {c.x || '??'}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: '10px', color: 'var(--text-muted)', marginLeft: 8 }}>
                    {c.y}
                  </span>
                </div>
              ))}
              {(!analytics.countries || analytics.countries.length === 0) && (
                <span style={{ fontFamily: MONO, fontSize: '10px', color: 'var(--text-muted)' }}>No data yet</span>
              )}
            </div>

            {/* Devices & Browsers */}
            <div style={{ ...cardStyle, minWidth: 140 }}>
              <div style={{ ...labelStyle, marginBottom: 8 }}>Devices (30d)</div>
              {(analytics.devices || []).map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: MONO, fontSize: '10px', color: 'var(--text-secondary)' }}>{d.x}</span>
                  <span style={{ fontFamily: MONO, fontSize: '10px', color: 'var(--text-muted)', marginLeft: 8 }}>{d.y}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 6, paddingTop: 6 }}>
                <div style={{ ...labelStyle, marginBottom: 4 }}>Browsers</div>
                {(analytics.browsers || []).map((b, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontFamily: MONO, fontSize: '10px', color: 'var(--text-secondary)' }}>{b.x}</span>
                    <span style={{ fontFamily: MONO, fontSize: '10px', color: 'var(--text-muted)', marginLeft: 8 }}>{b.y}</span>
                  </div>
                ))}
              </div>
              {(!analytics.devices || analytics.devices.length === 0) && (
                <span style={{ fontFamily: MONO, fontSize: '10px', color: 'var(--text-muted)' }}>No data yet</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── AI / LLM Cost Estimates ── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
        padding: '16px', marginBottom: 12,
      }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontFamily: FONT, fontSize: '16px', color: 'var(--text-primary)', fontWeight: 400 }}>
            AI / LLM Cost Estimates
          </h2>
          <p style={{ fontFamily: MONO, fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: 2 }}>
            PROJECTED xAI GROK SPEND BASED ON TOKEN USAGE AND CURRENT PRICING
          </p>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ ...cardStyle, minWidth: 120, flex: 'none' }}>
            <div style={labelStyle}>Est. 7d Cost</div>
            <div style={{ ...valueStyle, color: '#00c9a7' }}>${AI_TOTAL_7D.toFixed(2)}</div>
          </div>
          <div style={{ ...cardStyle, minWidth: 120, flex: 'none' }}>
            <div style={labelStyle}>Est. 30d Cost</div>
            <div style={{ ...valueStyle, color: '#f0a500' }}>${AI_TOTAL_30D.toFixed(2)}</div>
          </div>
          <div style={{ ...cardStyle, minWidth: 120, flex: 'none' }}>
            <div style={labelStyle}>Est. Annual</div>
            <div style={{ ...valueStyle, color: 'var(--text-secondary)' }}>${(AI_TOTAL_30D * 12).toFixed(0)}</div>
          </div>
          <div style={{ ...cardStyle, minWidth: 180, flex: 'none' }}>
            <div style={labelStyle}>Top Cost Driver</div>
            {(() => {
              const top = [...AI_USAGE_DATA].sort((a, b) => b.est30dCost - a.est30dCost)[0];
              const pct = AI_TOTAL_30D > 0 ? ((top.est30dCost / AI_TOTAL_30D) * 100).toFixed(0) : '0';
              return (
                <>
                  <div style={{ fontFamily: MONO, fontSize: '13px', fontWeight: 600, color: MODEL_COLORS[top.model] || 'var(--text-primary)' }}>
                    {top.feature}
                  </div>
                  <div style={smallValueStyle}>
                    {top.model} — {pct}% of total
                  </div>
                </>
              );
            })()}
          </div>
          <div style={{ ...cardStyle, flex: 1, minWidth: 200 }}>
            <div style={labelStyle}>Model Breakdown (30d)</div>
            <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
              {(['grok-4.20', 'grok-4-1-fast', 'grok-3-mini-fast'] as const).map((m) => {
                const mCost = AI_USAGE_DATA.filter((r) => r.model === m).reduce((s, r) => s + r.est30dCost, 0);
                return (
                  <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: MODEL_COLORS[m] }} />
                    <span style={{ fontFamily: MONO, fontSize: '10px', color: MODEL_COLORS[m] }}>{m}</span>
                    <span style={{ fontFamily: MONO, fontSize: '10px', color: 'var(--text-muted)' }}>${mCost.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cost breakdown bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
            {(['grok-4.20', 'grok-4-1-fast', 'grok-3-mini-fast'] as const).map((m) => {
              const mCost = AI_USAGE_DATA.filter((r) => r.model === m).reduce((s, r) => s + r.est30dCost, 0);
              const pct = AI_TOTAL_30D > 0 ? (mCost / AI_TOTAL_30D) * 100 : 0;
              return <div key={m} style={{ width: `${pct}%`, background: MODEL_COLORS[m], minWidth: pct > 0 ? 2 : 0 }} />;
            })}
          </div>
        </div>

        {/* Detail table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO, fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                {['Feature', 'Model', 'Trigger', 'In / Out Tokens', 'Calls/Day', '$/Call', 'Est. 7d', 'Est. 30d'].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '8px 6px', fontWeight: 600,
                    fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AI_USAGE_DATA.map((row) => (
                <tr key={row.feature} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px 6px', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {row.feature}
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <span style={{
                      fontSize: '9px', padding: '1px 5px', borderRadius: 2,
                      background: `${MODEL_COLORS[row.model]}18`,
                      color: MODEL_COLORS[row.model],
                      fontWeight: 600, letterSpacing: '0.03em',
                    }}>
                      {row.model}
                    </span>
                  </td>
                  <td style={{ padding: '8px 6px', color: 'var(--text-secondary)', fontSize: '10px' }}>
                    {row.trigger}
                  </td>
                  <td style={{ padding: '8px 6px', color: 'var(--text-secondary)', fontSize: '10px', fontVariantNumeric: 'tabular-nums' }}>
                    {row.inputTokens.toLocaleString()} / {row.outputTokens.toLocaleString()}
                  </td>
                  <td style={{ padding: '8px 6px', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    ~{row.callsPerDay}
                  </td>
                  <td style={{ padding: '8px 6px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', fontSize: '10px' }}>
                    {row.costPerCall < 0.01 ? `$${row.costPerCall.toFixed(4)}` : `$${row.costPerCall.toFixed(3)}`}
                  </td>
                  <td style={{ padding: '8px 6px', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    ${row.est7dCost.toFixed(2)}
                  </td>
                  <td style={{ padding: '8px 6px', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{
                      color: row.est30dCost > 5 ? '#e03030' : row.est30dCost > 1 ? '#f0a500' : 'var(--text-primary)',
                      fontWeight: row.est30dCost > 1 ? 600 : 400,
                    }}>
                      ${row.est30dCost.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1px solid var(--border-primary)' }}>
                <td style={{ padding: '8px 6px', fontWeight: 600, color: 'var(--text-primary)' }}>TOTAL</td>
                <td /><td /><td />
                <td style={{ padding: '8px 6px', fontWeight: 600, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  ~{AI_USAGE_DATA.reduce((s, r) => s + r.callsPerDay, 0)}/day
                </td>
                <td />
                <td style={{ padding: '8px 6px', fontWeight: 600, color: '#00c9a7', fontVariantNumeric: 'tabular-nums' }}>
                  ${AI_TOTAL_7D.toFixed(2)}
                </td>
                <td style={{ padding: '8px 6px', fontWeight: 600, color: '#f0a500', fontVariantNumeric: 'tabular-nums' }}>
                  ${AI_TOTAL_30D.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p style={{ fontFamily: MONO, fontSize: '9px', color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.6 }}>
          Pricing: grok-4.20 multi-agent (Responses API) $3.00/$15.00 per M tokens + $5/1K web searches •
          grok-4-1-fast-non-reasoning $0.20/$0.50 per M tokens •
          grok-3-mini-fast ~$0.10/$0.40 per M tokens.
          xAI deprecated grok-3 for the Responses API in late Apr 2026; on-chain &amp; macro analyses
          (Members + VIP) and the briefing fallback path migrated to grok-4-1-fast-non-reasoning
          on 2026-04-25 for ~95% cost reduction on those rows. On-demand estimates assume moderate
          subscriber traffic with aggressive caching. VIP briefings scale linearly with VIP user
          count (~$0.001/user/day). RSS classifier volume depends on feed velocity and keyword
          confidence thresholds (120 calls/hr hard cap).
        </p>
      </div>

      {/* ── API Usage Estimates ── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
        padding: '16px', marginBottom: 32,
      }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontFamily: FONT, fontSize: '16px', color: 'var(--text-primary)', fontWeight: 400 }}>
            API Call Estimates
          </h2>
          <p style={{ fontFamily: MONO, fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: 2 }}>
            PROJECTED USAGE BASED ON CACHE TTL AND POLLING INTERVALS
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO, fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                {['Service', 'Endpoints', 'Refresh Rate', 'Est. 7d', 'Est. 30d', 'Limit', 'Key'].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '8px 6px', fontWeight: 600,
                    fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {API_USAGE_DATA.map((api) => {
                const pct30 = api.monthlyLimit ? (api.est30d / api.monthlyLimit) * 100 : null;
                const barColor = pct30 === null ? 'transparent' : pct30 > 80 ? '#e03030' : pct30 > 50 ? '#f0a500' : '#00c9a7';
                return (
                  <tr key={api.service} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 6px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {api.service}
                    </td>
                    <td style={{ padding: '8px 6px', color: 'var(--text-secondary)', fontSize: '10px' }}>
                      {api.endpoints}
                    </td>
                    <td style={{ padding: '8px 6px', color: 'var(--text-secondary)', fontSize: '10px' }}>
                      {api.refresh}
                    </td>
                    <td style={{ padding: '8px 6px', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {api.est7d.toLocaleString()}
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                          {api.est30d.toLocaleString()}
                        </span>
                        {pct30 !== null && (
                          <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, pct30)}%`, height: '100%', background: barColor, borderRadius: 2 }} />
                          </div>
                        )}
                        {pct30 !== null && (
                          <span style={{ fontSize: '9px', color: barColor }}>{pct30.toFixed(0)}%</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '8px 6px', color: 'var(--text-muted)', fontSize: '10px' }}>
                      {api.monthlyLimit ? `${(api.monthlyLimit / 1000).toFixed(0)}K/mo` : 'Free'}
                    </td>
                    <td style={{ padding: '8px 6px', fontSize: '10px' }}>
                      {api.envVar ? (
                        <span style={{ color: '#00c9a7', fontSize: '9px' }}>{api.envVar}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1px solid var(--border-primary)' }}>
                <td style={{ padding: '8px 6px', fontWeight: 600, color: 'var(--text-primary)' }}>TOTAL</td>
                <td />
                <td />
                <td style={{ padding: '8px 6px', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {API_USAGE_DATA.reduce((s, a) => s + a.est7d, 0).toLocaleString()}
                </td>
                <td style={{ padding: '8px 6px', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {API_USAGE_DATA.reduce((s, a) => s + a.est30d, 0).toLocaleString()}
                </td>
                <td />
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <p style={{ fontFamily: MONO, fontSize: '9px', color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.6 }}>
          Estimates assume continuous uptime with at least one active user keeping caches warm.
          All external calls go through server-side in-memory caches with TTLs tuned to each
          source&apos;s natural update cadence — multiple users share one upstream call per TTL window.
          API-Ninjas uses a market-aware batch manager (30 min during US market hours, 2 h off-hours,
          6 h weekends) plus a hard stop at 95% of the 100K monthly budget. Position-sync hits LN Markets
          only when an open trade exists. ISS uses a 30 s server cache so the upstream is hit at most
          ~2.9K times/day regardless of viewer count.
        </p>
      </div>

      {/* ── User Management ── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
        padding: '16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ fontFamily: FONT, fontSize: '16px', color: 'var(--text-primary)', fontWeight: 400 }}>
              User Accounts
            </h2>
            <span style={{ fontFamily: MONO, fontSize: '10px', color: 'var(--text-muted)' }}>
              {total} total {tierFilter && `(${tierFilter})`}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Search */}
            <input
              type="text"
              placeholder="Search email or name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                fontFamily: MONO, fontSize: '11px', padding: '6px 10px',
                background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)', width: 220, outline: 'none',
              }}
            />

            {/* Tier filter */}
            <select
              value={tierFilter}
              onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
              style={{
                fontFamily: MONO, fontSize: '11px', padding: '6px 8px',
                background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)', cursor: 'pointer',
              }}
            >
              <option value="">All tiers</option>
              <option value="free">Free</option>
              <option value="general">General</option>
              <option value="members">Members</option>
              <option value="vip">VIP</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO, fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                {['Email', 'Tier', 'Newsletter', 'Sub Expires', 'Paid', 'Donated', 'Last Seen', 'Joined', ''].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '8px 6px', fontWeight: 600,
                    fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isEditing = editingId === u.id;
                return (
                  <tr key={u.id} style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    background: isEditing ? 'var(--bg-secondary)' : 'transparent',
                  }}>
                    {/* Email */}
                    <td style={{ padding: '8px 6px', color: 'var(--text-primary)' }}>
                      <div>{u.email}</div>
                      {u.displayName && (
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{u.displayName}</div>
                      )}
                    </td>

                    {/* Tier */}
                    <td style={{ padding: '8px 6px' }}>
                      {isEditing ? (
                        <select
                          value={u.tier}
                          onChange={(e) => updateUser(u.id, 'tier', e.target.value)}
                          disabled={saving}
                          style={{
                            fontFamily: MONO, fontSize: '10px', padding: '2px 4px',
                            background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)',
                            color: TIER_COLORS[u.tier] || 'var(--text-primary)',
                          }}
                        >
                          <option value="free">Free</option>
                          <option value="general">General</option>
                          <option value="members">Members</option>
                          <option value="vip">VIP</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span style={{
                          fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: TIER_COLORS[u.tier] || 'var(--text-secondary)',
                        }}>
                          {u.tier}
                        </span>
                      )}
                    </td>

                    {/* Newsletter */}
                    <td style={{ padding: '8px 6px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={u.newsletterEnabled}
                            onChange={(e) => updateUser(u.id, 'newsletterEnabled', e.target.checked)}
                            disabled={saving}
                          />
                          <select
                            value={u.newsletterFrequency}
                            onChange={(e) => updateUser(u.id, 'newsletterFrequency', e.target.value)}
                            disabled={saving}
                            style={{
                              fontFamily: MONO, fontSize: '9px', padding: '1px 3px',
                              background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                          </select>
                        </div>
                      ) : (
                        <span style={{ color: u.newsletterEnabled ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                          {u.newsletterEnabled ? u.newsletterFrequency : 'off'}
                        </span>
                      )}
                    </td>

                    {/* Sub expires */}
                    <td style={{ padding: '8px 6px', color: 'var(--text-secondary)', fontSize: '10px' }}>
                      {u.subscriptionExpiresAt ? fmtDate(u.subscriptionExpiresAt) : '--'}
                    </td>

                    {/* Paid */}
                    <td style={{ padding: '8px 6px', color: 'var(--text-secondary)', fontSize: '10px' }}>
                      {u.totalPaidSats > 0 ? `${fmtSats(u.totalPaidSats)}` : '--'}
                    </td>

                    {/* Donated */}
                    <td style={{ padding: '8px 6px', color: 'var(--text-secondary)', fontSize: '10px' }}>
                      {u.totalDonatedSats > 0 ? `${fmtSats(u.totalDonatedSats)}` : '--'}
                    </td>

                    {/* Last Seen */}
                    <td style={{ padding: '8px 6px', color: 'var(--text-muted)', fontSize: '10px' }}>
                      {timeAgo(u.lastSeenAt)}
                    </td>

                    {/* Joined */}
                    <td style={{ padding: '8px 6px', color: 'var(--text-muted)', fontSize: '10px' }}>
                      {fmtDate(u.createdAt)}
                    </td>

                    {/* Edit toggle */}
                    <td style={{ padding: '8px 6px' }}>
                      <button
                        onClick={() => setEditingId(isEditing ? null : u.id)}
                        style={{
                          fontFamily: MONO, fontSize: '9px', padding: '2px 8px',
                          background: isEditing ? 'var(--accent-primary)' : 'transparent',
                          color: isEditing ? 'var(--bg-primary)' : 'var(--text-muted)',
                          border: '1px solid var(--border-subtle)',
                          cursor: 'pointer', letterSpacing: '0.06em',
                        }}
                      >
                        {isEditing ? 'DONE' : 'EDIT'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} style={{ padding: '24px 6px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 8,
            marginTop: 16, fontFamily: MONO, fontSize: '10px',
          }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={{
                padding: '4px 12px', border: '1px solid var(--border-subtle)',
                background: 'var(--bg-primary)', color: 'var(--text-secondary)',
                cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1,
              }}
            >
              PREV
            </button>
            <span style={{ padding: '4px 8px', color: 'var(--text-muted)' }}>
              {page} / {pages}
            </span>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: '4px 12px', border: '1px solid var(--border-subtle)',
                background: 'var(--bg-primary)', color: 'var(--text-secondary)',
                cursor: page >= pages ? 'default' : 'pointer', opacity: page >= pages ? 0.4 : 1,
              }}
            >
              NEXT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
