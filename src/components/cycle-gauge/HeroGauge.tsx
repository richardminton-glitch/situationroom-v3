'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/components/layout/ThemeProvider';
// ── Types ─────────────────────────────────────────────────────────────────────
interface SpiralSegment { x1: number; y1: number; x2: number; y2: number; color: string; date: string; }
interface SpiralGaugeData {
  segments: SpiralSegment[];
  tipX: number; tipY: number; tipColor: string;
  currentPrice: number; currentDate: string;
}

// ── Constants (must match the API route) ─────────────────────────────────────
const SIZE         = 340;
const SPIRAL_CX    = 170;
const SPIRAL_CY    = 170;
const SPIRAL_MAX_R = 135;
const SPIRAL_SW    = 9;
const R_CENTER     = 54;   // centre disc radius (holds score text)

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

// ── Props (same interface as the previous ring gauge) ─────────────────────────
interface Props {
  composite:  number;         // 0–100 cycle score
  phase:      string;
  phaseColor: string;
  confidence: { level: string; agreementCount: number; dominantDirection: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtPrice(n: number) {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function confidenceLabel(level: string, count: number): string {
  return `${level.toUpperCase()} CONFIDENCE · ${count} OF 5 SIGNALS`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function HeroGauge({ composite, phase, phaseColor, confidence }: Props) {
  const { theme } = useTheme();
  const isDark    = theme === 'dark';

  const [spiral, setSpiral] = useState<SpiralGaugeData | null>(null);

  useEffect(() => {
    fetch('/api/data/spiral-gauge')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setSpiral(d))
      .catch(() => {});
  }, []);

  // Theme-derived colours
  const bgCenter    = isDark ? '#090d12'         : '#f8f1e3';
  const textMuted   = isDark ? 'rgba(200,220,218,0.4)' : 'rgba(80,55,10,0.5)';
  const ringFaint   = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
  const scoreOpacity = isDark ? 1 : 0.9;

  // Parchment: tone down saturation slightly
  const segOpacity = isDark ? 1 : 0.82;

  // Confidence label
  const confText = confidenceLabel(confidence.level, confidence.agreementCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>

      {/* ── SVG spiral ─────────────────────────────────────────────── */}
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          {isDark && (
            <>
              {/* Glow filter for tip dot */}
              <filter id="sg-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Subtle centre glow for score text */}
              <filter id="sg-text-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </>
          )}
        </defs>

        {/* Faint reference ring at spiral outer edge */}
        <circle
          cx={SPIRAL_CX} cy={SPIRAL_CY}
          r={SPIRAL_MAX_R + SPIRAL_SW / 2 + 4}
          fill="none"
          stroke={ringFaint}
          strokeWidth={1}
        />

        {/* ── Spiral segments ───────────────────────────────────────── */}
        {spiral?.segments.map((seg, i) => (
          <line
            key={i}
            x1={seg.x1} y1={seg.y1}
            x2={seg.x2} y2={seg.y2}
            stroke={seg.color}
            strokeWidth={SPIRAL_SW}
            strokeLinecap="round"
            opacity={segOpacity}
          />
        ))}

        {/* ── Centre background disc ────────────────────────────────── */}
        <circle
          cx={SPIRAL_CX} cy={SPIRAL_CY}
          r={R_CENTER}
          fill={bgCenter}
        />

        {/* ── Score (composite) ─────────────────────────────────────── */}
        <text
          x={SPIRAL_CX}
          y={SPIRAL_CY - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={phaseColor}
          fontSize={spiral ? 44 : 32}
          fontWeight={700}
          fontFamily={FONT_MONO}
          opacity={scoreOpacity}
          filter={isDark ? 'url(#sg-text-glow)' : undefined}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {composite}
        </text>

        {/* ── Phase label ───────────────────────────────────────────── */}
        <text
          x={SPIRAL_CX}
          y={SPIRAL_CY + 22}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={textMuted}
          fontSize={8}
          fontFamily={FONT_MONO}
          letterSpacing={1.6}
        >
          {phase.toUpperCase()}
        </text>

        {/* ── Tip dot (current position) ────────────────────────────── */}
        {spiral && (
          <>
            {/* Glow halo (dark only) */}
            {isDark && (
              <circle
                cx={spiral.tipX} cy={spiral.tipY}
                r={14}
                fill={spiral.tipColor}
                opacity={0.22}
                filter="url(#sg-glow)"
              />
            )}
            {/* Outer ring */}
            <circle
              cx={spiral.tipX} cy={spiral.tipY}
              r={8}
              fill={spiral.tipColor}
              stroke={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.85)'}
              strokeWidth={2}
            />
            {/* Inner dot */}
            <circle
              cx={spiral.tipX} cy={spiral.tipY}
              r={3}
              fill={isDark ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,1)'}
            />
          </>
        )}

        {/* Loading shimmer in centre when spiral data not yet fetched */}
        {!spiral && (
          <text
            x={SPIRAL_CX}
            y={SPIRAL_CY + 50}
            textAnchor="middle"
            fill={textMuted}
            fontSize={8}
            fontFamily={FONT_MONO}
            letterSpacing={1.2}
          >
            LOADING SPIRAL...
          </text>
        )}
      </svg>

      {/* ── Legend row ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: FONT_MONO, fontSize: 9,
        letterSpacing: '0.09em',
        color: textMuted,
      }}>
        {/* Colour legend bar */}
        <div style={{
          width: 72, height: 4, borderRadius: 2,
          background: 'linear-gradient(to right, hsl(155,72%,35%), hsl(48,85%,48%), hsl(18,90%,50%), hsl(0,90%,38%))',
          flexShrink: 0,
        }} />
        <span>200W MA HEATMAP</span>
        {spiral && (
          <span style={{ opacity: 0.7 }}>· CURRENT {fmtPrice(spiral.currentPrice)}</span>
        )}
      </div>

      {/* ── Confidence line ────────────────────────────────────────────── */}
      <div style={{
        fontFamily:    FONT_MONO,
        fontSize:      9,
        letterSpacing: '0.1em',
        color:         textMuted,
        textAlign:     'center',
      }}>
        <span style={{ color: phaseColor, fontWeight: 600 }}>
          {confidence.level.toUpperCase()}
        </span>
        {' '}CONFIDENCE · {confidence.agreementCount} OF 5 SIGNALS{' '}
        <span style={{ color: phaseColor }}>
          {confidence.dominantDirection.toUpperCase()}
        </span>
      </div>

    </div>
  );
}
