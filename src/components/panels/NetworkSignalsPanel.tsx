'use client';

/**
 * NetworkSignalsPanel — "SOPR + ACTIVE ADDRESSES"
 *
 * Displays two key Bitcoin network health indicators:
 *
 *   SOPR (Spent Output Profit Ratio):
 *     > 1.0  — On-chain transactions are in aggregate profit (healthy demand)
 *     = 1.0  — Break-even — historically acts as support in bull, resistance in bear
 *     < 1.0  — On-chain activity in aggregate loss (capitulation pressure)
 *
 *   Active Addresses (7d MA):
 *     Rising trend = growing network adoption / activity
 *     Falling trend = declining engagement / distribution phase
 *
 * Chart: dual-line ComposedChart (SOPR + active addresses on separate Y axes)
 * Data: /api/data/network-signals (BRK sopr + active_addresses series)
 */

import { useEffect, useState } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useTheme } from '@/components/layout/ThemeProvider';
import { chartColors, PanelLoading } from './shared';

interface NetworkSignalPoint {
  date:               string;
  sopr:               number;
  soprMa7:            number;
  activeAddresses:    number;
  activeAddressesMa7: number;
}

interface NetworkSignalsResponse {
  data:          NetworkSignalPoint[];
  currentSopr:   number;
  soprSignal:    'bullish' | 'bearish' | 'neutral';
  currentActive: number;
  activeTrend:   'rising' | 'falling' | 'flat';
}

interface ChartPoint extends NetworkSignalPoint {
  label: string;
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatActive(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

const SOPR_SIGNAL_META = {
  bullish: { label: 'PROFIT ZONE',  color: '#22c55e' },
  neutral: { label: 'BREAK-EVEN',   color: '#a8a29e' },
  bearish: { label: 'LOSS ZONE',    color: '#ef4444' },
};

const TREND_META = {
  rising:  { label: '↑ RISING',  color: '#22c55e' },
  flat:    { label: '→ FLAT',    color: '#a8a29e' },
  falling: { label: '↓ FALLING', color: '#ef4444' },
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey?: string; color?: string; name?: string; value?: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: '2px' }}>
          {p.name}: {typeof p.value === 'number' ? (
            String(p.dataKey).includes('sopr') || String(p.dataKey).includes('Sopr')
              ? p.value.toFixed(4)
              : formatActive(p.value)
          ) : '—'}
        </div>
      ))}
    </div>
  );
}

export function NetworkSignalsPanel() {
  const { theme } = useTheme();
  const isDark    = theme === 'dark';
  const cc        = chartColors(isDark);

  const [resp,    setResp]    = useState<NetworkSignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/data/network-signals')
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setResp)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PanelLoading />;
  if (error || !resp || resp.data.length === 0) {
    return <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', padding: '12px' }}>Network signal data unavailable</div>;
  }

  const chartData: ChartPoint[] = resp.data.map((p) => ({ ...p, label: formatDateLabel(p.date) }));
  const soprMeta   = SOPR_SIGNAL_META[resp.soprSignal];
  const trendMeta  = TREND_META[resp.activeTrend];

  const step   = Math.max(1, Math.floor(chartData.length / 6));
  const xTicks = chartData.filter((_, i) => i % step === 0).map((p) => p.label);

  const soprMin  = Math.min(0.92, ...resp.data.map((p) => p.soprMa7));
  const soprMax  = Math.max(1.08, ...resp.data.map((p) => p.soprMa7));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0' }}>
      {/* Metric summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border-subtle)' }}>
        {/* SOPR */}
        <div style={{ padding: '8px 12px', borderRight: '1px solid var(--border-subtle)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '2px' }}>SOPR (7d MA)</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: soprMeta.color, fontWeight: 'bold', lineHeight: 1 }}>
            {resp.currentSopr.toFixed(4)}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: soprMeta.color, marginTop: '3px' }}>{soprMeta.label}</div>
        </div>

        {/* Active addresses */}
        <div style={{ padding: '8px 12px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '2px' }}>ACTIVE ADDR</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: 'var(--text-primary)', fontWeight: 'bold', lineHeight: 1 }}>
            {formatActive(resp.currentActive)}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: trendMeta.color, marginTop: '3px' }}>{trendMeta.label}</div>
        </div>
      </div>

      {/* SOPR chart */}
      <div style={{ padding: '6px 8px 2px', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
        SOPR — 7D MA · 60 DAYS
      </div>
      <div style={{ flex: '1 1 0', minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 2, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={cc.gridLine} />
            <XAxis
              dataKey="label"
              ticks={xTicks}
              tick={{ fontSize: 8, fontFamily: 'var(--font-mono)', fill: cc.axisTick }}
              axisLine={{ stroke: cc.gridLine }}
              tickLine={false}
            />
            <YAxis
              domain={[soprMin * 0.99, soprMax * 1.01]}
              tickFormatter={(v: number) => v.toFixed(3)}
              tick={{ fontSize: 8, fontFamily: 'var(--font-mono)', fill: cc.axisTick }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Break-even reference line */}
            <ReferenceLine y={1.0} stroke={cc.axisTick} strokeDasharray="4 2" strokeWidth={1} />

            {/* Daily SOPR (faint) */}
            <Line
              type="monotone"
              dataKey="sopr"
              stroke={soprMeta.color}
              strokeWidth={0.6}
              dot={false}
              isAnimationActive={false}
              strokeOpacity={0.4}
              name="SOPR"
            />
            {/* 7d MA (prominent) */}
            <Line
              type="monotone"
              dataKey="soprMa7"
              stroke={soprMeta.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              name="SOPR 7dMA"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Active addresses chart */}
      <div style={{ padding: '6px 8px 2px', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)' }}>
        ACTIVE ADDRESSES — 7D MA
      </div>
      <div style={{ flex: '1 1 0', minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 2, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={cc.gridLine} />
            <XAxis
              dataKey="label"
              ticks={xTicks}
              tick={{ fontSize: 8, fontFamily: 'var(--font-mono)', fill: cc.axisTick }}
              axisLine={{ stroke: cc.gridLine }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatActive(v)}
              tick={{ fontSize: 8, fontFamily: 'var(--font-mono)', fill: cc.axisTick }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="activeAddressesMa7"
              stroke={trendMeta.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              name="Active (7dMA)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Callout */}
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', lineHeight: 1.5, padding: '6px 10px', borderTop: '1px solid var(--border-subtle)', margin: 0 }}>
        SOPR below 1.0 signals that coins are being sold at a loss — a hallmark of capitulation. Recovery above
        1.0 and rising active addresses together mark the beginning of healthy demand-driven price appreciation.
      </p>
    </div>
  );
}
