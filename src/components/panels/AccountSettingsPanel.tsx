'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { useTier } from '@/hooks/useTier';
import { TierGate } from '@/components/auth/TierGate';
import { PanelLoading } from './shared';

// ── Alert types ───────────────────────────────────────────────────────────────

type TriggerType = 'conviction' | 'btc_price' | 'fear_greed' | 'new_briefing';
type ConditionType = 'above' | 'below' | 'any';

interface Alert {
  id: string;
  triggerType: TriggerType;
  condition: ConditionType;
  threshold: number | null;
  label: string;
  isActive: boolean;
  lastFiredAt: string | null;
  createdAt: string;
}

const TRIGGER_OPTIONS: { value: TriggerType; label: string }[] = [
  { value: 'conviction', label: 'Conviction Score' },
  { value: 'btc_price', label: 'BTC Price' },
  { value: 'fear_greed', label: 'Fear & Greed' },
  { value: 'new_briefing', label: 'New Briefing' },
];

/** Triggers that support above/below threshold comparisons */
const THRESHOLD_TRIGGERS: TriggerType[] = ['conviction', 'btc_price', 'fear_greed'];

function triggerLabel(t: TriggerType): string {
  return TRIGGER_OPTIONS.find((o) => o.value === t)?.label ?? t;
}

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

        {/* VIP custom alerts */}
        {canAccess('vip') && (
          <AlertsSection />
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

// ── AlertsSection ─────────────────────────────────────────────────────────────

function AlertsSection() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Add-alert form state
  const [trigger, setTrigger] = useState<TriggerType>('conviction');
  const [condition, setCondition] = useState<ConditionType>('above');
  const [threshold, setThreshold] = useState('');
  const [label, setLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const needsThreshold = THRESHOLD_TRIGGERS.includes(trigger);

  // Reset condition when switching to a non-threshold trigger
  useEffect(() => {
    if (!needsThreshold) setCondition('any');
    else if (condition === 'any') setCondition('above');
  }, [trigger, needsThreshold, condition]);

  useEffect(() => {
    fetch('/api/alerts')
      .then(async (r) => {
        if (r.ok) setAlerts(await r.json() as Alert[]);
        else setLoadError('Could not load alerts');
      })
      .catch(() => setLoadError('Network error'));
  }, []);

  const deleteAlert = async (id: string) => {
    const res = await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
    if (res.ok) setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleAlert = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      const updated = await res.json() as Alert;
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
    }
  };

  const addAlert = async () => {
    setAddError(null);
    if (needsThreshold && !threshold) {
      setAddError('Threshold required');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerType: trigger,
          condition,
          threshold: needsThreshold && threshold ? parseFloat(threshold) : undefined,
          label: label.trim(),
        }),
      });
      const data = await res.json() as Alert | { error: string };
      if (res.ok) {
        setAlerts((prev) => [data as Alert, ...prev]);
        setThreshold('');
        setLabel('');
      } else {
        setAddError((data as { error: string }).error ?? 'Failed to add alert');
      }
    } catch {
      setAddError('Network error');
    }
    setAdding(false);
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-subtle)',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    borderRadius: '4px',
    padding: '4px 6px',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  };

  return (
    <div className="mb-3">
      {/* Section header */}
      <div
        className="uppercase tracking-widest mb-3 flex items-center justify-between"
        style={{
          fontSize: '9px',
          letterSpacing: '0.18em',
          color: 'var(--text-muted)',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '6px',
        }}
      >
        <span>Custom Alerts <span style={{ color: 'var(--accent-primary)' }}>(VIP)</span></span>
        <span style={{ opacity: 0.6 }}>{alerts.length}/10</span>
      </div>

      {loadError && (
        <p style={{ color: 'var(--accent-danger)', marginBottom: '8px', fontSize: '11px' }}>
          {loadError}
        </p>
      )}

      {/* Add-alert form */}
      {alerts.length < 10 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1 items-center mb-1">
            {/* Trigger selector */}
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value as TriggerType)}
              style={{ ...selectStyle, minWidth: '130px' }}
            >
              {TRIGGER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Condition selector — only when threshold-based trigger */}
            {needsThreshold && (
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ConditionType)}
                style={{ ...selectStyle, minWidth: '70px' }}
              >
                <option value="above">above</option>
                <option value="below">below</option>
              </select>
            )}

            {/* Threshold input */}
            {needsThreshold && (
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder={trigger === 'btc_price' ? '$0' : '0'}
                style={{ ...inputStyle, width: '80px' }}
              />
            )}

            {/* Label */}
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="description (optional)"
              maxLength={100}
              style={{ ...inputStyle, flex: 1, minWidth: '100px' }}
            />

            {/* Add button */}
            <button
              onClick={addAlert}
              disabled={adding}
              className="px-3 py-1 rounded uppercase tracking-wider"
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-primary)',
                fontSize: '9px',
                letterSpacing: '0.12em',
                opacity: adding ? 0.5 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {adding ? '…' : 'Add Alert'}
            </button>
          </div>

          {addError && (
            <p style={{ color: 'var(--accent-danger)', fontSize: '10px', marginTop: '2px' }}>
              {addError}
            </p>
          )}
        </div>
      )}

      {/* Alert list */}
      {alerts.length === 0 && !loadError && (
        <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>No alerts set.</p>
      )}

      <div className="flex flex-col gap-1">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between px-2 py-1 rounded"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              opacity: alert.isActive ? 1 : 0.5,
            }}
          >
            {/* Alert description */}
            <button
              onClick={() => toggleAlert(alert.id, alert.isActive)}
              title={alert.isActive ? 'Click to pause' : 'Click to activate'}
              style={{ textAlign: 'left', flex: 1 }}
            >
              <span style={{ color: 'var(--accent-primary)', marginRight: '6px' }}>⚡</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                {triggerLabel(alert.triggerType)}
                {alert.condition !== 'any' && ` ${alert.condition}`}
                {alert.threshold != null && (
                  <span>
                    {' '}
                    {alert.triggerType === 'btc_price'
                      ? `$${alert.threshold.toLocaleString()}`
                      : alert.threshold}
                  </span>
                )}
                {alert.label && (
                  <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>
                    — {alert.label}
                  </span>
                )}
              </span>
            </button>

            {/* Delete button */}
            <button
              onClick={() => deleteAlert(alert.id)}
              title="Delete alert"
              style={{
                color: 'var(--text-muted)',
                fontSize: '13px',
                lineHeight: 1,
                padding: '0 4px',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-danger)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

