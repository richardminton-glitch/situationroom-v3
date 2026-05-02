'use client';

/**
 * CashIsaChart — six overlaid lines showing what £X of annual Cash ISA
 * subscriptions becomes under different growth regimes since 1999/00.
 *
 * Y axis: £ pot value. X axis: tax-year start. All lines originate at
 * (firstYear, 0) so the divergence is visible from the first contribution.
 *
 * Linear scale on both axes — the visual story is the *gap* between the
 * Cash ISA line and the inflation lines (and the vertical chasm beneath
 * the S&P 500 line, which is the point).
 */

import { useMemo, useState } from 'react';
import type { CashIsaSeriesPoint } from '@/lib/data/uk-cash-isa';

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

const PAD_L = 64;
const PAD_R = 16;
const PAD_T = 18;
const PAD_B = 36;
const W = 880;
const H = 360;

type SeriesKey = 'contributed' | 'isaPot' | 'cpiNeeded' | 'rpiNeeded' | 'm4Needed' | 'spxValue';

interface SeriesDef {
  key:    SeriesKey;
  label:  string;
  colour: string;
  hint:   string;
  width:  number;
  dash?:  string;
}

const SERIES: SeriesDef[] = [
  { key: 'contributed', label: 'Nominal contributions', colour: '#7a8290', hint: 'what you put in',                   width: 1.0, dash: '4 3' },
  { key: 'isaPot',      label: 'Cash ISA pot',          colour: '#4aa57a', hint: 'compounded at typical Cash ISA rate', width: 1.7 },
  { key: 'cpiNeeded',   label: 'CPI-protected',         colour: '#d68a3c', hint: 'what you need to hold purchasing power', width: 1.4 },
  { key: 'rpiNeeded',   label: 'RPI-protected',         colour: '#c97a3c', hint: 'RPI is a stickier inflation gauge',  width: 1.4 },
  { key: 'm4Needed',    label: 'M4 broad money',        colour: '#a466d6', hint: 'share of total UK money supply',     width: 1.4 },
  { key: 'spxValue',    label: 'S&P 500 (GBP TR)',      colour: '#5da9d6', hint: 'invested in US equities instead',    width: 1.7 },
];

function fmtCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) return '£' + (n / 1_000_000).toFixed(2) + 'M';
  if (Math.abs(n) >= 1_000)     return '£' + Math.round(n).toLocaleString();
  return '£' + n.toFixed(0);
}

function fmtAxis(n: number): string {
  if (n >= 1_000_000) return '£' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return '£' + Math.round(n / 1_000) + 'k';
  return '£' + n.toFixed(0);
}

export interface CashIsaChartProps {
  series: CashIsaSeriesPoint[];
}

export function CashIsaChart({ series }: CashIsaChartProps) {
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set());

  const xMin = series[0].startYear;
  const xMax = series[series.length - 1].startYear;

  const yMax = useMemo(() => {
    let max = 0;
    for (const p of series) {
      for (const s of SERIES) {
        if (hidden.has(s.key)) continue;
        const v = p[s.key];
        if (v > max) max = v;
      }
    }
    // Round to a tidy ceiling.
    const mag = Math.pow(10, Math.floor(Math.log10(max)));
    const step = mag / 2;
    return Math.ceil(max / step) * step;
  }, [series, hidden]);

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const xOf = (year: number) => PAD_L + ((year - xMin) / (xMax - xMin)) * plotW;
  const yOf = (val:  number) => PAD_T + (1 - val / yMax) * plotH;

  // Y-tick stride that yields ~5 ticks.
  const yTickStep = (() => {
    const target = yMax / 5;
    const mag = Math.pow(10, Math.floor(Math.log10(target)));
    const norm = target / mag;
    const niceNorm = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
    return niceNorm * mag;
  })();
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax + 1e-6; v += yTickStep) yTicks.push(v);

  // X ticks every 5 years from earliest divisible-by-5 start.
  const xTicks: number[] = [];
  const xStart = Math.ceil(xMin / 5) * 5;
  for (let y = xStart; y <= xMax; y += 5) xTicks.push(y);
  if (xTicks[0] !== xMin) xTicks.unshift(xMin);
  if (xTicks[xTicks.length - 1] !== xMax) xTicks.push(xMax);

  const paths = useMemo(() => {
    return SERIES.map((s) => {
      if (hidden.has(s.key)) return { ...s, d: '' };
      const d = series
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p.startYear).toFixed(1)} ${yOf(p[s.key]).toFixed(1)}`)
        .join(' ');
      return { ...s, d };
    });
  }, [series, hidden, yMax]);

  const hoverPoint = useMemo(() => {
    if (hoverX === null || hoverX < PAD_L || hoverX > W - PAD_R) return null;
    const yearFloat = xMin + ((hoverX - PAD_L) / plotW) * (xMax - xMin);
    return series.reduce(
      (best, p) => Math.abs(p.startYear - yearFloat) < Math.abs(best.startYear - yearFloat) ? p : best,
      series[0],
    );
  }, [hoverX, series, xMin, xMax, plotW]);

  const toggle = (key: SeriesKey) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  return (
    <div style={{ width: '100%', userSelect: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 6, flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{
          fontSize: 9, letterSpacing: '0.16em', color: 'var(--text-muted)',
          fontFamily: FONT_MONO,
        }}>
          POT VALUE BY TAX YEAR &nbsp;·&nbsp; MAX SUBSCRIPTION COMPOUNDED AT EACH RATE
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height={H}
        style={{ display: 'block', fontFamily: FONT_MONO }}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const xRatio = (e.clientX - rect.left) / rect.width;
          setHoverX(xRatio * W);
        }}
        onMouseLeave={() => setHoverX(null)}
      >
        {/* Plot frame */}
        <rect
          x={PAD_L} y={PAD_T} width={plotW} height={plotH}
          fill="none" stroke="var(--border-subtle)" strokeWidth={1}
        />

        {/* Y grid + labels */}
        {yTicks.map((v) => {
          const y = yOf(v);
          const isZero = v === 0;
          return (
            <g key={`gy-${v}`}>
              <line
                x1={PAD_L} x2={W - PAD_R} y1={y} y2={y}
                stroke={isZero ? 'var(--text-muted)' : 'var(--border-subtle)'}
                strokeWidth={isZero ? 0.9 : 0.5}
                strokeDasharray={isZero ? undefined : '2 4'}
                opacity={isZero ? 0.7 : 0.5}
              />
              <text
                x={PAD_L - 8} y={y + 3}
                fontSize={9} fill="var(--text-muted)" textAnchor="end"
              >
                {fmtAxis(v)}
              </text>
            </g>
          );
        })}

        {/* X grid + labels */}
        {xTicks.map((y) => {
          const x = xOf(y);
          return (
            <g key={`gx-${y}`}>
              <line
                x1={x} x2={x} y1={PAD_T} y2={H - PAD_B}
                stroke="var(--border-subtle)" strokeWidth={0.5}
                strokeDasharray="2 4" opacity={0.4}
              />
              <text
                x={x} y={H - PAD_B + 14}
                fontSize={9} fill="var(--text-muted)" textAnchor="middle"
              >
                {y}
              </text>
            </g>
          );
        })}

        {/* Series lines */}
        {paths.map((p) => p.d && (
          <path
            key={p.key}
            d={p.d}
            fill="none"
            stroke={p.colour}
            strokeWidth={p.width}
            strokeDasharray={p.dash}
            strokeLinejoin="round"
          />
        ))}

        {/* Hover guide */}
        {hoverPoint && hoverX !== null && (
          <>
            <line
              x1={xOf(hoverPoint.startYear)} x2={xOf(hoverPoint.startYear)}
              y1={PAD_T} y2={H - PAD_B}
              stroke="var(--text-muted)" strokeWidth={0.75} opacity={0.5}
            />
            {SERIES.filter((s) => !hidden.has(s.key)).map((s) => (
              <circle
                key={`h-${s.key}`}
                cx={xOf(hoverPoint.startYear)}
                cy={yOf(hoverPoint[s.key])}
                r={2.5}
                fill={s.colour}
              />
            ))}
          </>
        )}

        {/* Axis caption */}
        <text
          x={PAD_L} y={PAD_T - 6}
          fontSize={8} fill="var(--text-muted)"
          textAnchor="start" letterSpacing="0.14em"
        >
          POT (£)
        </text>
        <text
          x={W - PAD_R} y={H - 4}
          fontSize={8} fill="var(--text-muted)"
          textAnchor="end" letterSpacing="0.14em"
        >
          TAX YEAR (START)
        </text>
      </svg>

      {/* Legend (clickable to toggle) */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 14,
        marginTop: 10, fontSize: 10, fontFamily: FONT_MONO,
      }}>
        {SERIES.map((s) => {
          const off = hidden.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggle(s.key)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: 0, display: 'flex', alignItems: 'center', gap: 6,
                opacity: off ? 0.35 : 1, color: 'var(--text-secondary)',
              }}
              title={off ? 'Click to show' : 'Click to hide'}
            >
              <span style={{
                display: 'inline-block', width: 14, height: 2,
                background: s.colour,
                borderTop: s.dash ? `2px dashed ${s.colour}` : undefined,
                backgroundColor: s.dash ? 'transparent' : s.colour,
              }} />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Hover readout */}
      <div style={{
        minHeight: 22, marginTop: 10,
        fontSize: 10, color: 'var(--text-secondary)',
        fontFamily: FONT_MONO, letterSpacing: '0.04em',
        display: 'flex', flexWrap: 'wrap', gap: 14,
      }}>
        {hoverPoint ? (
          <>
            <span style={{ color: 'var(--text-primary)' }}>
              {hoverPoint.taxYear === 'start' ? 'pre-launch' : hoverPoint.taxYear}
            </span>
            {SERIES.filter((s) => !hidden.has(s.key)).map((s) => (
              <span key={`r-${s.key}`}>
                <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>{' '}
                <span style={{ color: s.colour, fontWeight: 600 }}>
                  {fmtCurrency(hoverPoint[s.key])}
                </span>
              </span>
            ))}
          </>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>
            Hover for values · click legend items to toggle lines
          </span>
        )}
      </div>
    </div>
  );
}
