'use client';

import type { CycleIndicatorResult } from '@/lib/signals/cycle-engine';

interface Props {
  indicators: CycleIndicatorResult[];
}

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

function dirColor(dir: CycleIndicatorResult['direction']): string {
  if (dir === 'bullish') return '#00d4c8';
  if (dir === 'bearish') return '#d06050';
  return '#c4885a';
}

function IndicatorCard({ indicator: ind }: { indicator: CycleIndicatorResult }) {
  const color = dirColor(ind.direction);

  return (
    <div style={{
      borderLeft:      `3px solid ${color}`,
      background:      'rgba(255,255,255,0.025)',
      border:          '1px solid rgba(255,255,255,0.06)',
      borderLeftColor: color,
      padding:         '14px 16px',
      display:         'flex',
      flexDirection:   'column',
      gap:             6,
      fontFamily:      FONT,
    }}>
      {/* Row 1: name + raw value */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(200,220,218,0.5)', textTransform: 'uppercase' }}>
          {ind.name}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(200,220,218,0.7)', fontVariantNumeric: 'tabular-nums' }}>
          {ind.rawLabel}
        </span>
      </div>

      {/* Row 2: zone label */}
      <div style={{ fontSize: 13, fontWeight: 600, color, letterSpacing: '0.04em' }}>
        {ind.zone}
      </div>

      {/* Row 3: interpretation + score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
        <span style={{ fontSize: 10, color: 'rgba(200,220,218,0.4)', lineHeight: 1.5, flex: 1 }}>
          {ind.interpretation}
        </span>
        <span style={{ fontSize: 20, fontWeight: 700, color, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
          {ind.score}
        </span>
      </div>
    </div>
  );
}

export function IndicatorGrid({ indicators }: Props) {
  return (
    <div style={{
      display:               'grid',
      gridTemplateColumns:   'repeat(auto-fit, minmax(260px, 1fr))',
      gap:                   12,
    }}>
      {indicators.map(ind => (
        <IndicatorCard key={ind.key} indicator={ind} />
      ))}
    </div>
  );
}
