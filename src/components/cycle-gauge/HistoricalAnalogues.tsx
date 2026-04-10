'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/components/layout/ThemeProvider';
import type { CycleHistorianAnnotation } from '@/app/api/ai/cycle-historian/route';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

function formatWeekLabel(weekKey: string): string {
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return weekKey;
  const [, year, week] = match;
  return `Week ${parseInt(week, 10)}, ${year}`;
}

function ReturnCard({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  const isPositive = value.trim().startsWith('+');
  const isNegative = value.trim().startsWith('-');
  const accentColor = isPositive
    ? (isDark ? '#00d4c8' : '#2a7048')
    : isNegative
    ? (isDark ? '#d06050' : '#9b3232')
    : (isDark ? '#c4885a' : '#8b6914');

  return (
    <div style={{
      flex:            1,
      minWidth:        160,
      background:      'var(--bg-card)',
      border:          '1px solid var(--border-subtle)',
      borderLeftColor: accentColor,
      borderLeftWidth: 3,
      padding:         '12px 14px',
      fontFamily:      FONT,
    }}>
      <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: accentColor, lineHeight: 1.5 }}>
        {value}
      </div>
    </div>
  );
}

export function HistoricalAnalogues() {
  const { theme }                     = useTheme();
  const isDark                        = theme === 'dark';
  const [loading, setLoading]         = useState(true);
  const [weeks, setWeeks]             = useState<CycleHistorianAnnotation[]>([]);
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

  const btnStyle = (active: boolean): React.CSSProperties => ({
    background:  'none',
    border:      '1px solid var(--border-subtle)',
    color:       active ? 'var(--text-secondary)' : 'var(--text-muted)',
    cursor:      active ? 'pointer' : 'not-allowed',
    padding:     '4px 10px',
    fontSize:    12,
    fontFamily:  FONT,
    opacity:     active ? 1 : 0.35,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Historical Analogues
        </span>
        <span style={{
          fontSize:      8,
          letterSpacing: '0.1em',
          color:         'var(--text-muted)',
          background:    'var(--bg-card)',
          padding:       '2px 6px',
          border:        '1px solid var(--border-subtle)',
        }}>
          WEEKLY · GROK
        </span>
      </div>

      {loading && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          LOADING ANALYSIS...
        </p>
      )}

      {!loading && weeks.length === 0 && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          ANALYSIS GENERATING — CHECK BACK AFTER THE NEXT WEEKLY CRON RUN
        </p>
      )}

      {!loading && selected && (
        <>
          {/* Navigation + week label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setSelectedIndex(i => i + 1)} disabled={!hasPrev} style={btnStyle(hasPrev)}>
              ‹
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
                {formatWeekLabel(selected.weekKey)}
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                {selectedIndex + 1} of {weeks.length} weeks · composite {selected.composite} · {selected.phase}
              </span>
            </div>

            <button onClick={() => setSelectedIndex(i => i - 1)} disabled={!hasNext} style={btnStyle(hasNext)}>
              ›
            </button>
          </div>

          {/* Historical context */}
          {selected.historicalContext && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
              {selected.historicalContext}
            </p>
          )}

          {/* Return projection cards */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <ReturnCard label="90 days"  value={selected.priceChange90d}  isDark={isDark} />
            <ReturnCard label="180 days" value={selected.priceChange180d} isDark={isDark} />
            <ReturnCard label="365 days" value={selected.priceChange365d} isDark={isDark} />
          </div>

          {/* Caveats */}
          {selected.caveats && (
            <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, opacity: 0.7 }}>
              ⚠ {selected.caveats}
            </p>
          )}
        </>
      )}
    </div>
  );
}
