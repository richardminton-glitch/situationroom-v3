'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { useTier } from '@/hooks/useTier';
import { TierGate } from '@/components/auth/TierGate';
import { PanelLoading } from './shared';

const VIP_TOPICS = [
  { id: 'price-action', label: 'Price Action' },
  { id: 'network-health', label: 'Network Health' },
  { id: 'onchain-flows', label: 'On-Chain Flows' },
  { id: 'macro-rates', label: 'Macro Rates' },
  { id: 'geopolitics', label: 'Geopolitics' },
  { id: 'mining', label: 'Mining' },
  { id: 'lightning', label: 'Lightning' },
  { id: 'derivatives', label: 'Derivatives' },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface NewsletterSettings {
  email: string;
  newsletterEnabled: boolean;
  newsletterFrequency: 'daily' | 'weekly';
  newsletterDay: number;
  newsletterVipTopics: string[];
  newsletterLastSent: string | null;
  newsletterConfirmedAt: string | null;
}

export function AccountSettingsPanel() {
  const { user, loading } = useAuth();
  const { userTier, canAccess } = useTier();
  const [settings, setSettings] = useState<NewsletterSettings | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/newsletter/settings');
      if (res.ok) setSettings(await res.json());
    } catch { /* */ }
    finally { setFetching(false); }
  }, []);

  useEffect(() => { if (user) fetchSettings(); }, [user, fetchSettings]);

  const flash = (text: string, ok: boolean) => {
    setMessage({ text, ok });
    setTimeout(() => setMessage(null), 3500);
  };

  const save = async (patch: Partial<NewsletterSettings>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/newsletter/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (res.ok) {
        setSettings((prev) => prev ? { ...prev, ...patch, ...data } : prev);
        flash('Saved', true);
      } else {
        flash(data.error || 'Save failed', false);
      }
    } catch {
      flash('Network error', false);
    }
    setSaving(false);
  };

  const resendConfirmation = async () => {
    setResending(true);
    try {
      const res = await fetch('/api/newsletter/send-confirmation', { method: 'POST' });
      const data = await res.json();
      flash(res.ok ? 'Confirmation email sent' : (data.error || 'Failed'), res.ok);
    } catch {
      flash('Network error', false);
    }
    setResending(false);
  };

  const toggleTopic = (topicId: string) => {
    if (!settings) return;
    const current = settings.newsletterVipTopics;
    const next = current.includes(topicId)
      ? current.filter((t) => t !== topicId)
      : current.length < 3 ? [...current, topicId] : current;
    save({ newsletterVipTopics: next });
  };

  if (loading || fetching) return <PanelLoading />;
  if (!user) {
    return (
      <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>
        Sign in to manage your account settings.
      </p>
    );
  }

  const isConfirmed = !!settings?.newsletterConfirmedAt;
  const isEnabled = settings?.newsletterEnabled ?? false;

  return (
    <div className="flex flex-col gap-4 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>

      {/* ── BRIEFINGS & NEWSLETTER ───────────────────────────────────────────── */}
      <section>
        <div
          className="uppercase tracking-widest mb-3"
          style={{ fontSize: '9px', letterSpacing: '0.18em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}
        >
          Briefings &amp; Newsletter
        </div>

        {/* No email on account */}
        {!settings?.email && (
          <p style={{ color: 'var(--accent-danger)', marginBottom: '8px' }}>
            No email address on this account — cannot send newsletters.
          </p>
        )}

        {/* Enable toggle */}
        <label className="flex items-center justify-between cursor-pointer mb-3">
          <span style={{ color: 'var(--text-secondary)' }}>Email newsletter</span>
          <button
            onClick={() => save({ newsletterEnabled: !isEnabled })}
            disabled={saving || !settings?.email}
            className="px-3 py-1 rounded"
            style={{
              backgroundColor: isEnabled ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: isEnabled ? 'var(--bg-primary)' : 'var(--text-muted)',
              border: '1px solid var(--border-primary)',
              opacity: saving || !settings?.email ? 0.5 : 1,
            }}
          >
            {isEnabled ? 'ON' : 'OFF'}
          </button>
        </label>

        {/* Confirmation status */}
        {isEnabled && (
          <div className="mb-3 p-2 rounded" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            {isConfirmed ? (
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--accent-success)' }}>
                  ✓ Confirmed
                  {settings?.newsletterLastSent && (
                    <span style={{ color: 'var(--text-muted)' }}>
                      {' · Last sent: '}{new Date(settings.newsletterLastSent).toLocaleDateString()}
                    </span>
                  )}
                </span>
                <button
                  onClick={() => save({ newsletterEnabled: false })}
                  style={{ color: 'var(--accent-danger)', textDecoration: 'underline' }}
                >
                  Unsubscribe
                </button>
              </div>
            ) : (
              <div>
                <span style={{ color: 'var(--accent-warning, #c4885a)' }}>⚠ Awaiting confirmation</span>
                <span style={{ color: 'var(--text-muted)' }}> — check your inbox ({settings?.email})</span>
                <button
                  onClick={resendConfirmation}
                  disabled={resending}
                  className="block mt-1 uppercase tracking-wider"
                  style={{ color: 'var(--accent-primary)', textDecoration: 'underline', fontSize: '9px', opacity: resending ? 0.5 : 1 }}
                >
                  {resending ? 'Sending…' : 'Resend Confirmation'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Frequency — General+ only */}
        <div className="mb-3">
          <div style={{ color: 'var(--text-muted)', marginBottom: '6px' }}>Frequency</div>
          <div className="flex gap-2">
            {(['weekly', 'daily'] as const).map((freq) => {
              const requiresGeneral = freq === 'daily';
              const locked = requiresGeneral && !canAccess('general');
              return (
                <button
                  key={freq}
                  onClick={() => !locked && save({ newsletterFrequency: freq })}
                  disabled={saving || locked}
                  className="px-3 py-1 rounded capitalize"
                  style={{
                    backgroundColor: settings?.newsletterFrequency === freq ? 'var(--bg-secondary)' : 'transparent',
                    color: locked ? 'var(--text-muted)' : settings?.newsletterFrequency === freq ? 'var(--text-primary)' : 'var(--text-muted)',
                    border: settings?.newsletterFrequency === freq ? '1px solid var(--border-primary)' : '1px solid transparent',
                    opacity: locked ? 0.45 : 1,
                  }}
                >
                  {freq}{locked ? ' [GENERAL ↑]' : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day picker — shown when weekly */}
        {(settings?.newsletterFrequency === 'weekly' || !canAccess('general')) && (
          <div className="mb-3">
            <div style={{ color: 'var(--text-muted)', marginBottom: '6px' }}>Send day</div>
            <div className="flex flex-wrap gap-1">
              {DAY_NAMES.map((name, i) => (
                <button
                  key={i}
                  onClick={() => save({ newsletterDay: i })}
                  disabled={saving}
                  className="px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: settings?.newsletterDay === i ? 'var(--bg-secondary)' : 'transparent',
                    color: settings?.newsletterDay === i ? 'var(--text-primary)' : 'var(--text-muted)',
                    border: settings?.newsletterDay === i ? '1px solid var(--border-primary)' : '1px solid transparent',
                    fontSize: '10px',
                  }}
                >
                  {name.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* VIP topic selector */}
        <TierGate requiredTier="vip" featureName="Topic Focus">
          <div className="mb-3">
            <div style={{ color: 'var(--text-muted)', marginBottom: '6px' }}>
              Focus topics <span style={{ color: 'var(--text-muted)', opacity: 0.6 }}>(max 3)</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {VIP_TOPICS.map((t) => {
                const selected = settings?.newsletterVipTopics?.includes(t.id) ?? false;
                const maxed = !selected && (settings?.newsletterVipTopics?.length ?? 0) >= 3;
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTopic(t.id)}
                    disabled={saving || maxed}
                    className="px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: selected ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                      color: selected ? 'var(--bg-primary)' : maxed ? 'var(--text-muted)' : 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      opacity: maxed ? 0.4 : 1,
                      fontSize: '10px',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </TierGate>

        {/* VIP portfolio fields */}
        {canAccess('vip') && (
          <PortfolioFields />
        )}
      </section>

      {/* Flash message */}
      {message && (
        <div
          className="text-xs px-3 py-2 rounded"
          style={{
            backgroundColor: message.ok ? 'var(--accent-success)' : 'var(--accent-danger)',
            color: 'var(--bg-primary)',
            opacity: 0.9,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Tier info */}
      <div style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
        Tier: <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{userTier}</span>
        {' · '}{user.email}
      </div>
    </div>
  );
}

function PortfolioFields() {
  const [costBasis, setCostBasis] = useState('');
  const [holdings, setHoldings] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/newsletter/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.portfolioCostBasis != null) setCostBasis(String(d.portfolioCostBasis));
        if (d.portfolioHoldingsBtc != null) setHoldings(String(d.portfolioHoldingsBtc));
      })
      .catch(() => { /* */ });
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch('/api/newsletter/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portfolioCostBasis: costBasis ? parseFloat(costBasis) : null,
        portfolioHoldingsBtc: holdings ? parseFloat(holdings) : null,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mb-3">
      <div style={{ color: 'var(--text-muted)', marginBottom: '6px' }}>Portfolio (for personalised briefing)</div>
      <div className="flex gap-2 items-center">
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '9px', marginBottom: '2px' }}>Cost basis (USD)</div>
          <input
            type="number"
            value={costBasis}
            onChange={(e) => setCostBasis(e.target.value)}
            placeholder="0.00"
            className="px-2 py-1 rounded w-28"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
            }}
          />
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '9px', marginBottom: '2px' }}>Holdings (BTC)</div>
          <input
            type="number"
            value={holdings}
            onChange={(e) => setHoldings(e.target.value)}
            placeholder="0.00000000"
            step="0.00000001"
            className="px-2 py-1 rounded w-28"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
            }}
          />
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="px-3 py-1 rounded mt-3.5"
          style={{
            backgroundColor: saved ? 'var(--accent-success)' : 'var(--bg-card)',
            color: saved ? 'var(--bg-primary)' : 'var(--text-secondary)',
            border: '1px solid var(--border-primary)',
          }}
        >
          {saved ? '✓' : saving ? '…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
