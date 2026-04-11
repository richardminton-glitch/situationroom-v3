'use client';

import { useState } from 'react';
import { useTheme } from '@/components/layout/ThemeProvider';

const MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

const RC: Record<string, string> = {
  US: '#3b82f6',
  CN: '#ef4444',
  RU: '#8b5cf6',
  KZ: '#f59e0b',
  CA: '#06b6d4',
  LATAM: '#10b981',
  EU: '#6366f1',
  ET: '#f97316',
  GULF: '#ec4899',
  OTHER: '#6b7280',
};

interface Props {
  regions: {
    id: string;
    name: string;
    share: number;
    hashrate: number;
    trend: string;
  }[];
  totalHashrateEH: number;
  alerts: {
    headline: string;
    detail: string;
    region: string;
    severity: string;
    date: string;
  }[];
  updatedAt: string;
}

export function HashrateDistribution({
  regions,
  totalHashrateEH,
  alerts,
  updatedAt,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const top5 = regions.slice(0, 5);

  const trendColor = (trend: string) => {
    if (trend === 'up' || trend === 'rising') return isDark ? '#2dd4bf' : '#4a7c59';
    if (trend === 'down' || trend === 'falling') return isDark ? '#d06050' : '#9b3232';
    return 'var(--text-muted)';
  };

  const trendArrow = (trend: string) => {
    if (trend === 'up' || trend === 'rising') return '\u25B2';
    if (trend === 'down' || trend === 'falling') return '\u25BC';
    return '\u2014';
  };

  return (
    <div>
      {/* Section label */}
      <div
        style={{
          fontFamily: MONO,
          fontSize: 9,
          letterSpacing: '0.16em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        HASHRATE DISTRIBUTION
      </div>

      {/* Stacked bar */}
      <div
        style={{
          display: 'flex',
          height: 32,
          overflow: 'hidden',
          marginBottom: 8,
        }}
      >
        {top5.map((r, i) => (
          <div
            key={r.id}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{
              flex: r.share,
              backgroundColor: RC[r.id] || RC.OTHER,
              opacity: hoveredIdx === null ? 0.75 : hoveredIdx === i ? 1 : 0.75,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 0.15s ease',
              cursor: 'default',
            }}
          >
            {r.share > 0.06 && (
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#fff',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {(r.share * 100).toFixed(0)}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Legend strip */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 14,
        }}
      >
        {top5.map((r) => (
          <div
            key={r.id}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                backgroundColor: RC[r.id] || RC.OTHER,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: MONO,
                fontSize: 9,
                color: 'var(--text-muted)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {r.name} {(r.share * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {/* Compact region list */}
      <div>
        {top5.map((r, i) => (
          <div
            key={r.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 0',
              borderTop: i === 0 ? '1px solid var(--border-subtle)' : 'none',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            {/* Coloured bar */}
            <div
              style={{
                width: 3,
                height: 20,
                backgroundColor: RC[r.id] || RC.OTHER,
                flexShrink: 0,
              }}
            />

            {/* Name */}
            <div
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: 12,
                color: 'var(--text-primary)',
                flex: 1,
              }}
            >
              {r.name}
            </div>

            {/* Share % */}
            <div
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
                minWidth: 42,
                textAlign: 'right',
              }}
            >
              {(r.share * 100).toFixed(1)}%
            </div>

            {/* Hashrate EH/s */}
            <div
              style={{
                fontFamily: MONO,
                fontSize: 10,
                color: 'var(--text-muted)',
                fontVariantNumeric: 'tabular-nums',
                minWidth: 60,
                textAlign: 'right',
              }}
            >
              {r.hashrate.toFixed(1)} EH/s
            </div>

            {/* Trend arrow */}
            <div
              style={{
                fontSize: 10,
                color: trendColor(r.trend),
                minWidth: 14,
                textAlign: 'right',
              }}
            >
              {trendArrow(r.trend)}
            </div>
          </div>
        ))}
      </div>

      {/* Updated timestamp */}
      <div
        style={{
          fontFamily: MONO,
          fontSize: 9,
          color: 'var(--text-muted)',
          textAlign: 'right',
          marginTop: 8,
        }}
      >
        Updated {updatedAt}
      </div>
    </div>
  );
}
