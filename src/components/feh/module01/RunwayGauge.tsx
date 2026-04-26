'use client';

/**
 * RunwayGauge — single-stat horizontal bar with severity colour.
 *
 * Used six times in the SovereignDossier to show debt/GDP, interest as %
 * revenue, primary deficit, real GDP growth, avg maturity, sovereignty score.
 * Each gauge maps the value into a 0..max range and fills accordingly.
 */

import type { ReactNode } from 'react';

interface RunwayGaugeProps {
  label: string;
  value: number;
  /** Display string (lets caller add %, x, Y, units). */
  display?: string;
  /** Min and max for the gauge axis. */
  min?: number;
  max: number;
  /** Bar colour token. Defaults to runway-aware: red over `dangerAt`, amber over `warnAt`. */
  color?: string;
  dangerAt?: number;
  warnAt?: number;
  /** Inverted = higher is worse (debt, interest). Reversed gauges flip the colour ramp. */
  inverted?: boolean;
  caption?: ReactNode;
}

export function RunwayGauge({
  label,
  value,
  display,
  min = 0,
  max,
  color,
  dangerAt,
  warnAt,
  inverted = false,
  caption,
}: RunwayGaugeProps) {
  const pct = clamp(((value - min) / (max - min)) * 100, 0, 100);

  let resolvedColor = color;
  if (!resolvedColor) {
    if (inverted) {
      // Higher value = worse
      if (dangerAt !== undefined && value >= dangerAt) resolvedColor = 'var(--feh-critical)';
      else if (warnAt !== undefined && value >= warnAt) resolvedColor = 'var(--feh-warning)';
      else resolvedColor = 'var(--feh-stable)';
    } else {
      // Higher value = better
      if (dangerAt !== undefined && value <= dangerAt) resolvedColor = 'var(--feh-critical)';
      else if (warnAt !== undefined && value <= warnAt) resolvedColor = 'var(--feh-warning)';
      else resolvedColor = 'var(--feh-stable)';
    }
  }

  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 10,
            letterSpacing: '0.16em',
            color: 'var(--text-muted)',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 13,
            fontWeight: 700,
            color: resolvedColor,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {display ?? value.toFixed(1)}
        </span>
      </div>
      <div
        className="mt-1 relative w-full"
        style={{
          height: 4,
          backgroundColor: 'var(--border-subtle)',
        }}
      >
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${pct}%`,
            backgroundColor: resolvedColor,
            transition: 'width 240ms ease',
          }}
        />
      </div>
      {caption && (
        <div
          style={{
            marginTop: 3,
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 9,
            letterSpacing: '0.14em',
            color: 'var(--text-muted)',
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
