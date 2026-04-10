'use client';

import { useEffect, useState } from 'react';
import type { CycleHistorianAnnotation } from '@/app/api/ai/cycle-historian/route';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

function formatWeekLabel(weekKey: string): string {
  // "2026-W15" → "Week 15, 2026"
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return weekKey;
  const [, year, week] = match;
  return `Week ${parseInt(week, 10)}, ${year}`;
}

function ReturnCard({ label, value }: { label: string; value: string }) {
  const isPositive = value.trim().startsWith('+');
  const isNegative = value.trim().startsWith('-');
  const accentColor = isPositive ? '#00d4c8' : isNegative ? '#d06050' : '#c4885a';

  return (
    <div style={{
      flex:          1,
      minWidth:      160,
      borderLeft:    `3px solid ${accentColor}`,
      background:    'rgba(255,255,255,0.025)',
      border:        '1px solid rgba(255,255,255,0.06)',
      borderLeftColor: accentColor,
      padding:       '12px 14px',
      fontFamily:    FONT,
    }}>
      <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(200,220,218,0.4)', marginBottom: 6, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: accentColor, lineHeight: 1.5 }}>
        {value}
      </div>
    </div>
  );
}

export function HistoricalAnalogues() {
  const [loading,       setLoading]       = useState(true);
  const [weeks,         setWeeks]         = useState<CycleHistorianAnnotation[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    fetch('/api/ai/cycle-historian')
      .then(r => r.ok ? r.json() : { weeks: [] })
      .then((d: { weeks: CycleHistorianAnnotation[] }) => setWeeks(d.weeks ?? []))
      .catch(() => setWeeks([]))
      .finally(() => setLoading(false));
  }, []);

  const selected = weeks[selectedIndex] ?? null;
  const hasPrev  = selectedIndex < weeks.length - 1;
  const hasNext  = selectedIndex > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(200,220,218,0.4)', textTransform: 'uppercase' }}>
          Historical Analogues
        </span>
        <span style={{
          fontSize:    8,
          letterSpacing: '0.1em',
          color:       'rgba(200,220,218,0.3)',
          background:  'rgba(255,255,255,0.04)',
          padding:     '2px 6px',
          border:      '1px solid rgba(255,255,255,0.08)',
        }}>
          WEEKLY · GROK
        </span>
      </div>

      {/* Loading / no data states */}
      {loading && (
        <p style={{ fontSize: 11, color: 'rgba(200,220,218,0.35)', letterSpacing: '0.1em' }}>
          LOADING ANALYSIS...
        </p>
      )}

      {!loading && weeks.length === 0 && (
        <p style={{ fontSize: 11, color: 'rgba(200,220,218,0.35)', letterSpacing: '0.1em' }}>
          ANALYSIS GENERATING — CHECK BACK AFTER THE NEXT WEEKLY CRON RUN
        </p>
      )}

      {!loading && selected && (
        <>
          {/* Navigation + week label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setSelectedIndex(i => i + 1)}
              disabled={!hasPrev}
              style={{
                background: 'none',
                border:     '1px solid rgba(255,255,255,0.1)',
                color:      hasPrev ? 'rgba(200,220,218,0.7)' : 'rgba(200,220,218,0.2)',
                cursor:     hasPrev ? 'pointer' : 'not-allowed',
                padding:    '4px 10px',
                fontSize:   12,
                fontFamily: FONT,
              }}
            >
              ‹
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'rgba(200,220,218,0.7)', letterSpacing: '0.08em' }}>
                {formatWeekLabel(selected.weekKey)}
              </span>
              <span style={{ fontSize: 9, color: 'rgba(200,220,218,0.35)', letterSpacing: '0.06em' }}>
                {selectedIndex + 1} of {weeks.length} weeks · composite {selected.composite} · {selected.phase}
              </span>
            </div>

            <button
              onClick={() => setSelectedIndex(i => i - 1)}
              disabled={!hasNext}
              style={{
                background: 'none',
                border:     '1px solid rgba(255,255,255,0.1)',
                color:      hasNext ? 'rgba(200,220,218,0.7)' : 'rgba(200,220,218,0.2)',
                cursor:     hasNext ? 'pointer' : 'not-allowed',
                padding:    '4px 10px',
                fontSize:   12,
                fontFamily: FONT,
              }}
            >
              ›
            </button>
          </div>

          {/* Historical context */}
          {selected.historicalContext && (
            <p style={{ fontSize: 12, color: 'rgba(200,220,218,0.7)', lineHeight: 1.7, margin: 0 }}>
              {selected.historicalContext}
            </p>
          )}

          {/* Return projection cards */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <ReturnCard label="90 days"  value={selected.priceChange90d}  />
            <ReturnCard label="180 days" value={selected.priceChange180d} />
            <ReturnCard label="365 days" value={selected.priceChange365d} />
          </div>

          {/* Caveats */}
          {selected.caveats && (
            <p style={{ fontSize: 10, color: 'rgba(200,220,218,0.3)', lineHeight: 1.6, margin: 0 }}>
              ⚠ {selected.caveats}
            </p>
          )}
        </>
      )}
    </div>
  );
}
