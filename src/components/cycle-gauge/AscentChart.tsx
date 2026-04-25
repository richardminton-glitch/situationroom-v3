'use client';

/**
 * AscentChart — inverse of DrawdownChart.
 *
 * Tracks the rally from each cycle low to the next cycle ATH, expressed
 * as a multiple of the cycle low (1x at start). Log-scale y-axis keeps
 * 2013's ~600x ascent and 2024's ~7x ascent legible on the same panel.
 * Endpoint dots show "Nx · $price" labels, mirroring DrawdownChart's
 * styling so the two charts visually pair.
 */

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

interface AscentMeta {
  id: string; label: string; lowDate: string; lowPrice: number;
  topDate: string; topPrice: number; multiple: number; days: number;
}
interface CycleAscentsResponse {
  data:   Record<string, number | null>[];
  cycles: AscentMeta[];
  maxDay: number;
}

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

// Same palette pattern as DrawdownChart so the two charts read as a pair:
// historical cycles in greyscale, the most recent (2024) ascent in orange.
const CYCLE_COLOURS = {
  dark: {
    a2013: 'rgba(255,255,255,0.22)',
    a2017: 'rgba(255,255,255,0.35)',
    a2021: 'rgba(255,255,255,0.55)',
    a2024: '#f7931a',
  },
  parch: {
    a2013: 'rgba(80,60,20,0.25)',
    a2017: 'rgba(80,60,20,0.40)',
    a2021: 'rgba(80,60,20,0.60)',
    a2024: '#b35900',
  },
};

function fmtPrice(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtPriceCompact(n: number): string {
  if (n < 10) return '$' + n.toFixed(2);
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function fmtMultiple(x: number): string {
  if (x >= 100) return Math.round(x) + 'x';
  if (x >= 10)  return x.toFixed(0) + 'x';
  return x.toFixed(1) + 'x';
}

function EndpointDot(props: {
  cx?: number; cy?: number; index?: number;
  payload?: Record<string, number | null>;
  dataKey: string;
  lastDay: number;
  meta: AscentMeta;
  color: string;
}) {
  const { cx, cy, index, dataKey, lastDay, meta, color } = props;
  if (cx == null || cy == null || index == null) return null;
  if (index !== lastDay) return null;
  if (props.payload?.[dataKey] == null) return null;

  const isLeft = lastDay > 750;

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
        {fmtMultiple(meta.multiple)} · {fmtPrice(meta.topPrice)}
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
        {fmtDate(meta.topDate)}
      </text>
    </g>
  );
}

function ChartTooltip({
  active, payload, label, isDark, cycles,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number | null; color: string }[];
  label?: number;
  isDark: boolean;
  cycles: AscentMeta[];
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
              {fmtMultiple(p.value!)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function AscentChart() {
  const { theme } = useTheme();
  const isDark    = theme === 'dark';
  const colours   = isDark ? CYCLE_COLOURS.dark : CYCLE_COLOURS.parch;

  const [resp,    setResp]    = useState<CycleAscentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/data/cycle-ascents')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((d: CycleAscentsResponse) => { setResp(d); setLoading(false); })
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
          LOADING ASCENT DATA...
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

  const { data, cycles, maxDay } = resp;

  const lastDayMap: Record<string, number> = {};
  for (const c of cycles) {
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i][c.id] != null) { lastDayMap[c.id] = i; break; }
    }
  }

  // Y-axis log ticks — stop at ~1000 unless any cycle exceeded it
  const maxMultiple = Math.max(1, ...cycles.map(c => c.multiple));
  const yTicks = [1, 2, 5, 10, 50, 100, 500, 1000].filter(v => v <= maxMultiple * 1.5);

  // X-axis ticks every 200 days
  const xTicks: number[] = [];
  for (let t = 0; t <= maxDay; t += 200) xTicks.push(t);

  const legendOrder: string[] = ['a2024', 'a2021', 'a2017', 'a2013'];

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
          ASCENTS FROM CYCLE LOW TO NEXT CYCLE TOP
        </p>
      </div>

      {/* Subtitle */}
      <p style={{ margin: '6px 0 14px', fontFamily: FONT, fontSize: 9, color: textMut, lineHeight: 1.7 }}>
        Daily closes aligned by days since each cycle low. Y-axis is log scale —
        each return cycle is plotted as a multiple of its starting low.
        Diminishing returns are the structural story:&nbsp;
        {cycles.map(c => (
          <span key={c.id}>
            {c.label} {fmtMultiple(c.multiple)} ({fmtPriceCompact(c.lowPrice)} → {fmtPrice(c.topPrice)}).&nbsp;
          </span>
        ))}
      </p>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        {legendOrder.map(id => {
          const meta  = cycles.find(c => c.id === id);
          if (!meta) return null;
          const color    = colours[id as keyof typeof colours];
          const isLatest = id === 'a2024';
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT, fontSize: 9, color: textMut }}>
              <div style={{ width: isLatest ? 18 : 14, height: isLatest ? 2.5 : 1.5, background: color, borderRadius: 1 }} />
              <span style={{ color: isLatest ? color : textMut }}>
                {meta.label}
              </span>
              <span style={{ opacity: 0.6, fontSize: 8 }}>
                Low {fmtDate(meta.lowDate)} · {fmtPriceCompact(meta.lowPrice)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 95, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={gridLine} strokeDasharray="3 3" />

          <XAxis
            dataKey="day"
            type="number"
            domain={[0, maxDay]}
            ticks={xTicks}
            tick={{ fontFamily: FONT, fontSize: 9, fill: isDark ? '#666' : '#9a8060' }}
            tickLine={false}
            axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)' }}
            label={{
              value: 'Days since cycle low',
              position: 'insideBottom',
              offset: -2,
              fontFamily: FONT,
              fontSize: 9,
              fill: textMut,
            }}
          />

          <YAxis
            scale="log"
            domain={[1, 'auto']}
            ticks={yTicks}
            tickFormatter={v => fmtMultiple(v as number)}
            tick={{ fontFamily: FONT, fontSize: 9, fill: isDark ? '#666' : '#9a8060' }}
            tickLine={false}
            axisLine={false}
            width={48}
            allowDataOverflow={false}
            label={{
              value: 'Multiple of cycle low',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fontFamily: FONT,
              fontSize: 9,
              fill: textMut,
            }}
          />

          <Tooltip content={<ChartTooltip isDark={isDark} cycles={cycles} />} />

          {/* 1x baseline */}
          <ReferenceLine y={1} stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'} strokeDasharray="4 4" />

          {/* Older cycles first so 2024 sits on top */}
          {(['a2013', 'a2017', 'a2021'] as const).map(id => {
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
                    color={color}
                  />
                )}
                activeDot={{ r: 3, fill: color }}
                connectNulls={false}
                isAnimationActive={false}
              />
            );
          })}

          {/* Most recent cycle — orange, thicker */}
          {(() => {
            const id   = 'a2024';
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
