'use client';

/**
 * /tools/blockchain — Blockchain Visualiser
 *
 * Available to General tier and above.
 * Theme-reactive: parchment scroll + darkroom contact sheet renderers.
 */

import { useEffect, useState } from 'react';
import { useAuth }           from '@/components/layout/AuthProvider';
import { useTier }           from '@/hooks/useTier';
import { useTheme }          from '@/components/layout/ThemeProvider';
import { UpgradePrompt }     from '@/components/auth/UpgradePrompt';
import { BlockchainPage }    from '@/components/blockchain/BlockchainPage';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

export default function BlockchainRoute() {
  const { user, loading: authLoading } = useAuth();
  const { canAccess } = useTier();
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

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
          BLOCKCHAIN VISUALISER
        </p>
        <h1 style={{
          fontSize: 22,
          color: 'var(--text-primary)',
          marginBottom: 12,
          fontWeight: 600,
          letterSpacing: '0.06em',
          fontFamily: isDark ? FONT : "'Georgia', 'Times New Roman', serif",
          // parchment: Georgia (not IM Fell)
        }}>
          MEMBERS ONLY
        </h1>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6, textAlign: 'center', maxWidth: 400 }}>
          Sign in to view a live unrolled chronicle of Bitcoin blocks past and coming.
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
        <UpgradePrompt requiredTier="general" featureName="Blockchain Visualiser" variant="overlay" />
      </div>
    );
  }

  return <BlockchainPage />;
}
