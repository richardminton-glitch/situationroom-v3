'use client';

/**
 * LTHSTHSupplyPanel — "THE HOLDERS — LTH / STH Supply"
 *
 * Two stacked panels:
 *   Panel A — Dual area chart: absolute BTC held by Long-Term and Short-Term Holders (1yr)
 *   Panel B — LTH % of total supply as a line, with reference lines at 70% and 60%
 *
 * Signal logic:
 *   ≥ 70%  → ACCUMULATION (green)
 *   60–70% → NEUTRAL      (amber)
 *   < 60%  → DISTRIBUTION (red)
 *
 * Data: BRK (bitview.space) lth_supply + sth_supply + supply via /api/data/lth-sth
 * LTH threshold: 155 days (BRK convention, consistent with Glassnode standard)
 * Theme: parchment / dark via useTheme() + chartColors() from shared.tsx
 */

import { useEffect, useState } from 'react';
import {
  AreaChart, Area,
  LineChart, Line,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { useTheme } from '@/components/layout/ThemeProvider';
import { chartColors, PanelLoading } from './shared';

// ── Types ────────────────────────────────────────────────────────────────────

interface LTHSTHPoint {
  date: string;
  lth: number;
  sth: number;
  lthPct: number;
  sthPct: number;
  totalSupply: number;
}

// Recharts needs a string key for the x-axis — we add `label` at render time
interface ChartPoint extends LTHSTHPoint {
  label: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBTC(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// ── Signal / colour helpers ───────────────────────────────────────────────────

function signalForPct(pct: number): { label: string; color: string } {
  if (pct >= 70) return { label: 'ACCUMULATION', color: '#4a7c59' };
  if (pct >= 60) return { label: 'NEUTRAL',       color: '#b8860b' };
  return              { label: 'DISTRIBUTION',   color: '#9b3232' };
}

function lineColorForPct(pct: number): string {
  return signalForPct(pct).color;
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

interface CustomTooltipProps extends TooltipProps<number, string> {
  isDark: boolean;
}

function CustomTooltip({ active, payload, isDark }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const C   = chartColors(isDark);
  const raw = payload[0]?.payload as ChartPoint | undefined;
  if (!raw) return null;

  return (
    <div
      style={{
        background: C.tooltipBg,
        border: `1px solid ${C.tooltipBorder}`,
        borderRadius: 4,
        padding: '8px 12px',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: C.tooltipText,
        minWidth: 186,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 11,
          marginBottom: 6,
          letterSpacing: '0.05em',
        }}
      >
        {raw.date}
      </div>

      {/* LTH */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: 2,
              background: isDark ? '#00d4c8' : '#b8860b', flexShrink: 0,
            }}
          />
          LTH Supply
        </span>
        <span>{formatBTC(raw.lth)} BTC</span>
      </div>

      {/* STH */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: 2,
              background: '#9b3232', flexShrink: 0,
            }}
          />
          STH Supply
        </span>
        <span>{formatBTC(raw.sth)} BTC</span>
      </div>

      {/* LTH % */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', gap: 12,
          borderTop: `1px solid ${C.tooltipBorder}`, marginTop: 5, paddingTop: 5,
        }}
      >
        <span style={{ opacity: 0.7 }}>LTH %</span>
        <span style={{ color: lineColorForPct(raw.lthPct), fontWeight: 600 }}>
          {raw.lthPct.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function LTHSTHSupplyPanel() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const C      = chartColors(isDark);

  const [data,    setData]    = useState<LTHSTHPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/data/lth-sth')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<LTHSTHPoint[]>;
      })
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e: Error) => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <PanelLoading />;
  if (error) {
    return (
      <div
        style={{
          padding: 16, fontFamily: 'var(--font-mono)', fontSize: 11,
          color: isDark ? '#e87a5a' : '#b04a2a', opacity: 0.85,
        }}
      >
        Failed to load LTH/STH data: {error}
      </div>
    );
  }
  if (!data.length) return null;

  const latest = data.at(-1)!;
  const signal = signalForPct(latest.lthPct);
  const lthLineColor = lineColorForPct(latest.lthPct);

  // LTH accent: gold (parchment) / teal (dark)
  const lthAccent = isDark ? '#00d4c8' : '#b8860b';
  const sthAccent = '#9b3232';

  // Y-axis domain for LTH% — small padding around data range
  const pctValues = data.map((d) => d.lthPct);
  const pctMin = Math.floor(Math.min(...pctValues) - 1);
  const pctMax = Math.ceil(Math.max(...pctValues)  + 1);

  // Tick cadence — aim for ~12 labels across 365 days ≈ monthly
  const tickInterval = Math.max(1, Math.floor(data.length / 12));

  const axisStyle = {
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
    fill: C.axisTick,
  } as const;

  const chartData: ChartPoint[] = data.map((d) => ({
    ...d,
    label: formatDateLabel(d.date),
  }));

  const tooltipContent = (
    <CustomTooltip
      isDark={isDark}
      active={undefined}
      payload={undefined}
      label={undefined}
    />
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'transparent',
        padding: '8px 8px 4px',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Status badge ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 8,
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: signal.color,
            border: `1px solid ${signal.color}`,
            padding: '2px 7px',
          }}
        >
          ● {signal.label}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: 11,
            color: signal.color,
          }}
        >
          {latest.lthPct.toFixed(1)}% of supply
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: C.axisTick,
            marginLeft: 'auto',
          }}
        >
          LTH {formatBTC(latest.lth)} · STH {formatBTC(latest.sth)}
        </span>
      </div>

      {/* ── Panel A — Dual area chart (absolute supply) ─────────────────────
          LTH dominates visually — it dwarfs STH by design (roughly 75% vs 25%)
      ─────────────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 3, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              {/* LTH fill gradient */}
              <linearGradient id="lthAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={lthAccent} stopOpacity={0.3} />
                <stop offset="95%" stopColor={lthAccent} stopOpacity={0.02} />
              </linearGradient>
              {/* STH fill gradient */}
              <linearGradient id="sthAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={sthAccent} stopOpacity={0.2} />
                <stop offset="95%" stopColor={sthAccent} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={C.gridLine} vertical={false} />
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
              width={54}
              tickFormatter={formatBTC}
            />
            <Tooltip
              content={tooltipContent}
              cursor={{ stroke: C.crosshair, strokeWidth: 1 }}
            />
            {/* LTH — dominant area, rendered first (lower z) */}
            <Area
              type="monotone"
              dataKey="lth"
              name="LTH Supply"
              stroke={lthAccent}
              strokeWidth={1.5}
              fill="url(#lthAreaGrad)"
              dot={false}
              isAnimationActive={false}
            />
            {/* STH — smaller fill, rendered on top */}
            <Area
              type="monotone"
              dataKey="sth"
              name="STH Supply"
              stroke={sthAccent}
              strokeWidth={1.5}
              fill="url(#sthAreaGrad)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Panel B — LTH % of supply (40% of Panel A height) ──────────────
          Line is coloured by current regime: green ≥70%, amber 60–70%, red <60%.
          Reference lines mark the STRONG ACCUMULATION and NEUTRAL thresholds.
      ─────────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 2,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          marginTop: 6,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: C.axisTick,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: 2,
            flexShrink: 0,
          }}
        >
          LTH % of Supply
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={C.gridLine} vertical={false} />
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
                width={40}
                domain={[pctMin, pctMax]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                content={tooltipContent}
                cursor={{ stroke: C.crosshair, strokeWidth: 1 }}
              />
              {/* 70% — Strong Accumulation threshold */}
              <ReferenceLine
                y={70}
                stroke="#4a7c59"
                strokeDasharray="4 3"
                strokeWidth={1}
                label={{
                  value: 'STRONG ACCUMULATION',
                  position: 'insideTopRight',
                  fill: '#4a7c59',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8,
                  letterSpacing: '0.06em',
                }}
              />
              {/* 60% — Neutral threshold */}
              <ReferenceLine
                y={60}
                stroke="#b8860b"
                strokeDasharray="4 3"
                strokeWidth={1}
                label={{
                  value: 'NEUTRAL',
                  position: 'insideTopRight',
                  fill: '#b8860b',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8,
                  letterSpacing: '0.06em',
                }}
              />
              {/* LTH % line — colour reflects current regime */}
              <Line
                type="monotone"
                dataKey="lthPct"
                name="LTH %"
                stroke={lthLineColor}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Narrative callout ───────────────────────────────────────────────── */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: isDark ? '#3a5a56' : '#c4a87a',
          marginTop: 4,
          lineHeight: 1.5,
          letterSpacing: '0.03em',
          flexShrink: 0,
        }}
      >
        LTH threshold: 155 days. Rising LTH supply during price weakness is the strongest on-chain accumulation signal.
      </div>
    </div>
  );
}
