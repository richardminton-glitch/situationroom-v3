'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TIER_LABELS, TIER_ORDER, isAdmin, hasAccess } from '@/lib/auth/tier';
import type { Tier } from '@/types';

// ── Alert types ──────────────────────────────────────────────────────────────

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

const THRESHOLD_TRIGGERS: TriggerType[] = ['conviction', 'btc_price', 'fear_greed'];

declare global {
  interface Window {
    nostr?: {
      getPublicKey: () => Promise<string>;
      signEvent: (event: Record<string, unknown>) => Promise<Record<string, unknown>>;
    };
  }
}

const VIP_TOPICS = [
  { key: 'btc-network',        label: 'Bitcoin Network',             desc: 'Hashrate, mining, difficulty, Lightning' },
  { key: 'onchain',            label: 'On-Chain Analytics',          desc: 'MVRV, SOPR, exchange flows, UTXO cohorts' },
  { key: 'macro-banks',        label: 'Macro & Central Banks',      desc: 'Rates, M2, QE/QT, central bank policy' },
  { key: 'geopolitical',       label: 'Geopolitical Risk',          desc: 'Conflict, sanctions, regulatory shifts' },
  { key: 'inflation',          label: 'Inflation & Purchasing Power', desc: 'CPI, real yields, currency debasement' },
  { key: 'energy-commodities', label: 'Energy & Commodities',       desc: 'Oil, gas, gold, mining energy costs' },
  { key: 'btc-equities',       label: 'Bitcoin Equities',           desc: 'MSTR, miners, ETF flows, equity proxies' },
  { key: 'emerging-markets',   label: 'Emerging Markets',           desc: 'EM adoption, capital controls, remittances' },
] as const;


export default function AccountPage() {
  const { user, refresh, logout } = useAuth();
  const router = useRouter();

  // Newsletter state
  const [newsletterEnabled, setNewsletterEnabled] = useState(true);
  const [frequency, setFrequency] = useState('weekly');
  const [nlLoading, setNlLoading] = useState(false);
  const [nlSaved, setNlSaved] = useState(false);

  // VIP briefing topics
  const [vipTopics, setVipTopics] = useState<string[]>([]);
  const [vipLoading, setVipLoading] = useState(false);
  const [vipSaved, setVipSaved] = useState(false);

  // PIN reset
  const [pinResetting, setPinResetting] = useState(false);
  const [pinReset, setPinReset] = useState(false);

  // Nostr linking
  const [nostrLinking, setNostrLinking] = useState(false);
  const [nostrError, setNostrError] = useState('');
  const [nostrLinked, setNostrLinked] = useState(false);

  // Ops Chat username
  const [chatName, setChatName] = useState('');
  const [chatNameSaving, setChatNameSaving] = useState(false);
  const [chatNameSaved, setChatNameSaved] = useState(false);
  const [chatNameError, setChatNameError] = useState('');

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Custom alerts (VIP)
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertTrigger, setAlertTrigger] = useState<TriggerType>('conviction');
  const [alertCondition, setAlertCondition] = useState<ConditionType>('above');
  const [alertThreshold, setAlertThreshold] = useState('');
  const [alertLabel, setAlertLabel] = useState('');
  const [alertAdding, setAlertAdding] = useState(false);
  const [alertError, setAlertError] = useState('');

  // Admin tier switch
  const [tierSwitching, setTierSwitching] = useState(false);

  // General state
  const [error, setError] = useState('');

  // Load newsletter settings on mount
  useEffect(() => {
    if (!user) return;
    fetch('/api/newsletter/settings')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setNewsletterEnabled(data.newsletterEnabled ?? true);
          setFrequency(data.newsletterFrequency ?? 'weekly');
          setVipTopics(data.newsletterVipTopics ?? []);
        }
      })
      .catch(() => {});
  }, [user]);

  // Load alerts on mount
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts');
      if (res.ok) setAlerts(await res.json());
    } catch { /* */ }
  }, []);

  useEffect(() => { if (user) fetchAlerts(); }, [user, fetchAlerts]);

  useEffect(() => {
    if (user?.nostrNpub) setNostrLinked(true);
  }, [user]);

  useEffect(() => {
    if (user) setChatName(user.chatDisplayName ?? '');
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)', minHeight: '400px' }}>
        <div className="text-center">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Sign in to access account settings.
          </p>
          <Link href="/login" style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            → Sign in
          </Link>
        </div>
      </div>
    );
  }

  const userTier = (user.tier as Tier) ?? 'free';
  const canDaily = userTier !== 'free';
  const userIsAdmin = isAdmin(user.email);

  // ── Handlers ──

  async function switchTier(newTier: Tier) {
    setTierSwitching(true);
    setError('');
    try {
      const res = await fetch('/api/admin/set-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: newTier }),
      });
      if (!res.ok) throw new Error('Failed to switch tier');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch');
    } finally {
      setTierSwitching(false);
    }
  }

  async function handleFrequencyChange(newFrequency: string) {
    if (newFrequency === 'daily' && !canDaily) return;
    setFrequency(newFrequency);
    setNewsletterEnabled(true);
    setNlLoading(true);
    setNlSaved(false);
    setError('');
    try {
      const res = await fetch('/api/newsletter/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newsletterEnabled: true,
          newsletterFrequency: newFrequency,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }
      setNlSaved(true);
      setTimeout(() => setNlSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setNlLoading(false);
    }
  }

  function toggleVipTopic(key: string) {
    setVipTopics((prev) => {
      if (prev.includes(key)) return prev.filter((t) => t !== key);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, key];
    });
    setVipSaved(false);
  }

  async function saveVipTopics() {
    setVipLoading(true);
    setVipSaved(false);
    setError('');
    try {
      const res = await fetch('/api/newsletter/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsletterVipTopics: vipTopics }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }
      setVipSaved(true);
      setTimeout(() => setVipSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setVipLoading(false);
    }
  }

  async function addAlert() {
    const needsThreshold = THRESHOLD_TRIGGERS.includes(alertTrigger);
    if (needsThreshold && !alertThreshold) { setAlertError('Threshold required'); return; }
    setAlertAdding(true);
    setAlertError('');
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerType: alertTrigger,
          condition: needsThreshold ? alertCondition : 'any',
          threshold: needsThreshold && alertThreshold ? parseFloat(alertThreshold) : undefined,
          label: alertLabel.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlerts((prev) => [data, ...prev]);
        setAlertThreshold('');
        setAlertLabel('');
      } else {
        setAlertError(data.error || 'Failed to add alert');
      }
    } catch { setAlertError('Network error'); }
    setAlertAdding(false);
  }

  async function deleteAlert(id: string) {
    const res = await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
    if (res.ok) setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  async function toggleAlert(id: string, isActive: boolean) {
    const res = await fetch(`/api/alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
    }
  }

  async function resetPin() {
    setPinResetting(true);
    setPinReset(false);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-pin', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reset PIN');
      setPinReset(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset PIN');
    } finally {
      setPinResetting(false);
    }
  }

  async function linkNostr() {
    setNostrLinking(true);
    setNostrError('');
    try {
      if (!window.nostr) {
        throw new Error('No Nostr extension detected. Install a NIP-07 extension (e.g. Alby, nos2x) and reload.');
      }

      // 1. Get challenge
      const challengeRes = await fetch('/api/auth/nostr/challenge', { method: 'POST' });
      if (!challengeRes.ok) throw new Error('Failed to get challenge');
      const { challenge } = await challengeRes.json();

      // 2. Sign with extension
      const pubkey = await window.nostr.getPublicKey();
      const event = await window.nostr.signEvent({
        kind: 1,
        content: challenge,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        pubkey,
      });

      // 3. Send to link endpoint
      const linkRes = await fetch('/api/auth/nostr/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      });

      if (!linkRes.ok) {
        const data = await linkRes.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to link');
      }

      setNostrLinked(true);
      await refresh();
    } catch (err) {
      setNostrError(err instanceof Error ? err.message : 'Failed to link Nostr identity');
    } finally {
      setNostrLinking(false);
    }
  }

  async function saveChatName() {
    const trimmed = chatName.trim();
    setChatNameSaving(true);
    setChatNameSaved(false);
    setChatNameError('');
    try {
      const res = await fetch('/api/user/chat-display-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setChatName(data.displayName ?? trimmed);
      setChatNameSaved(true);
      setTimeout(() => setChatNameSaved(false), 3000);
      await refresh();
    } catch (err) {
      setChatNameError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setChatNameSaving(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setError('');
    try {
      const res = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      if (!res.ok) throw new Error('Failed to delete account');
      await logout();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
    }
  }

  // ── Render ──

  const sectionStyle = {
    padding: '20px 24px',
    borderBottom: '1px solid var(--border-subtle)',
  };

  const labelStyle = {
    fontFamily: 'var(--font-mono)' as const,
    fontSize: '10px',
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-muted)',
    marginBottom: '12px',
    display: 'block' as const,
  };

  const btnStyle = (variant: 'primary' | 'danger' | 'muted' = 'primary') => ({
    padding: '8px 18px',
    fontFamily: 'var(--font-mono)' as const,
    fontSize: '11px',
    letterSpacing: '0.08em',
    border: 'none',
    cursor: 'pointer' as const,
    backgroundColor: variant === 'danger' ? '#8b2020' : variant === 'muted' ? 'var(--bg-secondary)' : 'var(--accent-primary)',
    color: variant === 'muted' ? 'var(--text-secondary)' : 'var(--bg-primary)',
  });

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">

      {/* Header */}
      <header style={{ marginBottom: '32px' }}>
        <div style={{ marginBottom: '6px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Situation Room
          </p>
        </div>
        <div style={{ borderTop: '3px double var(--border-primary)', paddingTop: '10px', marginBottom: '6px' }} />
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '28px', fontWeight: 'normal', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '4px' }}>
          Account
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          {user.email} · {TIER_LABELS[userTier]?.toUpperCase() || userTier.toUpperCase()}
        </p>
        <div style={{ borderTop: '1px solid var(--border-primary)', marginTop: '10px' }} />
      </header>

      {error && (
        <div style={{ padding: '10px 16px', marginBottom: '16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger)', backgroundColor: 'rgba(155, 50, 50, 0.08)' }}>
          {error}
        </div>
      )}

      {/* ── Subscription ── */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Subscription</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
              {TIER_LABELS[userTier] || userTier}
            </p>
            {user.subscriptionExpiresAt && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                Expires: {new Date(user.subscriptionExpiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
          <Link href="/support" style={{ ...btnStyle('primary'), textDecoration: 'none', display: 'inline-block' }}>
            {userTier === 'free' ? 'SUBSCRIBE' : 'UPGRADE'}
          </Link>
        </div>
      </div>

      {/* ── Admin: Tier Switch ── */}
      {userIsAdmin && (
        <div style={{ ...sectionStyle, backgroundColor: 'rgba(124, 92, 191, 0.06)', border: '1px solid var(--border-subtle)', marginBottom: '1px' }}>
          <span style={{ ...labelStyle, color: '#7c5cbf' }}>Admin — Tier Testing</span>
          <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>
            Switch your visible tier to test gated views. Does not affect admin access.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {TIER_ORDER.map((t) => (
              <button
                key={t}
                onClick={() => switchTier(t)}
                disabled={tierSwitching}
                style={{
                  padding: '7px 16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  backgroundColor: userTier === t ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: userTier === t ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  border: `1px solid ${userTier === t ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  cursor: tierSwitching ? 'wait' : 'pointer',
                  opacity: tierSwitching ? 0.5 : 1,
                }}
              >
                {TIER_LABELS[t].toUpperCase()}
                {userTier === t && ' ●'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Newsletter ── */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Newsletter</span>
        <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '8px' }}>
          Intelligence briefings delivered to your inbox.
        </p>
        <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '16px' }}>
          {canDaily
            ? 'New accounts default to weekly — switch to daily below to receive the full briefing every morning.'
            : 'New accounts default to the free Sunday digest. Daily briefings unlock from the General tier.'}
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Daily */}
          <button
            onClick={() => handleFrequencyChange('daily')}
            disabled={!canDaily || nlLoading}
            style={{
              flex: 1, padding: '14px 16px', textAlign: 'left' as const,
              backgroundColor: frequency === 'daily' && newsletterEnabled ? 'rgba(247, 147, 26, 0.1)' : 'var(--bg-secondary)',
              border: `1px solid ${frequency === 'daily' && newsletterEnabled ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
              cursor: !canDaily ? 'not-allowed' : 'pointer',
              opacity: !canDaily ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: frequency === 'daily' && newsletterEnabled ? 'var(--accent-primary)' : 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {frequency === 'daily' && newsletterEnabled && <span style={{ fontSize: '8px' }}>●</span>}
              DAILY
              {!canDaily && <span style={{ fontSize: '9px', fontWeight: 'normal', color: 'var(--text-muted)' }}>GENERAL ↑</span>}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
              Every morning · 06:00 UTC
            </div>
          </button>

          {/* Weekly */}
          <button
            onClick={() => handleFrequencyChange('weekly')}
            disabled={nlLoading}
            style={{
              flex: 1, padding: '14px 16px', textAlign: 'left' as const,
              backgroundColor: frequency === 'weekly' && newsletterEnabled ? 'rgba(247, 147, 26, 0.1)' : 'var(--bg-secondary)',
              border: `1px solid ${frequency === 'weekly' && newsletterEnabled ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: frequency === 'weekly' && newsletterEnabled ? 'var(--accent-primary)' : 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {frequency === 'weekly' && newsletterEnabled && <span style={{ fontSize: '8px' }}>●</span>}
              WEEKLY
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
              Every Sunday · 06:00 UTC
            </div>
          </button>
        </div>

        {nlSaved && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-success)', marginTop: '10px' }}>
            ✓ Saved
          </p>
        )}
      </div>

      {/* ── VIP Briefing Topics ── */}
      <div style={{
        ...sectionStyle,
        opacity: hasAccess(userTier, 'vip') ? 1 : 0.45,
        position: 'relative',
      }}>
        <span style={{ ...labelStyle, color: '#7c5cbf' }}>VIP Briefing</span>

        {!hasAccess(userTier, 'vip') && (
          <div style={{
            position: 'absolute', top: 20, right: 24,
            padding: '3px 10px',
            fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em',
            color: '#7c5cbf', border: '1px solid #7c5cbf', backgroundColor: 'rgba(124, 92, 191, 0.08)',
          }}>
            VIP ONLY
          </div>
        )}

        <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
          Choose up to 3 focus topics. Your daily briefing will be personalised with deeper analysis
          in these areas, weighted above the standard briefing sections.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {VIP_TOPICS.map((topic) => {
            const selected = vipTopics.includes(topic.key);
            const atLimit = vipTopics.length >= 3 && !selected;
            const disabled = !hasAccess(userTier, 'vip') || atLimit;

            return (
              <button
                key={topic.key}
                onClick={() => !disabled && toggleVipTopic(topic.key)}
                disabled={disabled}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px', textAlign: 'left',
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                  backgroundColor: selected ? 'rgba(124, 92, 191, 0.12)' : 'var(--bg-secondary)',
                  color: selected ? '#7c5cbf' : 'var(--text-secondary)',
                  border: `1px solid ${selected ? '#7c5cbf' : 'var(--border-subtle)'}`,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled && !selected ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{
                  width: '16px', height: '16px', flexShrink: 0,
                  border: `1px solid ${selected ? '#7c5cbf' : 'var(--border-primary)'}`,
                  backgroundColor: selected ? '#7c5cbf' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', color: 'var(--bg-primary)',
                }}>
                  {selected ? '✓' : ''}
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, display: 'block', marginBottom: '2px' }}>{topic.label}</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.02em' }}>{topic.desc}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={saveVipTopics}
            disabled={vipLoading || !hasAccess(userTier, 'vip')}
            style={{
              ...btnStyle('primary'),
              backgroundColor: '#7c5cbf',
              opacity: vipLoading || !hasAccess(userTier, 'vip') ? 0.5 : 1,
            }}
          >
            {vipLoading ? 'SAVING...' : vipSaved ? '✓ SAVED' : 'SAVE TOPICS'}
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
            {vipTopics.length}/3 selected
          </span>
        </div>
      </div>

      {/* ── Custom Alerts (VIP) ── */}
      <div style={{
        ...sectionStyle,
        opacity: hasAccess(userTier, 'vip') ? 1 : 0.45,
        position: 'relative',
      }}>
        <span style={{ ...labelStyle, color: '#7c5cbf' }}>Custom Alerts</span>

        {!hasAccess(userTier, 'vip') && (
          <div style={{
            position: 'absolute', top: 20, right: 24,
            padding: '3px 10px',
            fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em',
            color: '#7c5cbf', border: '1px solid #7c5cbf', backgroundColor: 'rgba(124, 92, 191, 0.08)',
          }}>
            VIP ONLY
          </div>
        )}

        <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
          Set up to 10 custom alerts. Get notified when conviction score, BTC price, or Fear & Greed
          crosses your thresholds, or when a new briefing is published.
        </p>

        {/* Add alert form */}
        {hasAccess(userTier, 'vip') && alerts.length < 10 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
              <select
                value={alertTrigger}
                onChange={(e) => {
                  const val = e.target.value as TriggerType;
                  setAlertTrigger(val);
                  if (!THRESHOLD_TRIGGERS.includes(val)) setAlertCondition('any');
                  else if (alertCondition === 'any') setAlertCondition('above');
                }}
                style={{
                  padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: '11px',
                  backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)', outline: 'none',
                }}
              >
                {TRIGGER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {THRESHOLD_TRIGGERS.includes(alertTrigger) && (
                <>
                  <select
                    value={alertCondition}
                    onChange={(e) => setAlertCondition(e.target.value as ConditionType)}
                    style={{
                      padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: '11px',
                      backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)', outline: 'none',
                    }}
                  >
                    <option value="above">above</option>
                    <option value="below">below</option>
                  </select>
                  <input
                    type="number"
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(e.target.value)}
                    placeholder={alertTrigger === 'btc_price' ? '$0' : '0'}
                    style={{
                      padding: '6px 10px', width: '90px', fontFamily: 'var(--font-mono)', fontSize: '11px',
                      backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)', outline: 'none',
                    }}
                  />
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="text"
                value={alertLabel}
                onChange={(e) => setAlertLabel(e.target.value)}
                placeholder="Description (optional)"
                maxLength={100}
                style={{
                  padding: '6px 10px', flex: 1, fontFamily: 'var(--font-mono)', fontSize: '11px',
                  backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)', outline: 'none',
                }}
              />
              <button
                onClick={addAlert}
                disabled={alertAdding}
                style={{
                  ...btnStyle('primary'), backgroundColor: '#7c5cbf',
                  opacity: alertAdding ? 0.5 : 1, whiteSpace: 'nowrap',
                }}
              >
                {alertAdding ? 'ADDING...' : 'ADD ALERT'}
              </button>
            </div>

            {alertError && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-danger)', marginTop: '6px' }}>
                {alertError}
              </p>
            )}
          </div>
        )}

        {/* Alert list */}
        {hasAccess(userTier, 'vip') && alerts.length === 0 && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
            No alerts set.
          </p>
        )}

        {hasAccess(userTier, 'vip') && alerts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {alerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                  opacity: alert.isActive ? 1 : 0.5,
                }}
              >
                <button
                  onClick={() => toggleAlert(alert.id, alert.isActive)}
                  title={alert.isActive ? 'Click to pause' : 'Click to activate'}
                  style={{ textAlign: 'left', flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <span style={{ color: '#7c5cbf', marginRight: '8px' }}>⚡</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {TRIGGER_OPTIONS.find((o) => o.value === alert.triggerType)?.label ?? alert.triggerType}
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
                      <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>— {alert.label}</span>
                    )}
                  </span>
                </button>

                <button
                  onClick={() => deleteAlert(alert.id)}
                  title="Delete alert"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)',
                    padding: '0 4px', flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {hasAccess(userTier, 'vip') && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', marginTop: '10px' }}>
            {alerts.length}/10 alerts
          </p>
        )}
      </div>

      {/* ── Reset PIN ── */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Sign-In PIN</span>
        <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px' }}>
          Your 4-digit PIN is permanent and used every time you sign in. Reset it here if needed — a new PIN will be emailed to you.
        </p>
        {pinReset ? (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-success)' }}>
            ✓ New PIN sent to {user.email}
          </p>
        ) : (
          <button onClick={resetPin} disabled={pinResetting} style={{ ...btnStyle('muted'), opacity: pinResetting ? 0.5 : 1 }}>
            {pinResetting ? 'RESETTING...' : 'RESET PIN'}
          </button>
        )}
      </div>

      {/* ── Ops Chat Username ── */}
      {(() => {
        const canEdit = hasAccess(userTier, 'members');
        const fallback = `anon-${user.id.slice(0, 4)}`;
        const trimmed = chatName.trim();
        const unchanged = trimmed === (user.chatDisplayName ?? '').trim();
        return (
          <div style={{
            ...sectionStyle,
            opacity: canEdit ? 1 : 0.45,
            position: 'relative',
          }}>
            <span style={labelStyle}>Ops Chat Username</span>

            {!canEdit && (
              <div style={{
                position: 'absolute', top: 20, right: 24,
                padding: '3px 10px',
                fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em',
                color: '#4a6fa5', border: '1px solid #4a6fa5', backgroundColor: 'rgba(74, 111, 165, 0.08)',
              }}>
                MEMBERS ONLY
              </div>
            )}

            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px' }}>
              How you appear in Ops Chat. 3–20 characters — letters, digits, <code>_</code> and <code>-</code> only.
              Leave empty to fall back to <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{fallback}</span>.
            </p>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={chatName}
                onChange={(e) => { setChatName(e.target.value); setChatNameSaved(false); setChatNameError(''); }}
                disabled={!canEdit || chatNameSaving}
                placeholder={fallback}
                maxLength={20}
                style={{
                  padding: '8px 12px', width: '220px',
                  fontFamily: 'var(--font-mono)', fontSize: '12px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  outline: 'none',
                }}
              />
              <button
                onClick={saveChatName}
                disabled={!canEdit || chatNameSaving || unchanged || trimmed.length === 0}
                style={{
                  ...btnStyle('primary'),
                  opacity: !canEdit || chatNameSaving || unchanged || trimmed.length === 0 ? 0.5 : 1,
                  cursor: !canEdit || chatNameSaving || unchanged || trimmed.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {chatNameSaving ? 'SAVING...' : 'SAVE'}
              </button>
            </div>

            {chatNameSaved && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-success)', marginTop: '10px' }}>
                ✓ Saved
              </p>
            )}
            {chatNameError && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-danger)', marginTop: '10px' }}>
                {chatNameError}
              </p>
            )}
          </div>
        );
      })()}

      {/* ── Nostr Identity ── */}
      <div style={{
        ...sectionStyle,
        opacity: hasAccess(userTier, 'members') ? 1 : 0.45,
        position: 'relative',
      }}>
        <span style={labelStyle}>Nostr Identity</span>

        {!hasAccess(userTier, 'members') && (
          <div style={{
            position: 'absolute', top: 20, right: 24,
            padding: '3px 10px',
            fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em',
            color: '#4a6fa5', border: '1px solid #4a6fa5', backgroundColor: 'rgba(74, 111, 165, 0.08)',
          }}>
            MEMBERS ONLY
          </div>
        )}

        {nostrLinked || user.nostrNpub ? (
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-success)', marginBottom: '4px' }}>
              ⚡ Nostr key linked
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
              {user.nostrNpub}
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px' }}>
              Link your Nostr key to get the ⚡ icon in Ops Chat and enable NIP-07 sign-in.
              Requires a browser extension like Alby or nos2x.
            </p>
            <button
              onClick={linkNostr}
              disabled={nostrLinking || !hasAccess(userTier, 'members')}
              style={{ ...btnStyle('primary'), opacity: nostrLinking || !hasAccess(userTier, 'members') ? 0.5 : 1 }}
            >
              {nostrLinking ? 'LINKING...' : 'LINK NOSTR KEY'}
            </button>
            {nostrError && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-danger)', marginTop: '8px' }}>
                {nostrError}
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Danger Zone ── */}
      <div style={{ ...sectionStyle, borderBottom: 'none' }}>
        <span style={{ ...labelStyle, color: '#8b2020' }}>Danger Zone</span>

        {!deleteConfirm ? (
          <button onClick={() => setDeleteConfirm(true)} style={btnStyle('danger')}>
            DELETE ACCOUNT
          </button>
        ) : (
          <div>
            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px' }}>
              This will permanently delete your account, all settings, subscription history, and chat messages.
              Type <strong>DELETE</strong> to confirm.
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={deleteTyped}
                onChange={(e) => setDeleteTyped(e.target.value)}
                placeholder="DELETE"
                style={{
                  padding: '8px 12px', width: '120px',
                  fontFamily: 'var(--font-mono)', fontSize: '12px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  outline: 'none',
                }}
              />
              <button
                onClick={deleteAccount}
                disabled={deleteTyped !== 'DELETE' || deleting}
                style={{
                  ...btnStyle('danger'),
                  opacity: deleteTyped !== 'DELETE' || deleting ? 0.4 : 1,
                  cursor: deleteTyped !== 'DELETE' || deleting ? 'not-allowed' : 'pointer',
                }}
              >
                {deleting ? 'DELETING...' : 'CONFIRM DELETE'}
              </button>
              <button
                onClick={() => { setDeleteConfirm(false); setDeleteTyped(''); }}
                style={{ ...btnStyle('muted') }}
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
