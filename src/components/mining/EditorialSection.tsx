'use client';

import { useTheme } from '@/components/layout/ThemeProvider';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface Props {
  title: string;
  body: string;
  updatedAt: string;
}

export function EditorialSection({ title, body, updatedAt }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

  const paragraphs = body.split('\n\n');

  return (
    <div>
      {/* Section label */}
      <div
        style={{
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          color: 'var(--text-muted)',
          marginBottom: 12,
          fontFamily: FONT,
        }}
      >
        EDITORIAL
      </div>

      {/* Title */}
      <h2
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginTop: 0,
          marginBottom: 12,
        }}
      >
        {title}
      </h2>

      {/* Body paragraphs */}
      <div style={{ maxWidth: 680 }}>
        {paragraphs.map((p, i) => (
          <p
            key={i}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              lineHeight: 1.75,
              color: 'var(--text-secondary)',
              marginTop: 0,
              marginBottom: 12,
            }}
          >
            {p}
          </p>
        ))}

        {/* Updated timestamp — right-aligned within maxWidth */}
        <div
          style={{
            fontSize: 9,
            color: 'var(--text-muted)',
            fontFamily: FONT,
            marginTop: 12,
            textAlign: 'right',
          }}
        >
          Updated {updatedAt}
        </div>
      </div>
    </div>
  );
}
