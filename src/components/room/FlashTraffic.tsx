'use client';

import { useEffect, useRef } from 'react';
import type { SignalArticle } from '@/hooks/useOpsRoom';

interface FlashTrafficProps {
  article: SignalArticle;
  onDismiss: () => void;
}

export default function FlashTraffic({ article, onDismiss }: FlashTrafficProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after 60 seconds
  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 60_000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onDismiss]);

  return (
    <>
      <style>{`
        @keyframes flash-traffic-pulse {
          0%, 100% { background: #cc4444; }
          50% { background: #991111; }
        }
      `}</style>

      <div
        style={{
          width: '100%',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
          animation: 'flash-traffic-pulse 1.5s ease-in-out infinite',
          color: '#ffffff',
          flexShrink: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>
            {'\uD83D\uDEA8'} FLASH TRAFFIC
          </span>
          <span style={{ fontSize: 11, marginLeft: 12, fontWeight: 500 }}>
            {article.title}
          </span>
        </div>

        <button
          onClick={onDismiss}
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#ffffff',
            fontSize: 9,
            fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '3px 10px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          DISMISS
        </button>
      </div>
    </>
  );
}
