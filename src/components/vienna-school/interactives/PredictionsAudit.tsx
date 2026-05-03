'use client';

/**
 * PredictionsAudit (Module 6) — paired-prediction scrolling timeline.
 *
 * Vertical timeline 1912 → 2023. Two columns:
 *
 *   - LEFT  (red):   mainstream predictions, mostly wrong
 *   - RIGHT (brass): Austrian predictions, mostly prescient
 *
 * Each entry: person, role, claim, what-actually-happened, source.
 * No interaction beyond scrolling — the contrast accumulates as the
 * user reads.
 *
 * On mobile: the two columns stack into a single chronological
 * column, with the lane (mainstream vs Austrian) shown as a coloured
 * pill on each card.
 */

import { ArrowSquareOut } from '@phosphor-icons/react';
import { PREDICTIONS_AUDIT, type AuditPrediction } from '@/content/vienna-school/data/predictions-audit';
import { useIsMobile } from '@/hooks/useIsMobile';

const HEADING_FONT = 'Georgia, serif';
const BODY_FONT    = "'Source Serif 4', Georgia, serif";
const MONO_FONT    = 'var(--font-mono)';

const C = {
  mainstream: '#9b3232',
  austrian:   '#b8860b',
  axis:       '#d4c9b8',
};

export function PredictionsAudit() {
  const isMobile = useIsMobile();
  const gridCols = isMobile ? '64px 1fr' : '1fr 80px 1fr';

  return (
    <div
      style={{
        border:     '1px solid var(--border-primary)',
        background: 'var(--bg-card)',
        padding:    '24px 28px',
        marginTop:  20,
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <p style={{ fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-muted)', margin: 0 }}>
          INTERACTIVE · PREDICTIONS AUDIT
        </p>
        <h3 style={{ fontFamily: HEADING_FONT, fontSize: 22, color: 'var(--text-primary)', margin: '4px 0 0 0', fontWeight: 600 }}>
          What they said. What happened.
        </h3>
      </div>

      {/* Column headers — desktop only */}
      {!isMobile && (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 80px 1fr',
        alignItems: 'baseline',
        marginBottom: 14, gap: 12,
      }}>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            display: 'inline-block',
            padding: '4px 12px',
            fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.18em', fontWeight: 600,
            background: C.mainstream, color: '#F8F1E3',
          }}>
            MAINSTREAM
          </span>
        </div>
        <div style={{
          fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.16em',
          color: 'var(--text-muted)', textAlign: 'center',
        }}>
          YEAR
        </div>
        <div style={{ textAlign: 'left' }}>
          <span style={{
            display: 'inline-block',
            padding: '4px 12px',
            fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.18em', fontWeight: 600,
            background: C.austrian, color: '#F8F1E3',
          }}>
            AUSTRIAN
          </span>
        </div>
      </div>
      )}

      {/* Timeline rows */}
      <div style={{ position: 'relative' }}>
        {/* Centre rail (desktop only) */}
        {!isMobile && (
          <div
            aria-hidden
            style={{
              position: 'absolute', top: 0, bottom: 0, left: '50%',
              width: 1, background: C.axis, transform: 'translateX(-0.5px)',
            }}
          />
        )}

        {PREDICTIONS_AUDIT.map((entry) => (
          <div
            key={entry.year}
            style={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              alignItems: 'start',
              gap: 12,
              padding: '14px 0',
            }}
          >
            {/* Year pill — first in mobile (left), middle in desktop */}
            {isMobile && <YearPill year={entry.year} />}

            {!isMobile && (
              <div style={{ minHeight: 1 }}>
                {entry.mainstream && (
                  <PredictionCard prediction={entry.mainstream} side="mainstream" />
                )}
              </div>
            )}

            {!isMobile && <YearPill year={entry.year} />}

            <div style={{ minHeight: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {isMobile && entry.mainstream && (
                <PredictionCard prediction={entry.mainstream} side="mainstream" mobile />
              )}
              {entry.austrian && (
                <PredictionCard prediction={entry.austrian} side="austrian" mobile={isMobile} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function YearPill({ year }: { year: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 56, height: 28,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-primary)',
        fontFamily: MONO_FONT, fontSize: 11, fontWeight: 600,
        color: 'var(--text-primary)', letterSpacing: '0.08em',
      }}>
        {year}
      </span>
    </div>
  );
}

function PredictionCard({ prediction, side, mobile = false }: { prediction: AuditPrediction; side: 'mainstream' | 'austrian'; mobile?: boolean }) {
  const accent = side === 'mainstream' ? C.mainstream : C.austrian;
  // On mobile both sides are left-aligned in the single column.
  const align: 'left' | 'right' = mobile ? 'left' : (side === 'mainstream' ? 'right' : 'left');

  return (
    <div
      style={{
        border:     `1px solid ${accent}40`,
        borderLeft: (mobile || side === 'austrian')   ? `3px solid ${accent}` : '1px solid transparent',
        borderRight: (!mobile && side === 'mainstream') ? `3px solid ${accent}` : '1px solid transparent',
        background: 'var(--bg-primary)',
        padding:    '12px 14px',
        textAlign:  align,
      }}
    >
      <div style={{
        fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.14em',
        color: accent, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase',
      }}>
        {prediction.person} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· {prediction.role}</span>
      </div>

      <p style={{
        fontFamily: HEADING_FONT, fontSize: 15, fontStyle: 'italic',
        color: 'var(--text-primary)', lineHeight: 1.5,
        margin: '0 0 8px 0',
      }}>
        &ldquo;{prediction.claim}&rdquo;
      </p>

      <div style={{
        padding: '8px 10px',
        background: 'var(--bg-card-hover)',
        borderLeft: side === 'austrian'   ? `2px solid ${accent}` : 'none',
        borderRight: side === 'mainstream' ? `2px solid ${accent}` : 'none',
        marginBottom: 6,
        textAlign: 'left',  // outcome reads naturally L→R regardless of column
      }}>
        <div style={{
          fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.14em',
          color: 'var(--text-muted)', fontWeight: 600, marginBottom: 3,
        }}>
          WHAT HAPPENED
        </div>
        <p style={{
          fontFamily: BODY_FONT, fontSize: 13, lineHeight: 1.5,
          color: 'var(--text-secondary)', margin: 0,
        }}>
          {prediction.outcome}
        </p>
      </div>

      <div style={{
        fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.1em',
        color: 'var(--text-muted)',
        display: 'flex', justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        alignItems: 'center', gap: 4,
      }}>
        SOURCE · {prediction.source}
        {prediction.url && (
          <a href={prediction.url} target="_blank" rel="noopener noreferrer" style={{ color: accent, marginLeft: 4 }}>
            <ArrowSquareOut size={11} weight="bold" />
          </a>
        )}
      </div>
    </div>
  );
}
