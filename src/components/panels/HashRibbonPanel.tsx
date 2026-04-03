'use client';

/**
 * HashRibbonPanel — "HASH RIBBON"
 *
 * Recharts ComposedChart showing Bitcoin hash rate trend with 30d and 60d moving
 * averages. The "ribbon" between the two MAs indicates miner health:
 *   30d > 60d (ribbon above) → green → miners recovered / BULLISH
 *   30d < 60d (ribbon below) → red   → miner stress / BEARISH
 *
 * Signal banner at top explains the current regime.
 * Data: /api/data/hash-ribbon (BRK hashrate series + sma computation)
 */

import { useEffect, useState } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useTheme } from '@/components/layout/ThemeProvider';
import { chartColors, PanelLoading } from './shared';

interface HashRibbonPoint {
  date:     string;
  hashrate: number;
  ma30:     number;
  ma60:     number;
}

interface HashRibbonResponse {
  data:            HashRibbonPoint[];
  signal:          'bullish' | 'bearish' | 'neutral';
  currentHashrate: number;
  currentMa30:     number;
  currentMa60:     number;
}

interface ChartPoint extends HashRibbonPoint {
  label:   string;
  ribbonHi: number;
  ribbonLo: number;
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function fmtEH(v: number): string {
  return `${v.toFixed(0)} EH/s`;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey?: string; color?: string; name?: string; value?: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const bg = 'var(--bg-card)';
  const border = 'var(--border-primary)';
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: '2px' }}>
          {p.name}: {typeof p.value === 'number' ? fmtEH(p.value) : '—'}
        </div>
      ))}
    </div>
  );
}

export function HashRibbonPanel() {
  const { theme } = useTheme();
  const isDark    = theme === 'dark';
  const cc        = chartColors(isDark);

  const [resp,    setResp]    = useState<HashRibbonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/data/hash-ribbon')
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setResp)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PanelLoading />;
  if (error || !resp || resp.data.length === 0) {
    return <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', padding: '12px' }}>Hash ribbon data unavailable</div>;
  }

  const chartData: ChartPoint[] = resp.data.map((p) => ({
    ...p,
    label:    formatDateLabel(p.date),
    ribbonHi: Math.max(p.ma30, p.ma60),
    ribbonLo: Math.min(p.ma30, p.ma60),
  }));

  const isBullish = resp.signal === 'bullish';
  const ribbonColor = isBullish ? '#22c55e' : resp.signal === 'bearish' ? '#ef4444' : '#a8a29e';

  // Axis ticks: every ~3rd label
  const step = Math.max(1, Math.floor(chartData.length / 8));
  const xTicks = chartData.filter((_, i) => i % step === 0).map((p) => p.label);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px' }}>
      {/* Signal banner */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 10px',
        backgroundColor: isBullish
          ? (isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)')
          : resp.signal === 'bearish'
          ? (isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)')
          : (isDark ? 'rgba(168,162,158,0.1)' : 'rgba(168,162,158,0.05)'),
        border: `1px solid ${ribbonColor}40`,
      }}>
        <div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>HASH RIBBON · </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: ribbonColor, fontWeight: 'bold' }}>
            {resp.signal === 'bullish' ? 'RECOVERY — 30D > 60D' : resp.signal === 'bearish' ? 'STRESS — 30D < 60D' : 'NEUTRAL'}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)' }}>
          {resp.currentHashrate.toFixed(0)} EH/s
        </span>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={cc.gridLine} />
            <XAxis
              dataKey="label"
              ticks={xTicks}
              tick={{ fontSize: 8, fontFamily: 'var(--font-mono)', fill: cc.axisTick }}
              axisLine={{ stroke: cc.gridLine }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `${v.toFixed(0)}`}
              tick={{ fontSize: 8, fontFamily: 'var(--font-mono)', fill: cc.axisTick }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Ribbon fill between MAs */}
            <Area
              dataKey="ribbonHi"
              stroke="none"
              fill={ribbonColor}
              fillOpacity={0.15}
              isAnimationActive={false}
              legendType="none"
              name="Ribbon Hi"
            />
            <Area
              dataKey="ribbonLo"
              stroke="none"
              fill={isDark ? '#1a1a1a' : '#f5f0e8'}
              fillOpacity={1}
              isAnimationActive={false}
              legendType="none"
              name="Ribbon Lo"
            />

            {/* 60d MA */}
            <Line
              type="monotone"
              dataKey="ma60"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              name="60d MA"
            />
            {/* 30d MA */}
            <Line
              type="monotone"
              dataKey="ma30"
              stroke={ribbonColor}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              name="30d MA"
            />
            {/* Hashrate (faint) */}
            <Line
              type="monotone"
              dataKey="hashrate"
              stroke={cc.axisTick}
              strokeWidth={0.8}
              dot={false}
              isAnimationActive={false}
              strokeDasharray="3 2"
              name="Hash Rate"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '12px', paddingLeft: '40px', paddingBottom: '4px' }}>
        {[
          { color: ribbonColor, label: '30d MA' },
          { color: '#f59e0b',   label: '60d MA' },
          { color: cc.axisTick,     label: 'Hash Rate' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '16px', height: '2px', backgroundColor: color }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Callout */}
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', lineHeight: 1.5, padding: '6px 10px', borderTop: '1px solid var(--border-subtle)', margin: 0 }}>
        Hash Ribbon identifies miner capitulation cycles. When the 30d MA crosses above the 60d MA,
        miners have survived stress and are back to accumulating — historically a high-conviction buy signal.
      </p>
    </div>
  );
}
