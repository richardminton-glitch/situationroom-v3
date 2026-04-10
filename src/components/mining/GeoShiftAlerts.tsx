'use client';

import { useTheme } from '@/components/layout/ThemeProvider';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

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
  useTheme(); // consumed for reactivity

  return (
    <section style={{ fontFamily: FONT }}>
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
        GEOGRAPHIC SIGNALS
      </div>

      {alerts.length === 0 ? (
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            fontStyle: 'italic',
          }}
        >
          No active signals
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 10,
          }}
        >
          {alerts.map((alert, i) => {
            const borderColor = severityColor(alert.severity);
            const dotColor = severityColor(alert.severity);

            return (
              <div
                key={i}
                style={{
                  padding: '10px 12px',
                  borderLeft: `3px solid ${borderColor}`,
                  background: 'var(--bg-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {/* Row 1: severity dot + headline */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: dotColor,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {alert.headline}
                  </span>
                </div>

                {/* Row 2: detail — max 2 lines */}
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {alert.detail}
                </div>

                {/* Row 3: region tag + date */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {alert.region}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
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
