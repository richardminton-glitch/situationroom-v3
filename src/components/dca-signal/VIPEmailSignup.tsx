'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/components/layout/ThemeProvider';

const FONT     = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";
const LS_EMAIL = 'sr-dca-vip-signup-email';

type Frequency = 'weekly' | 'monthly';
type Status    = 'idle' | 'loading' | 'sent' | 'updated' | 'error';

interface Props {
  baseAmount: number;   // synced from DCASignalPage base $ input
}

export function VIPEmailSignup({ baseAmount }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';
  const [email,     setEmail]     = useState('');
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [status,    setStatus]    = useState<Status>('idle');
  const [errorMsg,  setErrorMsg]  = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // Hydrate from localStorage + check URL confirmation param
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('vip_subscribed') === '1') setConfirmed(true);
      const stored = localStorage.getItem(LS_EMAIL);
      if (stored) setEmail(stored);
    } catch { /* SSR guard */ }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) return;

    setStatus('loading');
    setErrorMsg('');

    try { localStorage.setItem(LS_EMAIL, email); } catch { /* noop */ }

    try {
      const res = await fetch('/api/dca-signal-subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email,
          frequency,
          baseAmount,
          signalType: 'dca_in_out',
        }),
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

  // Confirmed via URL param
  if (confirmed) {
    return (
      <VipSuccessBox
        message="VIP subscription confirmed."
        sub="You'll receive combined buy + exit signals on the schedule you chose."
      />
    );
  }

  // Confirm email sent
  if (status === 'sent') {
    return (
      <VipSuccessBox
        message="Check your inbox — confirm your VIP subscription."
        sub={`Sent to ${email} · click the link to activate.`}
      />
    );
  }

  // Preferences updated
  if (status === 'updated') {
    return (
      <VipSuccessBox
        message="VIP signal preferences updated."
        sub={`${frequency === 'weekly' ? 'Weekly' : 'Monthly'} in/out signals for ${email}.`}
      />
    );
  }

  return (
    <div style={{
      marginTop:  20,
      paddingTop: 16,
      borderTop:  '1px solid rgba(196,136,90,0.15)',
      fontFamily: FONT,
    }}>

      {/* Section label */}
      <span style={{
        display:       'block',
        fontSize: 11,
        letterSpacing: '0.14em',
        color:         '#c4885a',
        marginBottom:  10,
      }}>
        VIP · DCA IN/OUT SIGNAL EMAIL
      </span>

      <div style={{
        padding:    '16px 18px',
        background: 'rgba(196,136,90,0.04)',
        border:     '1px solid rgba(196,136,90,0.15)',
      }}>
        <p style={{ fontSize: 12, color: '#b89878', margin: '0 0 14px', lineHeight: 1.6, letterSpacing: '0.04em' }}>
          Receive the combined buy <em>and</em> exit signal by email — including your weekly
          recommendation whether to accumulate or distribute, and the exit multiplier tier
          when the signal crosses below 0.70×.
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
                  border:        '1px solid rgba(196,136,90,0.25)',
                  background:    frequency === f ? 'rgba(196,136,90,0.18)' : 'transparent',
                  color:         frequency === f ? '#c4885a' : '#8a9bb0',
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
                flex:       1,
                fontSize: 13,
                fontFamily: FONT,
                background: 'var(--bg-card)',
                border:     '1px solid var(--border-primary)',
                color:      'var(--text-primary)',
                padding:    '6px 10px',
                outline:    'none',
                transition: 'none',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#c4885a'; }}
              onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
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
                background:    '#c4885a',
                color:         '#090d12',
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
            <span style={{ fontSize: 11, color: '#d06050', letterSpacing: '0.08em' }}>
              {errorMsg || 'Subscription failed — try again'}
            </span>
          )}

          {/* Context */}
          <span style={{ fontSize: 10, color: '#6b7a8d', letterSpacing: '0.08em' }}>
            Double opt-in confirmation · confirmation email includes unsubscribe links for both signals · not financial advice
          </span>

        </form>
      </div>
    </div>
  );
}

function VipSuccessBox({ message, sub }: { message: string; sub: string }) {
  return (
    <div style={{
      marginTop:  20,
      paddingTop: 16,
      borderTop:  '1px solid rgba(196,136,90,0.15)',
      fontFamily: FONT,
    }}>
      <span style={{
        display:       'block',
        fontSize: 11,
        letterSpacing: '0.14em',
        color:         '#c4885a',
        marginBottom:  10,
      }}>
        VIP · DCA IN/OUT SIGNAL EMAIL
      </span>
      <div style={{
        padding:       '14px 18px',
        background:    'rgba(196,136,90,0.07)',
        border:        '1px solid rgba(196,136,90,0.25)',
        display:       'flex',
        flexDirection: 'column',
        gap:           4,
      }}>
        <span style={{ fontSize: 13, color: '#c4885a', fontWeight: 600, letterSpacing: '0.04em' }}>
          {message}
        </span>
        <span style={{ fontSize: 11, color: '#8a9bb0', letterSpacing: '0.08em' }}>
          {sub}
        </span>
      </div>
    </div>
  );
}
