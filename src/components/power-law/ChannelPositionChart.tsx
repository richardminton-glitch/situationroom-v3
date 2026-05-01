'use client';

/**
 * ChannelPositionChart — companion to PowerLawChart. Plots BTC's position
 * within the power-law channel (0% = on support, 100% = on resistance)
 * over linear calendar time. The cycle structure jumps out:
 * accumulation troughs sit near 0; cycle peaks near 1; the median
 * (50%) divides the regimes.
 *
 * Position[t] = (log10(price_t) − median_t − cMin) / (cMax − cMin)
 *             = (residual_t − cMin) / (cMax − cMin)
 *
 * Linear time, linear position — the channel is "flattened".
 */

import { useMemo, useState } from 'react';

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface BtcPoint { date: string; price: number }

interface Model {
  alpha:        number;
  beta:         number;
  cMin:         number;
  cMax:         number;
  genesisDate:  string;
}

export interface ChannelPositionChartProps {
  btc:   BtcPoint[];
  model: Model;
}

const PAD_L = 56;
const PAD_R = 16;
const PAD_T = 18;
const PAD_B = 28;
const W = 880;
const H = 260;

const ONE_DAY_MS = 86_400_000;

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + 'T00:00:00Z').getTime();
  const b = new Date(toIso   + 'T00:00:00Z').getTime();
  return Math.round((b - a) / ONE_DAY_MS);
}

export function ChannelPositionChart({ btc, model }: ChannelPositionChartProps) {
  const [hoverX, setHoverX] = useState<number | null>(null);

  const series = useMemo(() => {
    const span = model.cMax - model.cMin;
    if (span === 0) return [] as { date: string; t: number; pos: number; price: number }[];
    return btc.map((p) => {
      if (p.price <= 0) return null;
      const d = Math.max(1, daysBetween(model.genesisDate, p.date));
      const yPred = model.alpha + model.beta * Math.log10(d);
      const residual = Math.log10(p.price) - yPred;
      const pos = Math.max(0, Math.min(1, (residual - model.cMin) / span));
      return {
        date: p.date,
        t:    new Date(p.date + 'T00:00:00Z').getTime(),
        pos,
        price: p.price,
      };
    }).filter((x): x is { date: string; t: number; pos: number; price: number } => x !== null);
  }, [btc, model]);

  if (series.length < 2) {
    return <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 11 }}>No data</div>;
  }

  const tMin = series[0].t;
  const tMax = series[series.length - 1].t;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  function xOfT(t: number): number {
    return PAD_L + ((t - tMin) / (tMax - tMin)) * plotW;
  }
  function yOfPos(pos: number): number {
    return PAD_T + (1 - pos) * plotH;
  }

  const linePath = useMemo(() =>
    series.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOfT(p.t).toFixed(1)} ${yOfPos(p.pos).toFixed(1)}`).join(' '),
    [series, tMin, tMax]
  );

  // Year tick stride
  const yearStart = new Date(series[0].date + 'T00:00:00Z').getUTCFullYear();
  const yearEnd   = new Date(series[series.length - 1].date + 'T00:00:00Z').getUTCFullYear();
  const stride    = (yearEnd - yearStart) > 14 ? 2 : 1;
  const xTicks: { t: number; year: number }[] = [];
  for (let y = yearStart; y <= yearEnd; y += stride) {
    const t = new Date(`${y}-01-01T00:00:00Z`).getTime();
    if (t >= tMin && t <= tMax) xTicks.push({ t, year: y });
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  // Bands: 0-33 cheap (green), 33-66 fair, 66-100 expensive (red)
  const bandCheap = {
    yTop: yOfPos(0.33),
    yBot: yOfPos(0),
  };
  const bandExpensive = {
    yTop: yOfPos(1.0),
    yBot: yOfPos(0.66),
  };

  // Hover
  const hoverInfo = useMemo(() => {
    if (hoverX === null || hoverX < PAD_L || hoverX > W - PAD_R) return null;
    const t = tMin + ((hoverX - PAD_L) / plotW) * (tMax - tMin);
    const point = series.reduce((best, p) => Math.abs(p.t - t) < Math.abs(best.t - t) ? p : best, series[0]);
    return point;
  }, [hoverX, series, tMin, tMax, plotW]);

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
          CHANNEL POSITION OVER TIME &nbsp;·&nbsp; 0% SUPPORT &nbsp;·&nbsp; 100% RESISTANCE
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

        {/* Cheap band */}
        <rect
          x={PAD_L} y={bandCheap.yTop}
          width={plotW} height={bandCheap.yBot - bandCheap.yTop}
          fill="#4aa57a" fillOpacity={0.10}
        />
        {/* Expensive band */}
        <rect
          x={PAD_L} y={bandExpensive.yTop}
          width={plotW} height={bandExpensive.yBot - bandExpensive.yTop}
          fill="#c04848" fillOpacity={0.10}
        />

        {/* Y-grid */}
        {yTicks.map((v) => {
          const y = yOfPos(v);
          const isMid = Math.abs(v - 0.5) < 1e-6;
          return (
            <g key={`gy-${v}`}>
              <line
                x1={PAD_L} x2={W - PAD_R} y1={y} y2={y}
                stroke={isMid ? 'var(--text-muted)' : 'var(--border-subtle)'}
                strokeWidth={isMid ? 0.9 : 0.5}
                strokeDasharray={isMid ? '4 3' : '2 4'}
                opacity={isMid ? 0.7 : 0.6}
              />
              <text
                x={PAD_L - 6} y={y + 3}
                fontSize={9} fill="var(--text-muted)" textAnchor="end"
              >
                {Math.round(v * 100)}%
              </text>
            </g>
          );
        })}

        {/* X-grid */}
        {xTicks.map((t) => {
          const x = xOfT(t.t);
          return (
            <g key={`gx-${t.year}`}>
              <line
                x1={x} x2={x} y1={PAD_T} y2={H - PAD_B}
                stroke="var(--border-subtle)" strokeWidth={0.5}
                strokeDasharray="2 4" opacity={0.4}
              />
              <text
                x={x} y={H - PAD_B + 14}
                fontSize={9} fill="var(--text-muted)" textAnchor="middle"
              >
                {t.year}
              </text>
            </g>
          );
        })}

        {/* Position line */}
        <path d={linePath} fill="none" stroke="#d68a3c" strokeWidth={1.4} />

        {/* Hover guide */}
        {hoverInfo && hoverX !== null && (
          <>
            <line
              x1={hoverX} x2={hoverX}
              y1={PAD_T} y2={H - PAD_B}
              stroke="var(--text-muted)" strokeWidth={0.75} opacity={0.5}
            />
            <circle
              cx={xOfT(hoverInfo.t)} cy={yOfPos(hoverInfo.pos)}
              r={3} fill="#d68a3c"
            />
          </>
        )}

        {/* Axis label */}
        <text
          x={PAD_L} y={PAD_T - 6}
          fontSize={8} fill="var(--text-muted)"
          textAnchor="start" letterSpacing="0.14em"
        >
          CHANNEL %
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
            {' '}&nbsp; CHANNEL{' '}
            <span style={{ color: '#d68a3c', fontWeight: 600 }}>
              {(hoverInfo.pos * 100).toFixed(1)}%
            </span>
            {' '}&nbsp; BTC{' '}
            <span style={{ color: 'var(--text-primary)' }}>
              ${Math.round(hoverInfo.price).toLocaleString()}
            </span>
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>
            Hover for values · the 50% line is the median (fair-value) trajectory
          </span>
        )}
      </div>
    </div>
  );
}
