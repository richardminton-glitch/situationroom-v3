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
  threatState: ThreatState;
  threatScore: number;
  connected: boolean;
  operatorCount: number;
  eventCount: number;
  goldPrice: number;
  goldDelta: number;
  dxyPrice: number;
  dxyDelta: number;
  fearGreed: number | null;
  convictionScore: number | null;
  convictionBand: string | null;
}

const STATE_LABELS: Record<ThreatState, string> = {
  QUIET: 'QUIET',
  MONITORING: 'MONITORING',
  ELEVATED: 'ELEVATED',
  ALERT: 'ALERT',
  CRITICAL: 'CRITICAL',
};

export default function TopBar({
  threatState,
  threatScore,
  connected,
  operatorCount,
  eventCount,
  goldPrice,
  goldDelta,
  dxyPrice,
  dxyDelta,
  fearGreed,
  convictionScore,
  convictionBand,
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
      {/* Left: Global situation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ color: '#4a5a6d', fontSize: 9, letterSpacing: '0.05em' }}>
          {utc}
        </span>

        {/* Separator */}
        <span style={{ color: '#2a3a4a', fontSize: 10 }}>|</span>

        {/* Gold */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#6b7a8d', fontSize: 9, letterSpacing: '0.08em' }}>GOLD</span>
          <span style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums', color: '#e8edf2' }}>
            ${goldPrice > 0 ? goldPrice.toFixed(0) : '--'}
          </span>
          {goldPrice > 0 && (
            <span style={{ fontSize: 9, fontVariantNumeric: 'tabular-nums', color: goldDelta >= 0 ? '#00e5c8' : '#e03030' }}>
              {goldDelta >= 0 ? '+' : ''}{goldDelta.toFixed(1)}%
            </span>
          )}
        </div>

        {/* DXY */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#6b7a8d', fontSize: 9, letterSpacing: '0.08em' }}>DXY</span>
          <span style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums', color: '#e8edf2' }}>
            {dxyPrice > 0 ? dxyPrice.toFixed(1) : '--'}
          </span>
          {dxyPrice > 0 && (
            <span style={{ fontSize: 9, fontVariantNumeric: 'tabular-nums', color: dxyDelta >= 0 ? '#00e5c8' : '#e03030' }}>
              {dxyDelta >= 0 ? '+' : ''}{dxyDelta.toFixed(1)}%
            </span>
          )}
        </div>

        <span style={{ color: '#2a3a4a', fontSize: 10 }}>|</span>

        {/* Fear & Greed */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#6b7a8d', fontSize: 9, letterSpacing: '0.08em' }}>F&G</span>
          <span style={{
            fontSize: 10, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
            color: fearGreed != null
              ? (fearGreed < 30 ? '#e03030' : fearGreed > 60 ? '#00e5c8' : '#f0a500')
              : '#4a5a6d',
          }}>
            {fearGreed != null ? fearGreed.toFixed(0) : '--'}
          </span>
        </div>

        {/* Conviction */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#6b7a8d', fontSize: 9, letterSpacing: '0.08em' }}>CVT</span>
          <span style={{
            fontSize: 10, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
            color: '#f0a500',
          }}>
            {convictionScore != null ? convictionScore.toFixed(0) : '--'}
          </span>
          {convictionBand && (
            <span style={{ fontSize: 8, color: '#6b7a8d', letterSpacing: '0.06em' }}>
              {convictionBand.toUpperCase().split(' ')[0]}
            </span>
          )}
        </div>
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
