/**
 * SectionDivider — DECLASSIFIED stamp between modules.
 *
 * A thin horizontal rule with a rotated red-bordered stamp overlaid in the
 * centre. Slight transparency, slight rotation — the visual punctuation between
 * intelligence sections.
 */

interface SectionDividerProps {
  label?: string;
}

export function SectionDivider({ label = 'DECLASSIFIED — UPON RELEASE' }: SectionDividerProps) {
  return (
    <div className="relative py-10 md:py-14 flex items-center justify-center select-none">
      <div
        className="absolute inset-x-0 top-1/2 h-px"
        style={{ backgroundColor: 'var(--border-subtle)' }}
      />
      <div
        className="relative z-10 px-3.5 py-1.5 border-2"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--feh-critical)',
          color: 'var(--feh-critical)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.26em',
          transform: 'rotate(-4deg)',
          opacity: 0.82,
        }}
      >
        [ {label} ]
      </div>
    </div>
  );
}
