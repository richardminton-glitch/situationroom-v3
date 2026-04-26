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

import {
  RCDI_COMPONENTS,
  RCDI_HISTORY,
  RCDI_ANNOTATIONS,
  RCDI_COMPOSITE,
  RCDI_YOY,
  RCDI_5Y,
} from '@/lib/feh/rcdi-seed';
import { RCDISparkline } from './RCDISparkline';
import { ComponentGauge } from './ComponentGauge';

export function Module02() {
  const trendArrow = RCDI_YOY >= 0 ? '↗' : '↘';
  const trendColor = RCDI_YOY >= 0 ? 'var(--feh-warning)' : 'var(--feh-stable)';

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
          {RCDI_COMPOSITE.toFixed(1)}
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
          <span>{trendArrow} {RCDI_YOY >= 0 ? '+' : ''}{RCDI_YOY}% YoY</span>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <span>{trendArrow} {RCDI_5Y >= 0 ? '+' : ''}{RCDI_5Y}% 5Y</span>
        </div>
      </div>

      {/* Centre third — sparkline */}
      <div
        className="lg:col-span-5 px-3 py-3 lg:border-r border-t lg:border-t-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <RCDISparkline data={RCDI_HISTORY} annotations={RCDI_ANNOTATIONS} />
      </div>

      {/* Right third — four component gauges, 2×2 */}
      <div
        className="lg:col-span-4 grid grid-cols-2 grid-rows-2 border-t lg:border-t-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {RCDI_COMPONENTS.map((c, i) => (
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
