'use client';

/**
 * Energy Gravity Chart (Blockware model)
 *
 * Shows the breakeven electricity rate ($/kWh) over time.
 * Reference lines at key regional electricity costs show where
 * mining is profitable vs unprofitable in each region.
 *
 * Uses ParchmentChart (D3) with multiple reference lines.
 */

import { useMemo } from 'react';
import { useTheme } from '@/components/layout/ThemeProvider';
import { ParchmentChart } from '@/components/panels/charts/ParchmentChart';

const MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface Props {
  history: { date: string; gravity: number; hashPrice: number }[];
  current: number;
  globalAvgKwh: number;
  theme: string;
}

export function EnergyGravityChart({ history, current, globalAvgKwh, theme }: Props) {
  const isDark = theme !== 'parchment';

  // Map to ParchmentChart data format
  const chartData = useMemo(() =>
    history
      .filter(p => p.gravity > 0)
      .map(p => ({
        time: new Date(p.date + 'T00:00:00Z').getTime(),
        value: p.gravity,
      })),
    [history],
  );

  // Reference lines at key electricity costs
  const refLines = useMemo(() => [
    { value: globalAvgKwh, label: `Global $${globalAvgKwh.toFixed(2)}` },
  ], [globalAvgKwh]);

  const color = isDark
    ? (current > globalAvgKwh ? '#2dd4bf' : '#d06050')
    : (current > globalAvgKwh ? '#4a7c59' : '#9b3232');

  return (
    <div>
      {/* Label + current value */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 8,
      }}>
        <div style={{
          fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em',
          color: 'var(--text-muted)', textTransform: 'uppercase',
        }}>
          ENERGY GRAVITY
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{
            fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700,
            color, fontVariantNumeric: 'tabular-nums',
          }}>
            ${current.toFixed(3)}
          </span>
          <span style={{
            fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)',
          }}>
            /kWh
          </span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 200, position: 'relative' }}>
        <ParchmentChart
          data={chartData}
          title="ENERGY GRAVITY — 120 DAY"
          color={color}
          theme={theme}
          yFormat={(v) => `$${v.toFixed(3)}`}
          refLines={refLines}
        />
      </div>

      {/* Context note */}
      <div style={{
        fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)',
        marginTop: 6, lineHeight: 1.4,
      }}>
        Max affordable electricity at current BTC price + hashrate. Above the line = profitable.
      </div>
    </div>
  );
}
