'use client';

import { useMemo } from 'react';
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

const MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

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

  const chartData = useMemo(() => base.map((b, i) => ({
    year: b.year,
    subsidy: b.dailySubsidyUsd,
    fees: b.dailyFeesUsd,
    baseTotal: b.dailyTotalUsd,
    conservativeTotal: conservative[i]?.dailyTotalUsd ?? 0,
    optimisticTotal: optimistic[i]?.dailyTotalUsd ?? 0,
  })), [base, conservative, optimistic]);

  const halvingYears = [2028, 2032, 2036, 2040];

  const projectionRows = useMemo(() => {
    const years = [2024, 2028, 2032, 2036, 2040];
    return years
      .map(yr => base.find(b => b.year === yr))
      .filter((r): r is SecurityBudgetProjection => r != null);
  }, [base]);

  // Inline metrics strip data
  const metricsStrip = [
    { label: 'DAILY BUDGET', value: formatBudget(current.dailyTotalUsd), isBold: true },
    { label: 'SUBSIDY', value: `${current.subsidyPct.toFixed(0)}% subsidy`, bar: current.subsidyPct },
    { label: 'FEES', value: `${current.feePct.toFixed(0)}% fees` },
    { label: 'BLOCK SUBSIDY', value: `${current.subsidyBtc} BTC/block` },
  ];

  return (
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
        SECURITY BUDGET — POST-SUBSIDY TRAJECTORY
      </div>

      {/* Inline metrics strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '10px 0',
        }}
      >
        {metricsStrip.map((m, i) => (
          <div
            key={m.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              padding: '0 16px',
              borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none',
              paddingLeft: i === 0 ? 0 : 16,
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 8,
                letterSpacing: '0.14em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              {m.label}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: m.isBold ? 16 : 13,
                  fontWeight: m.isBold ? 700 : 500,
                  color: 'var(--text-primary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {m.value}
              </span>
              {m.bar != null && (
                <div
                  style={{
                    width: 60,
                    height: 6,
                    display: 'flex',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${m.bar}%`,
                      backgroundColor: 'var(--accent-primary)',
                      height: '100%',
                    }}
                  />
                  <div
                    style={{
                      width: `${100 - m.bar}%`,
                      backgroundColor: '#f59e0b',
                      height: '100%',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Chart container */}
      <div
        style={{
          border: '1px solid var(--border-subtle)',
          padding: 16,
          marginTop: 16,
        }}
      >
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.gridLine} />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 9, fill: colors.axisTick, fontFamily: MONO }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value: unknown) => formatBudget(Number(value))}
              tick={{ fontSize: 9, fill: colors.axisTick, fontFamily: MONO }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: 0,
                fontSize: 10,
                fontFamily: MONO,
                color: colors.tooltipText,
              }}
              formatter={(value: unknown, name: unknown) => {
                const v = Number(value);
                const n = String(name);
                const labels: Record<string, string> = {
                  subsidy: 'Subsidy',
                  fees: 'Fees',
                  baseTotal: 'Base',
                  conservativeTotal: 'Conservative',
                  optimisticTotal: 'Optimistic',
                };
                return [formatBudget(v), labels[n] ?? n];
              }}
              labelFormatter={(label) => `Year ${label}`}
            />

            {/* Stacked areas */}
            <Area
              type="monotone"
              dataKey="subsidy"
              stackId="budget"
              fill="var(--accent-primary)"
              fillOpacity={0.15}
              stroke="none"
              name="subsidy"
            />
            <Area
              type="monotone"
              dataKey="fees"
              stackId="budget"
              fill="#f59e0b"
              fillOpacity={0.15}
              stroke="none"
              name="fees"
            />

            {/* Scenario lines */}
            <Line
              type="monotone"
              dataKey="baseTotal"
              stroke="var(--text-primary)"
              strokeWidth={1.5}
              dot={false}
              name="baseTotal"
            />
            <Line
              type="monotone"
              dataKey="conservativeTotal"
              stroke="var(--text-muted)"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              name="conservativeTotal"
            />
            <Line
              type="monotone"
              dataKey="optimisticTotal"
              stroke="var(--accent-success)"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              name="optimisticTotal"
            />

            {/* Halving reference lines */}
            {halvingYears.map((yr) => (
              <ReferenceLine
                key={yr}
                x={yr}
                stroke="var(--border-primary)"
                strokeDasharray="3 3"
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend + projection table */}
      <div style={{ marginTop: 12 }}>
        {/* Legend row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 12,
          }}
        >
          {[
            { label: 'Base', stroke: 'var(--text-primary)', dash: false },
            { label: 'Conservative', stroke: 'var(--text-muted)', dash: true },
            { label: 'Optimistic', stroke: 'var(--accent-success)', dash: true },
            { label: 'Subsidy', fill: 'var(--accent-primary)' },
            { label: 'Fees', fill: '#f59e0b' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {item.fill ? (
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 8,
                    backgroundColor: item.fill,
                    opacity: 0.4,
                  }}
                />
              ) : (
                <svg width={16} height={8}>
                  <line
                    x1={0}
                    y1={4}
                    x2={16}
                    y2={4}
                    stroke={item.stroke}
                    strokeWidth={item.dash ? 1 : 1.5}
                    strokeDasharray={item.dash ? '4 3' : undefined}
                  />
                </svg>
              )}
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  color: 'var(--text-muted)',
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Compact projection table */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr 1fr',
            gap: 1,
            backgroundColor: 'var(--border-subtle)',
          }}
        >
          {/* Header row */}
          {['YEAR', 'BTC/BLOCK', 'DAILY TOTAL'].map((h) => (
            <div
              key={h}
              style={{
                backgroundColor: 'var(--bg-primary)',
                padding: '6px 10px',
                fontFamily: MONO,
                fontSize: 8,
                letterSpacing: '0.14em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              {h}
            </div>
          ))}
          {/* Data rows */}
          {projectionRows.map((row) => (
            <>
              <div
                key={`${row.year}-yr`}
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  padding: '5px 10px',
                  fontFamily: 'var(--font-data)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {row.year}
              </div>
              <div
                key={`${row.year}-sub`}
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  padding: '5px 10px',
                  fontFamily: MONO,
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {row.subsidyBtc} BTC
              </div>
              <div
                key={`${row.year}-total`}
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  padding: '5px 10px',
                  fontFamily: 'var(--font-data)',
                  fontSize: 11,
                  color: 'var(--text-primary)',
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 500,
                }}
              >
                {formatBudget(row.dailyTotalUsd)}
              </div>
            </>
          ))}
        </div>

        {/* Note */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 9,
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            marginTop: 10,
          }}
        >
          Constant ${formatPrice(btcPrice, 0)} BTC. Fee scenarios: 1&times;/2&times;/5&times; current.
        </div>
      </div>
    </div>
  );
}
