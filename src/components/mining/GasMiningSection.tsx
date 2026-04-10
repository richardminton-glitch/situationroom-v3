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

const energySourceColor: Record<string, string> = {
  'flared-gas': '#f59e0b',
  hydro: '#3b82f6',
  geothermal: '#ef4444',
  gas: '#8b5cf6',
};

function getSourceColor(source: string): string {
  return energySourceColor[source] || '#6b7280';
}

function trendIcon(trend: string): { symbol: string; color: string } {
  if (trend === 'increasing' || trend === 'up') return { symbol: '\u2191', color: '#ef4444' };
  if (trend === 'decreasing' || trend === 'down') return { symbol: '\u2193', color: '#22c55e' };
  return { symbol: '\u2192', color: '#6b7280' };
}

function statusColor(status: string, isDark: boolean): string {
  if (status === 'operational') return '#22c55e';
  if (status === 'construction' || status === 'under-construction') return '#f59e0b';
  return isDark ? '#9ca3af' : '#6b7280';
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
        STRANDED ENERGY — MINING OPPORTUNITY MAP
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'FLARED GAS (2024)', value: `${stats.totalFlaredGasBcm}`, unit: 'bcm/year' },
          { label: 'ACTIVE OPERATIONS', value: `${stats.activeMiningOperations}`, unit: '' },
          { label: 'COUNTRIES', value: `${stats.countriesWithOperations}`, unit: '' },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              flex: 1,
              padding: '14px 16px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            }}
          >
            <div
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--text-muted)',
                marginBottom: 6,
                fontFamily: FONT,
              }}
            >
              {card.label}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: 'var(--text-primary)',
                fontFamily: isDark ? FONT : "'Source Serif 4', 'Georgia', serif",
              }}
            >
              {card.value}
              {card.unit && (
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    marginLeft: 4,
                    fontWeight: 400,
                  }}
                >
                  {card.unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* D3 world map — flare heat + mining operation markers */}
      <StrandedEnergyMap
        flareCountries={flareSites.topCountries}
        projects={projects}
      />

      {/* Project cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 28,
        }}
      >
        {projects.map((project) => {
          const srcColor = getSourceColor(project.energySource);
          return (
            <div
              key={`${project.name}-${project.region}`}
              style={{
                borderLeft: `3px solid ${srcColor}`,
                padding: '12px 14px',
                border: '1px solid var(--border-subtle)',
                borderLeftWidth: 3,
                borderLeftColor: srcColor,
                backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: srcColor,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    fontFamily: isDark ? FONT : "'Source Serif 4', 'Georgia', serif",
                  }}
                >
                  {project.name}
                </span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  marginBottom: 6,
                  fontFamily: FONT,
                }}
              >
                {project.region}, {project.country}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  marginBottom: 8,
                  fontFamily: isDark ? FONT : "'Source Serif 4', 'Georgia', serif",
                }}
              >
                {project.description}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {project.capacityMW != null && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      color: 'var(--text-secondary)',
                      fontFamily: FONT,
                    }}
                  >
                    {project.capacityMW} MW
                  </span>
                )}
                <span
                  style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    color: statusColor(project.status, isDark),
                    border: `1px solid ${statusColor(project.status, isDark)}`,
                    fontFamily: FONT,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {project.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top flaring countries table */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--text-muted)',
            marginBottom: 10,
            fontFamily: FONT,
          }}
        >
          TOP FLARING COUNTRIES ({flareSites.year})
        </div>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12,
            fontFamily: isDark ? FONT : "'Source Serif 4', 'Georgia', serif",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              {['Country', 'Flared Gas (bcm)', 'Global %', 'Trend'].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: h === 'Country' ? 'left' : 'right',
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
              ))}
            </tr>
          </thead>
          <tbody>
            {flareSites.topCountries.slice(0, 10).map((row) => {
              const t = trendIcon(row.trend);
              return (
                <tr
                  key={row.country}
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <td
                    style={{
                      padding: '6px 8px',
                      color: 'var(--text-primary)',
                      fontWeight: 500,
                    }}
                  >
                    {row.name || row.country}
                  </td>
                  <td
                    style={{
                      padding: '6px 8px',
                      textAlign: 'right',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {row.flaredBcm.toFixed(1)}
                  </td>
                  <td
                    style={{
                      padding: '6px 8px',
                      textAlign: 'right',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {row.pctGlobal.toFixed(1)}%
                  </td>
                  <td
                    style={{
                      padding: '6px 8px',
                      textAlign: 'right',
                      color: t.color,
                      fontWeight: 600,
                    }}
                  >
                    {t.symbol}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Narrative hook */}
      {narrativeHook && (
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontStyle: 'italic',
            fontSize: 14,
            lineHeight: 1.7,
            color: 'var(--text-secondary)',
            maxWidth: 720,
          }}
        >
          {narrativeHook}
        </div>
      )}
    </div>
  );
}
