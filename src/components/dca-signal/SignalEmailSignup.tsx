'use client';

import { useState, useEffect } from 'react';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";
const LS_EMAIL = 'sr-dca-signup-email';

type Frequency = 'weekly' | 'monthly';
type Status    = 'idle' | 'loading' | 'sent' | 'updated' | 'error';

interface Props {
  baseAmount: number;  // inherit from HeroSignal so the email uses the same base
}

export function SignalEmailSignup({ baseAmount }: Props) {
  const [email,     setEmail]     = useState('');
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [status,    setStatus]    = useState<Status>('idle');
  const [errorMsg,  setErrorMsg]  = useState('');
  const [confirmed, setConfirmed] = useState(false);

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

  // Confirmed via URL param
  if (confirmed) {
    return (
      <SuccessBox
        message="You're subscribed! Your first signal email is on its way."
        sub="Check your inbox — signal emails land every Monday (weekly) or first of month."
      />
    );
  }

  // Confirm email sent
  if (status === 'sent') {
    return (
      <SuccessBox
        message="Check your inbox — confirm your subscription."
        sub={`Sent to ${email} · click the link to activate.`}
      />
    );
  }

  // Preferences updated
  if (status === 'updated') {
    return (
      <SuccessBox
        message="Preferences updated."
        sub={`${frequency === 'weekly' ? 'Weekly' : 'Monthly'} signal emails for ${email}.`}
      />
    );
  }

  return (
    <div style={{
      paddingTop:  16,
      borderTop:   '1px solid rgba(255,255,255,0.06)',
      fontFamily:  FONT,
    }}>

      {/* Section label */}
      <span style={{
        display:       'block',
        fontSize: 11,
        letterSpacing: '0.14em',
        color:         '#8a9bb0',
        marginBottom:  10,
      }}>
        SIGNAL EMAIL
      </span>

      <div style={{
        padding:    '16px 18px',
        background: 'rgba(255,255,255,0.025)',
        border:     '1px solid rgba(255,255,255,0.06)',
      }}>
        <p style={{ fontSize: 12, color: '#8aaba6', margin: '0 0 14px', lineHeight: 1.6, letterSpacing: '0.04em' }}>
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
                  border:        '1px solid rgba(255,255,255,0.12)',
                  background:    frequency === f ? 'rgba(0,212,200,0.15)' : 'transparent',
                  color:         frequency === f ? '#00d4c8' : '#8a9bb0',
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
                background:   '#0d1520',
                border:       '1px solid rgba(255,255,255,0.12)',
                color:        '#e8edf2',
                padding:      '6px 10px',
                outline:      'none',
                transition:   'none',
              }}
              onFocus={e  => { e.currentTarget.style.borderColor = '#00d4c8'; }}
              onBlur={e   => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
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
                background:    '#00d4c8',
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

          {/* Context line */}
          <span style={{ fontSize: 10, color: '#6b7a8d', letterSpacing: '0.08em' }}>
            Double opt-in confirmation email sent · unsubscribe any time · not financial advice
          </span>

        </form>
      </div>
    </div>
  );
}

function SuccessBox({ message, sub }: { message: string; sub: string }) {
  return (
    <div style={{
      paddingTop:  16,
      borderTop:   '1px solid rgba(255,255,255,0.06)',
      fontFamily:  FONT,
    }}>
      <span style={{
        display:       'block',
        fontSize: 11,
        letterSpacing: '0.14em',
        color:         '#8a9bb0',
        marginBottom:  10,
      }}>
        SIGNAL EMAIL
      </span>
      <div style={{
        padding:    '14px 18px',
        background: 'rgba(0,212,200,0.07)',
        border:     '1px solid rgba(0,212,200,0.2)',
        display:    'flex',
        flexDirection: 'column',
        gap:        4,
      }}>
        <span style={{ fontSize: 13, color: '#00d4c8', fontWeight: 600, letterSpacing: '0.04em' }}>
          {message}
        </span>
        <span style={{ fontSize: 11, color: '#8a9bb0', letterSpacing: '0.08em' }}>
          {sub}
        </span>
      </div>
    </div>
  );
}
