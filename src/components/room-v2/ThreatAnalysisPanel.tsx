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
  const [serverState, setServerState] = useState<string>('QUIET');
  const [serverScore, setServerScore] = useState(0);
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
      if (data.state) setServerState(data.state);
      if (data.score != null) setServerScore(data.score);
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
        background: 'rgba(9, 13, 18, 0.75)',
        backdropFilter: 'blur(6px)',
        borderTop: '1px solid rgba(0, 229, 200, 0.12)',
        borderRight: '1px solid rgba(0, 229, 200, 0.12)',
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
          color: '#8494a7',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>THREAT ANALYSIS</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hovered && (
            <span style={{ color: '#5e7080', fontSize: 8 }}>PAUSED</span>
          )}
          <span style={{ color: STATE_COLORS[displayState] || '#8494a7', fontSize: 8, fontWeight: 600 }}>
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
          <div style={{ padding: '8px 10px', color: '#5e7080', lineHeight: '16px' }}>
            <span style={{ color: '#4d6070' }}>{formatTime(Date.now())}</span>
            <span style={{ color: '#8494a7', fontWeight: 600, fontSize: 9, marginLeft: 6 }}>INIT</span>
            <div style={{ color: '#a0b0c0', marginTop: 2, paddingLeft: 62, lineHeight: '14px' }}>
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
                    color: '#4d6070',
                    flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                    width: 56,
                  }}
                >
                  {formatTime(entry.timestamp)}
                </span>

                <span style={{ fontSize: 9, fontWeight: 600 }}>
                  <span style={{ color: STATE_COLORS[fromState] || '#8494a7' }}>
                    {entry.fromState}
                  </span>
                  <span style={{ color: '#5e7080', margin: '0 3px' }}>{'->'}</span>
                  <span style={{ color: STATE_COLORS[toState] || '#8494a7' }}>
                    {entry.toState}
                  </span>
                </span>

                <span style={{ color: '#5e7080', fontSize: 9 }}>
                  ({entry.score}/100)
                </span>
              </div>

              {/* Analysis text */}
              <div
                style={{
                  color: '#a0b0c0',
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
