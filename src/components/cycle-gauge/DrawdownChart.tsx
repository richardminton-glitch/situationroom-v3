'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useTheme } from '@/components/layout/ThemeProvider';

// Inline types — do NOT import from the route file (it uses fs/path).
interface CycleMeta {
  id: string; label: string; athDate: string; athPrice: number;
  endDate: string; endPrice: number; live: boolean; days: number;
}
interface DrawdownChartResponse {
  data:   Record<string, number | null>[];
  cycles: CycleMeta[];
  maxDay: number;
}

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

// ── Colour palette ────────────────────────────────────────────────────────────

const CYCLE_COLOURS = {
  dark: {
    c2013: 'rgba(255,255,255,0.22)',
    c2017: 'rgba(255,255,255,0.35)',
    c2021: 'rgba(255,255,255,0.55)',
    c2024: '#f7931a',
  },
  parch: {
    c2013: 'rgba(80,60,20,0.25)',
    c2017: 'rgba(80,60,20,0.40)',
    c2021: 'rgba(80,60,20,0.60)',
    c2024: '#b35900',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// Custom dot: renders a circle + label only at the LAST data point of each series
function EndpointDot(props: {
  cx?: number; cy?: number; index?: number;
  payload?: Record<string, number | null>;
  dataKey: string;
  lastDay: number;
  meta: CycleMeta;
  isDark: boolean;
  color: string;
}) {
  const { cx, cy, index, dataKey, lastDay, meta, color } = props;
  if (cx == null || cy == null || index == null) return null;
  if (index !== lastDay) return null;
  // Confirm this series has a real value at this point
  if (props.payload?.[dataKey] == null) return null;

  const label = `${fmtPrice(meta.endPrice)}`;
  const date  = fmtDate(meta.endDate);
  const isLeft = lastDay > 400; // label on left side if near right edge

  return (
    <g>
      <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="none" />
      <text
        x={isLeft ? cx - 6 : cx + 6}
        y={cy - 1}
        textAnchor={isLeft ? 'end' : 'start'}
        fontSize={9}
        fontFamily={FONT}
        fill={color}
      >
        {label}
      </text>
      <text
        x={isLeft ? cx - 6 : cx + 6}
        y={cy + 9}
        textAnchor={isLeft ? 'end' : 'start'}
        fontSize={8}
        fontFamily={FONT}
        fill={color}
        opacity={0.75}
      >
        {date}
      </text>
    </g>
  );
}

// Custom tooltip
function ChartTooltip({
  active, payload, label, isDark, cycles,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number | null; color: string }[];
  label?: number;
  isDark: boolean;
  cycles: CycleMeta[];
}) {
  if (!active || !payload?.length || label == null) return null;
  const bg     = isDark ? 'rgba(10,14,20,0.92)' : 'rgba(245,238,220,0.96)';
  const border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';
  const text   = isDark ? '#e8e0d0' : '#2a1f00';
  const muted  = isDark ? '#888' : '#7a6040';

  const valid = (payload ?? []).filter(p => p.value != null);
  if (!valid.length) return null;

  return (
    <div style={{
      background: bg, border: `1px solid ${border}`, borderRadius: 4,
      padding: '8px 12px', fontFamily: FONT, fontSize: 10,
    }}>
      <div style={{ color: muted, marginBottom: 5, letterSpacing: '0.1em' }}>
        DAY {label}
      </div>
      {valid.map(p => {
        const meta = cycles.find(c => c.id === p.dataKey);
        return (
          <div key={p.dataKey} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
            <span style={{ color: p.color, fontWeight: 700 }}>{meta?.label ?? p.dataKey}</span>
            <span style={{ color: text, fontVariantNumeric: 'tabular-nums' }}>
              {p.value!.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DrawdownChart() {
  const { theme }    = useTheme();
  const isDark       = theme === 'dark';
  const colours      = isDark ? CYCLE_COLOURS.dark : CYCLE_COLOURS.parch;

  const [resp,    setResp]    = useState<DrawdownChartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/data/drawdown-chart')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((d: DrawdownChartResponse) => { setResp(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, []);

  const bg       = 'var(--bg-card)';
  const border   = 'var(--border-subtle)';
  const textPri  = 'var(--text-primary)';
  const textMut  = 'var(--text-muted)';
  const gridLine = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

  if (loading) {
    return (
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: '32px 24px', textAlign: 'center' }}>
        <span style={{ color: textMut, fontFamily: FONT, fontSize: 10, letterSpacing: '0.12em' }}>
          LOADING CYCLE DATA...
        </span>
      </div>
    );
  }

  if (error || !resp) {
    return (
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: '32px 24px', textAlign: 'center' }}>
        <span style={{ color: isDark ? '#d06050' : '#9b3232', fontFamily: FONT, fontSize: 10 }}>
          {error ?? 'No data'}
        </span>
      </div>
    );
  }

  const { data, cycles } = resp;

  // Precompute last non-null index per cycle for endpoint dots
  const lastDayMap: Record<string, number> = {};
  for (const c of cycles) {
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i][c.id] != null) { lastDayMap[c.id] = i; break; }
    }
  }

  // Y-axis ticks: 0, -20, -40, -60, -80, -100
  const yTicks = [0, -20, -40, -60, -80, -100];

  // X-axis ticks every 100 days
  const xMax    = resp.maxDay;
  const xTicks: number[] = [];
  for (let t = 0; t <= xMax; t += 100) xTicks.push(t);

  // Legend entries
  const legendOrder: string[] = ['c2024', 'c2021', 'c2017', 'c2013'];

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: '20px 24px 16px' }}>

      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <p style={{ margin: 0, fontFamily: FONT, fontSize: 9, letterSpacing: '0.18em', color: textMut, textTransform: 'uppercase' }}>
          Cycle Analysis
        </p>
        <p style={{
          margin: '3px 0 0', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em',
          color: textPri,
          fontFamily: isDark ? FONT : "'Georgia', 'Times New Roman', serif",
        }}>
          DRAWDOWNS FROM ATH TO CYCLE LOW
        </p>
      </div>

      {/* Subtitle */}
      <p style={{ margin: '6px 0 14px', fontFamily: FONT, fontSize: 9, color: textMut, lineHeight: 1.7 }}>
        Daily closes aligned by days since each cycle ATH. Cycles anchored to halving dates.
        {cycles.map(c => !c.live && (
          <span key={c.id}> {c.label} ends {fmtDate(c.endDate)} ({fmtPrice(c.endPrice)}).</span>
        ))}
      </p>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        {legendOrder.map(id => {
          const meta  = cycles.find(c => c.id === id);
          if (!meta) return null;
          const color = colours[id as keyof typeof colours];
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT, fontSize: 9, color: textMut }}>
              <div style={{ width: meta.live ? 18 : 14, height: meta.live ? 2.5 : 1.5, background: color, borderRadius: 1 }} />
              <span style={{ color: meta.live ? color : textMut }}>
                {meta.label}{meta.live ? ' (live)' : ''}
              </span>
              <span style={{ opacity: 0.6, fontSize: 8 }}>
                ATH {fmtDate(meta.athDate)} · {fmtPrice(meta.athPrice)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 80, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={gridLine} strokeDasharray="3 3" />

          <XAxis
            dataKey="day"
            type="number"
            domain={[0, xMax]}
            ticks={xTicks}
            tick={{ fontFamily: FONT, fontSize: 9, fill: isDark ? '#666' : '#9a8060' }}
            tickLine={false}
            axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)' }}
            label={{
              value: 'Days since ATH',
              position: 'insideBottom',
              offset: -2,
              fontFamily: FONT,
              fontSize: 9,
              fill: textMut,
            }}
          />

          <YAxis
            domain={[-100, 5]}
            ticks={yTicks}
            tickFormatter={v => `${v}%`}
            tick={{ fontFamily: FONT, fontSize: 9, fill: isDark ? '#666' : '#9a8060' }}
            tickLine={false}
            axisLine={false}
            width={42}
            label={{
              value: 'Drawdown from ATH',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fontFamily: FONT,
              fontSize: 9,
              fill: textMut,
            }}
          />

          <Tooltip
            content={
              <ChartTooltip isDark={isDark} cycles={cycles} />
            }
          />

          {/* 0% reference line */}
          <ReferenceLine y={0} stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'} strokeDasharray="4 4" />

          {/* Completed cycles (rendered first so live cycle is on top) */}
          {(['c2013', 'c2017', 'c2021'] as const).map(id => {
            const meta = cycles.find(c => c.id === id);
            if (!meta) return null;
            const color = colours[id];
            const last  = lastDayMap[id] ?? 0;
            return (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                stroke={color}
                strokeWidth={1.5}
                dot={(p) => (
                  <EndpointDot
                    key={`dot-${id}-${p.index}`}
                    {...p}
                    dataKey={id}
                    lastDay={last}
                    meta={meta}
                    isDark={isDark}
                    color={color}
                  />
                )}
                activeDot={{ r: 3, fill: color }}
                connectNulls={false}
                isAnimationActive={false}
              />
            );
          })}

          {/* Live cycle — orange, thicker */}
          {(() => {
            const id   = 'c2024';
            const meta = cycles.find(c => c.id === id);
            if (!meta) return null;
            const color = colours[id];
            const last  = lastDayMap[id] ?? 0;
            return (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                stroke={color}
                strokeWidth={2.5}
                dot={(p) => (
                  <EndpointDot
                    key={`dot-${id}-${p.index}`}
                    {...p}
                    dataKey={id}
                    lastDay={last}
                    meta={meta}
                    isDark={isDark}
                    color={color}
                  />
                )}
                activeDot={{ r: 4, fill: color }}
                connectNulls={false}
                isAnimationActive={false}
              />
            );
          })()}
        </LineChart>
      </ResponsiveContainer>

    </div>
  );
}
