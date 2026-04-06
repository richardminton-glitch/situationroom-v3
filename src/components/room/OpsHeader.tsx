'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OpsHeaderProps {
  threatLevel: string;
  operatorCount: number;
  isAdmin?: boolean;
  editMode?: boolean;
  onToggleEdit?: () => void;
  onResetLayout?: () => void;
}

const THREAT_COLORS: Record<string, string> = {
  // Current unified states (Members Room algorithm)
  QUIET:      '#00d4aa',
  MONITORING: '#00d4aa',
  ELEVATED:   '#cc7722',
  ALERT:      '#cc4444',
  CRITICAL:   '#cc4444',
  // Legacy states
  LOW:        '#00d4aa',
  GUARDED:    '#d4a017',
  HIGH:       '#cc4444',
  SEVERE:     '#cc4444',
};

function formatUTCClock(): string {
  const now = new Date();
  const h = String(now.getUTCHours()).padStart(2, '0');
  const m = String(now.getUTCMinutes()).padStart(2, '0');
  const s = String(now.getUTCSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function OpsHeader({ threatLevel, operatorCount, isAdmin, editMode, onToggleEdit, onResetLayout }: OpsHeaderProps) {
  const [clock, setClock] = useState(formatUTCClock);

  useEffect(() => {
    const interval = setInterval(() => {
      setClock(formatUTCClock());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const level = threatLevel.toUpperCase();
  const threatColor = THREAT_COLORS[level] || '#4a6060';
  const isCritical = level === 'CRITICAL';

  return (
    <>
      <style>{`
        @keyframes ops-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes ops-pill-pulse {
          0%, 100% { box-shadow: 0 0 4px ${threatColor}; }
          50% { box-shadow: 0 0 12px ${threatColor}, 0 0 24px ${threatColor}; }
        }
        @keyframes ops-dot-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px #00d4aa; }
          50% { opacity: 0.5; box-shadow: 0 0 8px #00d4aa; }
        }
      `}</style>

      <header
        className="flex items-center justify-between w-full px-5"
        style={{
          height: 48,
          background: '#080d0d',
          borderBottom: '1px solid #1a2e2e',
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        {/* Left — title (clickable back to dashboard) */}
        <Link
          href="/"
          className="flex items-center"
          style={{
            fontSize: 13,
            letterSpacing: '0.05em',
            color: '#4a6060',
            whiteSpace: 'nowrap',
            textDecoration: 'none',
          }}
          title="Back to Dashboard"
        >
          <span style={{ color: '#00d4aa', marginRight: 8 }}>◈</span>
          SITUATION ROOM — OPS ROOM
        </Link>

        {/* Centre — threat pill */}
        <div className="flex items-center justify-center">
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 12px',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: threatColor,
              border: `1px solid ${threatColor}`,
              borderRadius: 3,
              background: `${threatColor}10`,
              animation: isCritical ? 'ops-pill-pulse 1.5s ease-in-out infinite' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {level}
          </span>
        </div>

        {/* Right — admin edit + operators + UTC clock */}
        <div
          className="flex items-center"
          style={{
            fontSize: 12,
            color: '#4a6060',
            whiteSpace: 'nowrap',
            gap: 6,
          }}
        >
          {/* Admin layout controls */}
          {isAdmin && onToggleEdit && (
            <>
              {editMode && onResetLayout && (
                <button
                  onClick={onResetLayout}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    padding: '2px 8px',
                    border: '1px solid #1a2e2e',
                    background: 'transparent',
                    color: '#4a6060',
                    cursor: 'pointer',
                  }}
                >
                  RESET
                </button>
              )}
              <button
                onClick={onToggleEdit}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  padding: '2px 8px',
                  border: editMode ? '1px solid #00d4aa' : '1px solid #1a2e2e',
                  background: editMode ? '#00d4aa' : 'transparent',
                  color: editMode ? '#080d0d' : '#4a6060',
                  cursor: 'pointer',
                }}
              >
                {editMode ? '✓ DONE' : '⚙ EDIT LAYOUT'}
              </button>
              <span style={{ color: '#1a2e2e', margin: '0 2px' }}>|</span>
            </>
          )}

          <span
            style={{
              display: 'inline-block',
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#00d4aa',
              animation: 'ops-dot-pulse 2s ease-in-out infinite',
              flexShrink: 0,
            }}
          />
          <span style={{ color: '#e0f0f0' }}>{operatorCount}</span>
          <span>operators online</span>
          <span style={{ color: '#1a2e2e', margin: '0 2px' }}>|</span>
          <span style={{ color: '#e0f0f0' }}>{clock}</span>
          <span>UTC</span>
        </div>
      </header>
    </>
  );
}
