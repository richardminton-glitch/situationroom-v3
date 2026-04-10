'use client';

import { useTheme } from '@/components/layout/ThemeProvider';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

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
    countries?: string[];
  }[];
  totalHashrateEH: number;
  updatedAt: string;
  energyPrices: Record<string, { priceKwh: number; source: string; label: string; updatedAt: string }>;
}

export default function HashrateGeoSection({ regions, totalHashrateEH, updatedAt, energyPrices }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

  return (
    <section style={{ fontFamily: FONT }}>
      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── Left column ── */}
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
            HASHRATE BY GEOGRAPHY
          </div>

          {/* Stacked horizontal bar — pure CSS flex */}
          <div
            style={{
              height: 28,
              display: 'flex',
              overflow: 'hidden',
              background: 'var(--border-subtle)',
            }}
          >
            {regions.map((r) => (
              <div
                key={r.id}
                style={{
                  flex: r.share,
                  background: REGION_COLORS[r.id] ?? '#6b7280',
                  minWidth: r.share > 0 ? 1 : 0,
                }}
                title={`${r.name}: ${r.share.toFixed(1)}%`}
              />
            ))}
          </div>

          {/* Legend strip */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              marginTop: 8,
            }}
          >
            {regions.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: REGION_COLORS[r.id] ?? '#6b7280',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.name}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {r.share.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column — region list ── */}
        <div>
          {regions.map((r, i) => {
            const color = REGION_COLORS[r.id] ?? '#6b7280';
            const energy = energyPrices[r.id];

            return (
              <div
                key={r.id}
                style={{
                  paddingBottom: 10,
                  marginBottom: i < regions.length - 1 ? 10 : 0,
                  borderBottom: i < regions.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                {/* Name + share */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-primary)' }}>{r.name}</span>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {r.share.toFixed(1)}%
                  </span>
                </div>

                {/* Proportional bar */}
                <div
                  style={{
                    height: 4,
                    background: 'var(--border-subtle)',
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(r.share, 100)}%`,
                      background: color,
                    }}
                  />
                </div>

                {/* Hashrate + energy cost */}
                <div
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
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {r.hashrate.toFixed(1)} EH/s
                  </span>
                  {energy && (
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      ${energy.priceKwh.toFixed(3)}/kWh
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Updated date */}
          <div
            style={{
              fontSize: 9,
              color: 'var(--text-muted)',
              marginTop: 8,
            }}
          >
            Updated: {updatedAt}
          </div>
        </div>
      </div>
    </section>
  );
}
