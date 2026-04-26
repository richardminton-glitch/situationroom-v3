'use client';

/**
 * Module01 — Sovereign Countdown Globe (composed).
 *
 * Holds:
 *   - selected sovereign state (default USA — namesake context)
 *   - stress toggle ("AT CURRENT RATES" vs "STRESSED" rates +200bps growth -100bps)
 *   - precomputed projection (runway + sovereignty score) per stress mode
 *
 * Layout:
 *   ┌──────────────────┬─────────────────────────────┐
 *   │  GLOBE           │  COUNTDOWN CLOCK            │
 *   │  (D3 ortho)      │  6 readout gauges           │
 *   │                  │  FULL DOSSIER button        │
 *   ├──────────────────┤                             │
 *   │  LEADERBOARD     │                             │
 *   └──────────────────┴─────────────────────────────┘
 */

import { useMemo, useState } from 'react';
import { useFehData } from '@/components/feh/FehDataProvider';
import { computeRunway } from '@/lib/feh/runway';
import { sovereigntyScore } from '@/lib/feh/sovereigntyScore';
import type { SovereignProjected } from '@/lib/feh/types';
import { SovereignGlobe } from './SovereignGlobe';
import { SovereignDossier } from './SovereignDossier';
import { Leaderboard } from './Leaderboard';

// Anchor point for countdown — every viewer sees the same time-since-computation.
const COMPUTED_AT = Date.UTC(2026, 3, 26, 14, 30, 0); // 26 Apr 2026 14:30 UTC

export function Module01() {
  const { sovereigns } = useFehData();
  const [selectedIso3, setSelectedIso3] = useState('USA');
  const [stressed, setStressed] = useState(false);

  const projected: SovereignProjected[] = useMemo(() => {
    return sovereigns.map((s) => ({
      ...s,
      runway: computeRunway(s, stressed),
      sovereigntyScore: sovereigntyScore(s),
    }));
  }, [sovereigns, stressed]);

  const selected =
    projected.find((s) => s.iso3 === selectedIso3) ?? projected[0];

  return (
    <div className="space-y-4">
      {/* Stress toggle */}
      <div className="flex items-center justify-end">
        <div
          role="group"
          aria-label="Stress toggle"
          className="inline-flex border"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <button
            type="button"
            onClick={() => setStressed(false)}
            className="px-3 py-1.5"
            style={{
              backgroundColor: !stressed ? 'var(--bg-card-hover)' : 'transparent',
              color: !stressed ? 'var(--text-primary)' : 'var(--text-muted)',
              fontFamily: 'var(--feh-font-mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              fontWeight: !stressed ? 700 : 400,
            }}
          >
            AT CURRENT RATES
          </button>
          <button
            type="button"
            onClick={() => setStressed(true)}
            className="px-3 py-1.5 border-l"
            style={{
              borderColor: 'var(--border-primary)',
              backgroundColor: stressed ? 'var(--bg-card-hover)' : 'transparent',
              color: stressed ? 'var(--feh-warning)' : 'var(--text-muted)',
              fontFamily: 'var(--feh-font-mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              fontWeight: stressed ? 700 : 400,
            }}
          >
            STRESSED
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="flex flex-col gap-4">
          <div
            className="border flex items-center justify-center"
            style={{
              borderColor: 'var(--border-primary)',
              backgroundColor: 'var(--bg-card)',
              aspectRatio: '1 / 1',
              maxHeight: 540,
            }}
          >
            <SovereignGlobe
              sovereigns={projected}
              selectedIso3={selected.iso3}
              onSelect={setSelectedIso3}
            />
          </div>
          <Leaderboard
            sovereigns={projected}
            selectedIso3={selected.iso3}
            onSelect={setSelectedIso3}
          />
        </div>
        <SovereignDossier
          sovereign={selected}
          computedAt={COMPUTED_AT}
          stressed={stressed}
        />
      </div>
    </div>
  );
}
