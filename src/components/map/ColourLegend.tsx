'use client';

import type { MetricDef } from './metrics';
import { getLegendStops } from './colour-scales';

interface ColourLegendProps {
  metric: MetricDef;
  panelOpen: boolean;
}

export function ColourLegend({ metric, panelOpen }: ColourLegendProps) {
  const stops = getLegendStops(metric);

  return (
    <div
      className="absolute z-20"
      style={{
        top: 12,
        right: panelOpen ? 330 : 12,
        transition: 'right 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        letterSpacing: '0.08em',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
      }}
    >
      <span>{stops[0].label}</span>
      <div
        style={{
          width: 14,
          height: 140,
          borderRadius: 2,
          border: '1px solid var(--border-primary)',
          background: `linear-gradient(to bottom, ${stops[0].color}, ${stops[1].color}, ${stops[2].color})`,
        }}
      />
      <span>{stops[2].label}</span>
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ width: 10, height: 10, border: '1px solid var(--border-primary)', background: '#d4c9b8' }} />
        <span>N/A</span>
      </div>
    </div>
  );
}
