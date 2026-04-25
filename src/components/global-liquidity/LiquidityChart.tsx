'use client';

/**
 * LiquidityChart — dual-axis SVG line chart pairing BTC/USD (right axis,
 * log scale) with the Global Liquidity composite (left axis, linear
 * indexed scale) shifted forward by `leadDays`.
 *
 * The composite is plotted at date+leadDays so its turning points line
 * up with where BTC supposedly follows. A range toggle (3Y / 5Y / ALL)
 * re-clips the visible window. Hover renders a vertical guide and a
 * floating readout.
 */

import { useMemo, useState } from 'react';

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface BtcPoint { date: string; price: number }
interface IdxPoint { date: string; value: number }

export interface LiquidityChartProps {
  btc:       BtcPoint[];
  composite: IdxPoint[];
  leadDays:  number;
}

type RangeKey = '2Y' | '3Y' | '5Y' | 'ALL';

const RANGE_DAYS: Record<RangeKey, number | null> = {
  '2Y': 730,
  '3Y': 1095,
  '5Y': 1825,
  'ALL': null,
};

const PAD_L = 56;
const PAD_R = 60;
const PAD_T = 18;
const PAD_B = 28;
const W = 880;
const H = 380;

const DAY_MS = 86_400_000;

function shiftDate(date: string, days: number): string {
  return new Date(new Date(date + 'T00:00:00Z').getTime() + days * DAY_MS)
    .toISOString().slice(0, 10);
}

function formatDateAxis(date: string): string {
  const d = new Date(date + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

function formatPrice(p: number): string {
  if (p >= 1000) return '$' + Math.round(p / 1000) + 'k';
  return '$' + Math.round(p);
}

export function LiquidityChart({ btc, composite, leadDays }: LiquidityChartProps) {
  const [range, setRange] = useState<RangeKey>('5Y');
  const [hoverX, setHoverX] = useState<number | null>(null);

  // Shift composite forward by leadDays
  const shiftedComposite = useMemo<IdxPoint[]>(() =>
    composite.map((p) => ({ date: shiftDate(p.date, leadDays), value: p.value })),
    [composite, leadDays]
  );

  // Determine x-domain. The latest x is max of (btc latest, shifted composite latest).
  const lastBtcDate     = btc.at(-1)?.date ?? '';
  const lastShiftedDate = shiftedComposite.at(-1)?.date ?? '';
  const xMaxDate        = lastShiftedDate > lastBtcDate ? lastShiftedDate : lastBtcDate;
  const xMaxMs          = xMaxDate ? new Date(xMaxDate + 'T00:00:00Z').getTime() : Date.now();

  const days = RANGE_DAYS[range];
  const xMinMs = days === null
    ? Math.min(
        btc[0] ? new Date(btc[0].date + 'T00:00:00Z').getTime() : xMaxMs,
        shiftedComposite[0] ? new Date(shiftedComposite[0].date + 'T00:00:00Z').getTime() : xMaxMs,
      )
    : xMaxMs - days * DAY_MS;

  // Slice both series to visible window
  const visBtc = useMemo(
    () => btc.filter((p) => {
      const t = new Date(p.date + 'T00:00:00Z').getTime();
      return t >= xMinMs && t <= xMaxMs;
    }),
    [btc, xMinMs, xMaxMs]
  );
  const visComp = useMemo(
    () => shiftedComposite.filter((p) => {
      const t = new Date(p.date + 'T00:00:00Z').getTime();
      return t >= xMinMs && t <= xMaxMs;
    }),
    [shiftedComposite, xMinMs, xMaxMs]
  );

  // Y domains
  const btcMin = visBtc.length ? Math.min(...visBtc.map((p) => p.price)) : 1;
  const btcMax = visBtc.length ? Math.max(...visBtc.map((p) => p.price)) : 100;
  const compMin = visComp.length ? Math.min(...visComp.map((p) => p.value)) : 100;
  const compMax = visComp.length ? Math.max(...visComp.map((p) => p.value)) : 200;

  // BTC log scale
  const btcLogMin = Math.log10(Math.max(btcMin * 0.85, 1));
  const btcLogMax = Math.log10(btcMax * 1.05);

  // Linear comp scale, padded
  const compRange = compMax - compMin || 1;
  const compYMin = compMin - compRange * 0.05;
  const compYMax = compMax + compRange * 0.05;

  // Geometry helpers
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  function xOf(t: number): number {
    return PAD_L + ((t - xMinMs) / (xMaxMs - xMinMs)) * plotW;
  }
  function yBtc(price: number): number {
    const v = (Math.log10(price) - btcLogMin) / (btcLogMax - btcLogMin);
    return PAD_T + (1 - v) * plotH;
  }
  function yComp(value: number): number {
    const v = (value - compYMin) / (compYMax - compYMin);
    return PAD_T + (1 - v) * plotH;
  }

  function buildPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }

  const btcPath = useMemo(() => buildPath(
    visBtc.map((p) => ({
      x: xOf(new Date(p.date + 'T00:00:00Z').getTime()),
      y: yBtc(p.price),
    }))
  ), [visBtc, xMinMs, xMaxMs, btcLogMin, btcLogMax]);

  const compPath = useMemo(() => buildPath(
    visComp.map((p) => ({
      x: xOf(new Date(p.date + 'T00:00:00Z').getTime()),
      y: yComp(p.value),
    }))
  ), [visComp, xMinMs, xMaxMs, compYMin, compYMax]);

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

  const compTicks = useMemo(() => {
    const step = compRange > 200 ? 50 : compRange > 100 ? 25 : 10;
    const start = Math.ceil(compYMin / step) * step;
    const end   = Math.floor(compYMax / step) * step;
    const t: number[] = [];
    for (let v = start; v <= end; v += step) t.push(v);
    return t;
  }, [compYMin, compYMax, compRange]);

  // X-axis ticks (~6 evenly spaced)
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
    // Nearest btc point
    const btcPoint = visBtc.length
      ? visBtc.reduce((best, p) => {
          const pT = new Date(p.date + 'T00:00:00Z').getTime();
          const bT = new Date(best.date + 'T00:00:00Z').getTime();
          return Math.abs(pT - t) < Math.abs(bT - t) ? p : best;
        }, visBtc[0])
      : null;
    const compPoint = visComp.length
      ? visComp.reduce((best, p) => {
          const pT = new Date(p.date + 'T00:00:00Z').getTime();
          const bT = new Date(best.date + 'T00:00:00Z').getTime();
          return Math.abs(pT - t) < Math.abs(bT - t) ? p : best;
        }, visComp[0])
      : null;
    return { t, date, btcPoint, compPoint };
  }, [hoverX, xMinMs, xMaxMs, plotW, visBtc, visComp]);

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
          BTC (LOG, RIGHT) &nbsp;·&nbsp; LIQUIDITY +{leadDays}D (LEFT)
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
        {/* Plot area background */}
        <rect
          x={PAD_L} y={PAD_T} width={plotW} height={plotH}
          fill="none" stroke="var(--border-subtle)" strokeWidth={1}
        />

        {/* Y-grid (left axis composite ticks) */}
        {compTicks.map((v) => {
          const y = yComp(v);
          return (
            <g key={`gy-${v}`}>
              <line
                x1={PAD_L} x2={W - PAD_R} y1={y} y2={y}
                stroke="var(--border-subtle)" strokeWidth={0.5} strokeDasharray="2 4" opacity={0.6}
              />
              <text
                x={PAD_L - 6} y={y + 3}
                fontSize={9} fill="var(--text-muted)" textAnchor="end"
              >
                {Math.round(v)}
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

        {/* Composite line — drawn first so BTC stays on top */}
        <path d={compPath} fill="none" stroke="#d68a3c" strokeWidth={1.5} opacity={0.95} strokeLinejoin="round" />

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
          LIQ INDEX
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
            {hoverInfo.compPoint && (
              <>
                {' '}&nbsp; LIQ +{leadDays}D{' '}
                <span style={{ color: '#d68a3c' }}>
                  {hoverInfo.compPoint.value.toFixed(1)}
                </span>
              </>
            )}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>
            Hover for values · index base 100 = window start
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
  const opts: RangeKey[] = ['2Y', '3Y', '5Y', 'ALL'];
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
