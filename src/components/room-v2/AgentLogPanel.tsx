'use client';

/**
 * Scrolling agent telemetry log.
 * Each entry has timestamp, domain badge, and message text.
 * Auto-scrolls, pauses on hover.
 */

import { useRef, useEffect, useState } from 'react';
import { AGENTS } from '@/lib/room/agentDomains';
import type { LogEntry } from '@/lib/room/logTemplates';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

// Domain colours matching agent definitions
const DOMAIN_COLORS: Record<string, string> = {
  MACRO: '#f0a500',
  PRICE: '#00e5c8',
  SENTIMENT: '#5b9bd5',
  RISK: '#e03030',
  COORDINATOR: '#8a8aff',
  SYSTEM: '#ffffff',
};

interface AgentLogPanelProps {
  entries: LogEntry[];
}

export default function AgentLogPanel({ entries }: AgentLogPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  // Auto-scroll when not hovered
  useEffect(() => {
    if (!hovered && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, hovered]);

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
        <span>AGENT TELEMETRY</span>
        {hovered && (
          <span style={{ color: '#4a5a6d', fontSize: 8 }}>PAUSED</span>
        )}
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        className="agent-log-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 0',
          fontFamily: FONT,
          fontSize: 10,
        }}
      >
        {entries.map((entry) => {
          const color = DOMAIN_COLORS[entry.domain] || '#6b7a8d';
          const agent = AGENTS[entry.domain as keyof typeof AGENTS];
          const label = agent?.shortLabel || entry.domain;
          const isTiered = entry.tier && entry.tier >= 3;

          return (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                padding: '2px 10px',
                lineHeight: '16px',
                gap: 6,
                borderLeft: isTiered ? `2px solid ${color}` : '2px solid transparent',
                background: isTiered ? 'rgba(255,255,255,0.02)' : 'transparent',
                animation: 'logFadeIn 0.3s ease-out',
              }}
            >
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

              {/* Domain badge */}
              <span
                style={{
                  color,
                  flexShrink: 0,
                  width: 44,
                  fontWeight: 600,
                  fontSize: 9,
                }}
              >
                {label}
              </span>

              {/* Message */}
              <span style={{ color: '#8a9aad' }}>
                {entry.message}
              </span>
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
        @keyframes logFadeIn {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .agent-log-scroll::-webkit-scrollbar { width: 3px; }
        .agent-log-scroll::-webkit-scrollbar-track { background: transparent; }
        .agent-log-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}
