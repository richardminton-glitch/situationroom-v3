/**
 * ComponentGauge — compact 0-100 horizontal gauge for one RCDI component.
 *
 * Used 4× in the right third of the strip, stacked 2×2. Higher = more decay,
 * so the colour ramp inverts: amber when significant, red when severe.
 */

interface ComponentGaugeProps {
  label: string;
  value: number;
  weight: number;
}

export function ComponentGauge({ label, value, weight }: ComponentGaugeProps) {
  const color =
    value >= 70 ? 'var(--feh-critical)' :
    value >= 50 ? 'var(--feh-warning)' :
    'var(--feh-stable)';

  return (
    <div className="flex flex-col gap-1 px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span
          className="truncate"
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 9,
            letterSpacing: '0.16em',
            color: 'var(--text-muted)',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 9,
            letterSpacing: '0.14em',
            color: 'var(--text-muted)',
            opacity: 0.6,
          }}
        >
          W {Math.round(weight * 100)}%
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="relative flex-1" style={{ height: 6, backgroundColor: 'var(--border-subtle)' }}>
          <div
            className="absolute inset-y-0 left-0"
            style={{ width: `${value}%`, backgroundColor: color, transition: 'width 240ms ease' }}
          />
        </div>
        <span
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 14,
            fontWeight: 700,
            color,
            fontVariantNumeric: 'tabular-nums',
            minWidth: 28,
            textAlign: 'right',
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
