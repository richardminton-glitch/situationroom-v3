'use client';

/**
 * UTXOAgeDistributionPanel — "THE HOLDERS"
 *
 * Stacked bar chart showing Bitcoin UTXO supply by age band over the last 90 days.
 * 10 bands from <1d (recent activity) to 5yr+ (long-term holders / lost coins).
 *
 * Data: BRK (bitview.space) via /api/data/utxo-age
 * Theme: parchment / dark via useTheme() + chartColors() + CSS variable fonts
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { useTheme } from '@/components/layout/ThemeProvider';
import { chartColors, PanelLoading } from './shared';

// ── Types ────────────────────────────────────────────────────────────────────

interface DayPoint {
  date: string;
  bands: number[];
}

// ── Band definitions ─────────────────────────────────────────────────────────

const BAND_LABELS = [
  '<1d',
  '1d–1w',
  '1w–1m',
  '1m–3m',
  '3m–6m',
  '6m–1yr',
  '1yr–2yr',
  '2yr–3yr',
  '3yr–5yr',
  '5yr+',
];

// Colour palette — parchment mode (warm amber→rust→teal spectrum)
const PARCHMENT_COLORS = [
  '#e8c56a', // <1d       — bright amber (fresh)
  '#d4a855', // 1d–1w     — golden
  '#b8864a', // 1w–1m     — mid amber
  '#9c6b3e', // 1m–3m     — warm brown
  '#7a5530', // 3m–6m     — dark brown
  '#5c6b4a', // 6m–1yr    — olive
  '#4a7a5c', // 1yr–2yr   — teal-green
  '#3a6e7a', // 2yr–3yr   — muted teal
  '#2a5a6b', // 3yr–5yr   — deep teal
  '#1a3a4a', // 5yr+      — darkest (HODLers)
];

// Colour palette — dark mode (teal→amber spectrum, higher contrast)
const DARK_COLORS = [
  '#ffd166', // <1d       — bright yellow
  '#f4a261', // 1d–1w     — orange
  '#e76f51', // 1w–1m     — coral
  '#d4556a', // 1m–3m     — rose
  '#a4547a', // 3m–6m     — mauve
  '#7a5c8a', // 6m–1yr    — purple
  '#4a7a9b', // 1yr–2yr   — steel blue
  '#2a9d8f', // 2yr–3yr   — teal
  '#1ab89a', // 3yr–5yr   — mint
  '#00d4c8', // 5yr+      — bright cyan (diamond hands)
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBTC(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

function formatDateLabel(iso: string): string {
  // "2025-01-15" → "Jan 15"
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

interface CustomTooltipProps extends TooltipProps<number, string> {
  isDark: boolean;
  colors: string[];
}

function CustomTooltip({ active, payload, label, isDark, colors }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const C = chartColors(isDark);

  // Total BTC held across all bands for this day
  const total = (payload as unknown as { value: number }[]).reduce(
    (sum, p) => sum + (p.value ?? 0),
    0,
  );

  return (
    <div
      style={{
        background: C.tooltipBg,
        border: `1px solid ${C.tooltipBorder}`,
        borderRadius: 4,
        padding: '10px 14px',
        minWidth: 200,
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: C.tooltipText,
      }}
    >
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 12, marginBottom: 8, letterSpacing: '0.05em' }}>
        {label}
      </div>
      {/* Reverse so longest-held is at top */}
      {[...(payload as unknown as { name: string; value: number; dataKey: string }[])]
        .reverse()
        .map((p, i, arr) => {
          const colorIndex = BAND_LABELS.length - 1 - i;
          const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : '0.0';
          return (
            <div
              key={p.dataKey}
              style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: colors[colorIndex],
                    flexShrink: 0,
                  }}
                />
                {p.name}
              </span>
              <span style={{ opacity: 0.85 }}>
                {formatBTC(p.value)} BTC{' '}
                <span style={{ opacity: 0.6 }}>({pct}%)</span>
              </span>
            </div>
          );
        })}
      <div
        style={{
          borderTop: `1px solid ${C.tooltipBorder}`,
          marginTop: 6,
          paddingTop: 6,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ opacity: 0.7 }}>Total</span>
        <span style={{ fontWeight: 600 }}>{formatBTC(total)} BTC</span>
      </div>
    </div>
  );
}

// ── Custom Legend ─────────────────────────────────────────────────────────────

interface LegendToggleProps {
  hidden: Set<string>;
  onToggle: (label: string) => void;
  isDark: boolean;
  colors: string[];
}

function LegendToggle({ hidden, onToggle, isDark, colors }: LegendToggleProps) {
  const textColor = isDark ? '#8aaba6' : '#8b7355';
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px 12px',
        padding: '6px 4px 2px',
        justifyContent: 'center',
      }}
    >
      {BAND_LABELS.map((label, i) => {
        const isHidden = hidden.has(label);
        return (
          <button
            key={label}
            onClick={() => onToggle(label)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: 3,
              opacity: isHidden ? 0.35 : 1,
              transition: 'opacity 0.15s',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: textColor,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: 2,
                background: colors[i],
                flexShrink: 0,
              }}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function UTXOAgeDistributionPanel() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : PARCHMENT_COLORS;
  const C = chartColors(isDark);

  const [rawData, setRawData] = useState<DayPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  // Fetch data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/data/utxo-age?days=90')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<DayPoint[]>;
      })
      .then((data) => {
        if (!cancelled) {
          setRawData(data);
          setLoading(false);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  const handleToggle = useCallback((label: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  // Transform raw data into Recharts-friendly format
  const chartData = rawData.map((day) => {
    const entry: Record<string, string | number> = {
      date: formatDateLabel(day.date),
    };
    BAND_LABELS.forEach((label, i) => {
      entry[label] = day.bands[i] ?? 0;
    });
    return entry;
  });

  // Thin out x-axis labels to avoid crowding (show every ~10 days)
  const tickInterval = Math.max(1, Math.floor(chartData.length / 9));

  const axisStyle = {
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
    fill: C.axisTick,
  };

  if (loading) return <PanelLoading />;
  if (error) return (
    <div style={{ padding: 24, fontFamily: 'var(--font-mono)', fontSize: 11, color: isDark ? '#e87a5a' : '#b04a2a', opacity: 0.8 }}>
      Failed to load UTXO age data: {error}
    </div>
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
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 4,
          paddingBottom: 4,
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: isDark ? '#8aaba6' : '#8b7355',
          }}
        >
          UTXO Age Distribution
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: isDark ? '#4a6b66' : '#b0956a',
            letterSpacing: '0.04em',
          }}
        >
          BTC SUPPLY BY AGE · 90D · BRK
        </span>
      </div>

      {/* Legend */}
      <LegendToggle hidden={hidden} onToggle={handleToggle} isDark={isDark} colors={colors} />

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 0, marginTop: 4 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            stackOffset="none"
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="10%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={C.gridLine}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
              height={24}
            />
            <YAxis
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              width={52}
              tickFormatter={formatBTC}
            />
            <Tooltip
              content={
                <CustomTooltip
                  isDark={isDark}
                  colors={colors}
                  active={undefined}
                  payload={undefined}
                  label={undefined}
                />
              }
              cursor={{ fill: C.crosshair }}
            />
            {BAND_LABELS.map((label, i) => (
              <Bar
                key={label}
                dataKey={label}
                stackId="age"
                fill={colors[i]}
                hide={hidden.has(label)}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer note */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: isDark ? '#3a5a56' : '#c4a87a',
          textAlign: 'right',
          marginTop: 2,
          letterSpacing: '0.03em',
        }}
      >
        Coin age from last movement · click legend to isolate bands
      </div>
    </div>
  );
}
