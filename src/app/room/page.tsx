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
import OpsRoomPage from '@/components/room/OpsRoomPage';

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
          backgroundColor: '#080d0d',
          fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
        }}
      >
        <p style={{ color: '#4a6060', fontSize: 12, letterSpacing: '0.1em' }}>LOADING OPS ROOM...</p>
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
          backgroundColor: 'var(--bg-primary)',
          fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
          padding: '40px 20px',
        }}
      >
        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-muted)', marginBottom: 8 }}>
          SITUATION ROOM
        </p>
        <h1
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 26,
            color: 'var(--text-primary)',
            marginBottom: 12,
            fontWeight: 'normal',
          }}
        >
          Ops Room
        </h1>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6, textAlign: 'center', maxWidth: 400 }}>
          The Ops Room is a live intelligence centre for Members.
          Sign in to access real-time signals, the global theatre, and the operator channel.
        </p>
        <a
          href="/login"
          style={{
            display: 'inline-block',
            padding: '8px 20px',
            fontSize: 11,
            letterSpacing: '0.1em',
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--bg-primary)',
            textDecoration: 'none',
            fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
          }}
        >
          SIGN IN
        </a>
      </div>
    );
  }

  // Render the full Ops Room for all authenticated users.
  // Posting in the operator channel is gated at Members+ within the component.
  return <OpsRoomPage />;
}
