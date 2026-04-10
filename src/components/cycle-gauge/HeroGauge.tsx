'use client';

import type { ConfidenceBand } from '@/lib/signals/cycle-engine';

interface Props {
  composite:  number;
  phase:      string;
  phaseColor: string;
  confidence: ConfidenceBand;
}

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

// Phase scale ticks at score boundaries
const PHASE_BOUNDARIES = [0, 15, 30, 45, 60, 75, 88, 100];

const GAUGE_START = 225;
const GAUGE_SPAN  = 270;
const R  = 100;
const CX = 120;
const CY = 120;

function toRad(deg: number) {
  return ((deg - 90) * Math.PI) / 180;
}

function arcPoint(deg: number) {
  return {
    x: CX + R * Math.cos(toRad(deg)),
    y: CY + R * Math.sin(toRad(deg)),
  };
}

function confidenceColor(level: ConfidenceBand['level']): string {
  if (level === 'High')     return '#00d4c8';
  if (level === 'Moderate') return '#c4885a';
  return '#d06050';
}

export function HeroGauge({ composite, phase, phaseColor, confidence }: Props) {
  const bgStart = arcPoint(GAUGE_START);
  const bgEnd   = arcPoint(GAUGE_START + GAUGE_SPAN);
  const bgPath  = `M ${bgStart.x} ${bgStart.y} A ${R} ${R} 0 1 1 ${bgEnd.x} ${bgEnd.y}`;

  const fillEnd   = GAUGE_START + GAUGE_SPAN * (composite / 100);
  const fillEndPt = arcPoint(fillEnd);
  const largeArc  = (fillEnd - GAUGE_START) > 180 ? 1 : 0;
  const fillPath  = composite > 0
    ? `M ${bgStart.x} ${bgStart.y} A ${R} ${R} 0 ${largeArc} 1 ${fillEndPt.x} ${fillEndPt.y}`
    : '';

  // Phase boundary ticks
  const ticks = PHASE_BOUNDARIES.map(score => {
    const tickDeg = GAUGE_START + GAUGE_SPAN * (score / 100);
    const inner = { x: CX + 92 * Math.cos(toRad(tickDeg)), y: CY + 92 * Math.sin(toRad(tickDeg)) };
    const outer = { x: CX + 112 * Math.cos(toRad(tickDeg)), y: CY + 112 * Math.sin(toRad(tickDeg)) };
    return { inner, outer };
  });

  const confColor = confidenceColor(confidence.level);

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      gap:            12,
      padding:        '24px 0',
    }}>
      <svg width={240} height={240} viewBox="0 0 240 240">
        {/* Background arc */}
        <path d={bgPath} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" strokeLinecap="round" />

        {/* Phase boundary ticks */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.inner.x} y1={t.inner.y}
            x2={t.outer.x} y2={t.outer.y}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1.5"
          />
        ))}

        {/* Filled arc */}
        {fillPath && (
          <path d={fillPath} fill="none" stroke={phaseColor} strokeWidth="10" strokeLinecap="round" />
        )}

        {/* Score */}
        <text
          x={CX} y={CY - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={phaseColor}
          fontSize="52"
          fontWeight="bold"
          fontFamily={FONT}
        >
          {composite}
        </text>

        {/* Phase label inside SVG */}
        <text
          x={CX} y={CY + 30}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(200,220,218,0.55)"
          fontSize="11"
          fontFamily={FONT}
          letterSpacing="0.1"
        >
          {phase.toUpperCase()}
        </text>
      </svg>

      {/* Confidence badge below gauge */}
      <div style={{
        display:     'flex',
        alignItems:  'center',
        gap:         8,
        fontFamily:  FONT,
        fontSize:    10,
        letterSpacing: '0.12em',
        color:       'rgba(200,220,218,0.45)',
      }}>
        <span style={{ color: confColor, fontWeight: 600 }}>
          {confidence.level.toUpperCase()}
        </span>
        <span>CONFIDENCE</span>
        <span style={{ color: 'rgba(200,220,218,0.25)' }}>·</span>
        <span>{confidence.agreementCount} OF 5 SIGNALS {confidence.dominantDirection.toUpperCase()}</span>
      </div>
    </div>
  );
}
