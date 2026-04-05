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
