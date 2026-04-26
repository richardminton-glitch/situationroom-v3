/**
 * ClassificationBar — full-width classification banner.
 *
 * Top stripe of every Fiscal Event Horizon page. Crimson-on-cream in parchment,
 * blast-red on near-black in dark mode. Mirrors the visual grammar of a real
 * classified-document cover sheet.
 */

interface ClassificationBarProps {
  classification?: string;
  caveats?: string[];
}

export function ClassificationBar({
  classification = 'TOP SECRET',
  caveats = ['FISCAL', 'NOFORN'],
}: ClassificationBarProps) {
  const text = [classification, ...caveats].join(' // ');
  return (
    <div
      className="w-full text-center select-none"
      style={{
        backgroundColor: 'var(--feh-classified-bg)',
        color: 'var(--feh-classified-fg)',
        fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.32em',
        padding: '6px 8px',
      }}
    >
      {text}
    </div>
  );
}
