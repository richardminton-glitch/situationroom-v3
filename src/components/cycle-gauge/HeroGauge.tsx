'use client';

import { useTheme } from '@/components/layout/ThemeProvider';
import type { ConfidenceBand } from '@/lib/signals/cycle-engine';

interface Props {
  composite:  number;
  phase:      string;
  phaseColor: string;   // kept for API compat; derived internally below
  confidence: ConfidenceBand;
}

// ── Geometry ──────────────────────────────────────────────────────────────────
const SIZE       = 360;
const CX         = 180;
const CY         = 180;
const R_OUT      = 133;   // outer edge of phase ring
const R_IN       = 111;   // inner edge of phase ring
const R_MID      = 122;   // midpoint (indicator dot orbit)
const R_LBL      = 150;   // phase label radius
const R_TICK_O   = 137;   // outer tick mark
const R_TICK_I   = 108;   // inner tick mark
const R_DECOR_O  = 146;   // faint outer decorative ring
const R_DECOR_I  = 100;   // faint inner decorative ring
const R_NDL_O    = 118;   // needle tip
const R_NDL_I    = 52;    // needle tail
const SEG_GAP    = 1.5;   // degrees gap between segments

// ── Phase data ────────────────────────────────────────────────────────────────
interface PhaseData {
  label: string[];   // 1 or 2 words
  start: number;     // score lower bound (0–100)
  end:   number;     // score upper bound
  dark:  string;     // dark-mode fill
  parch: string;     // parchment-mode fill
}

const PHASES: PhaseData[] = [
  { label: ['DEEP', 'BEAR'],  start: 0,  end: 15,  dark: '#8b2020', parch: '#7a2020' },
  { label: ['EARLY', 'ACC.'], start: 15, end: 30,  dark: '#c85a2d', parch: '#a04828' },
  { label: ['MID',  'ACC.'],  start: 30, end: 45,  dark: '#b8860b', parch: '#8b6914' },
  { label: ['EARLY', 'BULL'], start: 45, end: 60,  dark: '#5a8a5a', parch: '#3a6b3a' },
  { label: ['MID',  'BULL'],  start: 60, end: 75,  dark: '#2e8b57', parch: '#2a7048' },
  { label: ['LATE', 'BULL'],  start: 75, end: 88,  dark: '#1a9e78', parch: '#1a6b5a' },
  { label: ['DIST.'],         start: 88, end: 100, dark: '#c04040', parch: '#9b2020' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a 0–100 score to a 0–360 clock-wise angle starting at 12 o'clock. */
function scoreToAngle(score: number): number {
  return (score / 100) * 360;
}

/** Polar → Cartesian.  angleDeg = 0 is 12 o'clock, increases clockwise. */
function polar(r: number, angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

/** SVG path string for a filled annular segment (donut slice). */
function segPath(rIn: number, rOut: number, scoreStart: number, scoreEnd: number): string {
  const a1    = scoreToAngle(scoreStart) + SEG_GAP / 2;
  const a2    = scoreToAngle(scoreEnd)   - SEG_GAP / 2;
  const span  = a2 - a1;
  const large = span > 180 ? 1 : 0;
  const o1 = polar(rOut, a1);
  const o2 = polar(rOut, a2);
  const i2 = polar(rIn,  a2);
  const i1 = polar(rIn,  a1);
  const f  = (n: number) => n.toFixed(2);
  return [
    `M ${f(o1.x)} ${f(o1.y)}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${f(o2.x)} ${f(o2.y)}`,
    `L ${f(i2.x)} ${f(i2.y)}`,
    `A ${rIn}  ${rIn}  0 ${large} 0 ${f(i1.x)} ${f(i1.y)}`,
    'Z',
  ].join(' ');
}

function confidenceColor(level: ConfidenceBand['level'], isDark: boolean): string {
  if (level === 'High')     return isDark ? '#00d4c8' : '#2a6b3a';
  if (level === 'Moderate') return isDark ? '#c4885a' : '#8b6914';
  return isDark ? '#d06050' : '#9b2020';
}

// ── Component ─────────────────────────────────────────────────────────────────
export function HeroGauge({ composite, phase, confidence }: Props) {
  const { theme } = useTheme();
  const isDark    = theme === 'dark';

  const currentPhase = PHASES.find(p => composite >= p.start && composite < p.end) ?? PHASES[PHASES.length - 1];
  const activeColor  = isDark ? currentPhase.dark : currentPhase.parch;

  const indicatorAngle = scoreToAngle(composite);
  const dot            = polar(R_MID,  indicatorAngle);
  const ndlOuter       = polar(R_NDL_O, indicatorAngle);
  const ndlInner       = polar(R_NDL_I, indicatorAngle);

  const textMuted  = isDark ? 'rgba(200,220,218,0.45)' : 'var(--text-muted)';
  const tickColor  = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)';
  const decorColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const bgFill     = isDark ? '#090d12' : 'var(--bg-primary)';
  const confColor  = confidenceColor(confidence.level, isDark);

  const FONT_DATA = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";
  const FONT_LBL  = isDark
    ? "'JetBrains Mono', 'IBM Plex Mono', monospace"
    : "'IM Fell English SC', 'Georgia', serif";

  const f = (n: number) => n.toFixed(2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <defs>
          {isDark && (
            <>
              <filter id="cg-glow-lg">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="cg-glow-sm">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </>
          )}
        </defs>

        {/* Outer decorative ring */}
        <circle cx={CX} cy={CY} r={R_DECOR_O} fill="none" stroke={decorColor} strokeWidth="1" />

        {/* Phase segments */}
        {PHASES.map(p => {
          const color     = isDark ? p.dark : p.parch;
          const isCurrent = composite >= p.start && composite < p.end;
          return (
            <path
              key={p.label[0]}
              d={segPath(R_IN, R_OUT, p.start, p.end)}
              fill={color}
              fillOpacity={isCurrent ? 1 : 0.25}
              filter={isCurrent && isDark ? 'url(#cg-glow-sm)' : undefined}
            />
          );
        })}

        {/* Phase boundary ticks */}
        {[0, 15, 30, 45, 60, 75, 88].map(score => {
          const a  = scoreToAngle(score);
          const ti = polar(R_TICK_I, a);
          const to = polar(R_TICK_O, a);
          return (
            <line key={score}
              x1={f(ti.x)} y1={f(ti.y)}
              x2={f(to.x)} y2={f(to.y)}
              stroke={tickColor} strokeWidth="1.5"
            />
          );
        })}

        {/* Phase labels outside ring */}
        {PHASES.map(p => {
          const midA      = scoreToAngle((p.start + p.end) / 2);
          const pos       = polar(R_LBL, midA);
          const color     = isDark ? p.dark : p.parch;
          const isCurrent = composite >= p.start && composite < p.end;
          const fw        = isCurrent ? '700' : '400';
          const fo        = isCurrent ? 1 : 0.45;

          return (
            <text
              key={p.label[0] + '-lbl'}
              textAnchor="middle"
              fill={color}
              fillOpacity={fo}
              fontSize="6.5"
              fontFamily={FONT_LBL}
              fontWeight={fw}
              letterSpacing="0.07em"
            >
              {p.label.length === 1 ? (
                <tspan x={f(pos.x)} y={f(pos.y)} dominantBaseline="middle">
                  {p.label[0]}
                </tspan>
              ) : (
                <>
                  <tspan x={f(pos.x)} y={f(pos.y - 4)}>{p.label[0]}</tspan>
                  <tspan x={f(pos.x)} y={f(pos.y + 5)}>{p.label[1]}</tspan>
                </>
              )}
            </text>
          );
        })}

        {/* Inner decorative ring */}
        <circle cx={CX} cy={CY} r={R_DECOR_I} fill="none" stroke={decorColor} strokeWidth="1" />

        {/* Needle */}
        <line
          x1={f(ndlInner.x)} y1={f(ndlInner.y)}
          x2={f(ndlOuter.x)} y2={f(ndlOuter.y)}
          stroke={activeColor} strokeWidth="1.5" strokeOpacity="0.65"
        />

        {/* Center pivot */}
        <circle cx={CX} cy={CY} r={6} fill={activeColor} fillOpacity="0.85" />
        <circle cx={CX} cy={CY} r={2.5} fill={bgFill} />

        {/* Indicator dot on ring */}
        <circle
          cx={f(dot.x)} cy={f(dot.y)} r={9}
          fill={activeColor}
          filter={isDark ? 'url(#cg-glow-lg)' : undefined}
        />
        <circle cx={f(dot.x)} cy={f(dot.y)} r={4} fill={bgFill} />

        {/* Score */}
        <text
          x={CX} y={CY - 14}
          textAnchor="middle" dominantBaseline="middle"
          fill={activeColor}
          fontSize="56"
          fontWeight="700"
          fontFamily={FONT_DATA}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {composite}
        </text>

        {/* Phase label */}
        <text
          x={CX} y={CY + 26}
          textAnchor="middle" dominantBaseline="middle"
          fill={textMuted}
          fontSize="10"
          fontFamily={FONT_LBL}
          letterSpacing="0.14em"
        >
          {phase.toUpperCase()}
        </text>
      </svg>

      {/* Confidence line */}
      <div style={{
        display:       'flex',
        alignItems:    'center',
        gap:           8,
        fontFamily:    FONT_DATA,
        fontSize:      10,
        letterSpacing: '0.12em',
        color:         textMuted,
      }}>
        <span style={{ color: confColor, fontWeight: 700 }}>
          {confidence.level.toUpperCase()}
        </span>
        <span>CONFIDENCE</span>
        <span style={{ opacity: 0.35 }}>·</span>
        <span>{confidence.agreementCount} OF 5 SIGNALS {confidence.dominantDirection.toUpperCase()}</span>
      </div>
    </div>
  );
}
