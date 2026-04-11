'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/components/layout/ThemeProvider';

// ── Inline types (no import from route — avoids Turbopack bundling fs/path) ──
interface SpiralSegment { x1: number; y1: number; x2: number; y2: number; color: string; date: string; }
interface PriceTick     { r: number; label: string; }
interface HalvingMark   { x: number; y: number; year: number; }
interface SpiralGaugeData {
  segments:     SpiralSegment[];
  tipX: number; tipY: number; tipColor: string;
  currentPrice: number; currentDate: string;
  priceTicks:   PriceTick[];
  halvings:     HalvingMark[];
  rCenter:      number;
  rOuter:       number;
}

// ── SVG constants (must match route) ─────────────────────────────────────────
const SIZE      = 360;
const CX        = 180;
const CY        = 180;
const R_CENTER  = 42;
const SPIRAL_SW = 2.5;

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  composite:  number;
  phase:      string;
  phaseColor: string;
  confidence: { level: string; agreementCount: number; dominantDirection: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtPrice(n: number) {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
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

  // Theme colours
  const bgCenter   = isDark ? '#090d12'               : '#f8f1e3';
  const textMuted  = isDark ? 'rgba(200,220,218,0.4)' : 'rgba(80,55,10,0.5)';
  const ringFaint  = isDark ? 'rgba(255,255,255,0.05)': 'rgba(0,0,0,0.07)';
  const halvColor  = isDark ? 'rgba(255,200,100,0.65)': 'rgba(180,100,0,0.6)';

  // The SVG viewBox is centred at CX,CY. We offset every coordinate by
  // (CX - 170) = 10 to move the chart to the new centre.
  // Rather than recompute all coordinates, we apply a translate on a <g>.
  const offset = CX - 170;  // 10

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>

      {/* ── Title ─────────────────────────────────────────────────────── */}
      <div style={{
        fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.14em',
        color: textMuted, textTransform: 'uppercase',
      }}>
        Bitcoin 4-Year Cycle · Log-Polar Price Spiral
      </div>

      {/* ── SVG ───────────────────────────────────────────────────────── */}
      <svg
        width={SIZE} height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          {isDark && (
            <>
              <filter id="sg-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="sg-text-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </>
          )}
        </defs>

        {/* All chart elements translated so centre = CX,CY */}
        <g transform={`translate(${offset}, ${offset})`}>

          {/* ── Price-axis reference rings ───────────────────────────── */}
          {spiral?.priceTicks.map(tick => (
            <circle
              key={tick.r}
              cx={170} cy={170} r={tick.r}
              fill="none"
              stroke={ringFaint}
              strokeWidth={0.8}
              strokeDasharray="3 5"
            />
          ))}

          {/* ── Price labels (placed at ~45° above east = upper-right) ── */}
          {spiral?.priceTicks.map(tick => {
            // θ = -π/5 (36° above horizontal) so labels fan out diagonally
            const theta = -Math.PI / 5;
            const x = +(170 + tick.r * Math.cos(theta) + 3).toFixed(1);
            const y = +(170 + tick.r * Math.sin(theta) - 1).toFixed(1);
            return (
              <text
                key={`lbl-${tick.r}`}
                x={x} y={y}
                textAnchor="start"
                fontSize={6.5}
                fontFamily={FONT_MONO}
                fill={textMuted}
                opacity={0.7}
              >
                {tick.label}
              </text>
            );
          })}

          {/* ── Spiral segments ─────────────────────────────────────── */}
          {spiral?.segments.map((seg, i) => (
            <line
              key={i}
              x1={seg.x1} y1={seg.y1}
              x2={seg.x2} y2={seg.y2}
              stroke={seg.color}
              strokeWidth={SPIRAL_SW}
              strokeLinecap="round"
              opacity={isDark ? 1 : 0.85}
            />
          ))}

          {/* ── Halving markers ─────────────────────────────────────── */}
          {spiral?.halvings.map(h => (
            <g key={h.year}>
              <circle
                cx={h.x} cy={h.y} r={5}
                fill={halvColor}
                stroke={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.9)'}
                strokeWidth={1.5}
              />
              <text
                x={h.x + 7} y={h.y + 3}
                fontSize={7}
                fontFamily={FONT_MONO}
                fill={halvColor}
              >
                {h.year}
              </text>
            </g>
          ))}

          {/* ── Centre disc ─────────────────────────────────────────── */}
          <circle cx={170} cy={170} r={R_CENTER} fill={bgCenter} />

          {/* ── Composite score ─────────────────────────────────────── */}
          <text
            x={170} y={170 - 8}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={phaseColor}
            fontSize={38}
            fontWeight={700}
            fontFamily={FONT_MONO}
            filter={isDark ? 'url(#sg-text-glow)' : undefined}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {composite}
          </text>

          {/* ── Phase label ─────────────────────────────────────────── */}
          <text
            x={170} y={170 + 21}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={textMuted}
            fontSize={7.5}
            fontFamily={FONT_MONO}
            letterSpacing={1.4}
          >
            {phase.toUpperCase()}
          </text>

          {/* ── Current position dot ────────────────────────────────── */}
          {spiral && (
            <>
              {isDark && (
                <circle
                  cx={spiral.tipX} cy={spiral.tipY}
                  r={12} fill={spiral.tipColor} opacity={0.2}
                  filter="url(#sg-glow)"
                />
              )}
              <circle
                cx={spiral.tipX} cy={spiral.tipY} r={6}
                fill={spiral.tipColor}
                stroke={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.9)'}
                strokeWidth={1.5}
              />
              <circle
                cx={spiral.tipX} cy={spiral.tipY} r={2.5}
                fill={isDark ? 'rgba(255,255,255,0.9)' : '#fff'}
              />
            </>
          )}

          {/* Loading hint */}
          {!spiral && (
            <text
              x={170} y={170 + 58}
              textAnchor="middle"
              fill={textMuted}
              fontSize={7.5}
              fontFamily={FONT_MONO}
              letterSpacing={1.2}
            >
              LOADING SPIRAL...
            </text>
          )}

        </g>{/* end translate */}
      </svg>

      {/* ── Legend row ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.09em',
        color: textMuted,
      }}>
        <div style={{
          width: 72, height: 4, borderRadius: 2,
          background: 'linear-gradient(to right, hsl(155,72%,35%), hsl(48,85%,48%), hsl(18,90%,50%), hsl(0,90%,38%))',
          flexShrink: 0,
        }} />
        <span>200W MA HEATMAP</span>
        {spiral && (
          <span style={{ opacity: 0.7 }}>· {fmtPrice(spiral.currentPrice)}</span>
        )}
      </div>

      {/* ── Confidence line ─────────────────────────────────────────────── */}
      <div style={{
        fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.1em',
        color: textMuted, textAlign: 'center',
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
