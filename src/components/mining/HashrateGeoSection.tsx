'use client';

/**
 * Hashrate Geography — full-width section
 *
 * Visual anchor: thick stacked bar (52px) showing regional distribution.
 * Below: responsive grid of compact region cards with proportional fills.
 */

import { useTheme } from '@/components/layout/ThemeProvider';

const MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

const REGION_COLORS: Record<string, string> = {
  US: '#3b82f6', CN: '#ef4444', RU: '#8b5cf6', KZ: '#f59e0b', CA: '#06b6d4',
  LATAM: '#10b981', EU: '#6366f1', ET: '#f97316', GULF: '#ec4899', OTHER: '#6b7280',
};

interface Props {
  regions: { id: string; name: string; share: number; hashrate: number; trend: string; trendVsPrev: number; notes: string; countries?: string[] }[];
  totalHashrateEH: number;
  updatedAt: string;
  energyPrices: Record<string, { priceKwh: number; source: string; label: string; updatedAt: string }>;
}

function trendArrow(trend: string): string {
  if (trend === 'up') return '\u2197';     // ↗
  if (trend === 'down') return '\u2198';   // ↘
  return '\u2192';                          // →
}

function trendColor(trend: string): string {
  if (trend === 'up') return 'var(--accent-success)';
  if (trend === 'down') return 'var(--accent-danger)';
  return 'var(--text-muted)';
}

export default function HashrateGeoSection({ regions, totalHashrateEH, updatedAt, energyPrices }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

  // Map region IDs to energy cost lookup keys
  const energyLookup: Record<string, string> = {
    US: 'US-TX', RU: 'RU', KZ: 'KZ', EU: 'NO', LATAM: 'PY', ET: 'ET', GULF: 'AE', CA: 'US-WA',
  };

  return (
    <div>
      {/* Section label */}
      <div style={{
        fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em',
        color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16,
      }}>
        HASHRATE BY GEOGRAPHY
      </div>

      {/* ── Featured stacked bar (visual anchor) ──────────────────── */}
      <div style={{
        display: 'flex', height: 52, overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        marginBottom: 6,
      }}>
        {regions.map((r) => (
          <div
            key={r.id}
            title={`${r.name}: ${(r.share * 100).toFixed(1)}%`}
            style={{
              flex: r.share,
              backgroundColor: REGION_COLORS[r.id] || '#6b7280',
              opacity: isDark ? 0.85 : 0.75,
              transition: 'opacity 0.2s',
              cursor: 'default',
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = isDark ? '0.85' : '0.75')}
          >
            {/* Show label only if segment is wide enough */}
            {r.share >= 0.06 && (
              <span style={{
                fontFamily: MONO, fontSize: 9, fontWeight: 600,
                color: '#fff', letterSpacing: '0.04em',
                textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                whiteSpace: 'nowrap',
              }}>
                {r.id === 'OTHER' ? 'OTHER' : r.id} {(r.share * 100).toFixed(0)}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Legend — one-line compact strip */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '6px 14px',
        marginBottom: 20,
      }}>
        {regions.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 8, height: 8, backgroundColor: REGION_COLORS[r.id] || '#6b7280',
              opacity: isDark ? 0.85 : 0.75, flexShrink: 0,
            }} />
            <span style={{ fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)' }}>
              {r.name}
            </span>
          </div>
        ))}
      </div>

      {/* ── Region detail grid ────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 1,
        backgroundColor: 'var(--border-subtle)',
        border: '1px solid var(--border-subtle)',
      }}>
        {regions.map(r => {
          const color = REGION_COLORS[r.id] || '#6b7280';
          const energyKey = energyLookup[r.id];
          const energy = energyKey ? energyPrices[energyKey] : null;

          return (
            <div key={r.id} style={{
              backgroundColor: 'var(--bg-primary)',
              padding: '12px 14px',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              {/* Row 1: Name + trend + share */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 3, height: 18, backgroundColor: color, flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: 'var(--font-data)', fontSize: 12, fontWeight: 600,
                  color: 'var(--text-primary)', flex: 1,
                }}>
                  {r.name}
                </span>
                <span style={{
                  fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700,
                  color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums',
                }}>
                  {(r.share * 100).toFixed(1)}%
                </span>
              </div>

              {/* Proportional bar */}
              <div style={{
                height: 5,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${r.share * 100}%`, height: '100%',
                  backgroundColor: color, opacity: 0.6,
                }} />
              </div>

              {/* Row 2: Hashrate + energy cost + trend */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{
                  fontFamily: MONO, fontSize: 10, color: 'var(--text-muted)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {r.hashrate.toFixed(1)} EH/s
                </span>
                {energy && (
                  <span style={{
                    fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    ${energy.priceKwh.toFixed(3)}/kWh
                  </span>
                )}
                <span style={{
                  fontFamily: MONO, fontSize: 12,
                  color: trendColor(r.trend),
                }}>
                  {trendArrow(r.trend)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timestamp */}
      <div style={{
        fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)',
        marginTop: 8, textAlign: 'right', letterSpacing: '0.06em',
      }}>
        SOURCE DATA UPDATED {updatedAt.toUpperCase()}
      </div>
    </div>
  );
}
