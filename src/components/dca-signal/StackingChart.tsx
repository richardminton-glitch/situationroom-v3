'use client';

import { useState } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { StackingPoint } from '@/lib/data/daily-snapshot';
import { useTheme } from '@/components/layout/ThemeProvider';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

type Period = '1Y' | '3Y' | '5Y' | 'ALL';

interface Props {
  stackingHistory: StackingPoint[];
  baseAmount:      number;   // user's weekly base — scales the BTC amounts
}

const PERIODS: { label: Period; years: number | null }[] = [
  { label: '1Y',  years: 1 },
  { label: '3Y',  years: 3 },
  { label: '5Y',  years: 5 },
  { label: 'ALL', years: null },
];

function shiftYears(dateStr: string, years: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

function formatBtc(v: number): string {
  if (v >= 1)    return v.toFixed(3) + ' ₿';
  if (v >= 0.01) return v.toFixed(4) + ' ₿';
  return v.toFixed(5) + ' ₿';
}

function formatPrice(v: number): string {
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(2) + 'M';
  if (v >= 1_000)     return '$' + (v / 1_000).toFixed(0) + 'K';
  return '$' + v.toFixed(0);
}

function getXTicks(data: StackingPoint[], period: Period): string[] {
  // For ALL/5Y use yearly ticks; for 3Y use 6-monthly; for 1Y use monthly
  const seen = new Set<string>();
  const ticks: string[] = [];

  if (period === '1Y') {
    // Monthly
    for (const row of data) {
      const key = row.date.slice(0, 7);
      if (!seen.has(key)) { seen.add(key); ticks.push(row.date); }
    }
  } else if (period === '3Y') {
    // Quarterly
    for (const row of data) {
      const [yyyy, mm] = row.date.split('-');
      const q = Math.floor((parseInt(mm) - 1) / 3);
      const key = `${yyyy}-Q${q}`;
      if (!seen.has(key)) { seen.add(key); ticks.push(row.date); }
    }
  } else {
    // Yearly
    for (const row of data) {
      const key = row.date.slice(0, 4);
      if (!seen.has(key)) { seen.add(key); ticks.push(row.date); }
    }
  }
  return ticks;
}

function formatXTick(dateStr: string, period: Period): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (period === '1Y') {
    return d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  }
  if (period === '3Y') {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  }
  return String(d.getUTCFullYear());
}

export function StackingChart({ stackingHistory, baseAmount }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

  const [period, setPeriod] = useState<Period>('5Y');

  if (!stackingHistory || stackingHistory.length === 0) return null;

  const scale = baseAmount / 100;

  const signalColor  = isDark ? '#00d4c8' : '#4a7c59';
  const vanillaColor = isDark ? '#6b7a8d' : '#8a7e6c';
  const tooltipBg    = isDark ? 'rgba(21,29,37,0.97)' : 'rgba(248,241,227,0.97)';
  const priceStroke  = isDark ? 'rgba(200,230,227,0.2)' : 'rgba(60,80,60,0.2)';
  const gridStroke   = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
  const axisStroke   = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';
  const vanillaStroke = isDark ? 'rgba(74,85,104,0.6)' : 'rgba(100,90,80,0.6)';
  const advPositive  = isDark ? '#00d4c8' : '#4a7c59';
  const advNegative  = isDark ? '#d06050' : '#9b3232';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function CustomTooltipWrapped({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;

    const signal  = payload.find((p: any) => p.dataKey === 'btcSignalScaled');
    const vanilla = payload.find((p: any) => p.dataKey === 'btcVanillaScaled');
    const price   = payload.find((p: any) => p.dataKey === 'price');

    return (
      <div style={{
        background:    tooltipBg,
        border:        `1px solid ${axisStroke}`,
        padding:       '8px 12px',
        fontFamily:    FONT,
        fontSize: 12,
        color:         'var(--text-primary)',
        letterSpacing: '0.06em',
        lineHeight:    1.8,
      }}>
        <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
        {signal  && <div style={{ color: signalColor }}>SIGNAL  {formatBtc(Number(signal.value))}</div>}
        {vanilla && <div style={{ color: 'var(--text-muted)' }}>VANILLA {formatBtc(Number(vanilla.value))}</div>}
        {price   && <div style={{ color: 'var(--text-secondary)' }}>BTC     {formatPrice(Number(price.value))}</div>}
      </div>
    );
  }

  // Guard against empty history (e.g. stale cache with no computed data)
  if (!stackingHistory?.length) return null;

  // Filter to selected period
  const lastDate   = stackingHistory[stackingHistory.length - 1].date;
  const cutoff     = period === 'ALL'
    ? ''
    : shiftYears(lastDate, PERIODS.find(p => p.label === period)!.years!);

  // For ALL — include everything; otherwise filter and offset to zero-base
  let filtered: (StackingPoint & { btcSignalScaled: number; btcVanillaScaled: number })[];

  if (period === 'ALL') {
    filtered = stackingHistory.map(r => ({
      ...r,
      btcSignalScaled:  r.btcSignal  * scale,
      btcVanillaScaled: r.btcVanilla * scale,
    }));
  } else {
    const raw = stackingHistory.filter(r => r.date >= cutoff);
    if (raw.length === 0) return null;
    // Zero-base: subtract the starting cumulative so chart starts from 0
    const baseSignal  = raw[0].btcSignal;
    const baseVanilla = raw[0].btcVanilla;
    filtered = raw.map(r => ({
      ...r,
      btcSignalScaled:  (r.btcSignal  - baseSignal)  * scale,
      btcVanillaScaled: (r.btcVanilla - baseVanilla) * scale,
    }));
  }

  const xTicks = getXTicks(filtered, period);

  // Latest values for the legend
  const last     = filtered[filtered.length - 1];
  const signalBtc  = last?.btcSignalScaled  ?? 0;
  const vanillaBtc = last?.btcVanillaScaled ?? 0;
  const advPct = vanillaBtc > 0 ? ((signalBtc - vanillaBtc) / vanillaBtc) * 100 : 0;

  return (
    <div style={{
      paddingTop: 16,
      borderTop:  '1px solid var(--border-subtle)',
    }}>
      {/* Header row */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        marginBottom:   12,
        fontFamily:     FONT,
      }}>
        <span style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--text-secondary)' }}>
          BTC STACKING · SIGNAL vs VANILLA DCA
        </span>

        {/* Period toggles */}
        <div style={{ display: 'flex', gap: 0 }}>
          {PERIODS.map(p => (
            <button
              key={p.label}
              onClick={() => setPeriod(p.label)}
              style={{
                padding:       '3px 9px',
                fontSize: 11,
                letterSpacing: '0.1em',
                fontFamily:    FONT,
                cursor:        'pointer',
                border:        `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'}`,
                background:    period === p.label
                  ? (isDark ? 'rgba(0,212,200,0.12)' : 'rgba(74,124,89,0.12)')
                  : 'transparent',
                color:         period === p.label
                  ? signalColor
                  : 'var(--text-muted)',
                transition:    'none',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart
          data={filtered}
          margin={{ top: 4, right: 52, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="signalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={signalColor} stopOpacity={0.18} />
              <stop offset="95%" stopColor={signalColor} stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="vanillaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={vanillaColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={vanillaColor} stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke={gridStroke}
            vertical={false}
          />

          <XAxis
            dataKey="date"
            ticks={xTicks}
            tickFormatter={v => formatXTick(v, period)}
            tick={{ fontFamily: FONT, fontSize: 11, fill: 'var(--text-secondary)', letterSpacing: 1 }}
            axisLine={{ stroke: axisStroke }}
            tickLine={false}
          />

          {/* Left axis — BTC accumulated */}
          <YAxis
            yAxisId="left"
            domain={[0, 'auto']}
            tickFormatter={v => formatBtc(v)}
            tick={{ fontFamily: FONT, fontSize: 10, fill: 'var(--text-secondary)' }}
            axisLine={false}
            tickLine={false}
            width={56}
          />

          {/* Right axis — BTC price */}
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={formatPrice}
            tick={{ fontFamily: FONT, fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            width={52}
          />

          <Tooltip content={<CustomTooltipWrapped />} />

          {/* BTC price — muted background line */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="price"
            stroke={priceStroke}
            strokeWidth={1}
            dot={false}
            isAnimationActive={false}
          />

          {/* Vanilla DCA — muted filled area */}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="btcVanillaScaled"
            stroke={vanillaStroke}
            strokeWidth={1.5}
            fill="url(#vanillaGrad)"
            dot={false}
            isAnimationActive={false}
          />

          {/* Signal DCA — filled area (on top) */}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="btcSignalScaled"
            stroke={signalColor}
            strokeWidth={2}
            fill="url(#signalGrad)"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend + current stats */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        marginTop:      8,
        fontFamily:     FONT,
        fontSize: 11,
        letterSpacing:  '0.08em',
        color:          'var(--text-secondary)',
      }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 16, height: 2, background: signalColor }} />
            SIGNAL DCA · {formatBtc(signalBtc)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 16, height: 1.5, background: vanillaStroke }} />
            VANILLA DCA · {formatBtc(vanillaBtc)}
          </span>
        </div>
        <span style={{ color: advPct >= 0 ? advPositive : advNegative, fontSize: 11 }}>
          {advPct >= 0 ? '+' : ''}{advPct.toFixed(1)}% MORE BTC
        </span>
      </div>
    </div>
  );
}
