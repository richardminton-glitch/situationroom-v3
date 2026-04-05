'use client';

/**
 * Rolling threat level shift analysis panel.
 *
 * On mount: fetches the last 3 cached analyses from the server so the
 * user immediately sees recent threat history. Then continues to react
 * to live state changes, generating new AI analyses as they occur.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import type { ThreatState } from '@/lib/room/threatEngine';
import { STATE_COLORS } from '@/lib/room/threatEngine';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";
const MAX_ENTRIES = 20;

interface AnalysisEntry {
  id: string;
  timestamp: number;
  fromState: ThreatState;
  toState: ThreatState;
  score: number;
  analysis: string;
  loading: boolean;
}

interface ThreatAnalysisPanelProps {
  threatState: ThreatState;
  threatScore: number;
  stateChanged: boolean;
  prevState: ThreatState;
  recentHeadlines: string[];
}

export default function ThreatAnalysisPanel({
  threatState,
  threatScore,
  stateChanged,
  prevState,
  recentHeadlines,
}: ThreatAnalysisPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [entries, setEntries] = useState<AnalysisEntry[]>([]);
  const mountedRef = useRef(false);
  const cacheLoadedRef = useRef(false);

  // Auto-scroll when not hovered
  useEffect(() => {
    if (!hovered && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, hovered]);

  // Load cached analyses on mount, then add INIT entry
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    async function loadCached() {
      try {
        const res = await fetch('/api/ai/threat-analysis');
        if (res.ok) {
          const data = await res.json();
          if (data.analyses && data.analyses.length > 0) {
            // Convert cached analyses to display entries
            const cachedEntries: AnalysisEntry[] = data.analyses.map(
              (a: { fromState: string; toState: string; score: number; analysis: string; timestamp: number }) => ({
                id: `cached-${a.timestamp}`,
                timestamp: a.timestamp,
                fromState: a.fromState as ThreatState,
                toState: a.toState as ThreatState,
                score: a.score,
                analysis: a.analysis,
                loading: false,
              }),
            );

            // Add INIT entry showing current live state
            const initEntry: AnalysisEntry = {
              id: `init-${Date.now()}`,
              timestamp: Date.now(),
              fromState: threatState,
              toState: threatState,
              score: threatScore,
              analysis: `SYSTEM ONLINE -- Threat analysis engine initialised. Current posture: ${threatState} (${threatScore}/100). Cached state: ${data.state} (${data.score}/100).`,
              loading: false,
            };

            setEntries([...cachedEntries, initEntry]);
            cacheLoadedRef.current = true;
            return;
          }
        }
      } catch {
        // Fall through to default INIT
      }

      // No cached data — show default INIT
      setEntries([
        {
          id: `init-${Date.now()}`,
          timestamp: Date.now(),
          fromState: threatState,
          toState: threatState,
          score: threatScore,
          analysis: `SYSTEM ONLINE -- Threat analysis engine initialised. Current posture: ${threatState} (${threatScore}/100).`,
          loading: false,
        },
      ]);
      cacheLoadedRef.current = true;
    }

    loadCached();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch analysis from API
  const fetchAnalysis = useCallback(
    async (entryId: string, fromState: ThreatState, toState: ThreatState, score: number) => {
      try {
        const res = await fetch('/api/ai/threat-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromState,
            toState,
            score,
            recentHeadlines,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setEntries((prev) =>
          prev.map((e) =>
            e.id === entryId ? { ...e, analysis: data.analysis, loading: false } : e,
          ),
        );
      } catch {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entryId
              ? {
                  ...e,
                  analysis:
                    'Analysis unavailable -- threat posture shifted due to incoming intelligence events.',
                  loading: false,
                }
              : e,
          ),
        );
      }
    },
    [recentHeadlines],
  );

  // React to state changes
  useEffect(() => {
    if (!stateChanged || !cacheLoadedRef.current) return;

    const entryId = `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newEntry: AnalysisEntry = {
      id: entryId,
      timestamp: Date.now(),
      fromState: prevState,
      toState: threatState,
      score: threatScore,
      analysis: '',
      loading: true,
    };

    setEntries((prev) => {
      const updated = [...prev, newEntry];
      return updated.length > MAX_ENTRIES ? updated.slice(-MAX_ENTRIES) : updated;
    });

    fetchAnalysis(entryId, prevState, threatState, threatScore);
  }, [stateChanged, prevState, threatState, threatScore, fetchAnalysis]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toISOString().slice(11, 19);
  };

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
          color: '#6b7a8d',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>THREAT ANALYSIS</span>
        {hovered && (
          <span style={{ color: '#4a5a6d', fontSize: 8 }}>PAUSED</span>
        )}
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
        {entries.map((entry) => {
          const isInit = entry.id.startsWith('init-');
          const isCached = entry.id.startsWith('cached-');

          return (
            <div
              key={entry.id}
              style={{
                padding: '4px 10px',
                lineHeight: '16px',
                borderLeft: '2px solid transparent',
                animation: isCached ? 'none' : 'threatLogFadeIn 0.3s ease-out',
                opacity: isCached ? 0.85 : 1,
              }}
            >
              {/* Top line: timestamp + state transition + score */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {/* Timestamp */}
                <span
                  style={{
                    color: '#3a4a5a',
                    flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                    width: 56,
                  }}
                >
                  {formatTime(entry.timestamp)}
                </span>

                {/* State transition badge or INIT */}
                {isInit ? (
                  <span style={{ color: '#6b7a8d', fontWeight: 600, fontSize: 9 }}>
                    INIT
                  </span>
                ) : (
                  <span style={{ fontSize: 9, fontWeight: 600 }}>
                    <span style={{ color: STATE_COLORS[entry.fromState] }}>
                      {entry.fromState}
                    </span>
                    <span style={{ color: '#4a5a6d', margin: '0 3px' }}>{'->'}</span>
                    <span style={{ color: STATE_COLORS[entry.toState] }}>
                      {entry.toState}
                    </span>
                  </span>
                )}

                {/* Score */}
                <span style={{ color: '#4a5a6d', fontSize: 9 }}>
                  ({entry.score}/100)
                </span>

                {/* Cached badge */}
                {isCached && (
                  <span style={{ color: '#3a4a5a', fontSize: 7, letterSpacing: '0.08em' }}>
                    CACHED
                  </span>
                )}
              </div>

              {/* Analysis text */}
              <div
                style={{
                  color: '#8a9aad',
                  marginTop: 2,
                  paddingLeft: 62,
                  lineHeight: '14px',
                }}
              >
                {entry.loading ? (
                  <span
                    style={{
                      color: '#6b7a8d',
                      animation: 'analysisPulse 1.5s ease-in-out infinite',
                    }}
                  >
                    ANALYSING...
                  </span>
                ) : (
                  entry.analysis
                )}
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
        @keyframes analysisPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .threat-analysis-scroll::-webkit-scrollbar { width: 3px; }
        .threat-analysis-scroll::-webkit-scrollbar-track { background: transparent; }
        .threat-analysis-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}
