'use client';

/**
 * CoinDaysDestroyedPanel — "VALUE OF COIN DAYS DESTROYED"
 *
 * Recharts ComposedChart with two layers:
 *   1. Bar series — raw daily VOCDD, hot/cold coloured per bar vs 30D MA
 *   2. Line series — 30D MA (vocdd_average_1m fetched directly from BRK)
 *
 * Signal banner shown when current VOCDD is significantly above or below MA:
 *   >3× MA  → SPIKE    (red)
 *   >2× MA  → ELEVATED (amber)
 *   <0.5× MA → QUIET   (green)
 *
 * Data: BRK lth_supply + vocdd_average_1m via /api/data/cdd
 * VOCDD = Coin Days Destroyed × USD price at time of spend
 * Theme: parchment / dark via useTheme() + chartColors() from shared.tsx
 */

import { useEffect, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { useTheme } from '@/components/layout/ThemeProvider';
import { chartColors, PanelLoading } from './shared';

// ── Types ────────────────────────────────────────────────────────────────────

interface CDDPoint {
  date: string;
  vocdd: number;
  ma30: number;
}

interface CDDResponse {
  data: CDDPoint[];
  supplyAdjusted: boolean;
}

// Chart points get a readable label added at render time
interface ChartPoint extends CDDPoint {
  label: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatUSD(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3)  return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// ── Signal logic ─────────────────────────────────────────────────────────────

type Signal = {
  level: 'spike' | 'elevated' | 'quiet' | null;
  label: string;
  bg: string;
  text: string;
};

function getSignal(vocdd: number, ma30: number, isDark: boolean): Signal {
  if (ma30 === 0) return { level: null, label: '', bg: '', text: '' };
  const ratio = vocdd / ma30;
  if (ratio > 3) return {
    level: 'spike',
    label: '▲ SPIKE — Significant economic dormancy destroyed. Monitor for distribution.',
    bg:   isDark ? '#4a1a1a' : 'rgba(155,50,50,0.10)',
    text: isDark ? '#ffaaaa' : '#9b3232',
  };
  if (ratio > 2) return {
    level: 'elevated',
    label: '⚠ ELEVATED — Long-value holder movement detected.',
    bg:   isDark ? '#3a2a00' : 'rgba(139,105,20,0.10)',
    text: isDark ? '#ffd966' : '#8b6914',
  };
  if (ratio < 0.5) return {
    level: 'quiet',
    label: '● QUIET — Minimal economic dormancy destroyed. Accumulation conditions.',
    bg:   isDark ? 'rgba(0,180,160,0.08)' : 'rgba(74,124,89,0.10)',
    text: isDark ? '#00d4c8' : '#4a7c59',
  };
  return { level: null, label: '', bg: '', text: '' };
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

interface CustomTooltipProps extends TooltipProps<number, string> {
  isDark: boolean;
  // recharts v3 strips these from TooltipProps; they're injected by Tooltip via cloneElement
  active?: boolean;
  payload?: ReadonlyArray<{ value?: number; payload?: ChartPoint }>;
  label?: string | number;
}

function CustomTooltip({ active, payload, isDark }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const C   = chartColors(isDark);
  const raw = payload[0]?.payload as ChartPoint | undefined;
  if (!raw) return null;

  const ratio = raw.ma30 > 0 ? (raw.vocdd / raw.ma30).toFixed(1) : '—';

  return (
    <div
      style={{
        background:  C.tooltipBg,
        border:      `1px solid ${C.tooltipBorder}`,
        borderRadius: 4,
        padding:     '8px 12px',
        fontFamily:  'var(--font-mono)',
        fontSize:    11,
        color:       C.tooltipText,
        minWidth:    200,
      }}
    >
      <div
        style={{
          fontFamily:    'var(--font-heading)',
          fontSize:      11,
          marginBottom:  6,
          letterSpacing: '0.05em',
        }}
      >
        {raw.date}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
        <span style={{ opacity: 0.7 }}>VOCDD</span>
        <span>{formatUSD(raw.vocdd)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
        <span style={{ opacity: 0.7 }}>30D MA</span>
        <span>{formatUSD(raw.ma30)}</span>
      </div>
      <div
        style={{
          display:       'flex',
          justifyContent: 'space-between',
          gap:           12,
          borderTop:     `1px solid ${C.tooltipBorder}`,
          marginTop:     5,
          paddingTop:    5,
          fontWeight:    600,
        }}
      >
        <span style={{ opacity: 0.7 }}>Ratio</span>
        <span>{ratio}× average</span>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function CoinDaysDestroyedPanel() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const C      = chartColors(isDark);

  const [response, setResponse] = useState<CDDResponse | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/data/cdd')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<CDDResponse>;
      })
      .then((d) => { if (!cancelled) { setResponse(d); setLoading(false); } })
      .catch((e: Error) => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <PanelLoading />;
  if (error || !response?.data?.length) {
    return (
      <div
        style={{
          padding:    16,
          fontFamily: 'var(--font-mono)',
          fontSize:   11,
          color:      isDark ? '#e87a5a' : '#b04a2a',
          opacity:    0.85,
        }}
      >
        {error ? `Failed to load VOCDD data: ${error}` : 'No data available.'}
      </div>
    );
  }

  const { data } = response;
  const latest   = data.at(-1)!;
  const signal   = getSignal(latest.vocdd, latest.ma30, isDark);

  // Accent colour — gold (parchment) / teal (dark)
  const accentColor = isDark ? '#00d4c8' : '#b8860b';
  const mutedColor  = isDark ? '#2a5a56' : '#9a8a78';

  // Tick cadence — ~9 labels across 90 days ≈ every 10 days
  const tickInterval = Math.max(1, Math.floor(data.length / 9));

  const axisStyle = {
    fontSize:   10,
    fontFamily: 'var(--font-mono)',
    fill:       C.axisTick,
  } as const;

  const chartData: ChartPoint[] = data.map((d) => ({
    ...d,
    label: formatDateLabel(d.date),
  }));

  return (
    <div
      style={{
        display:       'flex',
        flexDirection: 'column',
        height:        '100%',
        background:    'transparent',
        padding:       '8px 8px 4px',
        boxSizing:     'border-box',
      }}
    >
      {/* ── Signal banner (shown only when regime is active) ───────────────── */}
      {signal.level && (
        <div
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      10,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            background:    signal.bg,
            color:         signal.text,
            padding:       '4px 8px',
            marginBottom:  6,
            flexShrink:    0,
          }}
        >
          {signal.label}
        </div>
      )}

      {/* ── ComposedChart — bars + MA line ─────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="15%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={C.gridLine}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
              height={20}
            />
            <YAxis
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              width={56}
              tickFormatter={formatUSD}
            />
            <Tooltip
              content={<CustomTooltip isDark={isDark} />}
              cursor={{ fill: C.crosshair }}
            />

            {/* Hot/cold bars — colour per bar relative to its 30D MA */}
            <Bar dataKey="vocdd" name="VOCDD" isAnimationActive={false}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.vocdd >= entry.ma30 ? accentColor : mutedColor}
                  fillOpacity={entry.vocdd >= entry.ma30 ? 0.8 : 0.6}
                />
              ))}
            </Bar>

            {/* 30D MA line — accent, solid, no fill */}
            <Line
              type="monotone"
              dataKey="ma30"
              name="30D MA"
              stroke={accentColor}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display:        'flex',
          gap:            16,
          marginTop:      4,
          flexShrink:     0,
          flexWrap:       'wrap',
        }}
      >
        <span
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        5,
            fontFamily: 'var(--font-mono)',
            fontSize:   9,
            color:      C.axisTick,
          }}
        >
          <span
            style={{
              display:      'inline-block',
              width:        10,
              height:       10,
              borderRadius: 2,
              background:   accentColor,
              opacity:      0.8,
            }}
          />
          VOCDD above MA
        </span>
        <span
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        5,
            fontFamily: 'var(--font-mono)',
            fontSize:   9,
            color:      C.axisTick,
          }}
        >
          <span
            style={{
              display:      'inline-block',
              width:        10,
              height:       10,
              borderRadius: 2,
              background:   mutedColor,
              opacity:      0.7,
            }}
          />
          VOCDD below MA
        </span>
        <span
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        5,
            fontFamily: 'var(--font-mono)',
            fontSize:   9,
            color:      C.axisTick,
          }}
        >
          <span
            style={{
              display:    'inline-block',
              width:      16,
              height:     2,
              background: accentColor,
            }}
          />
          30D MA
        </span>
      </div>

      {/* ── Narrative callout ───────────────────────────────────────────────── */}
      <div
        style={{
          fontFamily:  'var(--font-mono)',
          fontSize:    9,
          color:       isDark ? '#3a5a56' : '#c4a87a',
          marginTop:   4,
          lineHeight:  1.5,
          letterSpacing: '0.03em',
          flexShrink:  0,
        }}
      >
        VOCDD weights coin age by USD value at time of spend. Spikes signal high-value long-term holders moving capital. Context is everything — spikes into strength differ from spikes into weakness.
      </div>
    </div>
  );
}
