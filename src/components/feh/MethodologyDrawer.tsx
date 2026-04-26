'use client';

/**
 * MethodologyDrawer — slide-in panel that opens when the URL hash matches
 * `#methodology-XX`. ModuleShell renders a "METHODOLOGY ↗" link with that
 * hash so opening the drawer is a hash-change away. State lives in the
 * URL — no prop drilling, deep-linkable, closeable by hash clear.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getMethodology, METHODOLOGY } from '@/lib/feh/methodology-content';
import { MethodologyContent } from './MethodologyContent';

export function MethodologyDrawer() {
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const m = /^#methodology-(\w+)/.exec(window.location.hash);
      setSlug(m ? m[1] : null);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (!slug) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [slug]);

  const close = () => {
    if (typeof window !== 'undefined') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      setSlug(null);
    }
  };

  const entry = slug ? getMethodology(slug) : null;
  const open = !!entry;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        aria-hidden={!open}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: open ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)',
          pointerEvents: open ? 'auto' : 'none',
          transition: 'background-color 200ms ease',
          zIndex: 60,
        }}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label={entry ? `Methodology: ${entry.title}` : 'Methodology drawer'}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(560px, 100vw)',
          backgroundColor: 'var(--bg-secondary)',
          borderLeft: '2px solid var(--feh-critical)',
          boxShadow: '-12px 0 40px rgba(0,0,0,0.35)',
          transform: open ? 'translateX(0)' : 'translateX(110%)',
          transition: 'transform 240ms cubic-bezier(0.7, 0, 0.3, 1)',
          zIndex: 70,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {entry && (
          <>
            <div
              className="flex items-center justify-between gap-3 px-4 py-3 border-b sticky top-0"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--feh-critical)',
                zIndex: 1,
              }}
            >
              <div className="flex items-baseline gap-2 min-w-0">
                <span
                  style={{
                    fontFamily: 'var(--feh-font-mono)',
                    fontSize: 9,
                    letterSpacing: '0.22em',
                    color: 'var(--text-muted)',
                  }}
                >
                  METHODOLOGY · ITEM {entry.index}
                </span>
              </div>
              <button
                type="button"
                onClick={close}
                style={{
                  fontFamily: 'var(--feh-font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.22em',
                  color: 'var(--text-muted)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                [ CLOSE ✕ ]
              </button>
            </div>
            <div className="px-5 py-4 flex-1">
              <MethodologyContent entry={entry} />
              <div
                className="mt-6 pt-4 border-t"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <Link
                  href="/tools/fiscal-event-horizon/methodology"
                  onClick={close}
                  style={{
                    fontFamily: 'var(--feh-font-mono)',
                    fontSize: 10,
                    letterSpacing: '0.22em',
                    color: 'var(--feh-critical)',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  [ FULL METHODOLOGY DOCUMENT ↗ ]
                </Link>
                <div className="mt-2 flex flex-wrap gap-2">
                  {METHODOLOGY.filter((m) => m.slug !== entry.slug).map((m) => (
                    <a
                      key={m.slug}
                      href={`#methodology-${m.slug}`}
                      style={{
                        fontFamily: 'var(--feh-font-mono)',
                        fontSize: 9,
                        letterSpacing: '0.16em',
                        color: 'var(--text-muted)',
                        textDecoration: 'none',
                        padding: '3px 8px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {m.index} {m.title.split(' ')[0]}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
