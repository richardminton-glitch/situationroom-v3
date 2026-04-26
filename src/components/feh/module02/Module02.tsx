'use client';

/**
 * Module02 — Reserve Currency Decay Index strip.
 *
 *   ┌───────────────┬──────────────────────────────┬──────────────────────┐
 *   │   67.3        │  sparkline (5y)              │ ▓▓ GOLD/USD     72   │
 *   │               │  with FEB-2022 inflection    │ ▓▓ CIPS/SWIFT   58   │
 *   │ RCDI · YoY    │                              │ ▓▓ YUAN OIL     65   │
 *   │      · 5Y     │                              │ ▓▓ BRICS SWAPS  75   │
 *   └───────────────┴──────────────────────────────┴──────────────────────┘
 *
 * The number is the editorial centrepiece — oversized monospace, warning
 * amber, no live tick. The sparkline carries the trajectory, the components
 * carry the breakdown.
 */

import { useMemo } from 'react';
import { useFehData } from '@/components/feh/FehDataProvider';
import { RCDISparkline } from './RCDISparkline';
import { ComponentGauge } from './ComponentGauge';

export function Module02() {
  const { rcdiHistory, rcdiComponents, rcdiAnnotations } = useFehData();

  const { composite, yoy, fiveY } = useMemo(() => {
    if (rcdiHistory.length === 0) return { composite: 0, yoy: 0, fiveY: 0 };
    const latest = rcdiHistory[rcdiHistory.length - 1].value;
    const yearAgoIdx = Math.max(0, rcdiHistory.length - 13);
    const fiveYAgoIdx = 0;
    const yearAgo = rcdiHistory[yearAgoIdx].value;
    const fiveYAgo = rcdiHistory[fiveYAgoIdx].value;
    return {
      composite: latest,
      yoy: yearAgo === 0 ? 0 : Math.round(((latest - yearAgo) / yearAgo) * 1000) / 10,
      fiveY: fiveYAgo === 0 ? 0 : Math.round(((latest - fiveYAgo) / fiveYAgo) * 1000) / 10,
    };
  }, [rcdiHistory]);

  const trendArrow = yoy >= 0 ? '↗' : '↘';
  const trendColor = yoy >= 0 ? 'var(--feh-warning)' : 'var(--feh-stable)';

  return (
    <div
      className="border grid grid-cols-1 lg:grid-cols-12 gap-0"
      style={{
        borderColor: 'var(--border-primary)',
        backgroundColor: 'var(--bg-card)',
      }}
    >
      {/* Left third — composite number */}
      <div
        className="lg:col-span-3 flex flex-col justify-center px-5 py-5 lg:border-r"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 'clamp(56px, 7.5vw, 96px)',
            fontWeight: 900,
            color: 'var(--feh-warning)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {composite.toFixed(1)}
        </div>
        <div
          className="mt-3"
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
          }}
        >
          RESERVE CURRENCY DECAY INDEX
        </div>
        <div
          className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5"
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 11,
            letterSpacing: '0.14em',
            color: trendColor,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span>{trendArrow} {yoy >= 0 ? '+' : ''}{yoy}% YoY</span>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <span>{trendArrow} {fiveY >= 0 ? '+' : ''}{fiveY}% 5Y</span>
        </div>
      </div>

      {/* Centre third — sparkline */}
      <div
        className="lg:col-span-5 px-3 py-3 lg:border-r border-t lg:border-t-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <RCDISparkline data={rcdiHistory} annotations={rcdiAnnotations} />
      </div>

      {/* Right third — four component gauges, 2×2 */}
      <div
        className="lg:col-span-4 grid grid-cols-2 grid-rows-2 border-t lg:border-t-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {rcdiComponents.map((c, i) => (
          <div
            key={c.id}
            style={{
              borderRight: i % 2 === 0 ? '1px solid var(--border-subtle)' : 'none',
              borderBottom: i < 2 ? '1px solid var(--border-subtle)' : 'none',
            }}
          >
            <ComponentGauge label={c.label} value={c.value} weight={c.weight} />
          </div>
        ))}
      </div>
    </div>
  );
}
