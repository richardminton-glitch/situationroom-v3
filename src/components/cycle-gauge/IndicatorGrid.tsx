'use client';

import { useTheme } from '@/components/layout/ThemeProvider';
import type { CycleIndicatorResult } from '@/lib/signals/cycle-engine';

interface Props {
  indicators: CycleIndicatorResult[];
  columns?:   string;
}

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

function useDirColor() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (dir: CycleIndicatorResult['direction']): string => {
    if (dir === 'bullish') return isDark ? '#00d4c8' : '#3a6b3a';
    if (dir === 'bearish') return isDark ? '#d06050' : '#9b3232';
    return isDark ? '#c4885a' : '#8b6914';
  };
}

function IndicatorCard({ indicator: ind }: { indicator: CycleIndicatorResult }) {
  const dirColor = useDirColor();
  const color    = dirColor(ind.direction);

  return (
    <div style={{
      borderLeft:      `3px solid ${color}`,
      background:      'var(--bg-card)',
      border:          '1px solid var(--border-subtle)',
      borderLeftColor: color,
      padding:         '14px 16px',
      display:         'flex',
      flexDirection:   'column',
      gap:             6,
      fontFamily:      FONT,
    }}>
      {/* Row 1: name + raw value */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {ind.name}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          {ind.rawLabel}
        </span>
      </div>

      {/* Row 2: zone label */}
      <div style={{ fontSize: 13, fontWeight: 600, color, letterSpacing: '0.04em' }}>
        {ind.zone}
      </div>

      {/* Row 3: interpretation + score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5, flex: 1 }}>
          {ind.interpretation}
        </span>
        <span style={{ fontSize: 20, fontWeight: 700, color, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
          {ind.score}
        </span>
      </div>
    </div>
  );
}

export function IndicatorGrid({ indicators, columns }: Props) {
  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: columns ?? 'repeat(auto-fit, minmax(260px, 1fr))',
      gap:                 12,
    }}>
      {indicators.map(ind => (
        <IndicatorCard key={ind.key} indicator={ind} />
      ))}
    </div>
  );
}
