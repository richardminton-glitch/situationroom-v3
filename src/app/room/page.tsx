'use client';

/**
 * /room — Members Room (Ops Room)
 *
 * Full-page dark-mode-only view for Members+ users.
 * Replaces the standard dashboard canvas when active.
 */

import { useAuth } from '@/components/layout/AuthProvider';
import { useTier } from '@/hooks/useTier';
import { UpgradePrompt } from '@/components/auth/UpgradePrompt';
import MembersRoom from '@/components/room-v2/MembersRoom';

export default function RoomPage() {
  const { user, loading } = useAuth();
  const { canAccess } = useTier();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#090d12',
          fontFamily: "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace",
        }}
      >
        <p style={{ color: '#6b7a8d', fontSize: 11, letterSpacing: '0.14em' }}>INITIALISING...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#090d12',
          fontFamily: "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace",
          padding: '40px 20px',
        }}
      >
        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: '#6b7a8d', marginBottom: 8 }}>
          SITUATION ROOM
        </p>
        <h1
          style={{
            fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
            fontSize: 22,
            color: '#e8edf2',
            marginBottom: 12,
            fontWeight: 600,
            letterSpacing: '0.06em',
          }}
        >
          MEMBERS ROOM
        </h1>
        <p style={{ fontSize: 11, color: '#6b7a8d', marginBottom: 24, lineHeight: 1.6, textAlign: 'center', maxWidth: 400 }}>
          Live intelligence centre. Real-time agent network, threat analysis,
          and operator channel access for authenticated members.
        </p>
        <a
          href="/login"
          style={{
            display: 'inline-block',
            padding: '8px 20px',
            fontSize: 11,
            letterSpacing: '0.1em',
            backgroundColor: '#00e5c8',
            color: '#090d12',
            textDecoration: 'none',
            fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
            fontWeight: 600,
          }}
        >
          SIGN IN
        </a>
      </div>
    );
  }

  // Render the full Ops Room for all authenticated users.
  // Posting in the operator channel is gated at Members+ within the component.
  return <MembersRoom />;
}
