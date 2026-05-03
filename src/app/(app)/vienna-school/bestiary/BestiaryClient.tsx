'use client';

/**
 * /vienna-school/bestiary — alphabetical glossary of Austrian terms.
 *
 * Open-access. Each card: term, one-line definition, longer example,
 * optional pull-quote, links to related terms and the modules where
 * the concept surfaces. Searchable.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { BESTIARY, BESTIARY_BY_SLUG } from '@/content/vienna-school/data/bestiary';
import { MODULE_BY_SLUG } from '@/content/vienna-school';

const HEADING_FONT = 'Georgia, serif';
const BODY_FONT    = "'Source Serif 4', Georgia, serif";
const MONO_FONT    = "'IBM Plex Mono', 'SF Mono', Consolas, monospace";

export function BestiaryClient() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BESTIARY;
    return BESTIARY.filter((b) =>
      b.term.toLowerCase().includes(q) ||
      b.definition.toLowerCase().includes(q) ||
      b.example.toLowerCase().includes(q),
    );
  }, [query]);

  // Sorted A→Z by term
  const sorted = [...filtered].sort((a, b) => a.term.localeCompare(b.term));

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100%' }}>
      {/* ── Atmospheric banner ─────────────────────────────────── */}
      <div style={{
        position:        'relative',
        width:           '100%',
        aspectRatio:     '21 / 7',
        maxHeight:       300,
        overflow:        'hidden',
        backgroundColor: '#1a1a1a',
      }}>
        <img
          src="/images/vienna-school/bestiary-specimens.png"
          alt="Three objects arranged in a row on dark wood like museum specimens — the Bestiary."
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.10) 50%, var(--bg-primary) 100%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          left:     '50%',
          transform:'translateX(-50%)',
          bottom:   24,
          width:    'calc(100% - 48px)',
          maxWidth: 880,
          color:    '#F8F1E3',
        }}>
          <p style={{
            fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.22em',
            margin: 0, marginBottom: 8, opacity: 0.85,
          }}>
            <Link href="/vienna-school" style={{ color: 'inherit', textDecoration: 'none' }}>
              ← THE VIENNA SCHOOL
            </Link>
            <span style={{ margin: '0 8px' }}>·</span>
            BESTIARY
          </p>
          <h1 style={{
            fontFamily: HEADING_FONT, fontSize: 48, fontWeight: 700,
            margin: 0, lineHeight: 1.05, letterSpacing: '-0.015em',
            textShadow: '0 2px 12px rgba(0,0,0,0.6)',
          }}>
            The Bestiary
          </h1>
          <p style={{
            fontFamily: BODY_FONT, fontStyle: 'italic',
            fontSize: 17, margin: '6px 0 0 0', opacity: 0.92,
            textShadow: '0 1px 6px rgba(0,0,0,0.5)',
          }}>
            A glossary of Austrian-school terms — hovered from any module text, or browsed in full here.
          </p>
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────────────── */}
      <header style={{ maxWidth: 980, margin: '0 auto', padding: '24px 24px 8px' }}>

        {/* Search box */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginTop: 24, maxWidth: 360,
          padding: '8px 12px',
          border: '1px solid var(--border-primary)',
          background: 'var(--bg-card)',
        }}>
          <MagnifyingGlass size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search terms…"
            style={{
              flex: 1,
              border:     'none',
              background: 'transparent',
              outline:    'none',
              fontFamily: BODY_FONT,
              fontSize:   14,
              color:      'var(--text-primary)',
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{
                fontFamily: MONO_FONT, fontSize: 10,
                background: 'transparent',
                border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              CLEAR
            </button>
          )}
        </div>
        <p style={{
          fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em',
          color: 'var(--text-muted)', marginTop: 8,
        }}>
          {sorted.length} OF {BESTIARY.length} TERMS
        </p>
      </header>

      {/* ── Grid ─────────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 980, margin: '8px auto 80px',
        padding:  '0 24px',
        display:  'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap:      18,
      }}>
        {sorted.map((b) => (
          <article
            key={b.slug}
            id={b.slug}
            style={{
              border:     '1px solid var(--border-primary)',
              background: 'var(--bg-card)',
              padding:    '18px 20px',
            }}
          >
            <h2 style={{
              fontFamily: HEADING_FONT, fontSize: 22, fontWeight: 600,
              color: 'var(--text-primary)', margin: 0, lineHeight: 1.2,
            }}>
              {b.term}
            </h2>
            <p style={{
              fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em',
              color: 'var(--accent-primary)', margin: '4px 0 12px 0',
              fontWeight: 600, textTransform: 'uppercase',
            }}>
              {b.definition}
            </p>
            <p style={{
              fontFamily: BODY_FONT, fontSize: 14, lineHeight: 1.6,
              color: 'var(--text-primary)', margin: '0 0 12px 0',
            }}>
              {b.example}
            </p>

            {b.quote && (
              <blockquote style={{
                margin: '12px 0',
                padding: '8px 12px',
                borderLeft: '2px solid var(--accent-primary)',
                background: 'var(--bg-card-hover)',
              }}>
                <p style={{
                  fontFamily: HEADING_FONT, fontStyle: 'italic',
                  fontSize: 14, color: 'var(--text-primary)',
                  lineHeight: 1.5, margin: 0,
                }}>
                  &ldquo;{b.quote.text}&rdquo;
                </p>
                <footer style={{
                  fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.14em',
                  color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase',
                }}>
                  — {b.quote.author}
                </footer>
              </blockquote>
            )}

            {/* Footer — related terms + modules */}
            <div style={{
              marginTop: 14, paddingTop: 10,
              borderTop: '1px dotted var(--border-subtle)',
              display: 'flex', flexWrap: 'wrap', gap: '4px 12px',
              fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.1em',
            }}>
              {b.relatedTerms.length > 0 && (
                <span style={{ color: 'var(--text-muted)' }}>
                  RELATED:{' '}
                  {b.relatedTerms.map((slug, i) => {
                    const r = BESTIARY_BY_SLUG[slug];
                    if (!r) return null;
                    return (
                      <span key={slug}>
                        <a href={`#${slug}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                          {r.term.toLowerCase()}
                        </a>
                        {i < b.relatedTerms.length - 1 && ', '}
                      </span>
                    );
                  })}
                </span>
              )}
              {b.modules.length > 0 && (
                <span style={{ color: 'var(--text-muted)' }}>
                  MODULES:{' '}
                  {b.modules.map((slug, i) => {
                    const m = MODULE_BY_SLUG[slug];
                    if (!m) return null;
                    return (
                      <span key={slug}>
                        <Link href={`/vienna-school/${slug}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                          {String(m.number).padStart(2, '0')}
                        </Link>
                        {i < b.modules.length - 1 && ', '}
                      </span>
                    );
                  })}
                </span>
              )}
            </div>
          </article>
        ))}

        {sorted.length === 0 && (
          <p style={{
            fontFamily: BODY_FONT, fontSize: 14, fontStyle: 'italic',
            color: 'var(--text-muted)', textAlign: 'center',
            gridColumn: '1 / -1', padding: '40px 0',
          }}>
            No terms match &ldquo;{query}&rdquo;.
          </p>
        )}
      </section>
    </div>
  );
}
