'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/layout/AuthProvider';
import { useRouter } from 'next/navigation';

type Method = 'email' | 'nostr';
type EmailStep = 'email' | 'pin';

export default function LoginPage() {
  const [method, setMethod] = useState<Method>('email');
  const [emailStep, setEmailStep] = useState<EmailStep>('email');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { refresh } = useAuth();
  const router = useRouter();

  // ── Email / PIN flow ──────────────────────────────────────────────────

  async function handleSendPin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to send PIN');
        return;
      }
      setEmailStep('pin');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyPin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Invalid PIN');
        return;
      }
      await refresh();
      router.push('/');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Nostr NIP-07 flow ─────────────────────────────────────────────────

  async function handleNostrLogin() {
    setError('');
    setLoading(true);
    try {
      // Check for NIP-07 extension
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nostr = (window as any).nostr;
      if (!nostr) {
        setError('No Nostr extension detected. Install a NIP-07 signer (Alby, nos2x, Nostr Connect) and reload.');
        return;
      }

      // 1. Get challenge from server
      const challengeRes = await fetch('/api/auth/nostr/challenge', { method: 'POST' });
      if (!challengeRes.ok) {
        setError('Failed to get authentication challenge.');
        return;
      }
      const { challenge } = await challengeRes.json();

      // 2. Sign challenge with extension
      const pubkey = await nostr.getPublicKey();
      const event = await nostr.signEvent({
        kind: 1,
        content: challenge,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        pubkey,
      });

      // 3. Verify with server
      const verifyRes = await fetch('/api/auth/nostr/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      });
      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => ({}));
        setError(data.error || 'Nostr authentication failed.');
        return;
      }

      await refresh();
      router.push('/');
    } catch (err) {
      if (err instanceof Error && err.message.includes('denied')) {
        setError('Signature request was denied.');
      } else {
        setError('Nostr authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Styles ────────────────────────────────────────────────────────────

  const tabStyle = (active: boolean) => ({
    flex: 1,
    padding: '10px 0',
    fontSize: '11px',
    letterSpacing: '0.14em',
    fontFamily: 'var(--font-mono)',
    fontWeight: active ? 700 : 400,
    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
    backgroundColor: active ? 'var(--bg-card)' : 'transparent',
    border: active ? '1px solid var(--border-primary)' : '1px solid transparent',
    borderBottom: active ? '1px solid var(--bg-card)' : '1px solid var(--border-primary)',
    cursor: 'pointer',
    textAlign: 'center' as const,
    marginBottom: '-1px',
  });

  const inputStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    outline: 'none',
  };

  const buttonStyle = (disabled: boolean) => ({
    width: '100%',
    padding: '12px',
    backgroundColor: 'var(--accent-primary)',
    color: 'var(--bg-primary)',
    border: 'none',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    letterSpacing: '0.1em',
    fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  });

  const linkStyle = {
    fontSize: '12px',
    color: 'var(--text-muted)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    padding: 0,
    textDecoration: 'underline',
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--bg-primary)', padding: '20px' }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Link
            href="/"
            style={{
              fontSize: '10px',
              letterSpacing: '0.16em',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ← SITUATION ROOM
          </Link>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '20px',
              color: 'var(--text-primary)',
              margin: '12px 0 4px',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            Sign In
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Create an account or sign in to access your dashboard
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-primary)' }}>
          <button
            onClick={() => { setMethod('email'); setError(''); }}
            style={tabStyle(method === 'email')}
          >
            EMAIL
          </button>
          <button
            onClick={() => { setMethod('nostr'); setError(''); }}
            style={tabStyle(method === 'nostr')}
          >
            NOSTR
          </button>
        </div>

        {/* Form area */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            borderTop: 'none',
            padding: '28px 24px',
          }}
        >
          {/* Error */}
          {error && (
            <div
              style={{
                padding: '10px 12px',
                marginBottom: '16px',
                fontSize: '12px',
                color: 'var(--accent-danger)',
                backgroundColor: 'rgba(155, 50, 50, 0.08)',
                border: '1px solid rgba(155, 50, 50, 0.15)',
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          {method === 'email' ? (
            <>
              {emailStep === 'email' ? (
                <form onSubmit={handleSendPin}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
                    Enter your email to receive a 4-digit PIN. New users are registered automatically.
                  </p>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '10px',
                      letterSpacing: '0.12em',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      marginBottom: '6px',
                    }}
                  >
                    EMAIL
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    style={{ ...inputStyle, marginBottom: '16px' }}
                    placeholder="you@email.com"
                  />
                  <button type="submit" disabled={loading} style={buttonStyle(loading)}>
                    {loading ? 'SENDING...' : 'SEND PIN'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyPin}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
                    PIN sent to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
                    Check your inbox and enter it below.
                  </p>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '10px',
                      letterSpacing: '0.12em',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      marginBottom: '6px',
                    }}
                  >
                    4-DIGIT PIN
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                    style={{
                      ...inputStyle,
                      textAlign: 'center',
                      fontSize: '24px',
                      letterSpacing: '0.5em',
                      fontFamily: 'var(--font-data)',
                      marginBottom: '16px',
                    }}
                    placeholder="0000"
                  />
                  <button
                    type="submit"
                    disabled={loading || pin.length !== 4}
                    style={buttonStyle(loading || pin.length !== 4)}
                  >
                    {loading ? 'VERIFYING...' : 'SIGN IN'}
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px' }}>
                    <button
                      type="button"
                      onClick={() => { setEmailStep('email'); setPin(''); setError(''); }}
                      style={linkStyle}
                    >
                      Different email
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        setPin('');
                        setError('');
                        handleSendPin(e as unknown as React.FormEvent);
                      }}
                      style={linkStyle}
                    >
                      Resend PIN
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            /* Nostr tab */
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
                Sign in with your Nostr identity using a NIP-07 browser extension
                (Alby, nos2x, Nostr Connect).
              </p>
              <button
                onClick={handleNostrLogin}
                disabled={loading}
                style={{
                  ...buttonStyle(loading),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {loading ? 'AUTHENTICATING...' : 'SIGN IN WITH NOSTR'}
              </button>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '16px', lineHeight: 1.6 }}>
                Your Nostr public key will be used as your identity.
                No email required. You can add an email later from your account settings.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--text-muted)',
          marginTop: '16px',
          lineHeight: 1.6,
        }}>
          Free account — unlock more with a{' '}
          <Link href="/support" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
            subscription
          </Link>
        </p>
      </div>
    </div>
  );
}
