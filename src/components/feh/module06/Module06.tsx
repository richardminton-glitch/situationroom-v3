'use client';

/**
 * Module06 — Petro-Dollar Erosion Tracker.
 *
 * Layered line chart, 10y, indexed to 100 at series start. DXY base layer
 * (greyed dashed), three erosion overlays: yuan oil settlement %, gold
 * repatriation index, BRICS+ bilateral swap notional.
 *
 * Toggle: DXY-ALONE (consensus) vs FULL-STACK (contrarian).
 */

import { useState } from 'react';
import { useFehData } from '@/components/feh/FehDataProvider';
import { PetroDollarChart } from './PetroDollarChart';

export function Module06() {
  const { petroHistory, petroAnnotations } = useFehData();
  const [showStack, setShowStack] = useState(true);

  const latest = petroHistory[petroHistory.length - 1];
  const first = petroHistory[0];

  const dxy10y = first.dxy === 0 ? 0 : ((latest.dxy - first.dxy) / first.dxy) * 100;
  const yuanOil10y = first.yuanOil === 0 ? 0 : ((latest.yuanOil - first.yuanOil) / first.yuanOil) * 100;
  const gold10y = first.goldRepat === 0 ? 0 : ((latest.goldRepat - first.goldRepat) / first.goldRepat) * 100;
  const brics10y = first.bricsSwaps === 0 ? 0 : ((latest.bricsSwaps - first.bricsSwaps) / first.bricsSwaps) * 100;

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 10,
            letterSpacing: '0.16em',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
          }}
        >
          DXY is a relative measure. It does not measure decay.
        </div>
        <div className="inline-flex border" style={{ borderColor: 'var(--border-primary)' }}>
          <button
            type="button"
            onClick={() => setShowStack(false)}
            className="px-2.5 py-1"
            style={{
              backgroundColor: !showStack ? 'var(--bg-card-hover)' : 'transparent',
              color: !showStack ? 'var(--text-primary)' : 'var(--text-muted)',
              fontFamily: 'var(--feh-font-mono)',
              fontSize: 9,
              letterSpacing: '0.16em',
              fontWeight: !showStack ? 700 : 400,
            }}
          >
            DXY ALONE
          </button>
          <button
            type="button"
            onClick={() => setShowStack(true)}
            className="px-2.5 py-1 border-l"
            style={{
              borderColor: 'var(--border-primary)',
              backgroundColor: showStack ? 'var(--bg-card-hover)' : 'transparent',
              color: showStack ? 'var(--feh-critical)' : 'var(--text-muted)',
              fontFamily: 'var(--feh-font-mono)',
              fontSize: 9,
              letterSpacing: '0.16em',
              fontWeight: showStack ? 700 : 400,
            }}
          >
            FULL STACK
          </button>
        </div>
      </div>

      <PetroDollarChart data={petroHistory} annotations={petroAnnotations} showStack={showStack} />

      {/* Sub-readouts: 10Y deltas */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-2 border-t pt-3"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <Readout label="DXY" delta={dxy10y} color="var(--text-muted)" />
        {showStack && (
          <>
            <Readout label="YUAN OIL %" delta={yuanOil10y} color="var(--feh-critical)" />
            <Readout label="GOLD REPAT" delta={gold10y} color="var(--feh-warning)" />
            <Readout label="BRICS SWAPS" delta={brics10y} color="var(--feh-stable)" />
          </>
        )}
      </div>
    </div>
  );
}

function Readout({ label, delta, color }: { label: string; delta: number; color: string }) {
  const arrow = delta >= 0 ? '↗' : '↘';
  return (
    <div className="flex flex-col gap-0.5">
      <span
        style={{
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 9,
          letterSpacing: '0.16em',
          color: 'var(--text-muted)',
        }}
      >
        {label} 10Y
      </span>
      <span
        style={{
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 14,
          fontWeight: 700,
          color,
          letterSpacing: '0.04em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {arrow} {delta >= 0 ? '+' : ''}
        {delta.toFixed(1)}%
      </span>
    </div>
  );
}
