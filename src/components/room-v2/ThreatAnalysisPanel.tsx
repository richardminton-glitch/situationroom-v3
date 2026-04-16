'use client';

/**
 * Rolling threat analysis transcript panel.
 *
 * Polls GET /api/ai/threat-analysis every 15 seconds to pick up
 * server-generated analyses. All AI generation happens server-side
 * in /api/data/threat-score — this panel is purely a display layer.
 *
 * Shows the last 6 analyses shared across all users.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import type { ThreatState } from '@/lib/room/threatEngine';
import { STATE_COLORS } from '@/lib/room/threatEngine';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";
const POLL_INTERVAL = 15_000; // 15 seconds

interface AnalysisEntry {
  fromState: string;
  toState: string;
  score: number;
  analysis: string;
  timestamp: number;
}

interface ThreatAnalysisPanelProps {
  threatState: ThreatState;
  threatScore: number;
}

export default function ThreatAnalysisPanel({
  threatState,
  threatScore,
}: ThreatAnalysisPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [entries, setEntries] = useState<AnalysisEntry[]>([]);
  const prevCountRef = useRef(0);

  // Auto-scroll when not hovered and new entries arrive
  useEffect(() => {
    if (!hovered && scrollRef.current && entries.length !== prevCountRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      prevCountRef.current = entries.length;
    }
  }, [entries, hovered]);

  // Poll for analyses
  const fetchAnalyses = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/threat-analysis');
      if (!res.ok) return;
      const data = await res.json();
      if (data.analyses) setEntries(data.analyses);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchAnalyses();
    const interval = setInterval(fetchAnalyses, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAnalyses]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toISOString().slice(11, 19);
  };

  // Use live client-side state for "current posture" but analyses come from server
  const displayState = threatState;
  const displayScore = threatScore;

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'color-mix(in srgb, var(--bg-secondary) 75%, transparent)',
        backdropFilter: 'blur(6px)',
        borderTop: '1px solid color-mix(in srgb, var(--accent-primary) 15%, transparent)',
        borderRight: '1px solid color-mix(in srgb, var(--accent-primary) 15%, transparent)',
        overflow: 'hidden',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div
        style={{
          padding: '6px 12px',
          fontSize: 9,
          fontFamily: FONT,
          letterSpacing: '0.14em',
          color: 'var(--text-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>THREAT ANALYSIS</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hovered && (
            <span style={{ color: 'var(--text-muted)', fontSize: 8 }}>PAUSED</span>
          )}
          <span style={{ color: STATE_COLORS[displayState] || 'var(--text-secondary)', fontSize: 8, fontWeight: 600 }}>
            {displayState} ({displayScore})
          </span>
        </div>
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        className="threat-analysis-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 0',
          fontFamily: FONT,
          fontSize: 10,
        }}
      >
        {entries.length === 0 && (
          <div style={{ padding: '8px 10px', color: 'var(--text-muted)', lineHeight: '16px' }}>
            <span style={{ color: 'var(--text-muted)' }}>{formatTime(Date.now())}</span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 9, marginLeft: 6 }}>INIT</span>
            <div style={{ color: 'var(--text-primary)', marginTop: 2, paddingLeft: 62, lineHeight: '14px' }}>
              SYSTEM ONLINE — Threat analysis engine initialised. Current posture: {displayState} ({displayScore}/100). Awaiting first state transition for AI analysis.
            </div>
          </div>
        )}

        {entries.map((entry, i) => {
          const fromState = entry.fromState as ThreatState;
          const toState = entry.toState as ThreatState;

          return (
            <div
              key={`${entry.timestamp}-${i}`}
              style={{
                padding: '4px 10px',
                lineHeight: '16px',
                borderLeft: '2px solid transparent',
                animation: i === entries.length - 1 ? 'threatLogFadeIn 0.3s ease-out' : 'none',
              }}
            >
              {/* Top line: timestamp + state transition + score */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span
                  style={{
                    color: 'var(--text-muted)',
                    flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                    width: 56,
                  }}
                >
                  {formatTime(entry.timestamp)}
                </span>

                <span style={{ fontSize: 9, fontWeight: 600 }}>
                  <span style={{ color: STATE_COLORS[fromState] || 'var(--text-secondary)' }}>
                    {entry.fromState}
                  </span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 3px' }}>{'->'}</span>
                  <span style={{ color: STATE_COLORS[toState] || 'var(--text-secondary)' }}>
                    {entry.toState}
                  </span>
                </span>

                <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>
                  ({entry.score}/100)
                </span>
              </div>

              {/* Analysis text */}
              <div
                style={{
                  color: 'var(--text-primary)',
                  marginTop: 2,
                  paddingLeft: 62,
                  lineHeight: '14px',
                }}
              >
                {entry.analysis}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scan line overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)',
          zIndex: 1,
        }}
      />

      <style>{`
        @keyframes threatLogFadeIn {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .threat-analysis-scroll::-webkit-scrollbar { width: 3px; }
        .threat-analysis-scroll::-webkit-scrollbar-track { background: transparent; }
        .threat-analysis-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}
