'use client';

/**
 * URPDPanel — "SUPPLY AT COST BASIS"
 *
 * UTXO Realised Price Distribution — horizontal bar chart showing BTC supply
 * grouped by the USD price at which each UTXO last moved.
 *
 * Visual anatomy:
 *   - Profit/loss split bar (above chart)
 *   - Status callout (one line based on inProfit %)
 *   - BarChart layout="vertical" — horizontal bars, price on Y-axis
 *   - Per-bar colour: green (in profit) / amber (transition zone) / red (at loss)
 *   - ReferenceLine for current price and realised price
 *   - Narrative callout (below chart)
 *
 * NOTE on log scale: Recharts BarChart uses a categorical YAxis in layout="vertical"
 * mode. Categorical axes do not support scale="log". To achieve log-like visual
 * distribution, the data itself is binned in $2,500 linear increments and the Y-axis
 * is rendered with selected major tick labels only ($0, $10K, $20K … $130K).
 * True logarithmic spacing would require a numerical YAxis, which is incompatible
 * with the categorical Bar chart type in Recharts.
 *
 * Data: BRK cost-basis/all/{date} via /api/data/urpd
 * Theme: parchment / dark via useTheme() + chartColors() from shared.tsx
 */

import { useEffect, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { useTheme } from '@/components/layout/ThemeProvider';
import { chartColors, PanelLoading } from './shared';

// ── Types ────────────────────────────────────────────────────────────────────

interface URPDBucket {
  price: number;
  supply: number;
}

interface URPDResponse {
  buckets: URPDBucket[];
  currentPrice: number;
  realisedPrice: number;
  inProfit: number;
  atLoss: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatUSD(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function formatSupply(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(1);
}

// Bar colour based on how far the bucket price is from current price
function barColor(bucketPrice: number, currentPrice: number): string {
  if (bucketPrice > currentPrice * 1.05)  return '#8b3a3a'; // above current — at a loss
  if (bucketPrice >= currentPrice * 0.95) return '#c9a227'; // transition zone
  return '#2d6a4f';                                          // below current — in profit
}

// Status callout text based on in-profit %
function statusText(inProfit: number): { text: string; color: string } {
  if (inProfit >= 85) return {
    text: 'Near-euphoric supply distribution — historically precedes local tops.',
    color: '#c9a227',
  };
  if (inProfit >= 70) return {
    text: 'Healthy majority in profit — bull market conditions.',
    color: '#2d6a4f',
  };
  if (inProfit >= 50) return {
    text: 'Mixed — market at an inflection point.',
    color: '#c9a227',
  };
  return {
    text: 'Majority underwater — capitulation or accumulation zone.',
    color: '#8b3a3a',
  };
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

interface CustomTooltipProps extends TooltipProps<number, string> {
  isDark: boolean;
  totalSupply: number;
}

function CustomTooltip({ active, payload, isDark, totalSupply }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const C   = chartColors(isDark);
  const raw = payload[0]?.payload as URPDBucket | undefined;
  if (!raw) return null;

  const pct = totalSupply > 0
    ? ((raw.supply / totalSupply) * 100).toFixed(2)
    : '—';

  return (
    <div
      style={{
        background:    C.tooltipBg,
        border:        `1px solid ${C.tooltipBorder}`,
        borderRadius:  4,
        padding:       '8px 12px',
        fontFamily:    'var(--font-mono)',
        fontSize:      11,
        color:         C.tooltipText,
        minWidth:      200,
      }}
    >
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 11, marginBottom: 6, letterSpacing: '0.05em' }}>
        Cost basis bucket
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
        <span style={{ opacity: 0.7 }}>Price range</span>
        <span>{formatUSD(raw.price)} – {formatUSD(raw.price + 2_500)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
        <span style={{ opacity: 0.7 }}>Supply</span>
        <span>{formatSupply(raw.supply)} BTC</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderTop: `1px solid ${C.tooltipBorder}`, marginTop: 5, paddingTop: 5 }}>
        <span style={{ opacity: 0.7 }}>% of supply</span>
        <span>{pct}%</span>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

// Ticks to render on the Y-axis — must match bin boundaries exactly
const Y_TICKS = [0, 10_000, 20_000, 30_000, 40_000, 50_000, 60_000, 70_000, 80_000, 90_000, 100_000, 110_000, 120_000, 130_000];

export function URPDPanel() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const C      = chartColors(isDark);

  const [data,    setData]    = useState<URPDResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/data/urpd')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<URPDResponse>;
      })
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e: Error) => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <PanelLoading />;
  if (error || !data?.buckets?.length) {
    return (
      <div style={{ padding: 16, fontFamily: 'var(--font-mono)', fontSize: 11, color: isDark ? '#e87a5a' : '#b04a2a', opacity: 0.85 }}>
        {error ? `Failed to load URPD data: ${error}` : 'No data available.'}
      </div>
    );
  }

  const { buckets, currentPrice, realisedPrice, inProfit, atLoss } = data;
  const totalSupply = buckets.reduce((s, b) => s + b.supply, 0);
  const status      = statusText(inProfit);

  // Accent colour: gold (parchment) / teal (dark)
  const accentColor = isDark ? '#00d4c8' : '#b8860b';
  const mutedColor  = isDark ? '#4a6b66' : '#a0906a';

  // Find the bins nearest to current and realised price for reference lines
  const BIN_SIZE       = 2_500;
  const currentBin     = Math.floor(currentPrice / BIN_SIZE) * BIN_SIZE;
  const realisedBin    = Math.floor(realisedPrice / BIN_SIZE) * BIN_SIZE;

  const axisStyle = {
    fontSize:   9,
    fontFamily: 'var(--font-mono)',
    fill:       C.axisTick,
  } as const;

  // Today's date for header
  const todayLabel = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  });

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
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'flex-start',
          marginBottom:   6,
          paddingBottom:  4,
          borderBottom:   `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
          flexShrink:     0,
        }}
      >
        <div>
          <span
            style={{
              display:       'block',
              fontFamily:    'var(--font-heading)',
              fontSize:      11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color:         C.axisTick,
            }}
          >
            Supply at Cost Basis
          </span>
          <span
            style={{
              display:       'block',
              fontFamily:    'var(--font-mono)',
              fontSize:      9,
              color:         isDark ? '#4a6b66' : '#b0956a',
              letterSpacing: '0.03em',
              marginTop:     1,
            }}
          >
            BTC supply grouped by last-moved price (URPD)
          </span>
        </div>
        <span
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      9,
            color:         isDark ? '#4a6b66' : '#b0956a',
            letterSpacing: '0.04em',
            whiteSpace:    'nowrap',
            marginLeft:    8,
          }}
        >
          {todayLabel} · BRK
        </span>
      </div>

      {/* ── Profit/loss split bar ───────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, marginBottom: 6 }}>
        <div
          style={{
            display:        'flex',
            justifyContent: 'space-between',
            fontFamily:     'var(--font-mono)',
            fontSize:        9,
            color:           C.axisTick,
            marginBottom:    3,
          }}
        >
          <span style={{ color: '#2d6a4f' }}>{inProfit.toFixed(1)}% of supply in profit</span>
          <span style={{ color: '#8b3a3a' }}>{atLoss.toFixed(1)}% at a loss</span>
        </div>
        <div
          style={{
            display:      'flex',
            height:        6,
            borderRadius:  2,
            overflow:      'hidden',
            background:    isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ flex: inProfit, background: '#2d6a4f', opacity: 0.85 }} />
          <div style={{ flex: atLoss,   background: '#8b3a3a', opacity: 0.85 }} />
        </div>
      </div>

      {/* ── Status callout ─────────────────────────────────────────────────── */}
      <div
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      9,
          color:         status.color,
          letterSpacing: '0.04em',
          marginBottom:  6,
          flexShrink:    0,
        }}
      >
        {status.text}
      </div>

      {/* ── BarChart — horizontal bars, price on Y-axis ─────────────────────
          NOTE: Recharts categorical YAxis does not support scale="log".
          Bars are in $2,500 linear increments with selective tick labels only.
      ─────────────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={buckets}
            layout="vertical"
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="0%"
            barGap={0}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={C.gridLine}
              horizontal={false}
            />
            {/* X-axis = supply (value axis) */}
            <XAxis
              type="number"
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${formatSupply(v)}`}
              width={40}
              height={18}
            />
            {/* Y-axis = price (category axis) — show only key price labels */}
            <YAxis
              type="category"
              dataKey="price"
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              width={44}
              ticks={Y_TICKS}
              tickFormatter={(v: number) => formatUSD(v)}
            />
            <Tooltip
              content={
                <CustomTooltip
                  isDark={isDark}
                  totalSupply={totalSupply}
                  active={undefined}
                  payload={undefined}
                  label={undefined}
                />
              }
              cursor={{ fill: C.crosshair }}
            />

            {/* Current price reference line — solid accent, label at top */}
            <ReferenceLine
              y={currentBin}
              stroke={accentColor}
              strokeWidth={2}
              label={{
                value:      `NOW ${formatUSD(currentPrice)}`,
                position:   'insideRight',
                fill:       accentColor,
                fontFamily: 'var(--font-mono)',
                fontSize:   8,
                letterSpacing: '0.05em',
              }}
            />
            {/* Realised price reference line — dashed, muted */}
            <ReferenceLine
              y={realisedBin}
              stroke={mutedColor}
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{
                value:      `REALISED ${formatUSD(realisedPrice)}`,
                position:   'insideRight',
                fill:       mutedColor,
                fontFamily: 'var(--font-mono)',
                fontSize:   8,
                letterSpacing: '0.05em',
              }}
            />

            {/* Horizontal supply bars — colour per bar based on vs current price */}
            <Bar
              dataKey="supply"
              isAnimationActive={false}
              barSize={4}
            >
              {buckets.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={barColor(entry.price, currentPrice)}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Colour legend ───────────────────────────────────────────────────── */}
      <div
        style={{
          display:    'flex',
          gap:        12,
          marginTop:  4,
          flexShrink: 0,
          flexWrap:   'wrap',
        }}
      >
        {[
          { color: '#2d6a4f', label: 'In profit' },
          { color: '#c9a227', label: 'Near price' },
          { color: '#8b3a3a', label: 'Underwater' },
        ].map(({ color, label }) => (
          <span
            key={label}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 9, color: C.axisTick }}
          >
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: color, opacity: 0.85 }} />
            {label}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 9, color: C.axisTick }}>
          <span style={{ display: 'inline-block', width: 16, height: 2, background: accentColor }} />
          <span>Spot</span>
          <span style={{ display: 'inline-block', width: 16, height: 2, background: mutedColor, borderTop: '1px dashed' }} />
          <span>Realised</span>
        </span>
      </div>

      {/* ── Narrative callout ───────────────────────────────────────────────── */}
      <div
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      9,
          color:         isDark ? '#3a5a56' : '#c4a87a',
          marginTop:     4,
          lineHeight:    1.5,
          letterSpacing: '0.03em',
          flexShrink:    0,
        }}
      >
        Dense supply clusters act as support and resistance. The realised price is the market's true average cost — price above it means the average holder is in profit.
      </div>
    </div>
  );
}
