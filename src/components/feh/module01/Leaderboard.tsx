'use client';

/**
 * Leaderboard — top 10 distressed sovereigns by runway (ascending).
 *
 * Click a row → globe flies to that country and dossier loads it. Severity-
 * coloured runway badge on the right; failure mode underneath the country.
 */

import type { SovereignProjected } from '@/lib/feh/types';
import { colorForRunway } from '@/lib/feh/colors';
import { failureModeLabel } from '@/lib/feh/runway';

interface LeaderboardProps {
  sovereigns: SovereignProjected[];
  selectedIso3: string;
  onSelect: (iso3: string) => void;
}

export function Leaderboard({ sovereigns, selectedIso3, onSelect }: LeaderboardProps) {
  // Primary sort: shortest runway first. Tiebreak by Sovereignty Score
  // (lowest = most distressed) — keeps Lebanon/Venezuela/Zimbabwe at the top
  // of the runway=0 tier instead of alphabetical order.
  const top10 = [...sovereigns]
    .sort((a, b) => {
      if (a.runway.years !== b.runway.years) return a.runway.years - b.runway.years;
      return a.sovereigntyScore - b.sovereigntyScore;
    })
    .slice(0, 10);

  return (
    <div
      className="border"
      style={{
        borderColor: 'var(--border-primary)',
        backgroundColor: 'var(--bg-card)',
      }}
    >
      <div
        className="px-3 py-2 border-b flex items-center justify-between"
        style={{
          borderColor: 'var(--border-subtle)',
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 9,
          letterSpacing: '0.22em',
          color: 'var(--text-muted)',
        }}
      >
        <span>TOP 10 · DISTRESSED LEADERBOARD</span>
        <span style={{ color: 'var(--feh-critical)' }}>RANKED BY RUNWAY ↑</span>
      </div>
      <ul className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
        {top10.map((s, i) => {
          const active = s.iso3 === selectedIso3;
          const runwayLabel =
            s.runway.years === 0
              ? 'NOW'
              : s.runway.years >= 100
              ? '100Y+'
              : `${s.runway.years}Y`;
          return (
            <li key={s.iso3}>
              <button
                type="button"
                onClick={() => onSelect(s.iso3)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors"
                style={{
                  backgroundColor: active ? 'var(--bg-card-hover)' : 'transparent',
                  borderLeft: `2px solid ${active ? colorForRunway(s.runway.years) : 'transparent'}`,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--feh-font-mono)',
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    color: 'var(--text-muted)',
                    width: 22,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 min-w-0">
                  <span
                    className="block truncate"
                    style={{
                      fontFamily: 'var(--feh-font-mono)',
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {s.name}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--feh-font-mono)',
                      fontSize: 9,
                      letterSpacing: '0.14em',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {failureModeLabel(s.runway.failureMode)}
                  </span>
                </span>
                <span
                  className="border px-2 py-0.5"
                  style={{
                    borderColor: colorForRunway(s.runway.years),
                    color: colorForRunway(s.runway.years),
                    fontFamily: 'var(--feh-font-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: 50,
                    textAlign: 'center',
                  }}
                >
                  {runwayLabel}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
