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

const MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

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
  marginal: { bg: '#f59e0b', color: 'var(--bg-primary)', label: 'MARGINAL' },
  unprofitable: { bg: 'var(--accent-danger)', color: '#fff', label: 'UNPROFITABLE' },
};

const DISPLAY_REGIONS = ['US-TX', 'NO', 'RU', 'PY', 'ET'];

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[d.getMonth()]}`;
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

  const computeMarginAtCost = (priceKwh: number) => {
    const be = (efficientMinerJPerTH / 1000) * 24 * priceKwh;
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
  if (globalWeightedAvg > 0) {
    energyEntries.push({ label: 'GLOBAL', priceKwh: globalWeightedAvg });
  }

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
    <section>
      {/* Two-column grid: 5fr 2fr */}
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 2fr', gap: 28, alignItems: 'start' }}>

        {/* ── Left column: chart ── */}
        <div>
          {/* Section label */}
          <div
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: '0.16em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            HASH PRICE — MINER MARGIN
          </div>

          {/* Chart container */}
          <div
            style={{
              border: '1px solid var(--border-subtle)',
              padding: 16,
            }}
          >
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={history} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.gridLine} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateShort}
                  tick={{ fill: colors.axisTick, fontSize: 9, fontFamily: MONO }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: colors.axisTick, fontSize: 9, fontFamily: MONO }}
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
                    fontFamily: MONO,
                    fontSize: 10,
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
                  label={{
                    value: 'Breakeven',
                    position: 'right',
                    fontSize: 9,
                    fill: 'var(--accent-danger)',
                    fontFamily: MONO,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hashPrice"
                  fill="var(--accent-success)"
                  fillOpacity={0.12}
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
        </div>

        {/* ── Right column: sidebar ── */}
        <div>
          {/* 1. Hash price hero */}
          <div
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            ${current.toFixed(4)}
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 10,
              color: 'var(--text-muted)',
              marginBottom: 8,
            }}
          >
            /TH/s/day
          </div>

          {/* 2. Signal badge */}
          <div style={{ marginBottom: 16 }}>
            <span
              style={{
                display: 'inline-block',
                background: signalStyle.bg,
                color: signalStyle.color,
                fontFamily: MONO,
                fontSize: 8,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '3px 8px',
              }}
            >
              {signalStyle.label}
            </span>
          </div>

          {/* 3. Metrics block — rows with 1px borders between */}
          <div>
            {metricRows.map((row, i) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  padding: '8px 0',
                  borderBottom: i < metricRows.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 9,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {row.label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: 13,
                    color: row.color ?? 'var(--text-primary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* 4. Energy costs — compact comparison */}
          <div
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: '0.16em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            REGIONAL ENERGY
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {energyEntries.map((entry) => {
              const m = computeMarginAtCost(entry.priceKwh);
              return (
                <div
                  key={entry.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    padding: '4px 0',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 9,
                      color: 'var(--text-muted)',
                    }}
                  >
                    {entry.label}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-data)',
                      fontSize: 10,
                      color: 'var(--text-primary)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    ${entry.priceKwh.toFixed(3)}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-data)',
                      fontSize: 10,
                      fontWeight: 600,
                      color: marginColor(m),
                      fontVariantNumeric: 'tabular-nums',
                      minWidth: 40,
                      textAlign: 'right',
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
