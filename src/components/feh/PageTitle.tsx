/**
 * PageTitle — stencil-style page heading with one-time redaction reveal.
 *
 * The redaction bar covers the title on first paint and retracts right-to-left
 * to reveal it (see .feh-title in globals.css). Below sits the dossier abstract:
 * 2-3 lines, italic, monospace.
 */

interface PageTitleProps {
  title: string;
  abstract: string;
}

export function PageTitle({ title, abstract }: PageTitleProps) {
  return (
    <div className="px-4 py-12 md:py-16 text-center">
      <h1
        className="feh-title"
        style={{
          fontFamily: 'var(--feh-font-display)',
          fontSize: 'clamp(36px, 6vw, 76px)',
          letterSpacing: '0.18em',
          fontWeight: 600,
          color: 'var(--feh-stencil-ink)',
          margin: 0,
          lineHeight: 1.05,
        }}
      >
        {title}
      </h1>
      <p
        className="mt-6 mx-auto italic"
        style={{
          fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
          fontSize: 12,
          lineHeight: 1.75,
          color: 'var(--text-secondary)',
          letterSpacing: '0.04em',
          maxWidth: 720,
        }}
      >
        {abstract}
      </p>
    </div>
  );
}
