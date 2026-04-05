'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { useRouter } from 'next/navigation';
import { ADMIN_EMAILS } from '@/lib/auth/tier';

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
// Based on xAI pricing (Apr 2026):
//   grok-4.20 multi-agent (Responses API): $3.00/M in, $15.00/M out + $5/1K web searches
//   grok-4-1-fast-non-reasoning:           $0.20/M in, $0.50/M out

interface AiUsageRow {
  feature: string;
  model: string;
  trigger: string;
  inputTokens: number;   // avg per call
  outputTokens: number;  // avg per call
  callsPerDay: number;   // estimated avg
  costPerCall: number;   // USD
  est7dCost: number;     // USD
  est30dCost: number;    // USD
}

const MODEL_COLORS: Record<string, string> = {
  'grok-4.20': '#7c5cbf',
  'grok-4-1-fast': '#00c9a7',
  'grok-3': '#f0a500',
};

const AI_USAGE_DATA: AiUsageRow[] = [
  {
    feature: 'Daily Briefing',
    model: 'grok-4.20',
    trigger: 'Cron 06:00 UTC',
    inputTokens: 3_000,
    outputTokens: 400,
    callsPerDay: 6,
    // (3000 × $3/M) + (400 × $15/M) + ~3 web searches × $0.005 = $0.030
    costPerCall: 0.030,
    est7dCost: 1.26,
    est30dCost: 5.40,
  },
  {
    feature: 'VIP Briefings',
    model: 'grok-4-1-fast',
    trigger: 'Cron 06:10 UTC',
    inputTokens: 1_750,
    outputTokens: 250,
    callsPerDay: 10,  // ~5 VIP users × 2 calls
    costPerCall: 0.0005,
    est7dCost: 0.04,
    est30dCost: 0.15,
  },
  {
    feature: 'RSS Classifier',
    model: 'grok-4-1-fast',
    trigger: 'Auto (feed ingest)',
    inputTokens: 1_250,
    outputTokens: 175,
    callsPerDay: 75,  // 50–100 depending on feed velocity
    // (1250 × $0.20/M) + (175 × $0.50/M) = $0.0003
    costPerCall: 0.0003,
    est7dCost: 0.16,
    est30dCost: 0.68,
  },
  {
    feature: 'Signal Annotation',
    model: 'grok-4-1-fast',
    trigger: 'On-demand (Members+)',
    inputTokens: 800,
    outputTokens: 125,
    callsPerDay: 10,
    costPerCall: 0.0002,
    est7dCost: 0.01,
    est30dCost: 0.06,
  },
  {
    feature: 'Signal Interpreter',
    model: 'grok-4-1-fast',
    trigger: 'On-demand (Members+)',
    inputTokens: 2_500,
    outputTokens: 750,
    callsPerDay: 5,
    costPerCall: 0.0009,
    est7dCost: 0.03,
    est30dCost: 0.14,
  },
  {
    feature: 'Cohort Analysis',
    model: 'grok-4-1-fast',
    trigger: 'On-demand (Members+)',
    inputTokens: 1_800,
    outputTokens: 430,
    callsPerDay: 4,
    costPerCall: 0.0006,
    est7dCost: 0.02,
    est30dCost: 0.07,
  },
  {
    feature: 'Bitcoin Argument',
    model: 'grok-4-1-fast',
    trigger: 'On-demand (Members+)',
    inputTokens: 2_000,
    outputTokens: 500,
    callsPerDay: 2,
    costPerCall: 0.0007,
    est7dCost: 0.01,
    est30dCost: 0.04,
  },
  {
    feature: 'Pattern Historian',
    model: 'grok-4-1-fast',
    trigger: 'On-demand (Members+)',
    inputTokens: 1_600,
    outputTokens: 430,
    callsPerDay: 3,
    costPerCall: 0.0005,
    est7dCost: 0.01,
    est30dCost: 0.05,
  },
  {
    feature: 'Briefing Search',
    model: 'grok-4-1-fast',
    trigger: 'On-demand (VIP only)',
    inputTokens: 10_000,
    outputTokens: 1_100,
    callsPerDay: 2,
    costPerCall: 0.0026,
    est7dCost: 0.04,
    est30dCost: 0.16,
  },
  {
    feature: 'Briefing Retrospective',
    model: 'grok-4-1-fast',
    trigger: 'On-demand (Members+)',
    inputTokens: 2_500,
    outputTokens: 450,
    callsPerDay: 3,
    costPerCall: 0.0007,
    est7dCost: 0.02,
    est30dCost: 0.06,
  },
  {
    feature: 'Threat Analysis',
    model: 'grok-4-1-fast',
    trigger: 'Auto (state shifts)',
    inputTokens: 1_200,
    outputTokens: 175,
    callsPerDay: 15,
    costPerCall: 0.0003,
    est7dCost: 0.03,
    est30dCost: 0.14,
  },
  {
    feature: 'On-Chain Deep Analysis',
    model: 'grok-3',
    trigger: 'On-demand (VIP only)',
    inputTokens: 3_000,
    outputTokens: 1_200,
    callsPerDay: 4,  // ~4 VIP users × 1 call per 6h window
    // (3000 × $3/M) + (1200 × $15/M) = $0.009 + $0.018 = $0.027
    costPerCall: 0.027,
    est7dCost: 0.76,
    est30dCost: 3.24,
  },
];

const AI_TOTAL_7D = AI_USAGE_DATA.reduce((s, r) => s + r.est7dCost, 0);
const AI_TOTAL_30D = AI_USAGE_DATA.reduce((s, r) => s + r.est30dCost, 0);

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
    endpoints: '31 (indices, commodities, FX, equities, yields, rates)',
    refresh: '30m–6h (market-aware)',
    // ~32 calls/cycle. ~24 cycles/day (market hrs) + ~6 cycles/day (off hrs) = ~16 avg/day
    // ~16 cycles × 32 = 512/day avg
    est7d: 3_580,
    est30d: 15_360,
    monthlyLimit: 100_000,
    envVar: 'API_NINJAS_KEY',
  },
  {
    service: 'CoinGecko',
    endpoints: '1 (BTC market)',
    refresh: '60s cache',
    // 1 call per 60s = 1440/day
    est7d: 10_080,
    est30d: 43_200,
    monthlyLimit: null,
    envVar: null,
  },
  {
    service: 'Mempool.space',
    endpoints: '9 (fees, hashrate, mempool, blocks, lightning)',
    refresh: '30–120s cache',
    // ~9 endpoints avg 60s = 9 × 1440 = 12,960/day
    est7d: 90_720,
    est30d: 388_800,
    monthlyLimit: null,
    envVar: null,
  },
  {
    service: 'CoinMetrics',
    endpoints: '2 (MVRV, exchange flows)',
    refresh: '15min cache',
    // 2 × 96/day = 192/day
    est7d: 1_344,
    est30d: 5_760,
    monthlyLimit: null,
    envVar: null,
  },
  {
    service: 'BRK / Bitview',
    endpoints: '8 routes (CDD, hash ribbon, LTH/STH, URPD, Puell, UTXO, signals)',
    refresh: '1h cache + daily cron',
    // 8 routes × 24/day = 192/day (each route may bulk-fetch multiple series)
    est7d: 1_344,
    est30d: 5_760,
    monthlyLimit: null,
    envVar: null,
  },
  {
    service: 'FRED',
    endpoints: '11 series (CB assets, rates, M2)',
    refresh: '7d cache, weekly cron',
    // ~11 calls/week for CB data, ~4 calls/week for M2
    est7d: 15,
    est30d: 60,
    monthlyLimit: null,
    envVar: 'FRED_API_KEY',
  },
  {
    service: 'RSS Feeds',
    endpoints: '17 feeds (Reuters, BBC, BTC Mag, CoinDesk, etc.)',
    refresh: '5min cache',
    // 17 feeds × 288/day = 4,896/day
    est7d: 34_272,
    est30d: 146_880,
    monthlyLimit: null,
    envVar: null,
  },
  {
    service: 'Alternative.me',
    endpoints: '1 (Fear & Greed)',
    refresh: '5min cache',
    // 288/day
    est7d: 2_016,
    est30d: 8_640,
    monthlyLimit: null,
    envVar: null,
  },
  {
    service: 'Grok (xAI)',
    endpoints: '11 (briefing, classification, 9 analysis routes)',
    refresh: 'Daily cron + on-demand',
    // Daily briefing: 1/day, VIP: 1/day, classifications: ~50/day, analysis: ~5/day
    est7d: 400,
    est30d: 1_710,
    monthlyLimit: null,
    envVar: 'GROK_API_KEY',
  },
  {
    service: 'Resend',
    endpoints: '1 (email delivery)',
    refresh: 'Daily + weekly cron',
    // Depends on subscriber count. Estimate ~20 emails/day
    est7d: 140,
    est30d: 600,
    monthlyLimit: null,
    envVar: 'RESEND_API_KEY',
  },
  {
    service: 'LNMarkets',
    endpoints: '2 (invoices, pool status)',
    refresh: 'On-demand + 60s poll',
    // Pool status: 1440/day, invoices: ~5/day
    est7d: 10_115,
    est30d: 43_350,
    monthlyLimit: null,
    envVar: 'LNM_OPS_KEY',
  },
  {
    service: 'Open-Notify',
    endpoints: '1 (ISS position)',
    refresh: '5s cache',
    // 17,280/day
    est7d: 120_960,
    est30d: 518_400,
    monthlyLimit: null,
    envVar: null,
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [metrics, setMetrics] = useState<Metrics | null>(null);
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
              {(['grok-4.20', 'grok-3', 'grok-4-1-fast'] as const).map((m) => {
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
            {(['grok-4.20', 'grok-3', 'grok-4-1-fast'] as const).map((m) => {
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
          Pricing: grok-4.20 (Responses API) $3.00/$15.00 per M tokens + $5/1K web searches •
          grok-4-1-fast $0.20/$0.50 per M tokens.
          On-demand estimates assume moderate subscriber traffic with aggressive caching.
          VIP briefings scale linearly with VIP user count (~$0.001/user/day).
          RSS classifier volume depends on feed velocity and keyword confidence thresholds (120 calls/hr hard cap).
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
          Estimates assume continuous uptime with at least one active user refreshing caches.
          API-Ninjas calls reduce outside US market hours (2-hour TTL) and on weekends (6-hour TTL).
          BRK and RSS scale with active users but are bounded by server-side caching.
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
