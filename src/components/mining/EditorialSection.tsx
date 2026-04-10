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
          fontSize: 20,
          color: 'var(--text-primary)',
          marginTop: 0,
          marginBottom: 16,
          fontWeight: 400,
        }}
      >
        {title}
      </h2>

      {/* Body paragraphs */}
      <div style={{ maxWidth: 720 }}>
        {paragraphs.map((p, i) => (
          <p
            key={i}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: isDark ? 12 : 14,
              lineHeight: 1.8,
              color: 'var(--text-secondary)',
              marginTop: 0,
              marginBottom: i < paragraphs.length - 1 ? 16 : 0,
            }}
          >
            {p}
          </p>
        ))}
      </div>

      {/* Updated date */}
      <div
        style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          fontFamily: FONT,
          marginTop: 16,
        }}
      >
        Updated {updatedAt}
      </div>
    </div>
  );
}
