'use client';

/**
 * MembersRoom — main layout orchestrator for the reactive intelligence room.
 *
 * Layout:
 * ┌─────────────────┬──────────────────────────┬─────────────────────┐
 * │                 │  TOP BAR                 │                     │
 * │  BTC DATA (50%) ├──────────────────────────┤  NOSTR CHAT (60%)   │
 * │                 │                          │                     │
 * ├─────────────────┤  2D NETWORK CANVAS       ├─────────────────────┤
 * │                 │  (full-bleed background)  │  AGENT LOG  (40%)   │
 * │  THREAT         │                          │                     │
 * │  ANALYSIS (50%) │                          │                     │
 * └─────────────────┴──────────────────────────┴─────────────────────┘
 */

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/components/layout/AuthProvider';
import { useTier } from '@/hooks/useTier';
import { useOpsRoom } from '@/hooks/useOpsRoom';
import { useAgentEvents } from '@/hooks/useAgentEvents';
import { useThreatScore } from '@/hooks/useThreatScore';
import { useAgentLog } from '@/hooks/useAgentLog';
import TopBar from './TopBar';
import NostrChatSlot from './NostrChatSlot';
import AgentLogPanel from './AgentLogPanel';
import BtcInfoPanel from './BtcInfoPanel';
import ThreatAnalysisPanel from './ThreatAnalysisPanel';

// Lazy-load 2D canvas — client-only (uses requestAnimationFrame)
const NetworkCanvas2D = dynamic(
  () => import('./NetworkCanvas2D'),
  { ssr: false },
);

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";
const LEFT_COL_WIDTH = 280;
const RIGHT_COL_WIDTH = 320;

const KEYFRAME_CSS = `
@keyframes stateTransitionFade {
  0% { opacity: 1; }
  70% { opacity: 1; }
  100% { opacity: 0; }
}
`;

export default function MembersRoom() {
  const { user } = useAuth();
  const { canAccess } = useTier();
  const { data, sendMessage } = useOpsRoom();

  // Agent event system
  const { events, connected, lastEventTime } = useAgentEvents();
  const threat = useThreatScore(events);
  const { entries: logEntries } = useAgentLog(events);

  // Chat props
  const canPost = canAccess('members');
  const displayName = user?.chatDisplayName || 'anon';
  const userIcon = (user?.chatIcon as string) || 'email';

  // Asset data from snapshot
  const btcAsset = data.assets.find((a) => a.key === 'btc');
  const btcPrice = btcAsset?.price || 0;
  const btcDelta = btcAsset?.delta || 0;

  const dxyAsset = data.assets.find((a) => a.key === 'dxy');
  const goldAsset = data.assets.find((a) => a.key === 'gold');
  const oilAsset = data.assets.find((a) => a.key === 'oil');

  // Recent headlines for threat analysis context
  const recentHeadlines = useMemo(() =>
    events.slice(-12).map((e) => e.headline).filter(Boolean),
    [events],
  );

  return (
    <div
        style={{
          width: '100%',
          height: '100%',
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
          {/* ── Left column ── */}
          <div
            style={{
              width: LEFT_COL_WIDTH,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid rgba(255,255,255,0.08)',
              minHeight: 0,
            }}
          >
            {/* BTC data — 60% */}
            <div style={{ flex: 6, minHeight: 0 }}>
              <BtcInfoPanel
                btcPrice={btcPrice}
                btcDelta={btcDelta}
                network={data.network}
                conviction={data.conviction ? {
                  composite: data.conviction.composite,
                  band: data.conviction.band,
                  bandColor: data.conviction.bandColor,
                } : null}
                goldPrice={goldAsset?.price || 0}
                goldDelta={goldAsset?.delta || 0}
                oilPrice={oilAsset?.price || 0}
                oilDelta={oilAsset?.delta || 0}
                dxyPrice={dxyAsset?.price || 0}
                dxyDelta={dxyAsset?.delta || 0}
                threatScore={threat.score}
                threatState={threat.state}
              />
            </div>

            {/* Threat analysis — 40% */}
            <div style={{ flex: 4, minHeight: 0 }}>
              <ThreatAnalysisPanel
                threatState={threat.state}
                threatScore={threat.score}
                stateChanged={threat.stateChanged}
                prevState={threat.prevState}
                recentHeadlines={recentHeadlines}
              />
            </div>
          </div>

          {/* ── Centre: 2D orbital graph ── */}
          <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
            {/* Orbital network graph — full bleed background */}
            <NetworkCanvas2D
              threatState={threat.state}
              threatScore={threat.score}
              events={events}
              btcPrice={btcPrice}
              btcDelta={btcDelta}
              dxyPrice={dxyAsset?.price || 0}
              dxyDelta={dxyAsset?.delta || 0}
              fearGreed={data.conviction?.signals?.find(s => s.key === 'sentiment')?.rawValue ?? null}
              convictionScore={data.conviction?.composite ?? null}
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

        <style dangerouslySetInnerHTML={{ __html: KEYFRAME_CSS }} />
      </div>
  );
}
