'use client';

/**
 * WartimePipeline — vertical 5-stage descent visualisation.
 *
 * Each stage is a row showing the stage number, label, threshold
 * description, and the country chips placed at that stage. Stages are
 * connected by a thick "pipe" running down the left side, with severity
 * colour deepening from teal (Stage 1) through amber to critical-red
 * (Stage 5) — descent reads as escalation.
 *
 * Click a country chip → parent updates selectedIso3 → evidence panel
 * loads the drilldown. Click again to deselect.
 */

import {
  WARTIME_STAGES,
  type WartimeCountry,
  type WartimeStage,
} from '@/lib/feh/wartime-seed';

interface WartimePipelineProps {
  countries: WartimeCountry[];
  selectedIso3: string | null;
  onSelectIso3: (iso3: string | null) => void;
}

// Stage severity ramp — teal at top, red at bottom
const STAGE_COLOR: Record<WartimeStage, string> = {
  1: 'var(--feh-stable)',
  2: 'var(--feh-stable)',
  3: 'var(--feh-warning)',
  4: 'var(--feh-warning)',
  5: 'var(--feh-critical)',
};

const STAGE_TEXT_COLOR: Record<WartimeStage, string> = {
  1: 'var(--feh-stable)',
  2: 'var(--feh-stable)',
  3: 'var(--feh-warning)',
  4: 'var(--feh-warning)',
  5: 'var(--feh-critical)',
};

export function WartimePipeline({ countries, selectedIso3, onSelectIso3 }: WartimePipelineProps) {
  const byStage: Record<number, WartimeCountry[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const c of countries) byStage[c.stage].push(c);

  return (
    <div className="relative">
      {WARTIME_STAGES.map((s, idx) => {
        const isLast = idx === WARTIME_STAGES.length - 1;
        const countriesHere = byStage[s.stage] ?? [];
        const color = STAGE_COLOR[s.stage];
        const textColor = STAGE_TEXT_COLOR[s.stage];
        return (
          <div key={s.stage} className="relative grid grid-cols-[64px_1fr] gap-3 pb-7">
            {/* Stage indicator + pipe */}
            <div className="relative flex flex-col items-center">
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: color,
                  color: 'var(--bg-primary)',
                  fontFamily: 'var(--feh-font-mono)',
                  fontSize: 14,
                  fontWeight: 900,
                  letterSpacing: '0.02em',
                  boxShadow: `0 0 0 4px color-mix(in srgb, ${color} 18%, transparent)`,
                }}
              >
                {s.stage}
              </div>
              {!isLast && (
                <div
                  className="absolute"
                  style={{
                    top: 40,
                    bottom: -28,
                    width: 4,
                    backgroundColor: `color-mix(in srgb, ${color} 65%, var(--border-subtle))`,
                  }}
                />
              )}
            </div>

            {/* Stage content */}
            <div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span
                  style={{
                    fontFamily: 'var(--feh-font-mono)',
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    color: textColor,
                  }}
                >
                  STAGE {s.stage} · {s.label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--feh-font-mono)',
                    fontSize: 9,
                    letterSpacing: '0.14em',
                    color: 'var(--text-muted)',
                    fontStyle: 'italic',
                  }}
                >
                  {s.description}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {countriesHere.length === 0 ? (
                  <span
                    style={{
                      fontFamily: 'var(--feh-font-mono)',
                      fontSize: 10,
                      letterSpacing: '0.16em',
                      color: 'var(--text-muted)',
                      opacity: 0.6,
                      fontStyle: 'italic',
                    }}
                  >
                    [ no countries at this stage ]
                  </span>
                ) : (
                  countriesHere.map((c) => {
                    const isSelected = c.iso3 === selectedIso3;
                    return (
                      <button
                        key={c.iso3}
                        type="button"
                        onClick={() => onSelectIso3(isSelected ? null : c.iso3)}
                        className="border px-2 py-1 transition-all"
                        style={{
                          borderColor: isSelected ? color : 'var(--border-subtle)',
                          backgroundColor: isSelected
                            ? `color-mix(in srgb, ${color} 18%, var(--bg-card))`
                            : 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--feh-font-mono)',
                          fontSize: 11,
                          letterSpacing: '0.12em',
                          fontWeight: isSelected ? 700 : 400,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ marginRight: 4 }}>{c.flag}</span>
                        {c.iso3}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
