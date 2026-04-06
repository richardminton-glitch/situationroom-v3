'use client';

interface StatusBarProps {
  countryCount: number;
  metricLabel: string;
  hoverName: string | null;
  hoverValue: string | null;
  lastUpdated: string | null;
}

export function StatusBar({ countryCount, metricLabel, hoverName, hoverValue, lastUpdated }: StatusBarProps) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4"
      style={{
        height: 28,
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-subtle)',
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        letterSpacing: '0.06em',
        color: 'var(--text-muted)',
      }}
    >
      <span>
        {hoverName ? (
          <>
            <span style={{ textTransform: 'uppercase', marginRight: 6 }}>HOVER:</span>
            <span style={{ color: 'var(--text-secondary)' }}>{hoverName}</span>
            {hoverValue && (
              <>
                <span style={{ margin: '0 4px', color: 'var(--border-primary)' }}>&mdash;</span>
                <span style={{ color: 'var(--text-secondary)' }}>{hoverValue}</span>
              </>
            )}
          </>
        ) : (
          <span style={{ textTransform: 'uppercase' }}>GLOBAL SITUATION MAP</span>
        )}
      </span>

      <span style={{ textTransform: 'uppercase' }}>
        METRIC: <span style={{ color: 'var(--text-secondary)' }}>{metricLabel}</span>
      </span>

      <span>
        {countryCount} TERRITORIES
        {lastUpdated && (
          <>
            <span style={{ margin: '0 4px', color: 'var(--border-primary)' }}>&middot;</span>
            UPDATED: <span style={{ color: 'var(--text-secondary)' }}>{lastUpdated}</span>
          </>
        )}
      </span>
    </div>
  );
}
