'use client';

import { useTheme } from '@/components/layout/ThemeProvider';
import { formatPrice, chartColors } from '@/components/panels/shared';
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

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

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

const DISPLAY_REGIONS = ['US-TX', 'NO', 'RU', 'PY', 'ET'];

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
  const colors = chartColors(isDark);
  const signalStyle = SIGNAL_STYLES[signal] ?? SIGNAL_STYLES.marginal;

  // Compute breakeven hash price at a given energy cost
  // breakevenAtCost = (efficiency / 1000) * 24 * priceKwh
  // margin at that cost = ((current - breakevenAtCost) / current) * 100
  const computeBreakevenAtCost = (priceKwh: number) => {
    return (efficientMinerJPerTH / 1000) * 24 * priceKwh;
  };

  const computeMarginAtCost = (priceKwh: number) => {
    const be = computeBreakevenAtCost(priceKwh);
    if (current === 0) return 0;
    return ((current - be) / current) * 100;
  };

  // Build energy display entries: specific regions + global weighted avg
  const energyEntries: { label: string; priceKwh: number }[] = [];
  for (const key of DISPLAY_REGIONS) {
    const ep = energyPrices[key];
    if (ep) {
      energyEntries.push({ label: ep.label, priceKwh: ep.priceKwh });
    }
  }
  // Add global weighted average
  if (globalWeightedAvg > 0) {
    energyEntries.push({ label: 'GLOBAL AVG', priceKwh: globalWeightedAvg });
  }

  // Metric rows helper
  const metricRows: { label: string; value: string; color?: string }[] = [
    {
      label: 'MARGIN',
      value: `${marginPct > 0 ? '+' : ''}${marginPct.toFixed(1)}%`,
      color: marginColor(marginPct),
    },
    {
      label: 'BREAKEVEN',
      value: `$${breakevenHashPrice.toFixed(4)}`,
    },
    {
      label: 'BTC BREAKEVEN',
      value: `$${formatPrice(breakevenBtcPrice, 0)}`,
    },
    {
      label: 'EFFICIENCY',
      value: `${efficientMinerJPerTH} J/TH`,
    },
  ];

  return (
    <section style={{ fontFamily: FONT }}>
      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── Left column: chart ── */}
        <div>
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
            HASH PRICE — MINER MARGIN
          </div>

          {/* Recharts ComposedChart */}
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={history} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.gridLine} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateShort}
                tick={{ fill: colors.axisTick, fontSize: 9, fontFamily: FONT }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: colors.axisTick, fontSize: 9, fontFamily: FONT }}
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
                  fontFamily: FONT,
                  fontSize: 11,
                  borderRadius: 0,
                }}
                labelFormatter={(label: unknown) => formatDateShort(String(label))}
                formatter={(value: unknown, name: unknown) => {
                  const v = Number(value);
                  const n = String(name);
                  if (n === 'hashPrice') return [`$${v.toFixed(4)}`, 'Hash Price'];
                  if (n === 'btcPrice') return [`$${formatPrice(v)}`, 'BTC Price'];
                  return [String(v), n];
                }}
              />
              <ReferenceLine
                y={breakevenHashPrice}
                stroke="var(--accent-danger)"
                strokeDasharray="6 3"
              />
              <Area
                type="monotone"
                dataKey="hashPrice"
                fill="var(--accent-success)"
                fillOpacity={0.06}
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

        {/* ── Right column: sidebar metrics ── */}
        <div>
          {/* Current hash price — large */}
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            ${current.toFixed(4)}
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>
              /TH/day
            </span>
          </div>

          {/* Signal badge */}
          <div style={{ marginTop: 4 }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: 9,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '2px 8px',
                background: signalStyle.bg,
                color: signalStyle.color,
              }}
            >
              {signalStyle.label}
            </span>
          </div>

          {/* Gap */}
          <div style={{ height: 12 }} />

          {/* Metric rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {metricRows.map((row) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {row.label}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: row.color ?? 'var(--text-primary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border-subtle)', margin: '12px 0' }} />

          {/* Energy costs sub-label */}
          <div
            style={{
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: 'var(--text-muted)',
              marginBottom: 8,
            }}
          >
            ENERGY COSTS
          </div>

          {/* Compact energy list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {energyEntries.map((entry) => {
              const m = computeMarginAtCost(entry.priceKwh);
              return (
                <div
                  key={entry.label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    gap: 8,
                    alignItems: 'baseline',
                  }}
                >
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {entry.label}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-primary)',
                      fontVariantNumeric: 'tabular-nums',
                      textAlign: 'right',
                    }}
                  >
                    ${entry.priceKwh.toFixed(3)}/kWh
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: marginColor(m),
                      fontVariantNumeric: 'tabular-nums',
                      textAlign: 'right',
                      minWidth: 48,
                    }}
                  >
                    {m > 0 ? '+' : ''}{m.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
