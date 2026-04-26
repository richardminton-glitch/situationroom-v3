'use client';

/**
 * Module04 — Malinvestment Mapper.
 *
 * Left half: 9-axis radar chart of sector stress scores. Right half:
 * vertical list of sector dossier cards. Selecting either side highlights
 * the other. Composite Bust Probability sits top-right — geometric mean
 * across all 9 sectors per the locked editorial weight.
 */

import { useState } from 'react';
import { MALINVESTMENT_SECTORS, bustProbability } from '@/lib/feh/malinvestment-seed';
import { MalinvestmentRadar } from './MalinvestmentRadar';
import { SectorDossierCard } from './SectorDossierCard';

export function Module04() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const bp = bustProbability(MALINVESTMENT_SECTORS);
  const bpLabel = bp >= 75 ? 'CRITICAL' : bp >= 60 ? 'ELEVATED' : bp >= 40 ? 'NOMINAL' : 'STABLE';
  const bpColor =
    bp >= 75 ? 'var(--feh-critical)' :
    bp >= 60 ? 'var(--feh-warning)' :
    'var(--feh-stable)';

  return (
    <div className="space-y-4">
      {/* Bust Probability composite — top-right banner */}
      <div
        className="border px-4 py-3 flex items-center justify-between gap-4 flex-wrap"
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
            BUST PROBABILITY · COMPOSITE
          </div>
          <div className="flex items-baseline gap-3 mt-0.5">
            <span
              style={{
                fontFamily: 'var(--feh-font-mono)',
                fontSize: 30,
                fontWeight: 900,
                color: bpColor,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              }}
            >
              {bp.toFixed(1)}
            </span>
            <span
              style={{
                fontFamily: 'var(--feh-font-mono)',
                fontSize: 11,
                color: bpColor,
                letterSpacing: '0.18em',
                fontWeight: 700,
              }}
            >
              {bpLabel}
            </span>
          </div>
        </div>
        <div
          className="max-w-md"
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 10,
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            lineHeight: 1.7,
            textAlign: 'right',
          }}
        >
          This number does not predict timing. It measures kindling.
          <br />
          Cycle theory does not predict the day of the bust.
        </div>
      </div>

      {/* Radar + dossier list — radar is sticky on lg+ so it stays in view
          while the user scrolls through the 9 sector dossiers on the right.
          (No `items-start` on the grid — both columns must stretch to the
          row height for the sticky child to have room to scroll within.) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5">
          <div
            className="border flex items-center justify-center p-3 lg:sticky"
            style={{
              borderColor: 'var(--border-primary)',
              backgroundColor: 'var(--bg-card)',
              top: 16,
            }}
          >
            <MalinvestmentRadar
              sectors={MALINVESTMENT_SECTORS}
              selectedId={selectedId}
              onSelectId={setSelectedId}
            />
          </div>
        </div>

        <div
          className="lg:col-span-7 border divide-y"
          style={{
            borderColor: 'var(--border-primary)',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <div
            className="px-3 py-2 flex items-center justify-between"
            style={{
              borderBottom: '1px solid var(--border-subtle)',
              fontFamily: 'var(--feh-font-mono)',
              fontSize: 9,
              letterSpacing: '0.22em',
              color: 'var(--text-muted)',
            }}
          >
            <span>SECTOR DOSSIERS</span>
            <span style={{ color: 'var(--feh-warning)' }}>9 SECTORS · KINDLING MAP</span>
          </div>
          {MALINVESTMENT_SECTORS.map((s) => (
            <div key={s.id} style={{ borderColor: 'var(--border-subtle)' }}>
              <SectorDossierCard
                sector={s}
                selected={s.id === selectedId}
                onClick={() => setSelectedId(s.id === selectedId ? null : s.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
