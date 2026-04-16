'use client';

/**
 * /rooms/members — Members Room (Ops Room)
 *
 * Live intelligence centre for Members+ users. Theme-aware: renders in
 * whatever theme the user has selected (parchment or dark).
 */

import { useAuth } from '@/components/layout/AuthProvider';
import { useTier } from '@/hooks/useTier';
import { UpgradePrompt } from '@/components/auth/UpgradePrompt';
import MembersRoom from '@/components/room-v2/MembersRoom';

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

const fullScreenStyle: React.CSSProperties = {
  height:          '100%',
  display:         'flex',
  alignItems:      'center',
  justifyContent:  'center',
  backgroundColor: 'var(--bg-primary)',
  fontFamily:      FONT_MONO,
};

export default function RoomPage() {
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
      <div
        style={{
          ...fullScreenStyle,
          flexDirection: 'column',
          padding:       '40px 20px',
        }}
      >
        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-muted)', marginBottom: 8 }}>
          SITUATION ROOM
        </p>
        <h1
          style={{
            fontFamily:    FONT_MONO,
            fontSize:      22,
            color:         'var(--text-primary)',
            marginBottom:  12,
            fontWeight:    600,
            letterSpacing: '0.06em',
          }}
        >
          MEMBERS ROOM
        </h1>
        <p
          style={{
            fontSize:     11,
            color:        'var(--text-muted)',
            marginBottom: 24,
            lineHeight:   1.6,
            textAlign:    'center',
            maxWidth:     400,
          }}
        >
          Live intelligence centre. Real-time agent network, threat analysis,
          and operator channel access for authenticated members.
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
            fontFamily:      FONT_MONO,
            fontWeight:      600,
          }}
        >
          SIGN IN
        </a>
      </div>
    );
  }

  // Gate at Members+ tier
  if (!canAccess('members')) {
    return (
      <div style={{ ...fullScreenStyle, padding: '40px 20px' }}>
        <UpgradePrompt requiredTier="members" featureName="Members Room" variant="overlay" />
      </div>
    );
  }

  return <MembersRoom />;
}
