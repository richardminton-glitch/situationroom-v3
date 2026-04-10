'use client';

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { CompositeRow } from '@/lib/signals/dca-engine';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface Props {
  chartData: CompositeRow[];
}

function formatXTick(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}

function formatPrice(v: number): string {
  if (v >= 1000) return '$' + (v / 1000).toFixed(0) + 'K';
  return '$' + v.toFixed(0);
}

// Only show a tick at the 1st of each month
function getMonthTicks(data: CompositeRow[]): string[] {
  const seen = new Set<string>();
  const ticks: string[] = [];
  for (const row of data) {
    const key = row.date.slice(0, 7); // YYYY-MM
    if (!seen.has(key)) {
      seen.add(key);
      ticks.push(row.date);
    }
  }
  return ticks;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const composite = payload.find((p: any) => p.dataKey === 'normalisedComposite');
  const price     = payload.find((p: any) => p.dataKey === 'price');

  return (
    <div style={{
      background:    'rgba(21,29,37,0.97)',
      border:        '1px solid rgba(255,255,255,0.1)',
      padding:       '8px 12px',
      fontFamily:    FONT,
      fontSize:      10,
      color:         '#e8edf2',
      letterSpacing: '0.06em',
      lineHeight:    1.8,
    }}>
      <div style={{ color: '#6b7a8d', marginBottom: 4 }}>{label}</div>
      {composite && (
        <div style={{ color: '#00d4c8' }}>
          SIGNAL  {Number(composite.value).toFixed(3)}×
        </div>
      )}
      {price && (
        <div style={{ color: '#8aaba6' }}>
          BTC     {formatPrice(Number(price.value))}
        </div>
      )}
    </div>
  );
}

export function SignalChart({ chartData }: Props) {
  if (!chartData || chartData.length === 0) {
    return (
      <div style={{
        height:      200,
        display:     'flex',
        alignItems:  'center',
        justifyContent: 'center',
        fontFamily:  FONT,
        color:       '#4a5568',
        fontSize:    10,
        letterSpacing: '0.1em',
      }}>
        NO CHART DATA
      </div>
    );
  }

  const monthTicks = getMonthTicks(chartData);

  return (
    <div style={{
      padding:    '16px 0 8px',
      borderTop:  '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Section label */}
      <span style={{
        display:       'block',
        fontSize:      9,
        letterSpacing: '0.14em',
        color:         '#6b7a8d',
        fontFamily:    FONT,
        marginBottom:  12,
      }}>
        12-MONTH SIGNAL HISTORY
      </span>

      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart
          data={chartData}
          margin={{ top: 4, right: 44, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            ticks={monthTicks}
            tickFormatter={formatXTick}
            tick={{ fontFamily: FONT, fontSize: 9, fill: '#6b7a8d', letterSpacing: 1 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />

          {/* Left axis — composite multiplier */}
          <YAxis
            yAxisId="left"
            domain={[0, 'auto']}
            tickFormatter={v => v.toFixed(1)}
            tick={{ fontFamily: FONT, fontSize: 9, fill: '#6b7a8d' }}
            axisLine={false}
            tickLine={false}
            width={32}
          />

          {/* Right axis — BTC price */}
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={formatPrice}
            tick={{ fontFamily: FONT, fontSize: 9, fill: '#4a5568' }}
            axisLine={false}
            tickLine={false}
            width={44}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* BTC price — muted, secondary */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="price"
            stroke="rgba(200,230,227,0.35)"
            strokeWidth={1}
            dot={false}
            isAnimationActive={false}
          />

          {/* Composite signal — prominent, teal */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="normalisedComposite"
            stroke="#00d4c8"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{
        display:    'flex',
        gap:        20,
        marginTop:  8,
        fontFamily: FONT,
        fontSize:   9,
        letterSpacing: '0.1em',
        color:      '#6b7a8d',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 16, height: 2, background: '#00d4c8' }} />
          COMPOSITE SIGNAL
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 16, height: 1, background: 'rgba(200,230,227,0.35)' }} />
          BTC PRICE
        </span>
      </div>
    </div>
  );
}
