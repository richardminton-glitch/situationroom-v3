'use client';

/**
 * HayekianTriangle (Module 4) — capital structure visualisation.
 *
 * Two superimposed right-triangles:
 *
 *   - Natural triangle (brass): determined by the user-set natural rate.
 *     A *higher* natural rate → flatter, shorter triangle (less roundabout
 *     production). A *lower* natural rate → taller, more elongated
 *     triangle (more capital-intensive production).
 *
 *   - Artificial extension (red): when central bank intervention pushes
 *     the *effective* rate below natural, the triangle elongates beyond
 *     its sustainable shape. The red overlay is malinvestment — the
 *     long-dated stages of production that have been kicked off without
 *     the underlying real saving to sustain them.
 *
 * The malinvestment counter integrates the artificial extension over
 * elapsed time. Hit "CRASH" to release the rate back to natural — the
 * red zone collapses with an animation, the counter rolls back to zero,
 * and the caption updates to identify the crash with a real-world
 * historical event.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

const HEADING_FONT = 'Georgia, serif';
const BODY_FONT    = "'Source Serif 4', Georgia, serif";
const MONO_FONT    = 'var(--font-mono)';

const C = {
  natural:    '#b8860b',     // brass — sustainable structure
  artificial: '#9b3232',     // red — malinvestment / unsustainable
  axis:       '#8a7e6c',
  grid:       'rgba(80,60,20,0.10)',
  label:      '#5a4e3c',
};

const WIDTH      = 720;
const HEIGHT     = 320;
const MARGIN     = { top: 20, right: 24, bottom: 48, left: 60 };
const PLOT_W     = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H     = HEIGHT - MARGIN.top - MARGIN.bottom;

// Slider ranges
const NATURAL_RATE_MIN = 1;
const NATURAL_RATE_MAX = 10;
const SUPPRESSION_MIN  = 0;     // Effective rate above natural? Not modelled — we only handle suppression.
const SUPPRESSION_MAX  = 6;     // bps suppression below natural

interface CrashEvent {
  malinvestment: number;
  era:           string;
  blurb:         string;
}

const CRASH_BLURBS: { threshold: number; era: string; blurb: string }[] = [
  { threshold:    0, era: 'Soft landing',
    blurb: 'Almost no malinvestment had accumulated. The crash was barely perceptible — closer to a routine recession than a systemic event.' },
  { threshold:   80, era: '2001 — dot-com',
    blurb: 'A medium-sized misallocation. Tech firms with no path to profitability had been propped up by cheap capital. The bust cleared them out in 18 months.' },
  { threshold:  220, era: '2008 — Global Financial Crisis',
    blurb: 'A large, decade-long credit expansion piled into housing and structured credit. The bust took down Lehman, AIG, and the global banking system before central banks bailed everyone out.' },
  { threshold:  450, era: 'Right now (2026)',
    blurb: 'A historically unprecedented expansion. M2 doubled in two years, rates suppressed for over a decade, and the malinvestment is everywhere — commercial real estate, sovereign debt, private credit, sovereign bond markets. The bust hasn\'t happened yet. It\'s coming.' },
];

function pickCrashBlurb(malinvestment: number) {
  return [...CRASH_BLURBS].reverse().find((b) => malinvestment >= b.threshold) ?? CRASH_BLURBS[0];
}

export function HayekianTriangle() {
  const [naturalRate,  setNaturalRate]  = useState(5);   // %
  const [suppression,  setSuppression]  = useState(0);   // pp below natural
  const [malinvestment, setMalinvestment] = useState(0); // accumulated points
  const [crashed,      setCrashed]      = useState<CrashEvent | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Effective (distorted) rate
  const effectiveRate = Math.max(0.5, naturalRate - suppression);

  // ── Triangle geometry ────────────────────────────────────────────
  // Lower rate → longer structure (more stages). Map rate to "stages"
  // inversely: 10% → 4 stages, 1% → 14 stages.
  const naturalStages    = Math.round(20 - naturalRate * 1.5);
  const effectiveStages  = Math.round(20 - effectiveRate * 1.5);
  const maxStagesEver    = 20 - NATURAL_RATE_MIN * 1.5;   // for axis scale
  // Triangle height (capital invested at earliest stage) is also a
  // function of the rate — lower rate, taller triangle (more upstream
  // capital).
  const naturalHeight    = (11 - naturalRate)   / 11;     // 0..1
  const effectiveHeight  = (11 - effectiveRate) / 11;     // 0..1

  // ── Malinvestment accumulator ───────────────────────────────────
  useEffect(() => {
    if (crashed) return;
    if (suppression <= 0) {
      // Slowly bleed off accumulated malinvestment when intervention removed
      if (malinvestment > 0 && !tickRef.current) {
        tickRef.current = setInterval(() => {
          setMalinvestment((m) => {
            const next = Math.max(0, m - 4);
            if (next === 0 && tickRef.current) {
              clearInterval(tickRef.current);
              tickRef.current = null;
            }
            return next;
          });
        }, 200);
      }
      return;
    }
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setMalinvestment((m) => Math.min(800, m + suppression * 2));
    }, 200);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [suppression, crashed]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCrash() {
    if (suppression === 0 && malinvestment === 0) return;
    const crash = pickCrashBlurb(malinvestment);
    setCrashed({ malinvestment, era: crash.era, blurb: crash.blurb });
    setSuppression(0);
    setMalinvestment(0);
  }

  function handleReset() {
    setCrashed(null);
    setSuppression(0);
    setMalinvestment(0);
  }

  // ── Triangle path generators ─────────────────────────────────────
  // Right-triangle: base on X axis, hypotenuse from (0, top) sloping
  // down to (stages * step, base). Capital invested at each stage = the
  // y-coordinate of the hypotenuse at that x.
  const stagePixels  = PLOT_W / maxStagesEver;
  const naturalRight = MARGIN.left + naturalStages   * stagePixels;
  const effRight     = MARGIN.left + effectiveStages * stagePixels;
  const baseY        = MARGIN.top + PLOT_H;
  const naturalTopY  = baseY - naturalHeight   * PLOT_H;
  const effTopY      = baseY - effectiveHeight * PLOT_H;

  const naturalPath = `M ${MARGIN.left} ${baseY} L ${MARGIN.left} ${naturalTopY} L ${naturalRight} ${baseY} Z`;

  // The "artificial" path is the difference: a polygon covering the area
  // beyond the natural triangle that's now claimed by the elongated /
  // taller effective triangle. We draw it only when suppression > 0.
  const artificialPath = suppression > 0
    ? `M ${MARGIN.left} ${naturalTopY} L ${MARGIN.left} ${effTopY} L ${effRight} ${baseY} L ${naturalRight} ${baseY} L ${MARGIN.left} ${naturalTopY} Z`
    : null;

  return (
    <div
      style={{
        border:     '1px solid var(--border-primary)',
        background: 'var(--bg-card)',
        padding:    '24px 28px',
        marginTop:  20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <div>
          <p style={{ fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-muted)', margin: 0 }}>
            INTERACTIVE · HAYEKIAN TRIANGLE
          </p>
          <h3 style={{ fontFamily: HEADING_FONT, fontSize: 20, color: 'var(--text-primary)', margin: '4px 0 0 0', fontWeight: 600 }}>
            The structure of capital, distorted by central command.
          </h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.16em', color: 'var(--text-muted)', margin: 0 }}>
            MALINVESTMENT
          </p>
          <p style={{
            fontFamily: MONO_FONT, fontSize: 26, fontWeight: 600,
            color: malinvestment > 200 ? C.artificial : malinvestment > 80 ? 'var(--accent-warning)' : 'var(--text-secondary)',
            margin: '2px 0 0 0', letterSpacing: '0.02em',
          }}>
            {malinvestment.toFixed(0)}
          </p>
        </div>
      </div>

      {/* ── SVG triangle ──────────────────────────────────────────── */}
      <div style={{ width: '100%' }}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', background: 'var(--bg-primary)', maxHeight: HEIGHT, height: 'auto' }}
        >
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((p, i) => (
            <line
              key={i}
              x1={MARGIN.left}        y1={baseY - p * PLOT_H}
              x2={WIDTH - MARGIN.right} y2={baseY - p * PLOT_H}
              stroke={C.grid} strokeDasharray="2 4"
            />
          ))}

          {/* Artificial extension — drawn first so natural sits on top */}
          {artificialPath && (
            <path
              d={artificialPath}
              fill={C.artificial}
              fillOpacity={0.42}
              stroke={C.artificial}
              strokeWidth={1.5}
              style={{ transition: 'd 0.2s' }}
            />
          )}

          {/* Natural triangle */}
          <path
            d={naturalPath}
            fill={C.natural}
            fillOpacity={0.28}
            stroke={C.natural}
            strokeWidth={2}
            style={{ transition: 'd 0.2s' }}
          />

          {/* Stage dividers (vertical ticks) */}
          {Array.from({ length: Math.max(naturalStages, effectiveStages) }).map((_, i) => {
            const x = MARGIN.left + (i + 1) * stagePixels;
            return (
              <line
                key={i}
                x1={x} x2={x}
                y1={baseY} y2={baseY + 4}
                stroke={C.axis} strokeWidth={1}
              />
            );
          })}

          {/* X axis */}
          <line
            x1={MARGIN.left} x2={WIDTH - MARGIN.right}
            y1={baseY} y2={baseY}
            stroke={C.axis} strokeWidth={1}
          />
          {/* Y axis */}
          <line
            x1={MARGIN.left} x2={MARGIN.left}
            y1={MARGIN.top} y2={baseY}
            stroke={C.axis} strokeWidth={1}
          />

          {/* Axis labels */}
          <text
            x={MARGIN.left + PLOT_W / 2}
            y={HEIGHT - 14}
            fontFamily="var(--font-mono)" fontSize={10} fill={C.label}
            textAnchor="middle" letterSpacing="0.14em"
          >
            STAGES OF PRODUCTION  ·  RAW MATERIAL → CONSUMER GOODS →
          </text>
          <text
            x={14} y={MARGIN.top + PLOT_H / 2}
            fontFamily="var(--font-mono)" fontSize={10} fill={C.label}
            textAnchor="middle" letterSpacing="0.14em"
            transform={`rotate(-90, 14, ${MARGIN.top + PLOT_H / 2})`}
          >
            CAPITAL INVESTED
          </text>

          {/* "Consumer goods" label at the right end of natural triangle */}
          <text
            x={naturalRight + 4} y={baseY - 8}
            fontFamily="var(--font-mono)" fontSize={9} fill={C.natural}
            textAnchor="start" fontWeight={600}
          >
            ◀ NATURAL
          </text>

          {/* Artificial extension label */}
          {artificialPath && (
            <text
              x={effRight - 4} y={baseY - 8}
              fontFamily="var(--font-mono)" fontSize={9} fill={C.artificial}
              textAnchor="end" fontWeight={600}
            >
              ARTIFICIAL ▶
            </text>
          )}
        </svg>
      </div>

      {/* ── Sliders ─────────────────────────────────────────────── */}
      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
        <SliderControl
          label="Natural rate of interest"
          sublabel="Reflects real time preferences. Higher → shorter, fatter triangle."
          min={NATURAL_RATE_MIN}
          max={NATURAL_RATE_MAX}
          value={naturalRate}
          onChange={setNaturalRate}
          accent={C.natural}
          unit="%"
          disabled={!!crashed}
        />
        <SliderControl
          label="Central bank suppression"
          sublabel="Pushes effective rate below natural via credit expansion."
          min={SUPPRESSION_MIN}
          max={SUPPRESSION_MAX}
          value={suppression}
          onChange={setSuppression}
          accent={C.artificial}
          unit="pp ↓"
          disabled={!!crashed}
        />
      </div>

      {/* ── Effective rate readout + actions ───────────────────── */}
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{
          padding: '8px 14px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-primary)',
          fontFamily: MONO_FONT, fontSize: 11, letterSpacing: '0.12em',
        }}>
          NATURAL <span style={{ color: C.natural, fontWeight: 600 }}>{naturalRate}%</span>
          {suppression > 0 && (
            <>
              <span style={{ margin: '0 10px', color: 'var(--text-muted)' }}>—</span>
              EFFECTIVE <span style={{ color: C.artificial, fontWeight: 600 }}>{effectiveRate.toFixed(1)}%</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleCrash}
          disabled={!!crashed || (suppression === 0 && malinvestment === 0)}
          style={{
            padding: '10px 20px',
            fontFamily: MONO_FONT, fontSize: 11, letterSpacing: '0.14em', fontWeight: 600,
            background: (crashed || (suppression === 0 && malinvestment === 0)) ? 'var(--border-primary)' : C.artificial,
            color: (crashed || (suppression === 0 && malinvestment === 0)) ? 'var(--text-muted)' : '#F8F1E3',
            border: 'none',
            cursor: (crashed || (suppression === 0 && malinvestment === 0)) ? 'not-allowed' : 'pointer',
          }}
        >
          ⚡ CRASH — RELEASE THE RATE
        </button>

        {crashed && (
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '10px 16px',
              fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em',
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-primary)',
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            RESET
          </button>
        )}
      </div>

      {/* ── Status caption ─────────────────────────────────────── */}
      <div
        style={{
          marginTop: 18,
          padding: '14px 16px',
          borderLeft: `3px solid ${crashed ? C.artificial : suppression > 0 ? 'var(--accent-warning)' : C.natural}`,
          background: 'var(--bg-card-hover)',
          fontFamily: BODY_FONT, fontSize: 14, lineHeight: 1.55,
          color: 'var(--text-primary)',
        }}
      >
        {crashed ? (
          <>
            <strong style={{
              fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.18em',
              color: C.artificial, marginRight: 8,
            }}>
              CRASH · {crashed.era.toUpperCase()}
            </strong>
            <span style={{ fontStyle: 'italic' }}>{crashed.blurb}</span>
          </>
        ) : suppression === 0 ? (
          <>
            <strong style={{ fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.18em', color: C.natural, marginRight: 8 }}>
              EQUILIBRIUM
            </strong>
            <span style={{ fontStyle: 'italic' }}>
              The structure of production is sustained by real saving. Move the central-bank slider to push the effective rate below natural and watch malinvestment accumulate.
            </span>
          </>
        ) : malinvestment < 80 ? (
          <>
            <strong style={{ fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.18em', color: 'var(--accent-warning)', marginRight: 8 }}>
              EARLY BOOM
            </strong>
            <span style={{ fontStyle: 'italic' }}>
              The cheap credit is feeding into longer-dated projects. Everything looks fine — better than fine. Asset prices rising. Entrepreneurs confident. The structure is stretching, but the savings to support it haven\'t arrived.
            </span>
          </>
        ) : malinvestment < 220 ? (
          <>
            <strong style={{ fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.18em', color: 'var(--accent-warning)', marginRight: 8 }}>
              MATURING BOOM
            </strong>
            <span style={{ fontStyle: 'italic' }}>
              Malinvestment is now visible to anyone who looks. Capital is locked into projects that depend on the credit continuing. The system needs higher and higher doses of expansion to stay aloft.
            </span>
          </>
        ) : (
          <>
            <strong style={{ fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.18em', color: C.artificial, marginRight: 8 }}>
              CRACK-UP RISK
            </strong>
            <span style={{ fontStyle: 'italic' }}>
              The artificial extension is now larger than the sustainable triangle. The system is fragile. Any tightening, any shock, any drop in confidence and the whole structure liquidates. Hit CRASH to release the pressure — or wait for reality to do it.
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Subcomponent ────────────────────────────────────────────────────────

function SliderControl({
  label, sublabel, min, max, value, onChange, accent, unit, disabled,
}: {
  label: string; sublabel: string;
  min: number; max: number; value: number; onChange: (n: number) => void;
  accent: string; unit: string; disabled?: boolean;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{
          fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.16em',
          color: accent, fontWeight: 600, textTransform: 'uppercase',
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: MONO_FONT, fontSize: 14, fontWeight: 600,
          color: accent,
        }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        style={{
          width: '100%',
          accentColor: accent,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      />
      <p style={{
        fontFamily: BODY_FONT, fontSize: 12, fontStyle: 'italic',
        color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.4,
      }}>
        {sublabel}
      </p>
    </div>
  );
}
