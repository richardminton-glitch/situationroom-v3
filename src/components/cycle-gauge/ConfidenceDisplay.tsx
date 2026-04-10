'use client';

import type { CycleIndicatorResult, ConfidenceBand } from '@/lib/signals/cycle-engine';

interface Props {
  confidence:  ConfidenceBand;
  indicators:  CycleIndicatorResult[];
}

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

function levelColor(level: ConfidenceBand['level']): string {
  if (level === 'High')     return '#00d4c8';
  if (level === 'Moderate') return '#c4885a';
  return '#d06050';
}

function dirDot(dir: CycleIndicatorResult['direction']): string {
  if (dir === 'bullish') return '#00d4c8';
  if (dir === 'bearish') return '#d06050';
  return '#c4885a';
}

export function ConfidenceDisplay({ confidence, indicators }: Props) {
  const color = levelColor(confidence.level);

  return (
    <div style={{
      background:   'rgba(255,255,255,0.02)',
      border:       '1px solid rgba(255,255,255,0.06)',
      padding:      '12px 16px',
      display:      'flex',
      alignItems:   'center',
      gap:          16,
      flexWrap:     'wrap',
      fontFamily:   FONT,
    }}>
      {/* Label + level */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(200,220,218,0.4)', textTransform: 'uppercase' }}>
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
      <span style={{ fontSize: 10, color: 'rgba(200,220,218,0.45)', letterSpacing: '0.06em' }}>
        {confidence.agreementCount} of {indicators.length} indicators {confidence.dominantDirection}
      </span>
    </div>
  );
}
