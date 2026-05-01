'use client';

/**
 * PowerLawChart — log-log SVG chart of BTC price vs days since genesis,
 * with the OLS fit line (median) and parallel support / resistance bands
 * shifted by the residual extremes. The canonical Santostasi visual.
 *
 * Both axes are logarithmic. X is log10(days-since-genesis), labelled by
 * calendar year. Y is log10(price), labelled in dollars.
 *
 * Bands extend two years past the most recent BTC date so the projection
 * tail is visible — the model says where the channel goes next.
 *
 * Hover renders a vertical guide and a floating readout below the chart.
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

export interface PowerLawChartProps {
  btc:   BtcPoint[];
  model: Model;
}

const PAD_L = 56;
const PAD_R = 16;
const PAD_T = 18;
const PAD_B = 32;
const W = 880;
const H = 460;

const ONE_DAY_MS = 86_400_000;
const PROJECTION_YEARS = 2;   // extend bands this many years past today

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + 'T00:00:00Z').getTime();
  const b = new Date(toIso   + 'T00:00:00Z').getTime();
  return Math.round((b - a) / ONE_DAY_MS);
}

function isoFromDays(genesisIso: string, days: number): string {
  const ms = new Date(genesisIso + 'T00:00:00Z').getTime() + days * ONE_DAY_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

function formatPrice(p: number): string {
  if (p >= 1_000_000) return '$' + Math.round(p / 1_000_000) + 'M';
  if (p >= 1_000)     return '$' + Math.round(p / 1_000) + 'k';
  if (p >= 1)         return '$' + Math.round(p);
  return '$' + p.toFixed(2);
}

export function PowerLawChart({ btc, model }: PowerLawChartProps) {
  const [hoverX, setHoverX] = useState<number | null>(null);

  // ── Domains ────────────────────────────────────────────────────────────────
  const firstBtc = btc[0];
  const lastBtc  = btc.at(-1);
  if (!firstBtc || !lastBtc) {
    return <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 11 }}>No data</div>;
  }

  const dStart = Math.max(1, daysBetween(model.genesisDate, firstBtc.date));
  const dEnd   = daysBetween(model.genesisDate, lastBtc.date) + PROJECTION_YEARS * 365;

  const xMin = Math.log10(dStart);
  const xMax = Math.log10(dEnd);

  // Project resistance at xMax for upper Y bound; project support at xMin
  // for lower Y bound. Ensure we capture all BTC prices within the bounds.
  const supportAtStart = model.alpha + model.beta * xMin + model.cMin;
  const resistAtEnd    = model.alpha + model.beta * xMax + model.cMax;
  const btcLogs = btc.map((p) => Math.log10(Math.max(p.price, 1e-6)));
  const yMin = Math.min(supportAtStart, ...btcLogs) - 0.15;
  const yMax = Math.max(resistAtEnd,    ...btcLogs) + 0.15;

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  function xOfLog(logD: number): number {
    return PAD_L + ((logD - xMin) / (xMax - xMin)) * plotW;
  }
  function yOfLog(logP: number): number {
    return PAD_T + (1 - (logP - yMin) / (yMax - yMin)) * plotH;
  }

  // ── Paths ──────────────────────────────────────────────────────────────────
  const btcPath = useMemo(() => {
    return btc.map((p, i) => {
      const d = Math.max(1, daysBetween(model.genesisDate, p.date));
      const x = xOfLog(Math.log10(d));
      const y = yOfLog(Math.log10(Math.max(p.price, 1e-6)));
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [btc, model, xMin, xMax, yMin, yMax]);

  // Model lines — straight in log-log, so just two endpoints
  const medianPath = useMemo(() => {
    const yA = model.alpha + model.beta * xMin;
    const yB = model.alpha + model.beta * xMax;
    return `M${xOfLog(xMin).toFixed(1)} ${yOfLog(yA).toFixed(1)} L${xOfLog(xMax).toFixed(1)} ${yOfLog(yB).toFixed(1)}`;
  }, [model, xMin, xMax, yMin, yMax]);

  const supportPath = useMemo(() => {
    const yA = model.alpha + model.beta * xMin + model.cMin;
    const yB = model.alpha + model.beta * xMax + model.cMin;
    return `M${xOfLog(xMin).toFixed(1)} ${yOfLog(yA).toFixed(1)} L${xOfLog(xMax).toFixed(1)} ${yOfLog(yB).toFixed(1)}`;
  }, [model, xMin, xMax, yMin, yMax]);

  const resistPath = useMemo(() => {
    const yA = model.alpha + model.beta * xMin + model.cMax;
    const yB = model.alpha + model.beta * xMax + model.cMax;
    return `M${xOfLog(xMin).toFixed(1)} ${yOfLog(yA).toFixed(1)} L${xOfLog(xMax).toFixed(1)} ${yOfLog(yB).toFixed(1)}`;
  }, [model, xMin, xMax, yMin, yMax]);

  // Channel fill — between support and resistance
  const channelPath = useMemo(() => {
    const ySa = model.alpha + model.beta * xMin + model.cMin;
    const ySb = model.alpha + model.beta * xMax + model.cMin;
    const yRa = model.alpha + model.beta * xMin + model.cMax;
    const yRb = model.alpha + model.beta * xMax + model.cMax;
    return [
      `M${xOfLog(xMin).toFixed(1)} ${yOfLog(yRa).toFixed(1)}`,
      `L${xOfLog(xMax).toFixed(1)} ${yOfLog(yRb).toFixed(1)}`,
      `L${xOfLog(xMax).toFixed(1)} ${yOfLog(ySb).toFixed(1)}`,
      `L${xOfLog(xMin).toFixed(1)} ${yOfLog(ySa).toFixed(1)} Z`,
    ].join(' ');
  }, [model, xMin, xMax, yMin, yMax]);

  // ── Ticks ──────────────────────────────────────────────────────────────────
  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const startExp = Math.ceil(yMin);
    const endExp   = Math.floor(yMax);
    for (let e = startExp; e <= endExp; e++) {
      ticks.push(Math.pow(10, e));
    }
    return ticks;
  }, [yMin, yMax]);

  // X ticks at calendar-year boundaries
  const xTicks = useMemo(() => {
    const startYear = new Date(isoFromDays(model.genesisDate, dStart) + 'T00:00:00Z').getUTCFullYear();
    const endYear   = new Date(isoFromDays(model.genesisDate, dEnd)   + 'T00:00:00Z').getUTCFullYear();
    const out: { logD: number; year: number }[] = [];
    // Stride years if span is wide so labels don't crowd
    const span = endYear - startYear;
    const stride = span > 14 ? 2 : 1;
    for (let y = startYear; y <= endYear; y += stride) {
      const iso = `${y}-01-01`;
      const d = daysBetween(model.genesisDate, iso);
      if (d < dStart || d > dEnd) continue;
      out.push({ logD: Math.log10(d), year: y });
    }
    return out;
  }, [model.genesisDate, dStart, dEnd]);

  // ── Hover ─────────────────────────────────────────────────────────────────
  const hoverInfo = useMemo(() => {
    if (hoverX === null) return null;
    if (hoverX < PAD_L || hoverX > W - PAD_R) return null;
    const logD = xMin + ((hoverX - PAD_L) / plotW) * (xMax - xMin);
    const days = Math.pow(10, logD);
    const date = isoFromDays(model.genesisDate, Math.round(days));

    // Snap to closest BTC point
    const targetMs = new Date(date + 'T00:00:00Z').getTime();
    const btcPoint = btc.length
      ? btc.reduce((best, p) => {
          const pT = new Date(p.date + 'T00:00:00Z').getTime();
          const bT = new Date(best.date + 'T00:00:00Z').getTime();
          return Math.abs(pT - targetMs) < Math.abs(bT - targetMs) ? p : best;
        }, btc[0])
      : null;

    // Model values at this x (use the actual hover x, not the BTC snap)
    const yMed = model.alpha + model.beta * logD;
    const yRes = yMed + model.cMax;
    const ySup = yMed + model.cMin;
    const median     = Math.pow(10, yMed);
    const support    = Math.pow(10, ySup);
    const resistance = Math.pow(10, yRes);

    return { date, days: Math.round(days), btcPoint, median, support, resistance };
  }, [hoverX, xMin, xMax, plotW, btc, model]);

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
          BTC LOG-LOG &nbsp;·&nbsp; X = LOG&#8321;&#8320;(DAYS SINCE GENESIS) &nbsp;·&nbsp; Y = LOG&#8321;&#8320;(USD)
        </div>
        <Legend />
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

        {/* Channel fill */}
        <path d={channelPath} fill="#d68a3c" fillOpacity={0.06} />

        {/* Y-grid (powers of 10) */}
        {yTicks.map((p) => {
          const y = yOfLog(Math.log10(p));
          return (
            <g key={`gy-${p}`}>
              <line
                x1={PAD_L} x2={W - PAD_R} y1={y} y2={y}
                stroke="var(--border-subtle)" strokeWidth={0.5}
                strokeDasharray="2 4" opacity={0.5}
              />
              <text
                x={PAD_L - 6} y={y + 3}
                fontSize={9} fill="var(--text-muted)" textAnchor="end"
              >
                {formatPrice(p)}
              </text>
            </g>
          );
        })}

        {/* X-grid (year boundaries) */}
        {xTicks.map((t) => {
          const x = xOfLog(t.logD);
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

        {/* Model lines */}
        <path d={resistPath}  fill="none" stroke="#a455c4" strokeWidth={1.5} opacity={0.95} />
        <path d={medianPath}  fill="none" stroke="#4aa57a" strokeWidth={1.5} opacity={0.95} />
        <path d={supportPath} fill="none" stroke="#c04848" strokeWidth={1.5} opacity={0.95} />

        {/* BTC line */}
        <path d={btcPath} fill="none" stroke="#f7931a" strokeWidth={1.4} />

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
          x={PAD_L} y={PAD_T - 6}
          fontSize={8} fill="var(--text-muted)"
          textAnchor="start" letterSpacing="0.14em"
        >
          USD (LOG)
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
            {hoverInfo.date} &middot; day {hoverInfo.days.toLocaleString()}
            {hoverInfo.btcPoint && (
              <>
                {' '}&nbsp; BTC{' '}
                <span style={{ color: '#f7931a', fontWeight: 600 }}>
                  ${Math.round(hoverInfo.btcPoint.price).toLocaleString()}
                </span>
              </>
            )}
            {' '}&nbsp; FAIR{' '}
            <span style={{ color: '#4aa57a' }}>{formatPrice(hoverInfo.median)}</span>
            {' '}&nbsp; SUP{' '}
            <span style={{ color: '#c04848' }}>{formatPrice(hoverInfo.support)}</span>
            {' '}&nbsp; RES{' '}
            <span style={{ color: '#a455c4' }}>{formatPrice(hoverInfo.resistance)}</span>
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>
            Hover for values · model is straight-line on log-log; price is the orange trace
          </span>
        )}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div style={{
      display: 'flex', gap: 12, fontSize: 9,
      letterSpacing: '0.08em', color: 'var(--text-muted)',
      fontFamily: FONT_MONO, flexWrap: 'wrap',
    }}>
      <LegendDot colour="#f7931a" label="BTC" />
      <LegendDot colour="#4aa57a" label="MEDIAN" />
      <LegendDot colour="#a455c4" label="RESISTANCE" />
      <LegendDot colour="#c04848" label="SUPPORT" />
    </div>
  );
}

function LegendDot({ colour, label }: { colour: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{
        display: 'inline-block', width: 10, height: 2, background: colour,
      }} />
      {label}
    </span>
  );
}
