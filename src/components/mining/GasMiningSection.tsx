'use client';

import { StrandedEnergyMap } from './StrandedEnergyMap';

const MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface Props {
  projects: {
    name: string;
    lat: number;
    lng: number;
    country: string;
    region: string;
    energySource: string;
    description: string;
    capacityMW: number | null;
    status: string;
  }[];
  narrativeHook: string;
  stats: {
    totalFlaredGasBcm: number;
    activeMiningOperations: number;
    countriesWithOperations: number;
  };
  flareSites: {
    topCountries: {
      country: string;
      name: string;
      flaredBcm: number;
      pctGlobal: number;
      trend: string;
    }[];
    totalFlaredBcm: number;
    year: number;
  };
}

const SRC: Record<string, string> = {
  'flared-gas': '#f59e0b',
  hydro: '#3b82f6',
  geothermal: '#ef4444',
  gas: '#8b5cf6',
};

function srcColor(source: string): string {
  return SRC[source] || '#6b7280';
}

function trendIcon(trend: string): { symbol: string; color: string } {
  if (trend === 'increasing' || trend === 'up') return { symbol: '\u2191', color: '#ef4444' };
  if (trend === 'decreasing' || trend === 'down') return { symbol: '\u2193', color: '#22c55e' };
  return { symbol: '\u2192', color: '#6b7280' };
}

function statusColor(status: string): string {
  if (status === 'operational') return '#22c55e';
  if (status === 'construction' || status === 'under-construction') return '#f59e0b';
  return '#6b7280';
}

const LABEL: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 9,
  letterSpacing: '0.16em',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  marginBottom: 16,
};

export function GasMiningSection({ projects, narrativeHook, stats, flareSites }: Props) {
  return (
    <div>
      {/* Section label */}
      <div style={LABEL}>
        STRANDED ENERGY — MINING OPERATIONS
      </div>

      {/* Stats tape — full width, horizontal with 1px vertical dividers */}
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
        {[
          { value: `${stats.totalFlaredGasBcm} bcm`, label: `FLARED GAS (${flareSites.year})` },
          { value: `${stats.activeMiningOperations}`, label: 'OPERATIONS' },
          { value: `${stats.countriesWithOperations}`, label: 'COUNTRIES' },
        ].map((m, i) => (
          <div
            key={m.label}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              paddingLeft: i > 0 ? 16 : 0,
              paddingRight: 16,
              borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {m.value}
            </span>
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
          </div>
        ))}
      </div>

      {/* Two-column grid: 5fr 2fr */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '5fr 2fr',
          gap: 28,
          alignItems: 'start',
          marginTop: 20,
        }}
      >
        {/* Left column — map + narrative */}
        <div>
          <StrandedEnergyMap
            flareCountries={flareSites.topCountries}
            projects={projects}
          />
          {narrativeHook && (
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontStyle: 'italic',
                fontSize: 12,
                lineHeight: 1.6,
                color: 'var(--text-muted)',
                maxWidth: 560,
                marginTop: 12,
              }}
            >
              {narrativeHook}
            </div>
          )}
        </div>

        {/* Right column — compact operational data */}
        <div>
          {/* OPERATIONS sub-label */}
          <div style={{ ...LABEL, marginBottom: 8 }}>
            OPERATIONS
          </div>

          {/* Project list — scrollable */}
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {projects.map((p) => {
              const c = srcColor(p.energySource);
              return (
                <div
                  key={`${p.name}-${p.region}`}
                  style={{
                    padding: '6px 0',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  {/* Row: color bar + name ... capacity + status dot */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {/* Coloured bar */}
                    <div
                      style={{
                        width: 2,
                        height: 14,
                        backgroundColor: c,
                        flexShrink: 0,
                      }}
                    />
                    {/* Name */}
                    <span
                      style={{
                        fontFamily: 'var(--font-data)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.name}
                    </span>
                    {/* Capacity badge */}
                    {p.capacityMW != null && (
                      <span
                        style={{
                          fontFamily: MONO,
                          fontSize: 9,
                          color: 'var(--text-muted)',
                          fontVariantNumeric: 'tabular-nums',
                          flexShrink: 0,
                        }}
                      >
                        {p.capacityMW} MW
                      </span>
                    )}
                    {/* Status dot */}
                    <div
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        backgroundColor: statusColor(p.status),
                        flexShrink: 0,
                      }}
                    />
                  </div>
                  {/* Region — one line */}
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 9,
                      color: 'var(--text-muted)',
                      marginTop: 2,
                      paddingLeft: 8,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.region}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gap between sections */}
          <div style={{ height: 14 }} />

          {/* TOP FLARING COUNTRIES sub-label */}
          <div style={{ ...LABEL, marginBottom: 8 }}>
            TOP FLARING COUNTRIES
          </div>

          {/* 5 rows */}
          {flareSites.topCountries.slice(0, 5).map((row, i) => {
            const t = trendIcon(row.trend);
            return (
              <div
                key={row.country}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 0',
                  borderBottom: i < 4 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: 11,
                    color: 'var(--text-primary)',
                  }}
                >
                  {row.name || row.country}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 10,
                      color: 'var(--text-secondary)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {row.flaredBcm.toFixed(1)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: t.color,
                      fontWeight: 600,
                    }}
                  >
                    {t.symbol}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
