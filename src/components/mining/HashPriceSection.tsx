'use client';

import { useTheme } from '@/components/layout/ThemeProvider';
import { DataRow, formatPrice, formatPct, pctColor, chartColors } from '@/components/panels/shared';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";
const FONT_SERIF = "'Source Serif 4', 'Georgia', serif";

interface Props {
  current: number;
  history: { date: string; hashPrice: number; btcPrice: number }[];
  signal: 'profitable' | 'marginal' | 'unprofitable';
  breakevenHashPrice: number;
  marginPct: number;
  breakevenBtcPrice: number;
  energyPrices: Record<string, { priceKwh: number; source: string; label: string }>;
  globalWeightedAvg: number;
  efficientMinerJPerTH: number;
}

const SIGNAL_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  profitable: { bg: 'var(--accent-success)', color: '#fff', label: 'PROFITABLE' },
  marginal: { bg: '#f59e0b', color: '#1a1a1a', label: 'MARGINAL' },
  unprofitable: { bg: 'var(--accent-danger)', color: '#fff', label: 'UNPROFITABLE' },
};

// Key regions to display in energy comparison table
const DISPLAY_REGIONS = ['US-TX', 'NO', 'RU', 'PY', 'ET', 'GLOBAL'];

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
}

function marginColor(pct: number): string {
  if (pct > 20) return 'var(--accent-success)';
  if (pct > 0) return '#f59e0b';
  return 'var(--accent-danger)';
}

export default function HashPriceSection({
  current,
  history,
  signal,
  breakevenHashPrice,
  marginPct,
  breakevenBtcPrice,
  energyPrices,
  globalWeightedAvg,
  efficientMinerJPerTH,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';
  const font = isDark ? FONT_MONO : FONT_SERIF;
  const colors = chartColors(isDark);
  const signalStyle = SIGNAL_STYLES[signal] ?? SIGNAL_STYLES.marginal;

  // Compute implied breakeven hash price for each energy region
  // Formula: breakevenHashPrice scales linearly with energy cost relative to the global weighted average
  const computeImpliedBreakeven = (priceKwh: number) => {
    if (globalWeightedAvg === 0) return 0;
    return breakevenHashPrice * (priceKwh / globalWeightedAvg);
  };

  const computeImpliedMargin = (priceKwh: number) => {
    const implied = computeImpliedBreakeven(priceKwh);
    if (implied === 0) return 0;
    return ((current - implied) / implied) * 100;
  };

  // Resolve which energy regions to display
  const displayEntries = DISPLAY_REGIONS
    .map((key) => {
      const ep = energyPrices[key];
      if (!ep) return null;
      return { key, ...ep };
    })
    .filter(Boolean) as { key: string; priceKwh: number; source: string; label: string }[];

  return (
    <section style={{ fontFamily: font }}>
      {/* Section label */}
      <div
        style={{
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          color: 'var(--text-muted)',
          marginBottom: 12,
        }}
      >
        HASH PRICE VS ENERGY — MINER MARGIN
      </div>

      {/* Hero row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <span
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: font,
          }}
        >
          ${current.toFixed(3)} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>/TH/s/day</span>
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '3px 10px',
            background: signalStyle.bg,
            color: signalStyle.color,
          }}
        >
          {signalStyle.label}
        </span>
      </div>

      {/* Chart */}
      <div style={{ marginBottom: 20 }}>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={history} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.gridLine} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              tick={{ fill: colors.axisTick, fontSize: 10, fontFamily: font }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: colors.axisTick, fontSize: 10, fontFamily: font }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                background: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                color: colors.tooltipText,
                fontFamily: font,
                fontSize: 11,
              }}
              labelFormatter={(label: unknown) => formatDateShort(String(label))}
              formatter={(value: unknown, name: unknown) => {
                const v = Number(value);
                const n = String(name);
                if (n === 'hashPrice') return [`$${v.toFixed(4)}`, 'Hash Price'];
                if (n === 'btcPrice') return [formatPrice(v), 'BTC Price'];
                return [v, n];
              }}
            />
            <ReferenceLine
              y={breakevenHashPrice}
              stroke="var(--accent-danger)"
              strokeDasharray="6 3"
              label={{
                value: 'Breakeven',
                position: 'right',
                fill: 'var(--accent-danger)',
                fontSize: 10,
                fontFamily: font,
              }}
            />
            <Area
              type="monotone"
              dataKey="hashPrice"
              fill="var(--accent-success)"
              fillOpacity={0.08}
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="hashPrice"
              stroke="var(--accent-primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* DataRow grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          marginBottom: 24,
        }}
      >
        <DataRow
          label="Margin"
          value={`${marginPct > 0 ? '+' : ''}${marginPct.toFixed(1)}%`}
          color={marginColor(marginPct)}
        />
        <DataRow
          label={`Breakeven (${efficientMinerJPerTH} J/TH)`}
          value={`$${breakevenHashPrice.toFixed(4)}`}
        />
        <DataRow
          label="BTC Breakeven"
          value={formatPrice(breakevenBtcPrice)}
        />
      </div>

      {/* Energy cost comparison table */}
      {displayEntries.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: 'var(--text-muted)',
              marginBottom: 8,
            }}
          >
            ENERGY COST COMPARISON
          </div>

          {/* Table header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 0.8fr 1fr 0.8fr',
              gap: 4,
              padding: '6px 0',
              borderBottom: '1px solid var(--border-primary)',
              fontSize: 10,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            <span>Region</span>
            <span style={{ textAlign: 'right' }}>$/kWh</span>
            <span style={{ textAlign: 'right' }}>Breakeven HP</span>
            <span style={{ textAlign: 'right' }}>Margin</span>
          </div>

          {/* Table rows */}
          {displayEntries.map((entry) => {
            const impliedBE = computeImpliedBreakeven(entry.priceKwh);
            const impliedMargin = computeImpliedMargin(entry.priceKwh);

            return (
              <div
                key={entry.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 0.8fr 1fr 0.8fr',
                  gap: 4,
                  padding: '6px 0',
                  borderBottom: '1px solid var(--border-primary)',
                  fontSize: 11,
                }}
              >
                <span style={{ color: 'var(--text-primary)' }}>{entry.label}</span>
                <span style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                  ${entry.priceKwh.toFixed(3)}
                </span>
                <span style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                  ${impliedBE.toFixed(4)}
                </span>
                <span
                  style={{
                    textAlign: 'right',
                    fontWeight: 600,
                    color: marginColor(impliedMargin),
                  }}
                >
                  {impliedMargin > 0 ? '+' : ''}
                  {impliedMargin.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
