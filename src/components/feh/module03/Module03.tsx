'use client';

/**
 * Module03 — Central Bank Divergence Matrix.
 *
 * Big-stat header: DIVERGENCE INDEX (GDP-weighted std-dev of stance vector).
 * Below: 24-cell grid of CBCards. Sort options: alphabetical / by stance /
 * by divergence vs G20 mean (rate magnitude).
 */

import { useMemo, useState } from 'react';
import { CB_RATES, divergenceIndex, type CBRate } from '@/lib/feh/cb-rates-seed';
import { CBCard } from './CBCard';

type SortMode = 'alpha' | 'stance' | 'divergence';

const STANCE_ORDER: Record<CBRate['stance'], number> = { tightening: 0, holding: 1, easing: 2 };

export function Module03() {
  const [sortMode, setSortMode] = useState<SortMode>('stance');

  const sorted = useMemo(() => {
    const r = [...CB_RATES];
    if (sortMode === 'alpha') {
      r.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'stance') {
      r.sort((a, b) => STANCE_ORDER[a.stance] - STANCE_ORDER[b.stance] || b.gdpUsdT - a.gdpUsdT);
    } else {
      // by divergence — highest absolute rate first (proxy for distance from G20 mean)
      const meanRate = CB_RATES.reduce((s, x) => s + x.rate * x.gdpUsdT, 0) /
                       CB_RATES.reduce((s, x) => s + x.gdpUsdT, 0);
      r.sort((a, b) => Math.abs(b.rate - meanRate) - Math.abs(a.rate - meanRate));
    }
    return r;
  }, [sortMode]);

  const div = divergenceIndex(CB_RATES);
  const divLabel = div > 0.55 ? 'HIGH' : div > 0.35 ? 'MODERATE' : 'LOW';
  const divColor =
    div > 0.55 ? 'var(--feh-critical)' :
    div > 0.35 ? 'var(--feh-warning)' :
    'var(--feh-stable)';

  return (
    <div className="space-y-4">
      {/* Big-stat header */}
      <div
        className="border px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--feh-font-mono)',
              fontSize: 9,
              letterSpacing: '0.22em',
              color: 'var(--text-muted)',
            }}
          >
            DIVERGENCE INDEX
          </div>
          <div className="flex items-baseline gap-3 mt-0.5">
            <span
              style={{
                fontFamily: 'var(--feh-font-mono)',
                fontSize: 28,
                fontWeight: 900,
                color: divColor,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.01em',
                lineHeight: 1,
              }}
            >
              {div.toFixed(2)}
            </span>
            <span
              style={{
                fontFamily: 'var(--feh-font-mono)',
                fontSize: 11,
                color: divColor,
                letterSpacing: '0.18em',
                fontWeight: 700,
              }}
            >
              ↗ {divLabel}
            </span>
          </div>
          <div
            style={{
              fontFamily: 'var(--feh-font-mono)',
              fontSize: 10,
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              marginTop: 4,
              fontStyle: 'italic',
            }}
          >
            When this number rises, capital moves.
          </div>
        </div>

        {/* Sort toggle */}
        <div className="flex" style={{ borderColor: 'var(--border-primary)' }}>
          {(['alpha', 'stance', 'divergence'] as SortMode[]).map((m, i) => (
            <button
              key={m}
              type="button"
              onClick={() => setSortMode(m)}
              className="px-2.5 py-1 border"
              style={{
                borderColor: 'var(--border-primary)',
                backgroundColor: sortMode === m ? 'var(--bg-card-hover)' : 'transparent',
                color: sortMode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                fontFamily: 'var(--feh-font-mono)',
                fontSize: 9,
                letterSpacing: '0.16em',
                fontWeight: sortMode === m ? 700 : 400,
                marginLeft: i === 0 ? 0 : -1,
              }}
            >
              {m === 'alpha' ? 'A-Z' : m === 'stance' ? 'STANCE' : 'DIVERGENCE'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of CB cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {sorted.map((r) => (
          <CBCard key={r.iso3} rate={r} />
        ))}
      </div>
    </div>
  );
}
