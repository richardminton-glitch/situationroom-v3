'use client';

/**
 * SectorDossierCard — single sector entry in the Malinvestment Mapper list.
 *
 * Shows stress score + bar, headline metric, YoY delta, and half-life-at-
 * current-rates. Highlights when selected (clicking the card or the
 * matching radar axis).
 */

import type { MalinvestmentSector } from '@/lib/feh/malinvestment-seed';

interface SectorDossierCardProps {
  sector: MalinvestmentSector;
  selected: boolean;
  onClick: () => void;
}

export function SectorDossierCard({ sector, selected, onClick }: SectorDossierCardProps) {
  const color =
    sector.stress >= 80 ? 'var(--feh-critical)' :
    sector.stress >= 60 ? 'var(--feh-warning)' :
    'var(--feh-stable)';

  const yoyArrow = sector.yoyDelta >= 0 ? '↗' : '↘';
  const yoyColor = sector.yoyDelta >= 0 ? 'var(--feh-critical)' : 'var(--feh-stable)';

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left transition-colors border-l-2 px-3 py-2.5"
      style={{
        borderLeftColor: selected ? color : 'transparent',
        backgroundColor: selected ? 'var(--bg-card-hover)' : 'transparent',
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '0.14em',
          }}
        >
          {sector.label}
        </span>
        <span
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 9,
            letterSpacing: '0.18em',
            color: 'var(--text-muted)',
          }}
        >
          STRESS{' '}
          <span style={{ color, fontWeight: 700, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
            {sector.stress}
          </span>
        </span>
      </div>

      <div className="mt-1.5 relative w-full" style={{ height: 4, backgroundColor: 'var(--border-subtle)' }}>
        <div
          className="absolute inset-y-0 left-0"
          style={{ width: `${sector.stress}%`, backgroundColor: color, transition: 'width 240ms ease' }}
        />
      </div>

      <div
        className="mt-2"
        style={{
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 10,
          color: 'var(--text-secondary)',
          letterSpacing: '0.04em',
          lineHeight: 1.5,
        }}
      >
        {sector.headline}
      </div>

      <div
        className="mt-1.5 flex items-center justify-between gap-3"
        style={{
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 9,
          letterSpacing: '0.14em',
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ color: yoyColor }}>
          {yoyArrow} {sector.yoyDelta >= 0 ? '+' : ''}
          {sector.yoyDelta.toFixed(1)}PP YoY
        </span>
        <span>HALF-LIFE @ CURRENT RATES: ~{sector.halfLifeMonths} MO</span>
      </div>
    </button>
  );
}
