'use client';

import { useTheme } from '@/components/layout/ThemeProvider';
import { formatPrice, chartColors } from '@/components/panels/shared';
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

function budgetColor(subsidyPct: number): string {
  if (subsidyPct >= 80) return 'var(--text-primary)';
  if (subsidyPct >= 60) return '#f59e0b';
  if (subsidyPct >= 40) return '#f97316';
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
    baseTotal: b.dailyTotalUsd,
    conservativeTotal: conservative[i]?.dailyTotalUsd ?? 0,
    optimisticTotal: optimistic[i]?.dailyTotalUsd ?? 0,
  }));

  const halvingYears = [2028, 2032, 2036, 2040];

  // Key halving rows for sidebar projections
  const projectionYears = [2024, 2028, 2032, 2036, 2040];
  const projectionRows = projectionYears
    .map((yr) => base.find((b) => b.year === yr))
    .filter((r): r is SecurityBudgetProjection => r != null);

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
        SECURITY BUDGET — POST-SUBSIDY TRAJECTORY
      </div>

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left column — chart */}
        <div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.gridLine} />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 9, fill: colors.axisTick }}
                tickLine={false}
                axisLine={{ stroke: colors.gridLine }}
                fontFamily={FONT}
              />
              <YAxis
                tickFormatter={(value: unknown) => formatBudget(Number(value))}
                tick={{ fontSize: 9, fill: colors.axisTick }}
                tickLine={false}
                axisLine={{ stroke: colors.gridLine }}
                fontFamily={FONT}
                width={56}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: colors.tooltipBg,
                  border: `1px solid ${colors.tooltipBorder}`,
                  borderRadius: 0,
                  fontSize: 11,
                  fontFamily: FONT,
                  color: colors.tooltipText,
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
                fillOpacity={0.2}
                stroke="none"
                name="Subsidy"
              />
              <Area
                type="monotone"
                dataKey="fees"
                stackId="budget"
                fill="#f59e0b"
                fillOpacity={0.2}
                stroke="none"
                name="Fees"
              />

              {/* Scenario lines */}
              <Line
                type="monotone"
                dataKey="baseTotal"
                stroke="var(--text-primary)"
                strokeWidth={1.5}
                dot={false}
                name="Base"
              />
              <Line
                type="monotone"
                dataKey="conservativeTotal"
                stroke="var(--text-muted)"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
                name="Conservative"
              />
              <Line
                type="monotone"
                dataKey="optimisticTotal"
                stroke="var(--accent-success)"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
                name="Optimistic"
              />

              {/* Halving reference lines */}
              {halvingYears.map((yr) => (
                <ReferenceLine
                  key={yr}
                  x={yr}
                  stroke="var(--border-primary)"
                  strokeDasharray="3 3"
                  label={{
                    value: '\u00bd',
                    position: 'top',
                    fontSize: 10,
                    fill: 'var(--text-muted)',
                    fontFamily: FONT,
                  }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Right column — sidebar */}
        <div>
          {/* Current state */}
          <div
            style={{
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: 'var(--text-muted)',
              marginBottom: 8,
              fontFamily: FONT,
            }}
          >
            CURRENT STATE
          </div>

          {/* Daily budget — large */}
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: FONT,
              fontVariantNumeric: 'tabular-nums',
              marginBottom: 10,
            }}
          >
            {formatBudget(current.dailyTotalUsd)}
          </div>

          {/* Proportional bar */}
          <div
            style={{
              display: 'flex',
              height: 8,
              width: '100%',
              overflow: 'hidden',
              marginBottom: 4,
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
              fontSize: 10,
              fontFamily: FONT,
              color: 'var(--text-muted)',
              marginBottom: 10,
            }}
          >
            <span>Subsidy {current.subsidyPct.toFixed(1)}%</span>
            <span>Fees {current.feePct.toFixed(1)}%</span>
          </div>

          {/* Current subsidy rate */}
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              fontFamily: FONT,
              marginBottom: 10,
            }}
          >
            3.125 BTC/block
          </div>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: 'var(--border-subtle)', margin: '10px 0' }} />

          {/* Projections */}
          <div
            style={{
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: 'var(--text-muted)',
              marginBottom: 8,
              fontFamily: FONT,
            }}
          >
            PROJECTIONS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {projectionRows.map((row) => (
              <div
                key={row.year}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    fontFamily: FONT,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {row.year}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    fontFamily: FONT,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {row.subsidyBtc} BTC
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: FONT,
                    fontVariantNumeric: 'tabular-nums',
                    color: budgetColor(row.subsidyPct),
                    fontWeight: 500,
                  }}
                >
                  {formatBudget(row.dailyTotalUsd)}
                </span>
              </div>
            ))}
          </div>

          {/* Note */}
          <div
            style={{
              fontSize: 9,
              color: 'var(--text-muted)',
              fontFamily: FONT,
              lineHeight: 1.5,
              marginTop: 12,
            }}
          >
            Assumes constant ${formatPrice(btcPrice, 0)} BTC. Fee scenarios: 1x/2x/5x current.
          </div>
        </div>
      </div>
    </div>
  );
}
