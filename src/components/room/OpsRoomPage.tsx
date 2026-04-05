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
 * Admin users can resize the Operations, Signals, and Channel
 * zones via drag handles. Layout dimensions persist to localStorage.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/components/layout/ThemeProvider';
import { useAuth } from '@/components/layout/AuthProvider';
import { useTier } from '@/hooks/useTier';
import { useOpsRoom } from '@/hooks/useOpsRoom';
import { isAdmin } from '@/lib/auth/tier';

import OpsHeader from './OpsHeader';
import OperationsPanel from './OperationsPanel';
import GlobalTheatre from './GlobalTheatre';
import SignalsBoard from './SignalsBoard';
import OperatorChannel from './OperatorChannel';
import FlashTraffic from './FlashTraffic';

// ── Layout defaults & persistence ────────────────────────────────────────��───

const STORAGE_KEY = 'sr-ops-room-layout';

interface OpsLayout {
  opsWidth: number;
  signalsWidth: number;
  channelHeight: number;
}

const DEFAULT_LAYOUT: OpsLayout = {
  opsWidth: 280,
  signalsWidth: 320,
  channelHeight: 80,
};

const MIN_OPS = 200;
const MAX_OPS = 400;
const MIN_SIGNALS = 240;
const MAX_SIGNALS = 480;
const MIN_CHANNEL = 60;
const MAX_CHANNEL = 160;

function readLayout(): OpsLayout {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw);
    return {
      opsWidth: Math.min(MAX_OPS, Math.max(MIN_OPS, parsed.opsWidth ?? DEFAULT_LAYOUT.opsWidth)),
      signalsWidth: Math.min(MAX_SIGNALS, Math.max(MIN_SIGNALS, parsed.signalsWidth ?? DEFAULT_LAYOUT.signalsWidth)),
      channelHeight: Math.min(MAX_CHANNEL, Math.max(MIN_CHANNEL, parsed.channelHeight ?? DEFAULT_LAYOUT.channelHeight)),
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function saveLayout(layout: OpsLayout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch { /* non-critical */ }
}

// ── Drag handle hook ─────────────────────────────────────────────────────────

type DragAxis = 'x' | 'y';
type DragDir = 'left' | 'right' | 'up';

function useDragHandle(
  axis: DragAxis,
  dir: DragDir,
  current: number,
  min: number,
  max: number,
  onChange: (v: number) => void,
) {
  const dragging = useRef(false);
  const startPos = useRef(0);
  const startVal = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startPos.current = axis === 'x' ? e.clientX : e.clientY;
    startVal.current = current;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = (axis === 'x' ? ev.clientX : ev.clientY) - startPos.current;
      // 'right' means dragging right increases width, 'left' means dragging left increases
      const sign = dir === 'left' ? -1 : dir === 'up' ? -1 : 1;
      const next = Math.round(Math.min(max, Math.max(min, startVal.current + delta * sign)));
      onChange(next);
    };

    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [axis, dir, current, min, max, onChange]);

  return { onMouseDown };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function OpsRoomPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { canAccess } = useTier();
  const { data, dismissFlash, sendMessage } = useOpsRoom();

  const userIsAdmin = isAdmin(user?.email);

  // Layout state
  const [layout, setLayout] = useState<OpsLayout>(readLayout);
  const [editMode, setEditMode] = useState(false);

  // Persist layout on change
  useEffect(() => {
    saveLayout(layout);
  }, [layout]);

  // Theme forcing — room layout handles the actual dark/restore lifecycle,
  // but ensure dark is applied if this component mounts independently
  const [transitionPhase, setTransitionPhase] = useState<'entering' | 'visible' | 'leaving'>('entering');

  useEffect(() => {
    if (theme !== 'dark') setTheme('dark');
    const timer = setTimeout(() => setTransitionPhase('visible'), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Layout updaters
  const setOpsWidth = useCallback((v: number) => setLayout((l) => ({ ...l, opsWidth: v })), []);
  const setSignalsWidth = useCallback((v: number) => setLayout((l) => ({ ...l, signalsWidth: v })), []);
  const setChannelHeight = useCallback((v: number) => setLayout((l) => ({ ...l, channelHeight: v })), []);

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    saveLayout(DEFAULT_LAYOUT);
  }, []);

  // Drag handles
  const opsHandle = useDragHandle('x', 'right', layout.opsWidth, MIN_OPS, MAX_OPS, setOpsWidth);
  const signalsHandle = useDragHandle('x', 'left', layout.signalsWidth, MIN_SIGNALS, MAX_SIGNALS, setSignalsWidth);
  const channelHandle = useDragHandle('y', 'up', layout.channelHeight, MIN_CHANNEL, MAX_CHANNEL, setChannelHeight);

  const canPost = canAccess('members');
  const displayName = user?.chatDisplayName || 'anon';
  const userIcon = (user?.chatIcon as string) || 'email';
  const flashGeoRef = data.flashTraffic?.geoReference || null;

  const HANDLE_COLOR = editMode ? '#00d4aa' : 'transparent';

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
          isAdmin={userIsAdmin}
          editMode={editMode}
          onToggleEdit={() => setEditMode((p) => !p)}
          onResetLayout={resetLayout}
        />

        {/* Middle row: Zones 2, 3, 4 */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            minHeight: 0,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Zone 2: Operations Panel */}
          <div style={{ width: layout.opsWidth, flexShrink: 0, position: 'relative' }}>
            <OperationsPanel
              assets={data.assets}
              network={data.network}
              conviction={data.conviction}
              outlookText={data.outlookText}
              pool={data.pool}
            />

            {/* Right-edge drag handle */}
            {editMode && (
              <div
                onMouseDown={opsHandle.onMouseDown}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: -2,
                  width: 5,
                  height: '100%',
                  cursor: 'col-resize',
                  background: HANDLE_COLOR,
                  opacity: 0.4,
                  zIndex: 30,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; }}
                title={`Operations width: ${layout.opsWidth}px (drag to resize)`}
              />
            )}
          </div>

          {/* Zone 3: Global Theatre */}
          <GlobalTheatre
            eventMarkers={data.eventMarkers}
            flashGeoRef={flashGeoRef}
          />

          {/* Zone 4: Signals Board */}
          <div style={{ width: layout.signalsWidth, flexShrink: 0, position: 'relative' }}>
            {/* Left-edge drag handle */}
            {editMode && (
              <div
                onMouseDown={signalsHandle.onMouseDown}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: -2,
                  width: 5,
                  height: '100%',
                  cursor: 'col-resize',
                  background: HANDLE_COLOR,
                  opacity: 0.4,
                  zIndex: 30,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; }}
                title={`Signals width: ${layout.signalsWidth}px (drag to resize)`}
              />
            )}

            <SignalsBoard
              articles={data.articles}
              flashArticleId={data.flashTraffic?.id || null}
            />
          </div>
        </div>

        {/* Channel top-edge drag handle */}
        {editMode && (
          <div
            onMouseDown={channelHandle.onMouseDown}
            style={{
              width: '100%',
              height: 5,
              cursor: 'row-resize',
              background: HANDLE_COLOR,
              opacity: 0.4,
              zIndex: 30,
              flexShrink: 0,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; }}
            title={`Channel height: ${layout.channelHeight}px (drag to resize)`}
          />
        )}

        {/* Zone 5: Operator Channel */}
        <div style={{ height: layout.channelHeight, flexShrink: 0 }}>
          <OperatorChannel
            messages={data.messages}
            operatorCount={data.operatorCount}
            onSend={sendMessage}
            canPost={canPost}
            userDisplayName={displayName}
            userIcon={userIcon}
          />
        </div>
      </div>

      {/* Edit mode dimension labels */}
      {editMode && (
        <div
          style={{
            position: 'fixed',
            bottom: layout.channelHeight + 12,
            left: 12,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            color: '#00d4aa',
            background: 'rgba(8,13,13,0.9)',
            border: '1px solid #1a2e2e',
            padding: '4px 8px',
            zIndex: 50,
            letterSpacing: '0.06em',
            lineHeight: 1.6,
          }}
        >
          OPS: {layout.opsWidth}px &nbsp;|&nbsp; SIGNALS: {layout.signalsWidth}px &nbsp;|&nbsp; CHANNEL: {layout.channelHeight}px
        </div>
      )}
    </>
  );
}
