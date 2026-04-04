'use client';

/**
 * MembersRoom — main layout orchestrator for the reactive intelligence room.
 *
 * Layout:
 * ┌──────────────────────────────────────────┬─────────────────────┐
 * │  TOP BAR: BTC ticker | Threat state      │                     │
 * ├──────────────────────────────────────────┤  NOSTR CHAT (60%)   │
 * │                                          │                     │
 * │   R3F NETWORK GRAPH                      ├─────────────────────┤
 * │   (full-bleed background)                │  AGENT LOG  (40%)   │
 * │                                          │                     │
 * └──────────────────────────────────────────┴─────────────────────┘
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from '@/components/layout/ThemeProvider';
import { useAuth } from '@/components/layout/AuthProvider';
import { useTier } from '@/hooks/useTier';
import { useOpsRoom } from '@/hooks/useOpsRoom';
import { useAgentEvents } from '@/hooks/useAgentEvents';
import { useThreatScore } from '@/hooks/useThreatScore';
import { useAgentLog } from '@/hooks/useAgentLog';
import { useAnimationQueue } from '@/hooks/useAnimationQueue';
import TopBar from './TopBar';
import NostrChatSlot from './NostrChatSlot';
import AgentLogPanel from './AgentLogPanel';
import HeatmapOverlay from './HeatmapOverlay';

// Lazy-load R3F canvas — heavy, client-only
const NetworkGraphCanvas = dynamic(
  () => import('./NetworkGraph/NetworkGraphCanvas'),
  { ssr: false },
);

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";
const RIGHT_COL_WIDTH = 320;

export default function MembersRoom() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { canAccess } = useTier();
  const { data, sendMessage } = useOpsRoom();

  // Agent event system
  const { events, connected, lastEventTime } = useAgentEvents();
  const threat = useThreatScore(events);
  const { entries: logEntries } = useAgentLog(events);
  const animQueue = useAnimationQueue();

  // Enqueue animations for new events
  const processedRef = useRef(new Set<string>());
  useEffect(() => {
    for (const evt of events) {
      if (!processedRef.current.has(evt.id)) {
        processedRef.current.add(evt.id);
        animQueue.enqueue(evt);
      }
    }
    // Prune processed set
    if (processedRef.current.size > 600) {
      const arr = Array.from(processedRef.current);
      processedRef.current = new Set(arr.slice(-300));
    }
  }, [events, animQueue]);

  // Heatmap overlay
  const [heatmapOpen, setHeatmapOpen] = useState(false);

  // Theme forcing — silent dark mode override
  const [transitionPhase, setTransitionPhase] = useState<'entering' | 'visible'>('entering');

  useEffect(() => {
    const storedTheme = localStorage.getItem('sr-theme') || 'parchment';
    sessionStorage.setItem('sr-ops-room-prev-theme', storedTheme);
    if (theme !== 'dark') setTheme('dark');
    const timer = setTimeout(() => setTransitionPhase('visible'), 300);
    return () => {
      clearTimeout(timer);
      const prev = sessionStorage.getItem('sr-ops-room-prev-theme');
      sessionStorage.removeItem('sr-ops-room-prev-theme');
      if (prev && prev !== 'dark') setTheme(prev as 'dark' | 'parchment');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chat props
  const canPost = canAccess('members');
  const displayName = user?.chatDisplayName || 'anon';
  const userIcon = (user?.chatIcon as string) || 'email';

  // BTC data from snapshot
  const btcAsset = data.assets.find((a) => a.key === 'btc');
  const btcPrice = btcAsset?.price || 0;
  const btcDelta = btcAsset?.delta || 0;

  return (
    <>
      {/* Transition overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#090d12',
          zIndex: 9999,
          pointerEvents: transitionPhase === 'visible' ? 'none' : 'auto',
          opacity: transitionPhase === 'entering' ? 1 : 0,
          transition: 'opacity 300ms ease-out',
        }}
      />

      {/* Full viewport layout */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          background: '#090d12',
          fontFamily: FONT,
          overflow: 'hidden',
          color: '#e8edf2',
        }}
      >
        {/* ── Top bar ── */}
        <TopBar
          btcPrice={btcPrice}
          btcDelta={btcDelta}
          threatState={threat.state}
          threatScore={threat.score}
          connected={connected}
          operatorCount={data.operatorCount}
          eventCount={events.length}
        />

        {/* ── Main content ── */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* ── Centre: R3F graph + heatmap ── */}
          <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
            {/* R3F network graph — full bleed background */}
            <NetworkGraphCanvas
              threatState={threat.state}
              animationState={{
                currentAnimation: animQueue.currentAnimation,
                isPlaying: animQueue.isPlaying,
                nodeActivations: animQueue.nodeActivations,
                edgeBrightness: animQueue.edgeBrightness,
                nodeScales: animQueue.nodeScales,
              }}
            />

            {/* Heatmap toggle button */}
            <button
              onClick={() => setHeatmapOpen((p) => !p)}
              style={{
                position: 'absolute',
                bottom: 14,
                left: 14,
                zIndex: 15,
                background: heatmapOpen
                  ? 'rgba(0, 229, 200, 0.15)'
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${heatmapOpen ? 'rgba(0, 229, 200, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                color: heatmapOpen ? '#00e5c8' : '#6b7a8d',
                fontSize: 9,
                fontFamily: FONT,
                letterSpacing: '0.1em',
                padding: '6px 12px',
                cursor: 'pointer',
                borderRadius: 1,
                backdropFilter: 'blur(4px)',
              }}
            >
              {heatmapOpen ? 'CLOSE GLOBE' : 'GLOBE'}
            </button>

            {/* Heatmap overlay */}
            <HeatmapOverlay
              visible={heatmapOpen}
              onClose={() => setHeatmapOpen(false)}
            />

            {/* Scan-line texture over the entire centre area */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.008) 3px, rgba(255,255,255,0.008) 6px)',
                zIndex: 5,
              }}
            />

            {/* Threat state transition notification */}
            {threat.stateChanged && (
              <div
                style={{
                  position: 'absolute',
                  top: 20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 15,
                  background: 'rgba(9, 13, 18, 0.9)',
                  border: '1px solid rgba(0, 229, 200, 0.3)',
                  padding: '8px 20px',
                  fontSize: 11,
                  fontFamily: FONT,
                  letterSpacing: '0.1em',
                  color: '#00e5c8',
                  animation: 'stateTransitionFade 3s ease-out forwards',
                }}
              >
                THREAT POSTURE: {threat.prevState} → {threat.state}
              </div>
            )}
          </div>

          {/* ── Right column ── */}
          <div
            style={{
              width: RIGHT_COL_WIDTH,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              minHeight: 0,
            }}
          >
            {/* Nostr chat — 60% */}
            <div style={{ flex: 6, minHeight: 0 }}>
              <NostrChatSlot
                messages={data.messages}
                operatorCount={data.operatorCount}
                onSend={sendMessage}
                canPost={canPost}
                userDisplayName={displayName}
                userIcon={userIcon}
              />
            </div>

            {/* Agent log — 40% */}
            <div style={{ flex: 4, minHeight: 0 }}>
              <AgentLogPanel entries={logEntries} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes stateTransitionFade {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </>
  );
}
