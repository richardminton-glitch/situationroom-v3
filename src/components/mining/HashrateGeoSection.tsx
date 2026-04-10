'use client';

import { useTheme } from '@/components/layout/ThemeProvider';
import { formatLargeNumber, formatPct, chartColors } from '@/components/panels/shared';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";
const FONT_SERIF = "'Source Serif 4', 'Georgia', serif";

const REGION_COLORS: Record<string, string> = {
  US: '#3b82f6',
  CN: '#ef4444',
  RU: '#8b5cf6',
  KZ: '#f59e0b',
  CA: '#06b6d4',
  LATAM: '#10b981',
  EU: '#6366f1',
  ET: '#f97316',
  GULF: '#ec4899',
  OTHER: '#6b7280',
};

interface Props {
  regions: {
    id: string;
    name: string;
    share: number;
    hashrate: number;
    trend: string;
    trendVsPrev: number;
    notes: string;
  }[];
  totalHashrateEH: number;
  updatedAt: string;
  energyPrices: Record<string, { priceKwh: number; source: string; label: string }>;
}

export default function HashrateGeoSection({ regions, totalHashrateEH, updatedAt, energyPrices }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';
  const font = isDark ? FONT_MONO : FONT_SERIF;
  const colors = chartColors(isDark);

  // Build stacked bar data — single row with each region as a key
  const barData = [
    regions.reduce<Record<string, number>>((acc, r) => {
      acc[r.id] = r.share;
      return acc;
    }, {}),
  ];

  const trendArrow = (t: string) => {
    if (t === 'up') return '↑';
    if (t === 'down') return '↓';
    return '→';
  };

  const trendColor = (t: string) => {
    if (t === 'up') return 'var(--accent-success)';
    if (t === 'down') return 'var(--accent-danger)';
    return 'var(--text-muted)';
  };

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
        GLOBAL HASHRATE DISTRIBUTION
      </div>

      {/* Hero number */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--text-muted)',
            marginBottom: 4,
          }}
        >
          NETWORK HASHRATE
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: font,
          }}
        >
          {totalHashrateEH.toFixed(1)} EH/s
        </div>
      </div>

      {/* Stacked horizontal bar */}
      <div style={{ marginBottom: 8 }}>
        <ResponsiveContainer width="100%" height={36}>
          <BarChart
            layout="vertical"
            data={barData}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            barCategoryGap={0}
          >
            <XAxis type="number" hide domain={[0, 100]} />
            <YAxis type="category" hide dataKey={() => ''} />
            <Tooltip
              contentStyle={{
                background: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                color: colors.tooltipText,
                fontFamily: font,
                fontSize: 11,
              }}
              formatter={(value: unknown, name: unknown) => {
                const v = Number(value);
                const n = String(name);
                const region = regions.find((r) => r.id === n);
                return [`${v.toFixed(1)}%`, region?.name ?? n];
              }}
            />
            {regions.map((r) => (
              <Bar key={r.id} dataKey={r.id} stackId="geo" fill={REGION_COLORS[r.id] ?? '#6b7280'} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 16px',
          marginBottom: 24,
          fontSize: 11,
          color: 'var(--text-muted)',
        }}
      >
        {regions.map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: REGION_COLORS[r.id] ?? '#6b7280',
                flexShrink: 0,
              }}
            />
            <span>{r.name}</span>
            <span style={{ opacity: 0.7 }}>{r.share.toFixed(1)}%</span>
          </div>
        ))}
      </div>

      {/* Region cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 10,
          marginBottom: 16,
        }}
      >
        {regions.map((r) => {
          const regionColor = REGION_COLORS[r.id] ?? '#6b7280';
          const energy = energyPrices[r.id];

          return (
            <div
              key={r.id}
              style={{
                borderLeft: `3px solid ${regionColor}`,
                background: isDark ? 'var(--bg-card)' : 'transparent',
                borderBottom: isDark ? 'none' : '1px solid var(--border-primary)',
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 4,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                  {r.name}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {r.share.toFixed(1)}%
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                }}
              >
                <span>{r.hashrate.toFixed(1)} EH/s</span>
                <span style={{ color: trendColor(r.trend) }}>
                  {trendArrow(r.trend)} {r.trendVsPrev > 0 ? '+' : ''}
                  {r.trendVsPrev.toFixed(1)}%
                </span>
              </div>

              {energy && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                  Energy: ${energy.priceKwh.toFixed(3)}/kWh ({energy.label})
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Updated date */}
      <div
        style={{
          textAlign: 'right',
          fontSize: 10,
          color: 'var(--text-muted)',
        }}
      >
        Updated {updatedAt}
      </div>
    </section>
  );
}
