'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/components/layout/ThemeProvider';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";
const LS_EMAIL = 'sr-dca-signup-email';

type Frequency = 'weekly' | 'monthly';
type Status    = 'idle' | 'loading' | 'sent' | 'updated' | 'error';

interface Props {
  baseAmount: number;
  frequency:  'weekly' | 'monthly';
}

export function SignalEmailSignup({ baseAmount, frequency: initialFrequency }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

  const [email,     setEmail]     = useState('');
  const [frequency, setFrequency] = useState<Frequency>(initialFrequency);
  const [status,    setStatus]    = useState<Status>('idle');
  const [errorMsg,  setErrorMsg]  = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // Sync frequency if parent changes it
  useEffect(() => { setFrequency(initialFrequency); }, [initialFrequency]);

  // Check URL param for confirmation success (client-only)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('subscribed') === '1') setConfirmed(true);
      const stored = localStorage.getItem(LS_EMAIL);
      if (stored) setEmail(stored);
    } catch { /* SSR guard */ }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      localStorage.setItem(LS_EMAIL, email);
    } catch { /* noop */ }

    try {
      const res = await fetch('/api/dca-signal-subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, frequency, baseAmount }),
      });
      const json = await res.json() as { status?: string; error?: string };

      if (!res.ok || json.error) {
        setStatus('error');
        setErrorMsg(json.error ?? 'Subscription failed');
      } else if (json.status === 'updated') {
        setStatus('updated');
      } else {
        setStatus('sent');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(String(err));
    }
  }

  const signalColor = isDark ? '#00d4c8' : '#4a7c59';

  // Confirmed via URL param
  if (confirmed) {
    return (
      <SuccessBox
        message="You're subscribed! Your first signal email is on its way."
        sub="Check your inbox — signal emails land every Monday (weekly) or first of month."
        isDark={isDark}
      />
    );
  }

  // Confirm email sent
  if (status === 'sent') {
    return (
      <SuccessBox
        message="Check your inbox — confirm your subscription."
        sub={`Sent to ${email} · click the link to activate.`}
        isDark={isDark}
      />
    );
  }

  // Preferences updated
  if (status === 'updated') {
    return (
      <SuccessBox
        message="Preferences updated."
        sub={`${frequency === 'weekly' ? 'Weekly' : 'Monthly'} signal emails for ${email}.`}
        isDark={isDark}
      />
    );
  }

  return (
    <div style={{
      paddingTop:  16,
      borderTop:   '1px solid var(--border-subtle)',
      fontFamily:  FONT,
    }}>

      {/* Section label */}
      <span style={{
        display:       'block',
        fontSize: 11,
        letterSpacing: '0.14em',
        color:         'var(--text-secondary)',
        marginBottom:  10,
      }}>
        SIGNAL EMAIL
      </span>

      <div style={{
        padding:    '16px 18px',
        background: 'var(--bg-card)',
        border:     '1px solid var(--border-subtle)',
      }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.6, letterSpacing: '0.04em' }}>
          Receive this signal by email on a {frequency === 'weekly' ? 'weekly' : 'monthly'} basis —
          with your recommended buy, both indicator readings, and how it compares to vanilla DCA.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Frequency toggle */}
          <div style={{ display: 'flex', gap: 0 }}>
            {(['weekly', 'monthly'] as Frequency[]).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFrequency(f)}
                style={{
                  padding:       '4px 12px',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  fontFamily:    FONT,
                  cursor:        'pointer',
                  border:        '1px solid var(--border-primary)',
                  background:    frequency === f
                    ? (isDark ? 'rgba(0,212,200,0.15)' : 'rgba(74,124,89,0.15)')
                    : 'transparent',
                  color:         frequency === f ? signalColor : 'var(--text-secondary)',
                  transition:    'none',
                  textTransform: 'uppercase' as const,
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Email input + submit */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                flex:         1,
                fontSize: 13,
                fontFamily:   FONT,
                background:   'var(--bg-card)',
                border:       '1px solid var(--border-primary)',
                color:        'var(--text-primary)',
                padding:      '6px 10px',
                outline:      'none',
                transition:   'none',
              }}
              onFocus={e  => { e.currentTarget.style.borderColor = isDark ? '#00d4c8' : '#4a7c59'; }}
              onBlur={e   => { e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                padding:       '6px 16px',
                fontSize: 11,
                letterSpacing: '0.12em',
                fontFamily:    FONT,
                cursor:        status === 'loading' ? 'wait' : 'pointer',
                background:    signalColor,
                color:         isDark ? '#090d12' : '#ffffff',
                border:        'none',
                fontWeight:    600,
                textTransform: 'uppercase' as const,
                transition:    'none',
                opacity:       status === 'loading' ? 0.7 : 1,
              }}
            >
              {status === 'loading' ? '...' : 'SUBSCRIBE'}
            </button>
          </div>

          {/* Error */}
          {status === 'error' && (
            <span style={{ fontSize: 11, color: isDark ? '#d06050' : '#9b3232', letterSpacing: '0.08em' }}>
              {errorMsg || 'Subscription failed — try again'}
            </span>
          )}

          {/* Context line */}
          <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            Double opt-in confirmation email sent · unsubscribe any time · not financial advice
          </span>

        </form>
      </div>
    </div>
  );
}

function SuccessBox({ message, sub, isDark }: { message: string; sub: string; isDark: boolean }) {
  const signalColor = isDark ? '#00d4c8' : '#4a7c59';
  return (
    <div style={{
      paddingTop:  16,
      borderTop:   '1px solid var(--border-subtle)',
      fontFamily:  FONT,
    }}>
      <span style={{
        display:       'block',
        fontSize: 11,
        letterSpacing: '0.14em',
        color:         'var(--text-secondary)',
        marginBottom:  10,
      }}>
        SIGNAL EMAIL
      </span>
      <div style={{
        padding:    '14px 18px',
        background: isDark ? 'rgba(0,212,200,0.07)' : 'rgba(74,124,89,0.07)',
        border:     `1px solid ${isDark ? 'rgba(0,212,200,0.2)' : 'rgba(74,124,89,0.2)'}`,
        display:    'flex',
        flexDirection: 'column',
        gap:        4,
      }}>
        <span style={{ fontSize: 13, color: signalColor, fontWeight: 600, letterSpacing: '0.04em' }}>
          {message}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
          {sub}
        </span>
      </div>
    </div>
  );
}
