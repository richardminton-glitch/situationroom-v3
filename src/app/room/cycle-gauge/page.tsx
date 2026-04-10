'use client';

/**
 * /room/cycle-gauge — Cycle Position Gauge
 *
 * Available to all authenticated users (free tier +).
 * Sits inside the /room layout (dark theme + Sidebar already applied).
 */

import { useEffect, useState }  from 'react';
import { useAuth }              from '@/components/layout/AuthProvider';
import { CycleGaugePage }       from '@/components/cycle-gauge/CycleGaugePage';
import type { CycleGaugeResponse } from '@/app/api/cycle-gauge/route';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

export default function CycleGaugeRoute() {
  const { user, loading: authLoading } = useAuth();

  const [data,    setData]    = useState<CycleGaugeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    fetch('/api/cycle-gauge')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<CycleGaugeResponse>;
      })
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [user]);

  // Auth loading
  if (authLoading) {
    return (
      <div style={{
        height:          '100%',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        backgroundColor: 'var(--bg-primary)',
        fontFamily:      FONT,
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.14em' }}>INITIALISING...</p>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div style={{
        height:          '100%',
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        backgroundColor: 'var(--bg-primary)',
        fontFamily:      FONT,
        padding:         '40px 20px',
      }}>
        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-muted)', marginBottom: 8 }}>
          CYCLE POSITION GAUGE
        </p>
        <h1 style={{ fontSize: 22, color: 'var(--text-primary)', marginBottom: 12, fontWeight: 600, letterSpacing: '0.06em' }}>
          SIGN IN TO VIEW
        </h1>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6, textAlign: 'center', maxWidth: 400 }}>
          Sign in to access the Cycle Position Gauge and on-chain cycle analysis.
        </p>
        <a
          href="/login"
          style={{
            display:         'inline-block',
            padding:         '8px 20px',
            fontSize:        11,
            letterSpacing:   '0.1em',
            backgroundColor: 'var(--accent-primary)',
            color:           'var(--bg-primary)',
            textDecoration:  'none',
            fontWeight:      600,
          }}
        >
          SIGN IN
        </a>
      </div>
    );
  }

  return <CycleGaugePage data={data} loading={loading} error={error} />;
}
