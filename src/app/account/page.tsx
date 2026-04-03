'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TIER_LABELS, TIER_ORDER, isAdmin } from '@/lib/auth/tier';
import type { Tier } from '@/types';

declare global {
  interface Window {
    nostr?: {
      getPublicKey: () => Promise<string>;
      signEvent: (event: Record<string, unknown>) => Promise<Record<string, unknown>>;
    };
  }
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily', desc: 'Every morning at 06:00 UTC' },
  { value: 'weekly', label: 'Weekly', desc: 'Every Sunday morning' },
];

const DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function AccountPage() {
  const { user, refresh, logout } = useAuth();
  const router = useRouter();

  // Newsletter state
  const [newsletterEnabled, setNewsletterEnabled] = useState(false);
  const [frequency, setFrequency] = useState('weekly');
  const [day, setDay] = useState(0);
  const [nlLoading, setNlLoading] = useState(false);
  const [nlSaved, setNlSaved] = useState(false);

  // PIN reset
  const [pinResetting, setPinResetting] = useState(false);
  const [pinReset, setPinReset] = useState(false);

  // Nostr linking
  const [nostrLinking, setNostrLinking] = useState(false);
  const [nostrError, setNostrError] = useState('');
  const [nostrLinked, setNostrLinked] = useState(false);

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState('');
  const [deleting, setDeleting] = useState(false);

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
          setNewsletterEnabled(data.newsletterEnabled ?? false);
          setFrequency(data.newsletterFrequency ?? 'weekly');
          setDay(data.newsletterDay ?? 0);
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (user?.nostrNpub) setNostrLinked(true);
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
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

  async function saveNewsletter() {
    setNlLoading(true);
    setNlSaved(false);
    setError('');
    try {
      const res = await fetch('/api/newsletter/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newsletterEnabled,
          newsletterFrequency: frequency,
          newsletterDay: day,
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
    <div className="max-w-2xl mx-auto px-6 py-12" style={{ minHeight: '100vh' }}>

      {/* Header */}
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Situation Room
          </p>
          <Link
            href="/"
            style={{
              fontSize: '11px', letterSpacing: '0.08em', color: 'var(--accent-primary)',
              textDecoration: 'none', fontFamily: 'var(--font-mono)',
            }}
          >
            ← Dashboard
          </Link>
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

      {/* ── Newsletter Frequency ── */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Newsletter</span>

        {/* Enable/disable */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <button
            onClick={() => setNewsletterEnabled(!newsletterEnabled)}
            style={{
              width: '36px', height: '20px', borderRadius: '10px',
              backgroundColor: newsletterEnabled ? 'var(--accent-primary)' : 'var(--border-primary)',
              border: 'none', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s',
            }}
          >
            <div style={{
              width: '16px', height: '16px', borderRadius: '50%',
              backgroundColor: 'var(--bg-primary)',
              position: 'absolute', top: '2px',
              left: newsletterEnabled ? '18px' : '2px', transition: 'left 0.2s',
            }} />
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
            {newsletterEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {newsletterEnabled && (
          <>
            {/* Frequency */}
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>Frequency</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {FREQUENCY_OPTIONS.map((opt) => {
                  const disabled = opt.value === 'daily' && !canDaily;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => !disabled && setFrequency(opt.value)}
                      disabled={disabled}
                      style={{
                        padding: '6px 14px',
                        fontFamily: 'var(--font-mono)', fontSize: '11px',
                        backgroundColor: frequency === opt.value ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: frequency === opt.value ? 'var(--bg-primary)' : 'var(--text-secondary)',
                        border: `1px solid ${frequency === opt.value ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.5 : 1,
                      }}
                    >
                      {opt.label}
                      {disabled && <span style={{ fontSize: '9px', marginLeft: '4px' }}>GENERAL ↑</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Day (weekly only) */}
            {frequency === 'weekly' && (
              <div style={{ marginBottom: '12px' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>Delivery day</p>
                <select
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                  style={{
                    padding: '6px 12px',
                    fontFamily: 'var(--font-mono)', fontSize: '11px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    outline: 'none',
                  }}
                >
                  {DAY_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            )}

            <button onClick={saveNewsletter} disabled={nlLoading} style={{ ...btnStyle('primary'), opacity: nlLoading ? 0.5 : 1 }}>
              {nlLoading ? 'SAVING...' : nlSaved ? '✓ SAVED' : 'SAVE PREFERENCES'}
            </button>
          </>
        )}

        {/* Save when toggling off too */}
        {!newsletterEnabled && (
          <button onClick={saveNewsletter} disabled={nlLoading} style={{ ...btnStyle('muted'), opacity: nlLoading ? 0.5 : 1 }}>
            {nlLoading ? 'SAVING...' : nlSaved ? '✓ SAVED' : 'SAVE'}
          </button>
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

      {/* ── Nostr Identity ── */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Nostr Identity</span>
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
            <button onClick={linkNostr} disabled={nostrLinking} style={{ ...btnStyle('primary'), opacity: nostrLinking ? 0.5 : 1 }}>
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
