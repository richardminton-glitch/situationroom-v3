'use client';

/**
 * Top bar — BTC ticker, threat state indicator, feed status.
 * 48px height, full width across main area.
 */

import { useState, useEffect } from 'react';
import type { ThreatState } from '@/lib/room/threatEngine';
import { STATE_COLORS } from '@/lib/room/threatEngine';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface TopBarProps {
  btcPrice: number;
  btcDelta: number;
  threatState: ThreatState;
  threatScore: number;
  connected: boolean;
  operatorCount: number;
  eventCount: number;
}

const STATE_LABELS: Record<ThreatState, string> = {
  QUIET: 'QUIET',
  MONITORING: 'MONITORING',
  ELEVATED: 'ELEVATED',
  ALERT: 'ALERT',
  CRITICAL: 'CRITICAL',
};

export default function TopBar({
  btcPrice,
  btcDelta,
  threatState,
  threatScore,
  connected,
  operatorCount,
  eventCount,
}: TopBarProps) {
  const [utc, setUtc] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setUtc(
        now.toISOString().slice(11, 19) + ' UTC',
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const stateColor = STATE_COLORS[threatState];
  const isElevated = threatState !== 'QUIET' && threatState !== 'MONITORING';

  return (
    <div
      style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: 'rgba(9, 13, 18, 0.85)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        fontFamily: FONT,
        fontSize: 12,
        color: '#e8edf2',
        zIndex: 10,
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Left: BTC price */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#6b7a8d', fontSize: 10, letterSpacing: '0.08em' }}>
          BTC/USD
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            color: '#e8edf2',
          }}
        >
          ${Math.round(btcPrice).toLocaleString('en-US')}
        </span>
        <span
          style={{
            fontSize: 11,
            fontVariantNumeric: 'tabular-nums',
            color: btcDelta >= 0 ? '#00e5c8' : '#e03030',
          }}
        >
          {btcDelta >= 0 ? '+' : ''}{btcDelta.toFixed(2)}%
        </span>
        <span style={{ color: '#6b7a8d', fontSize: 9, letterSpacing: '0.05em' }}>
          {utc}
        </span>
      </div>

      {/* Centre: Threat state */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Indicator dot with optional ring */}
        <div style={{ position: 'relative', width: 12, height: 12 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: stateColor,
              position: 'absolute',
              top: 2,
              left: 2,
              boxShadow: `0 0 6px ${stateColor}`,
            }}
          />
          {isElevated && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 12,
                height: 12,
                borderRadius: '50%',
                border: `1.5px solid ${stateColor}`,
                animation: 'threatPulse 1.5s ease-in-out infinite',
              }}
            />
          )}
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.12em',
            color: stateColor,
          }}
        >
          {STATE_LABELS[threatState]}
        </span>
        <span
          style={{
            fontSize: 9,
            color: '#6b7a8d',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          [{threatScore}]
        </span>
      </div>

      {/* Right: Feed status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#6b7a8d', fontSize: 9, letterSpacing: '0.06em' }}>
          {operatorCount} OPS
        </span>
        <span style={{ color: '#6b7a8d', fontSize: 9, letterSpacing: '0.06em' }}>
          {eventCount} EVT/30m
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: connected ? '#00e5c8' : '#e03030',
              boxShadow: connected ? '0 0 4px #00e5c8' : '0 0 4px #e03030',
            }}
          />
          <span
            style={{
              fontSize: 9,
              letterSpacing: '0.08em',
              color: connected ? '#00e5c8' : '#e03030',
            }}
          >
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes threatPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
