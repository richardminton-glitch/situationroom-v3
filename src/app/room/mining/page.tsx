'use client';

/**
 * /room/mining — Energy & Mining Intelligence Dashboard
 *
 * Available to General tier and above.
 * Sits inside the /room layout (parchment-compatible).
 */

import { useEffect, useState } from 'react';
import { useAuth }        from '@/components/layout/AuthProvider';
import { useTier }        from '@/hooks/useTier';
import { useTheme }       from '@/components/layout/ThemeProvider';
import { UpgradePrompt }  from '@/components/auth/UpgradePrompt';
import { MiningPage }     from '@/components/mining/MiningPage';
import type { MiningIntelResponse } from '@/app/api/mining-intel/route';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

export default function MiningIntelRoute() {
  const { user, loading: authLoading } = useAuth();
  const { canAccess } = useTier();
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

  const [data,    setData]    = useState<MiningIntelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!user || !canAccess('general')) {
      setLoading(false);
      return;
    }

    fetch('/api/mining-intel')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<MiningIntelResponse>;
      })
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [user, canAccess]);

  // Auth loading
  if (authLoading) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        fontFamily: FONT,
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.14em' }}>INITIALISING...</p>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        fontFamily: FONT,
        padding: '40px 20px',
      }}>
        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-muted)', marginBottom: 8 }}>
          ENERGY & MINING INTELLIGENCE
        </p>
        <h1 style={{
          fontSize: 22,
          color: 'var(--text-primary)',
          marginBottom: 12,
          fontWeight: 600,
          letterSpacing: '0.06em',
          fontFamily: isDark ? FONT : "'Georgia', 'Times New Roman', serif",
        }}>
          MEMBERS ONLY
        </h1>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6, textAlign: 'center', maxWidth: 400 }}>
          Sign in to access the Energy & Mining Intelligence dashboard.
        </p>
        <a
          href="/login"
          style={{
            display: 'inline-block',
            padding: '8px 20px',
            fontSize: 11,
            letterSpacing: '0.1em',
            backgroundColor: isDark ? '#00e5c8' : '#4a7c59',
            color: 'var(--bg-primary)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          SIGN IN
        </a>
      </div>
    );
  }

  // Tier gate — general and above
  if (!canAccess('general')) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        fontFamily: FONT,
        padding: '40px 20px',
      }}>
        <UpgradePrompt requiredTier="general" featureName="Mining Intel" variant="overlay" />
      </div>
    );
  }

  return <MiningPage data={data} loading={loading} error={error} />;
}
