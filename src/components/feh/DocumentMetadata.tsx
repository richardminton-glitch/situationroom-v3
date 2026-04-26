/**
 * DocumentMetadata — document-reference strip below the classification bar.
 *
 * All timestamps in military format (HHMMZ DDMMMYY). Compiled / next review /
 * declassified-on are the canonical fields per spec; supports adding or omitting
 * any of them by passing undefined.
 */

interface DocumentMetadataProps {
  docRef: string;
  compiled: string;
  nextReview?: string;
  declassified?: string;
}

export function DocumentMetadata({
  docRef,
  compiled,
  nextReview,
  declassified = 'NEVER',
}: DocumentMetadataProps) {
  const items: Array<[string, string]> = [
    ['DOCUMENT REF', docRef],
    ['COMPILED', compiled],
    ...(nextReview ? ([['NEXT REVIEW', nextReview]] as Array<[string, string]>) : []),
    ['DECLASSIFIED ON', declassified],
  ];

  return (
    <div
      className="w-full border-b"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div
        className="mx-auto max-w-[1320px] flex flex-wrap items-center justify-center gap-x-7 gap-y-1 px-4 py-2"
        style={{
          fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
          fontSize: 10,
          letterSpacing: '0.16em',
          color: 'var(--text-muted)',
        }}
      >
        {items.map(([label, value]) => (
          <span key={label} className="whitespace-nowrap">
            <span style={{ opacity: 0.55 }}>{label}:</span>{' '}
            <span style={{ color: 'var(--text-secondary)' }}>{value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
