'use client';

/**
 * Geographic Signals — compact grid with severity accents.
 */

import { useTheme } from '@/components/layout/ThemeProvider';

const MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface Props {
  alerts: { headline: string; detail: string; region: string; severity: string; date: string }[];
}

function severityColor(severity: string): string {
  if (severity === 'critical') return 'var(--accent-danger)';
  if (severity === 'warning') return '#f59e0b';
  return 'var(--accent-primary)';
}

export default function GeoShiftAlerts({ alerts }: Props) {
  useTheme(); // subscribe to theme changes

  if (alerts.length === 0) return null;

  return (
    <div>
      <div style={{
        fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em',
        color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10,
      }}>
        GEOGRAPHIC SIGNALS
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(alerts.length, 2)}, 1fr)`,
        gap: 1,
        backgroundColor: 'var(--border-subtle)',
        border: '1px solid var(--border-subtle)',
      }}>
        {alerts.map((alert, i) => {
          const color = severityColor(alert.severity);
          return (
            <div key={i} style={{
              backgroundColor: 'var(--bg-primary)',
              borderLeft: `3px solid ${color}`,
              padding: '10px 14px',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{
                fontFamily: 'var(--font-data)', fontSize: 12, fontWeight: 600,
                color: 'var(--text-primary)', lineHeight: 1.3,
              }}>
                {alert.headline}
              </div>
              <div style={{
                fontFamily: MONO, fontSize: 10, color: 'var(--text-muted)',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
              }}>
                {alert.detail}
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: 2,
              }}>
                <span style={{
                  fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em',
                  color, textTransform: 'uppercase', fontWeight: 600,
                }}>
                  {alert.region}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)' }}>
                  {alert.date}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
