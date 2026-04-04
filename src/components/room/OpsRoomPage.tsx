'use client';

/**
 * OpsRoomPage — main layout orchestrator for the Members Room.
 *
 * Four zones, all visible simultaneously, no outer scroll:
 * ┌─────────────────────────────────────────────────────┐
 * │  HEADER BAR (48px)                                  │
 * ├────────────┬───────────────────────┬────────────────┤
 * │ OPERATIONS │   GLOBAL THEATRE      │ SIGNALS BOARD  │
 * │ (280px)    │   (flex-grow)         │ (320px)        │
 * ├────────────┴───────────────────────┴────────────────┤
 * │  OPERATOR CHANNEL (80px)                            │
 * └─────────────────────────────────────────────────────┘
 *
 * This page forces dark mode on entry and restores on exit.
 */

import { useEffect, useState } from 'react';
import { useTheme } from '@/components/layout/ThemeProvider';
import { useAuth } from '@/components/layout/AuthProvider';
import { useTier } from '@/hooks/useTier';
import { useOpsRoom } from '@/hooks/useOpsRoom';

import OpsHeader from './OpsHeader';
import OperationsPanel from './OperationsPanel';
import GlobalTheatre from './GlobalTheatre';
import SignalsBoard from './SignalsBoard';
import OperatorChannel from './OperatorChannel';
import FlashTraffic from './FlashTraffic';

export default function OpsRoomPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { canAccess } = useTier();
  const { data, dismissFlash, sendMessage } = useOpsRoom();

  // Theme forcing: store previous theme in sessionStorage, force dark, restore on unmount
  const [transitionPhase, setTransitionPhase] = useState<'entering' | 'visible' | 'leaving'>('entering');

  useEffect(() => {
    // Store previous theme BEFORE forcing dark — read directly from localStorage
    // to avoid the race where the hook already reflects 'dark' from a prior visit
    const storedTheme = localStorage.getItem('sr-theme') || 'parchment';
    sessionStorage.setItem('sr-ops-room-prev-theme', storedTheme);

    if (theme !== 'dark') {
      setTheme('dark');
    }

    // Entry animation
    const timer = setTimeout(() => setTransitionPhase('visible'), 300);

    return () => {
      clearTimeout(timer);
      // Restore previous theme on unmount
      const prev = sessionStorage.getItem('sr-ops-room-prev-theme');
      sessionStorage.removeItem('sr-ops-room-prev-theme');
      if (prev && prev !== 'dark') {
        setTheme(prev as 'dark' | 'parchment');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canPost = canAccess('members');
  const displayName = user?.chatDisplayName || 'anon';
  const userIcon = (user?.chatIcon as string) || 'email';

  // Flash traffic geo reference for globe auto-focus
  const flashGeoRef = data.flashTraffic?.geoReference || null;

  return (
    <>
      {/* Transition overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#080d0d',
          zIndex: 9999,
          pointerEvents: transitionPhase === 'visible' ? 'none' : 'auto',
          opacity: transitionPhase === 'entering' ? 1 : 0,
          transition: 'opacity 300ms ease-out',
        }}
      />

      {/* Full page layout — no scroll */}
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#080d0d',
          overflow: 'hidden',
          fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
        }}
      >
        {/* Flash Traffic banner */}
        {data.flashTraffic && (
          <FlashTraffic article={data.flashTraffic} onDismiss={dismissFlash} />
        )}

        {/* Zone 1: Header Bar */}
        <OpsHeader
          threatLevel={data.threatLevel}
          operatorCount={data.operatorCount}
        />

        {/* Middle row: Zones 2, 3, 4 */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Zone 2: Operations Panel */}
          <OperationsPanel
            assets={data.assets}
            network={data.network}
            conviction={data.conviction}
            outlookText={data.outlookText}
            pool={data.pool}
          />

          {/* Zone 3: Global Theatre */}
          <GlobalTheatre
            eventMarkers={data.eventMarkers}
            flashGeoRef={flashGeoRef}
          />

          {/* Zone 4: Signals Board */}
          <SignalsBoard
            articles={data.articles}
            flashArticleId={data.flashTraffic?.id || null}
          />
        </div>

        {/* Zone 5: Operator Channel */}
        <OperatorChannel
          messages={data.messages}
          operatorCount={data.operatorCount}
          onSend={sendMessage}
          canPost={canPost}
          userDisplayName={displayName}
          userIcon={userIcon}
        />
      </div>
    </>
  );
}
