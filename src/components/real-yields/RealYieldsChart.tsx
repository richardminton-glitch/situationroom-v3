'use client';

/**
 * RealYieldsChart — dual-axis SVG line chart pairing BTC/USD (right axis,
 * log scale) with the 10-year real yield (DFII10, left axis, linear,
 * percentage points). The zero line is drawn explicitly and the area
 * below zero is shaded — this is the visual that makes the "Jordi claim"
 * legible: BTC's bull cycles overlap the green band.
 *
 * Range toggle re-clips the visible window. Hover renders a vertical
 * guide and a floating readout below the chart.
 */

import { useMemo, useState } from 'react';

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface BtcPoint   { date: string; price: number }
interface YieldPoint { date: string; value: number }

export interface RealYieldsChartProps {
  btc:       BtcPoint[];
  realYield: YieldPoint[];
}

type RangeKey = '5Y' | '10Y' | 'ALL';

const RANGE_DAYS: Record<RangeKey, number | null> = {
  '5Y':  1825,
  '10Y': 3650,
  'ALL': null,
};

const PAD_L = 56;
const PAD_R = 60;
const PAD_T = 18;
const PAD_B = 28;
const W = 880;
const H = 380;

const DAY_MS = 86_400_000;

function formatDateAxis(date: string): string {
  const d = new Date(date + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

function formatPrice(p: number): string {
  if (p >= 1000) return '$' + Math.round(p / 1000) + 'k';
  return '$' + Math.round(p);
}

export function RealYieldsChart({ btc, realYield }: RealYieldsChartProps) {
  const [range, setRange] = useState<RangeKey>('ALL');
  const [hoverX, setHoverX] = useState<number | null>(null);

  const lastBtcDate = btc.at(-1)?.date ?? '';
  const xMaxMs = lastBtcDate ? new Date(lastBtcDate + 'T00:00:00Z').getTime() : Date.now();

  const days = RANGE_DAYS[range];
  const xMinMs = days === null
    ? (btc[0] ? new Date(btc[0].date + 'T00:00:00Z').getTime() : xMaxMs)
    : xMaxMs - days * DAY_MS;

  const visBtc = useMemo(
    () => btc.filter((p) => {
      const t = new Date(p.date + 'T00:00:00Z').getTime();
      return t >= xMinMs && t <= xMaxMs;
    }),
    [btc, xMinMs, xMaxMs]
  );
  const visYld = useMemo(
    () => realYield.filter((p) => {
      const t = new Date(p.date + 'T00:00:00Z').getTime();
      return t >= xMinMs && t <= xMaxMs;
    }),
    [realYield, xMinMs, xMaxMs]
  );

  // Y domains
  const btcMin = visBtc.length ? Math.min(...visBtc.map((p) => p.price)) : 1;
  const btcMax = visBtc.length ? Math.max(...visBtc.map((p) => p.price)) : 100;
  const btcLogMin = Math.log10(Math.max(btcMin * 0.85, 1));
  const btcLogMax = Math.log10(btcMax * 1.05);

  const yldMin = visYld.length ? Math.min(...visYld.map((p) => p.value)) : -2;
  const yldMax = visYld.length ? Math.max(...visYld.map((p) => p.value)) : 4;
  // Always include zero in the visible range so the shading reads
  const yMin = Math.min(yldMin, 0) - 0.3;
  const yMax = Math.max(yldMax, 0) + 0.3;

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  function xOf(t: number): number {
    return PAD_L + ((t - xMinMs) / (xMaxMs - xMinMs)) * plotW;
  }
  function yBtc(price: number): number {
    const v = (Math.log10(price) - btcLogMin) / (btcLogMax - btcLogMin);
    return PAD_T + (1 - v) * plotH;
  }
  function yYld(value: number): number {
    const v = (value - yMin) / (yMax - yMin);
    return PAD_T + (1 - v) * plotH;
  }

  function buildPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }

  // Build the BTC path (line) and the real-yield path
  const btcPath = useMemo(() => buildPath(
    visBtc.map((p) => ({
      x: xOf(new Date(p.date + 'T00:00:00Z').getTime()),
      y: yBtc(p.price),
    }))
  ), [visBtc, xMinMs, xMaxMs, btcLogMin, btcLogMax]);

  const yldPath = useMemo(() => buildPath(
    visYld.map((p) => ({
      x: xOf(new Date(p.date + 'T00:00:00Z').getTime()),
      y: yYld(p.value),
    }))
  ), [visYld, xMinMs, xMaxMs, yMin, yMax]);

  // Build shaded inversion regions — contiguous segments where yield < 0,
  // closed back to the zero line. Same idea as YieldSpreadPanel.
  const zeroY = yYld(0);
  const negativeAreas = useMemo<string[]>(() => {
    if (visYld.length < 2) return [];
    const pts = visYld.map((p) => ({
      x: xOf(new Date(p.date + 'T00:00:00Z').getTime()),
      y: yYld(p.value),
      neg: p.value < 0,
    }));
    const out: string[] = [];
    let segStart: number | null = null;
    for (let i = 0; i < pts.length; i++) {
      const inSeg = pts[i].neg;
      if (inSeg && segStart === null) segStart = i;
      const ending = segStart !== null && (!inSeg || i === pts.length - 1);
      if (ending) {
        const end = inSeg ? i : i - 1;
        const seg = pts.slice(segStart!, end + 1);
        if (seg.length >= 2) {
          const path = `M${seg[0].x.toFixed(1)} ${zeroY.toFixed(1)} ` +
            seg.map((p) => `L${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
            ` L${seg[seg.length - 1].x.toFixed(1)} ${zeroY.toFixed(1)} Z`;
          out.push(path);
        }
        segStart = null;
      }
    }
    return out;
  }, [visYld, xMinMs, xMaxMs, yMin, yMax]);

  // Y-axis ticks
  const btcTicks = useMemo(() => {
    const ticks: number[] = [];
    const startExp = Math.ceil(btcLogMin);
    const endExp = Math.floor(btcLogMax);
    for (let e = startExp; e <= endExp; e++) {
      ticks.push(Math.pow(10, e));
      if (e < endExp) ticks.push(3 * Math.pow(10, e));
    }
    return ticks.filter((t) => t >= Math.pow(10, btcLogMin) * 0.95 && t <= Math.pow(10, btcLogMax) * 1.05);
  }, [btcLogMin, btcLogMax]);

  const yldTicks = useMemo(() => {
    const span = yMax - yMin;
    const step = span > 6 ? 2 : span > 3 ? 1 : 0.5;
    const start = Math.ceil(yMin / step) * step;
    const end   = Math.floor(yMax / step) * step;
    const t: number[] = [];
    for (let v = start; v <= end + 1e-9; v += step) t.push(Math.round(v * 100) / 100);
    return t;
  }, [yMin, yMax]);

  const xTicks = useMemo(() => {
    const span = xMaxMs - xMinMs;
    const N = 6;
    const out: number[] = [];
    for (let i = 0; i <= N; i++) out.push(xMinMs + (span * i) / N);
    return out;
  }, [xMinMs, xMaxMs]);

  // Hover values
  const hoverInfo = useMemo(() => {
    if (hoverX === null) return null;
    if (hoverX < PAD_L || hoverX > W - PAD_R) return null;
    const t = xMinMs + ((hoverX - PAD_L) / plotW) * (xMaxMs - xMinMs);
    const date = new Date(t).toISOString().slice(0, 10);
    const btcPoint = visBtc.length
      ? visBtc.reduce((best, p) => {
          const pT = new Date(p.date + 'T00:00:00Z').getTime();
          const bT = new Date(best.date + 'T00:00:00Z').getTime();
          return Math.abs(pT - t) < Math.abs(bT - t) ? p : best;
        }, visBtc[0])
      : null;
    const yldPoint = visYld.length
      ? visYld.reduce((best, p) => {
          const pT = new Date(p.date + 'T00:00:00Z').getTime();
          const bT = new Date(best.date + 'T00:00:00Z').getTime();
          return Math.abs(pT - t) < Math.abs(bT - t) ? p : best;
        }, visYld[0])
      : null;
    return { t, date, btcPoint, yldPoint };
  }, [hoverX, xMinMs, xMaxMs, plotW, visBtc, visYld]);

  return (
    <div style={{ width: '100%', userSelect: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 6,
      }}>
        <div style={{
          fontSize: 9, letterSpacing: '0.16em', color: 'var(--text-muted)',
          fontFamily: FONT_MONO,
        }}>
          BTC (LOG, RIGHT) &nbsp;·&nbsp; 10Y REAL YIELD (LEFT, %) &nbsp;·&nbsp; SHADED = NEGATIVE
        </div>
        <RangeToggle value={range} onChange={setRange} />
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
        {/* Plot area frame */}
        <rect
          x={PAD_L} y={PAD_T} width={plotW} height={plotH}
          fill="none" stroke="var(--border-subtle)" strokeWidth={1}
        />

        {/* Negative-yield shading — drawn first so everything else sits on top */}
        {negativeAreas.map((d, i) => (
          <path key={`neg-${i}`} d={d} fill="#4aa57a" fillOpacity={0.16} />
        ))}

        {/* Y-grid (left axis yield ticks) */}
        {yldTicks.map((v) => {
          const y = yYld(v);
          const isZero = Math.abs(v) < 1e-6;
          return (
            <g key={`gy-${v}`}>
              <line
                x1={PAD_L} x2={W - PAD_R} y1={y} y2={y}
                stroke={isZero ? 'var(--text-muted)' : 'var(--border-subtle)'}
                strokeWidth={isZero ? 0.9 : 0.5}
                strokeDasharray={isZero ? '4 3' : '2 4'}
                opacity={isZero ? 0.7 : 0.6}
              />
              <text
                x={PAD_L - 6} y={y + 3}
                fontSize={9} fill="var(--text-muted)" textAnchor="end"
              >
                {v.toFixed(v % 1 === 0 ? 0 : 1)}%
              </text>
            </g>
          );
        })}

        {/* Right axis BTC ticks */}
        {btcTicks.map((p) => {
          const y = yBtc(p);
          return (
            <text
              key={`by-${p}`}
              x={W - PAD_R + 6} y={y + 3}
              fontSize={9} fill="var(--text-muted)" textAnchor="start"
            >
              {formatPrice(p)}
            </text>
          );
        })}

        {/* X-axis ticks */}
        {xTicks.map((t, i) => {
          const x = xOf(t);
          const date = new Date(t).toISOString().slice(0, 10);
          return (
            <g key={`gx-${i}`}>
              <line
                x1={x} x2={x} y1={PAD_T} y2={H - PAD_B}
                stroke="var(--border-subtle)" strokeWidth={0.5} strokeDasharray="2 4" opacity={0.4}
              />
              <text
                x={x} y={H - PAD_B + 14}
                fontSize={9} fill="var(--text-muted)" textAnchor="middle"
              >
                {formatDateAxis(date)}
              </text>
            </g>
          );
        })}

        {/* Real-yield line — drawn before BTC so BTC sits on top visually */}
        <path d={yldPath} fill="none" stroke="#4aa57a" strokeWidth={1.5} opacity={0.95} strokeLinejoin="round" />

        {/* BTC line */}
        <path d={btcPath} fill="none" stroke="var(--text-primary)" strokeWidth={1.25} />

        {/* Hover guide */}
        {hoverInfo && hoverX !== null && (
          <line
            x1={hoverX} x2={hoverX}
            y1={PAD_T} y2={H - PAD_B}
            stroke="var(--text-muted)" strokeWidth={0.75} opacity={0.5}
          />
        )}

        {/* Axis labels */}
        <text
          x={PAD_L - 4} y={PAD_T - 6}
          fontSize={8} fill="var(--text-muted)"
          textAnchor="start" letterSpacing="0.14em"
        >
          REAL YIELD
        </text>
        <text
          x={W - PAD_R + 4} y={PAD_T - 6}
          fontSize={8} fill="var(--text-muted)"
          textAnchor="start" letterSpacing="0.14em"
        >
          BTC (LOG)
        </text>
      </svg>

      {/* Hover readout */}
      <div style={{
        minHeight: 22, marginTop: 6,
        fontSize: 10, color: 'var(--text-secondary)',
        fontFamily: FONT_MONO, letterSpacing: '0.04em',
      }}>
        {hoverInfo ? (
          <span>
            {hoverInfo.date}
            {hoverInfo.btcPoint && (
              <>
                {' '}&nbsp; BTC{' '}
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  ${Math.round(hoverInfo.btcPoint.price).toLocaleString()}
                </span>
              </>
            )}
            {hoverInfo.yldPoint && (
              <>
                {' '}&nbsp; REAL YIELD{' '}
                <span style={{ color: hoverInfo.yldPoint.value < 0 ? '#4aa57a' : '#c04848' }}>
                  {hoverInfo.yldPoint.value >= 0 ? '+' : ''}{hoverInfo.yldPoint.value.toFixed(2)}%
                </span>
              </>
            )}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>
            Hover for values · zero line marks the regime boundary
          </span>
        )}
      </div>
    </div>
  );
}

function RangeToggle({
  value, onChange,
}: {
  value: RangeKey;
  onChange: (k: RangeKey) => void;
}) {
  const opts: RangeKey[] = ['5Y', '10Y', 'ALL'];
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {opts.map((k) => {
        const active = k === value;
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            style={{
              padding: '3px 8px',
              fontSize: 9,
              fontFamily: FONT_MONO,
              letterSpacing: '0.08em',
              background: active ? 'var(--accent-primary)' : 'transparent',
              color: active ? 'var(--bg-primary)' : 'var(--text-muted)',
              border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
            }}
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}
