'use client';

/**
 * /tools/real-yields — Real Yields vs Bitcoin Returns (Members + VIP)
 *
 * 10-year TIPS yield (FRED DFII10) plotted against BTC log price since
 * 2010, with the negative-yield regime shaded. The thesis: the bulk of
 * Bitcoin's lifetime return has accrued during periods of negative real
 * yields. Headline stat quantifies the share.
 */

import { useAuth } from '@/components/layout/AuthProvider';
import { useTier } from '@/hooks/useTier';
import { UpgradePrompt } from '@/components/auth/UpgradePrompt';
import { RealYieldsRoom } from '@/components/real-yields/RealYieldsRoom';

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

const fullScreenStyle: React.CSSProperties = {
  height:          '100%',
  display:         'flex',
  alignItems:      'center',
  justifyContent:  'center',
  backgroundColor: 'var(--bg-primary)',
  fontFamily:      FONT_MONO,
};

export default function RealYieldsPage() {
  const { user, loading } = useAuth();
  const { canAccess } = useTier();

  if (loading) {
    return (
      <div style={fullScreenStyle}>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.14em' }}>
          INITIALISING...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ ...fullScreenStyle, flexDirection: 'column', padding: '40px 20px' }}>
        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-muted)', marginBottom: 8 }}>
          SITUATION ROOM
        </p>
        <h1 style={{ fontFamily: FONT_MONO, fontSize: 22, color: 'var(--text-primary)', marginBottom: 12, fontWeight: 600, letterSpacing: '0.06em' }}>
          REAL YIELDS · BITCOIN RETURNS
        </h1>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6, textAlign: 'center', maxWidth: 460 }}>
          10-year US TIPS yield against BTC log price since 2010 — the
          regime in which Bitcoin has earned its return. Sign in to view.
        </p>
        <a
          href="/login"
          style={{
            display: 'inline-block', padding: '8px 20px', fontSize: 11, letterSpacing: '0.1em',
            backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)',
            textDecoration: 'none', fontFamily: FONT_MONO, fontWeight: 600,
          }}
        >
          SIGN IN
        </a>
      </div>
    );
  }

  if (!canAccess('members')) {
    return (
      <div style={{ ...fullScreenStyle, padding: '40px 20px' }}>
        <UpgradePrompt requiredTier="members" featureName="Real Yields" variant="overlay" />
      </div>
    );
  }

  return <RealYieldsRoom />;
}
