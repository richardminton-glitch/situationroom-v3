'use client';

interface HoverTooltipProps {
  name: string;
  value: string | null;
  metricLabel: string;
  x: number;
  y: number;
}

export function HoverTooltip({ name, value, metricLabel, x, y }: HoverTooltipProps) {
  return (
    <div
      className="fixed pointer-events-none z-[10000]"
      style={{
        left: x + 14,
        top: y - 10,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
        padding: '8px 10px',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        lineHeight: 1.5,
        maxWidth: '280px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        color: 'var(--text-primary)',
      }}
    >
      <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{name}</div>
      {value != null && (
        <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {metricLabel}:
          </span>{' '}
          {value}
        </div>
      )}
    </div>
  );
}
