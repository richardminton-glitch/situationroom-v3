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

  return (
    <div style={{
      background: 'var(--bg-card)',
      border:     '1px solid var(--border-subtle)',
      padding:    '12px 16px',
      display:    'flex',
      alignItems: 'center',
      gap:        16,
      flexWrap:   'wrap',
      fontFamily: FONT,
    }}>
      {/* Label + level */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Confidence
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.1em' }}>
          {confidence.level.toUpperCase()}
        </span>
      </div>

      {/* Signal direction dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {indicators.map(ind => (
          <div
            key={ind.key}
            title={`${ind.name}: ${ind.direction}`}
            style={{
              width:        8,
              height:       8,
              borderRadius: '50%',
              background:   dirDot(ind.direction),
              flexShrink:   0,
            }}
          />
        ))}
      </div>

      {/* Agreement text */}
      <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
        {confidence.agreementCount} of {indicators.length} indicators {confidence.dominantDirection}
      </span>
    </div>
  );
}
