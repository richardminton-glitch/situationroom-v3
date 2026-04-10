'use client';

import { useTheme } from '@/components/layout/ThemeProvider';
import { formatPrice } from '@/components/panels/shared';
import { chartColors } from '@/components/panels/shared';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface SecurityBudgetProjection {
  year: number;
  halvingEpoch: number;
  subsidyBtc: number;
  dailySubsidyUsd: number;
  dailyFeesUsd: number;
  dailyTotalUsd: number;
  subsidyPct: number;
  feePct: number;
}

interface Props {
  current: SecurityBudgetProjection;
  conservative: SecurityBudgetProjection[];
  base: SecurityBudgetProjection[];
  optimistic: SecurityBudgetProjection[];
  btcPrice: number;
}

function formatBudget(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function subsidyPctColor(pct: number): string {
  if (pct >= 80) return '#22c55e';
  if (pct >= 60) return '#84cc16';
  if (pct >= 40) return '#f59e0b';
  if (pct >= 20) return '#f97316';
  return '#ef4444';
}

export function SecurityBudgetSection({
  current,
  conservative,
  base,
  optimistic,
  btcPrice,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';
  const colors = chartColors(isDark);

  // Build chart data merging all three scenarios
  const chartData = base.map((b, i) => ({
    year: b.year,
    subsidy: b.dailySubsidyUsd,
    fees: b.dailyFeesUsd,
    conservative: conservative[i]?.dailyTotalUsd ?? 0,
    base: b.dailyTotalUsd,
    optimistic: optimistic[i]?.dailyTotalUsd ?? 0,
  }));

  const halvingYears = [2028, 2032, 2036, 2040];

  return (
    <div>
      {/* Section label */}
      <div
        style={{
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          color: 'var(--text-muted)',
          marginBottom: 12,
          fontFamily: FONT,
        }}
      >
        NETWORK SECURITY BUDGET — POST-SUBSIDY TRAJECTORY
      </div>

      {/* Current state hero row */}
      <div
        style={{
          display: 'flex',
          gap: 24,
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        {/* Daily budget */}
        <div>
          <div
            style={{
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              marginBottom: 4,
              fontFamily: FONT,
            }}
          >
            DAILY SECURITY BUDGET
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: isDark ? FONT : "'Source Serif 4', 'Georgia', serif",
            }}
          >
            {formatPrice(current.dailyTotalUsd)}
          </div>
        </div>

        {/* Subsidy vs Fees bar */}
        <div style={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
          <div
            style={{
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              marginBottom: 6,
              fontFamily: FONT,
            }}
          >
            SUBSIDY vs FEES
          </div>
          <div
            style={{
              display: 'flex',
              height: 14,
              width: '100%',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${current.subsidyPct}%`,
                backgroundColor: 'var(--accent-primary)',
                height: '100%',
              }}
            />
            <div
              style={{
                width: `${current.feePct}%`,
                backgroundColor: '#f59e0b',
                height: '100%',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 4,
              fontSize: 10,
              fontFamily: FONT,
              color: 'var(--text-muted)',
            }}
          >
            <span>Subsidy {current.subsidyPct.toFixed(1)}%</span>
            <span>Fees {current.feePct.toFixed(1)}%</span>
          </div>
        </div>

        {/* Current subsidy */}
        <div>
          <div
            style={{
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              marginBottom: 4,
              fontFamily: FONT,
            }}
          >
            CURRENT SUBSIDY
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: isDark ? FONT : "'Source Serif 4', 'Georgia', serif",
            }}
          >
            3.125 BTC/block
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ marginBottom: 24 }}>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}
            />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 10, fill: colors.axisTick }}
              tickLine={false}
              axisLine={{ stroke: colors.gridLine }}
              fontFamily={FONT}
            />
            <YAxis
              tickFormatter={formatBudget}
              tick={{ fontSize: 10, fill: colors.axisTick }}
              tickLine={false}
              axisLine={{ stroke: colors.gridLine }}
              fontFamily={FONT}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#1a1a2e' : '#fff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 0,
                fontSize: 11,
                fontFamily: FONT,
              }}
              formatter={(value: unknown, name: unknown) => [
                formatBudget(Number(value)),
                String(name).charAt(0).toUpperCase() + String(name).slice(1),
              ]}
              labelFormatter={(label) => `Year ${label}`}
            />

            {/* Stacked areas */}
            <Area
              type="monotone"
              dataKey="subsidy"
              stackId="budget"
              fill="var(--accent-primary)"
              fillOpacity={0.3}
              stroke="none"
              name="Subsidy"
            />
            <Area
              type="monotone"
              dataKey="fees"
              stackId="budget"
              fill="#f59e0b"
              fillOpacity={0.3}
              stroke="none"
              name="Fees"
            />

            {/* Scenario lines */}
            <Line
              type="monotone"
              dataKey="conservative"
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              name="Conservative"
            />
            <Line
              type="monotone"
              dataKey="base"
              stroke="var(--accent-primary)"
              strokeWidth={2}
              dot={false}
              name="Base"
            />
            <Line
              type="monotone"
              dataKey="optimistic"
              stroke="#22c55e"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              name="Optimistic"
            />

            {/* Halving reference lines */}
            {halvingYears.map((yr) => (
              <ReferenceLine
                key={yr}
                x={yr}
                stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}
                strokeDasharray="2 2"
                label={{
                  value: '\u00bd',
                  position: 'top',
                  fontSize: 11,
                  fill: 'var(--text-muted)',
                  fontFamily: FONT,
                }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Projection table */}
      <div style={{ marginBottom: 16 }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12,
            fontFamily: isDark ? FONT : "'Source Serif 4', 'Georgia', serif",
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Year', 'Halving Epoch', 'Subsidy (BTC/block)', 'Daily Budget (USD)', 'Subsidy %', 'Fee %'].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: h === 'Year' ? 'left' : 'right',
                      padding: '6px 8px',
                      fontSize: 9,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'var(--text-muted)',
                      fontWeight: 500,
                      fontFamily: FONT,
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {base.map((row) => (
              <tr key={row.year} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '6px 8px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {row.year}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {row.halvingEpoch}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {row.subsidyBtc}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {formatBudget(row.dailyTotalUsd)}
                </td>
                <td
                  style={{
                    padding: '6px 8px',
                    textAlign: 'right',
                    color: subsidyPctColor(row.subsidyPct),
                    fontWeight: 600,
                  }}
                >
                  {row.subsidyPct.toFixed(1)}%
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {row.feePct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Note */}
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          fontFamily: FONT,
          lineHeight: 1.6,
          maxWidth: 720,
        }}
      >
        Projections assume constant BTC price ({formatPrice(btcPrice)}) and vary fee assumptions
        (1x/2x/5x current). Reality will depend on price appreciation, adoption, and fee market
        maturity.
      </div>
    </div>
  );
}
