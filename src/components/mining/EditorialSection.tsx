'use client';

const MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface Props {
  title: string;
  body: string;
  updatedAt: string;
}

export function EditorialSection({ title, body, updatedAt }: Props) {
  const paragraphs = body.split('\n\n');

  return (
    <div
      style={{
        borderLeft: '3px solid var(--accent-primary)',
        paddingLeft: 20,
      }}
    >
      {/* Section label */}
      <div
        style={{
          fontFamily: MONO,
          fontSize: 9,
          letterSpacing: '0.16em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        ANALYSIS
      </div>

      {/* Title */}
      <h2
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 20,
          fontWeight: 400,
          color: 'var(--text-primary)',
          marginTop: 0,
          marginBottom: 16,
          letterSpacing: '0.02em',
        }}
      >
        {title}
      </h2>

      {/* Body paragraphs */}
      <div style={{ maxWidth: 640 }}>
        {paragraphs.map((p, i) => (
          <p
            key={i}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: i === 0 ? 15 : 14,
              lineHeight: 1.8,
              color: 'var(--text-secondary)',
              marginTop: 0,
              marginBottom: 14,
            }}
          >
            {p}
          </p>
        ))}
      </div>

      {/* Updated timestamp */}
      <div
        style={{
          fontFamily: MONO,
          fontSize: 9,
          color: 'var(--text-muted)',
          marginTop: 16,
          letterSpacing: '0.06em',
        }}
      >
        Updated {updatedAt}
      </div>
    </div>
  );
}
