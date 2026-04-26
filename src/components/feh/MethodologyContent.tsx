/**
 * MethodologyContent — renders one methodology entry. Used by both the
 * slide-in drawer (one entry) and the full methodology page (all six,
 * stacked).
 */

import type { MethodologyEntry } from '@/lib/feh/methodology-content';

interface MethodologyContentProps {
  entry: MethodologyEntry;
  /** When rendering on the full page, anchor to this id for hash navigation. */
  anchorId?: string;
}

export function MethodologyContent({ entry, anchorId }: MethodologyContentProps) {
  return (
    <article id={anchorId} style={{ scrollMarginTop: 80 }}>
      <h2
        style={{
          fontFamily: 'var(--feh-font-display)',
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: '0.14em',
          color: 'var(--feh-stencil-ink)',
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        {entry.title}
      </h2>
      <div
        className="mt-1.5"
        style={{
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 10,
          letterSpacing: '0.18em',
          color: 'var(--text-muted)',
          fontStyle: 'italic',
        }}
      >
        CADENCE · {entry.cadence}
      </div>

      {entry.paragraphs.map((p) => (
        <section key={p.heading} className="mt-5">
          <h3
            style={{
              fontFamily: 'var(--feh-font-mono)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.22em',
              color: 'var(--feh-warning)',
              margin: 0,
            }}
          >
            {p.heading.toUpperCase()}
          </h3>
          <div
            className="mt-2"
            style={{
              fontFamily: 'var(--feh-font-mono)',
              fontSize: 12,
              lineHeight: 1.75,
              letterSpacing: '0.02em',
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {p.body}
          </div>
        </section>
      ))}

      {entry.editorialNote && (
        <section className="mt-5 px-4 py-3 border-l-2"
          style={{ borderColor: 'var(--feh-critical)', backgroundColor: 'var(--bg-card)' }}
        >
          <div
            style={{
              fontFamily: 'var(--feh-font-mono)',
              fontSize: 9,
              letterSpacing: '0.22em',
              color: 'var(--feh-critical)',
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            EDITORIAL NOTE
          </div>
          <div
            style={{
              fontFamily: 'var(--feh-font-mono)',
              fontSize: 12,
              lineHeight: 1.7,
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
            }}
          >
            {entry.editorialNote}
          </div>
        </section>
      )}

      <section className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <h3
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--text-muted)',
            margin: 0,
          }}
        >
          DATA SOURCES
        </h3>
        <ul className="mt-2 space-y-1">
          {entry.sources.map((s) => (
            <li
              key={s}
              style={{
                fontFamily: 'var(--feh-font-mono)',
                fontSize: 11,
                letterSpacing: '0.04em',
                color: 'var(--text-secondary)',
                paddingLeft: 14,
                position: 'relative',
                lineHeight: 1.6,
              }}
            >
              <span style={{ position: 'absolute', left: 0, color: 'var(--feh-warning)' }}>▸</span>
              {s}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
