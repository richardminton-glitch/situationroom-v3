'use client';

import { useTheme } from '@/components/layout/ThemeProvider';
import { StrandedEnergyMap } from './StrandedEnergyMap';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

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

const SRC_COLORS: Record<string, string> = {
  'flared-gas': '#f59e0b',
  hydro: '#3b82f6',
  geothermal: '#ef4444',
  gas: '#8b5cf6',
};

function getSourceColor(source: string): string {
  return SRC_COLORS[source] || '#6b7280';
}

function trendIcon(trend: string): { symbol: string; color: string } {
  if (trend === 'increasing' || trend === 'up') return { symbol: '\u2191', color: '#ef4444' };
  if (trend === 'decreasing' || trend === 'down') return { symbol: '\u2193', color: '#22c55e' };
  return { symbol: '\u2192', color: '#6b7280' };
}

function statusDotColor(status: string): string {
  if (status === 'operational') return '#22c55e';
  if (status === 'construction' || status === 'under-construction') return '#f59e0b';
  return '#6b7280';
}

export function GasMiningSection({ projects, narrativeHook, stats, flareSites }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

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
        STRANDED ENERGY — MINING OPERATIONS
      </div>

      {/* Stats strip — full width, inline metrics */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'baseline', marginBottom: 16 }}>
        {[
          { label: 'FLARED', value: `${stats.totalFlaredGasBcm}`, unit: 'bcm' },
          { label: 'OPERATIONS', value: `${stats.activeMiningOperations}`, unit: '' },
          { label: 'COUNTRIES', value: `${stats.countriesWithOperations}`, unit: '' },
        ].map((m) => (
          <div key={m.label} style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                fontFamily: FONT,
              }}
            >
              {m.label}
            </span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: FONT,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {m.value}
            </span>
            {m.unit && (
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  fontFamily: FONT,
                }}
              >
                {m.unit}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
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
                maxWidth: 600,
                marginTop: 12,
              }}
            >
              {narrativeHook}
            </div>
          )}
        </div>

        {/* Right column — compact sidebar */}
        <div>
          {/* Operations sub-label */}
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
            OPERATIONS
          </div>

          {/* Project list */}
          <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {projects.map((project) => {
              const srcColor = getSourceColor(project.energySource);
              return (
                <div
                  key={`${project.name}-${project.region}`}
                  style={{
                    borderLeft: `2px solid ${srcColor}`,
                    padding: '6px 8px',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)',
                  }}
                >
                  {/* First row: dot + name + capacity badge + status dot */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: srcColor,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        fontFamily: FONT,
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {project.name}
                    </span>
                    {project.capacityMW != null && (
                      <span
                        style={{
                          fontSize: 9,
                          padding: '1px 4px',
                          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                          color: 'var(--text-muted)',
                          fontFamily: FONT,
                          fontVariantNumeric: 'tabular-nums',
                          flexShrink: 0,
                        }}
                      >
                        {project.capacityMW} MW
                      </span>
                    )}
                    <div
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        backgroundColor: statusDotColor(project.status),
                        flexShrink: 0,
                      }}
                    />
                  </div>
                  {/* Second row: region + country */}
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      fontFamily: FONT,
                      marginTop: 2,
                      paddingLeft: 12,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {project.region}, {project.country}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: 'var(--border-subtle)', margin: '10px 0' }} />

          {/* Top flaring countries */}
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
            TOP FLARING COUNTRIES
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {flareSites.topCountries.slice(0, 5).map((row) => {
              const t = trendIcon(row.trend);
              return (
                <div
                  key={row.country}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '2px 0',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-primary)',
                      fontFamily: FONT,
                    }}
                  >
                    {row.name || row.country}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                        fontFamily: FONT,
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
                        fontFamily: FONT,
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
    </div>
  );
}
