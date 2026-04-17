'use client';

import { useTheme } from '@/components/layout/ThemeProvider';
import type { CycleIndicatorResult, ConfidenceBand } from '@/lib/signals/cycle-engine';

interface Props {
  confidence:  ConfidenceBand;
  indicators:  CycleIndicatorResult[];
}

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

function useLevelColor() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (level: ConfidenceBand['level']): string => {
    if (level === 'High')     return isDark ? '#00d4c8' : '#2a6b3a';
    if (level === 'Moderate') return isDark ? '#c4885a' : '#8b6914';
    return isDark ? '#d06050' : '#9b3232';
  };
}

function useDirDot() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (dir: CycleIndicatorResult['direction']): string => {
    if (dir === 'bullish') return isDark ? '#00d4c8' : '#3a6b3a';
    if (dir === 'bearish') return isDark ? '#d06050' : '#9b3232';
    return isDark ? '#c4885a' : '#8b6914';
  };
}

export function ConfidenceDisplay({ confidence, indicators }: Props) {
  const levelColor = useLevelColor();
  const dirDot     = useDirDot();
  const color      = levelColor(confidence.level);

  // Styled to match IndicatorCard so it sits naturally as a 6th cell
  // inside the same grid — gives a clean 2×3 layout against the spiral.
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
      {/* Row 1: section label + agreement count (mirrors "name + raw value") */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Confidence
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          {confidence.agreementCount}/{indicators.length} {confidence.dominantDirection}
        </span>
      </div>

      {/* Row 2: level label (mirrors "zone label") */}
      <div style={{ fontSize: 13, fontWeight: 600, color, letterSpacing: '0.04em' }}>
        {confidence.level}
      </div>

      {/* Row 3: direction dots (mirrors "interpretation + score") */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5, flex: 1 }}>
          {indicators.length} signals aligned by direction
        </span>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0, paddingBottom: 3 }}>
          {indicators.map(ind => (
            <div
              key={ind.key}
              title={`${ind.name}: ${ind.direction}`}
              style={{
                width:        10,
                height:       10,
                borderRadius: '50%',
                background:   dirDot(ind.direction),
                flexShrink:   0,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
