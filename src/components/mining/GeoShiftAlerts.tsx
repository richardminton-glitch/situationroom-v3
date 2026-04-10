'use client';

import { useTheme } from '@/components/layout/ThemeProvider';

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";
const FONT_SERIF = "'Source Serif 4', 'Georgia', serif";

interface Props {
  alerts: {
    headline: string;
    detail: string;
    region: string;
    severity: string;
    date: string;
  }[];
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'var(--accent-danger)';
    case 'warning':
      return '#f59e0b';
    case 'info':
    default:
      return 'var(--accent-primary)';
  }
}

export default function GeoShiftAlerts({ alerts }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';
  const font = isDark ? FONT_MONO : FONT_SERIF;

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
        GEOGRAPHIC SHIFTS — GEOPOLITICAL SIGNALS
      </div>

      {/* Alert cards */}
      {alerts.length === 0 ? (
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            padding: '16px 0',
            fontStyle: 'italic',
          }}
        >
          No active geographic signals
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.map((alert, i) => {
            const borderColor = severityColor(alert.severity);

            return (
              <div
                key={i}
                style={{
                  borderLeft: `3px solid ${borderColor}`,
                  background: isDark ? 'var(--bg-card)' : 'transparent',
                  borderBottom: isDark ? 'none' : '1px solid var(--border-primary)',
                  padding: '10px 12px',
                }}
              >
                {/* Headline */}
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: 4,
                  }}
                >
                  {alert.headline}
                </div>

                {/* Detail */}
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                    marginBottom: 8,
                  }}
                >
                  {alert.detail}
                </div>

                {/* Bottom row: region tag + date */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      padding: '2px 8px',
                      borderRadius: 9999,
                      background: isDark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.06)',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    {alert.region}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                    }}
                  >
                    {alert.date}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
