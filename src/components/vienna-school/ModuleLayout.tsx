'use client';

/**
 * ModuleLayout — shared frame for every Vienna School module page.
 *
 * Composes: hero image with title overlay, cold-open paragraph (drop-cap),
 * core argument paragraphs, the module-specific interactive element,
 * pull-quotes, reading ladder (beginner/intermediate/deep), field test,
 * and prev/next navigation.
 *
 * Pure presentational — receives the module data as a prop. Tier-gating
 * happens at the route level so the layout can stay dumb.
 */

import Link from 'next/link';
import { CaretLeft, CaretRight, FilePdf, BookOpen, Lock, CheckSquare, Square } from '@phosphor-icons/react';
import type { VsModule, Book } from '@/content/vienna-school/types';
import { MODULE_STUB_ORDER, BUILT_SLUGS, TOTAL_MODULES, type ModuleStub, bookId } from '@/content/vienna-school';
import { useAuth } from '@/components/layout/AuthProvider';
import { ProseParagraph } from './ModuleProse';
import { InteractiveMount } from './InteractiveMount';
import { FieldTest } from './FieldTest';
import { useVsProgress } from '@/hooks/useVsProgress';

const HEADING_FONT = 'Georgia, serif';
const BODY_FONT    = "'Source Serif 4', Georgia, serif";
const MONO_FONT    = 'var(--font-mono)';

interface Props {
  module: VsModule;
}

export function ModuleLayout({ module: m }: Props) {
  const idx  = MODULE_STUB_ORDER.findIndex((s) => s.slug === m.slug);
  const prev = idx > 0                                ? MODULE_STUB_ORDER[idx - 1] : null;
  const next = idx < MODULE_STUB_ORDER.length - 1     ? MODULE_STUB_ORDER[idx + 1] : null;

  const { markComplete, isComplete } = useVsProgress();
  const alreadyComplete = isComplete(m.slug);

  return (
    <article
      style={{
        backgroundColor: 'var(--bg-primary)',
        minHeight:       '100%',
      }}
    >
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div
        style={{
          position:       'relative',
          width:          '100%',
          aspectRatio:    '21 / 9',
          maxHeight:      460,
          overflow:       'hidden',
          backgroundColor: '#1a1a1a',
        }}
      >
        <img
          src={m.heroImage}
          alt={m.heroImageAlt}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            display: 'block',
          }}
        />
        {/* Vignette */}
        <div
          style={{
            position: 'absolute', inset: 0,
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.55) 100%)',
            pointerEvents: 'none',
          }}
        />
        {/* Title overlay */}
        <div
          style={{
            position: 'absolute',
            left:     '50%',
            transform: 'translateX(-50%)',
            bottom:   28,
            width:    'calc(100% - 48px)',
            maxWidth: 880,
            color:    '#F8F1E3',
          }}
        >
          <p style={{
            fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.22em',
            margin: 0, marginBottom: 8, opacity: 0.85,
          }}>
            THE VIENNA SCHOOL · MODULE {String(m.number).padStart(2, '0')} OF {TOTAL_MODULES}
          </p>
          <h1 style={{
            fontFamily: HEADING_FONT, fontSize: 44, fontWeight: 700,
            margin: 0, lineHeight: 1.1, letterSpacing: '-0.01em',
            textShadow: '0 2px 12px rgba(0,0,0,0.6)',
          }}>
            {m.title}
          </h1>
          <p style={{
            fontFamily: BODY_FONT, fontStyle: 'italic', fontSize: 17,
            margin: '8px 0 0 0', opacity: 0.92,
          }}>
            {m.subtitle}
          </p>
        </div>
      </div>

      {/* ── Body column ─────────────────────────────────────────────── */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Cold open */}
        <ProseParagraph dropCap>{m.coldOpen}</ProseParagraph>

        {/* Section break */}
        <SectionBreak />

        {/* Core argument */}
        {m.coreArgument.map((p, i) => (
          <ProseParagraph key={i}>{p}</ProseParagraph>
        ))}

        {/* Interactive */}
        <InteractiveMount spec={m.interactive} />

        {/* Pull quotes */}
        <div style={{ margin: '40px 0' }}>
          {m.quotes.map((q, i) => (
            <blockquote
              key={i}
              style={{
                margin:        '0 0 28px 0',
                padding:       '4px 0 4px 20px',
                borderLeft:    `3px solid ${i % 2 === 0 ? 'var(--accent-primary)' : 'var(--text-muted)'}`,
              }}
            >
              <p style={{
                fontFamily:  HEADING_FONT,
                fontStyle:   'italic',
                fontSize:    21,
                lineHeight:  1.45,
                color:       'var(--text-primary)',
                margin:      0,
              }}>
                &ldquo;{q.text}&rdquo;
              </p>
              <footer style={{
                fontFamily:    MONO_FONT,
                fontSize:      10,
                letterSpacing: '0.14em',
                color:         'var(--text-muted)',
                marginTop:     8,
                textTransform: 'uppercase',
              }}>
                — {q.author}
                {q.source && <>, <span style={{ fontStyle: 'italic', textTransform: 'none', letterSpacing: '0.02em', fontFamily: BODY_FONT, fontSize: 12 }}>{q.source}</span></>}
                {q.year && ` · ${q.year}`}
              </footer>
            </blockquote>
          ))}
        </div>

        {/* Optional secondary interactive (e.g. Module 3 currency cemetery) */}
        {m.secondaryInteractive && <InteractiveMount spec={m.secondaryInteractive} />}

        {/* Reading ladder */}
        <ReadingLadderSection ladder={m.readingLadder} moduleSlug={m.slug} />

        {/* Field test */}
        <FieldTest
          questions={m.fieldTest}
          onPass={() => markComplete(m.slug)}
          alreadyCompleted={alreadyComplete}
        />

        {/* Prev / Next nav */}
        <ModuleNav prev={prev} next={next} />
      </div>
    </article>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function SectionBreak() {
  return (
    <div style={{
      display:       'flex',
      alignItems:    'center',
      justifyContent:'center',
      margin:        '28px 0',
      fontFamily:    MONO_FONT,
      fontSize:      14,
      letterSpacing: '0.6em',
      color:         'var(--text-muted)',
      opacity:       0.5,
    }}>
      § § §
    </div>
  );
}

function ReadingLadderSection({ ladder, moduleSlug }: { ladder: VsModule['readingLadder']; moduleSlug: string }) {
  const { user } = useAuth();
  const { isBookRead, toggleBook } = useVsProgress();
  const checkable = !!user;

  return (
    <section style={{ marginTop: 40 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{
            fontFamily:    MONO_FONT, fontSize: 9, letterSpacing: '0.18em',
            color:         'var(--text-muted)', margin: 0,
          }}>
            READING LADDER
          </p>
          <h3 style={{
            fontFamily: HEADING_FONT, fontSize: 24, color: 'var(--text-primary)',
            margin: '4px 0 0 0', fontWeight: 600,
          }}>
            Climb at your own pace.
          </h3>
        </div>
        {!checkable && (
          <span style={{
            fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.14em',
            color: 'var(--text-muted)',
          }}>
            <Link href="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
              SIGN IN
            </Link> TO CHECK OFF READS
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 18 }}>
        <LadderColumn label="Beginner"      books={ladder.beginner}     moduleSlug={moduleSlug} checkable={checkable} isBookRead={isBookRead} toggleBook={toggleBook} />
        <LadderColumn label="Intermediate"  books={ladder.intermediate} moduleSlug={moduleSlug} checkable={checkable} isBookRead={isBookRead} toggleBook={toggleBook} />
        <LadderColumn label="Deep"          books={ladder.deep}         moduleSlug={moduleSlug} checkable={checkable} isBookRead={isBookRead} toggleBook={toggleBook} />
      </div>
    </section>
  );
}

interface LadderColumnProps {
  label:       string;
  books:       Book[];
  moduleSlug:  string;
  checkable:   boolean;
  isBookRead:  (id: string) => boolean;
  toggleBook:  (id: string, read: boolean) => void;
}

function LadderColumn({ label, books, moduleSlug, checkable, isBookRead, toggleBook }: LadderColumnProps) {
  return (
    <div style={{
      border:     '1px solid var(--border-primary)',
      background: 'var(--bg-card)',
      padding:    '16px 18px',
    }}>
      <div style={{
        fontFamily:    MONO_FONT, fontSize: 9, letterSpacing: '0.18em',
        color:         'var(--accent-primary)', fontWeight: 600,
        marginBottom:  10, textTransform: 'uppercase',
      }}>
        {label}
      </div>
      {books.map((b, i) => {
        const id   = bookId(moduleSlug, b.title);
        const read = isBookRead(id);
        return (
          <div key={i} style={{ marginBottom: i < books.length - 1 ? 14 : 0, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            {checkable && (
              <button
                type="button"
                onClick={() => toggleBook(id, !read)}
                title={read ? 'Mark as unread' : 'Mark as read'}
                aria-pressed={read}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  marginTop: 3, color: read ? 'var(--accent-success)' : 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                {read ? <CheckSquare size={16} weight="fill" /> : <Square size={16} weight="regular" />}
              </button>
            )}
            <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: HEADING_FONT, fontSize: 15, fontWeight: 600,
            color: read ? 'var(--text-secondary)' : 'var(--text-primary)',
            lineHeight: 1.3, marginBottom: 2,
            textDecoration: read ? 'line-through' : 'none',
            textDecorationColor: 'var(--text-muted)',
          }}>
            {b.title}
          </div>
          <div style={{
            fontFamily: BODY_FONT, fontSize: 12, fontStyle: 'italic',
            color: 'var(--text-muted)', marginBottom: 4,
          }}>
            {b.author} · {b.year}
          </div>
          <div style={{
            fontFamily: BODY_FONT, fontSize: 13, lineHeight: 1.5,
            color: 'var(--text-secondary)', marginBottom: 6,
          }}>
            {b.description}
          </div>
          <div style={{ display: 'flex', gap: 10, fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.1em' }}>
            {b.freePdfLink && (
              <a href={b.freePdfLink} target="_blank" rel="noopener noreferrer"
                 style={{ color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                <FilePdf size={12} weight="bold" /> FREE · MISES.ORG
              </a>
            )}
            {b.amazonLink && (
              <a href={b.amazonLink} target="_blank" rel="noopener noreferrer"
                 style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                <BookOpen size={12} weight="bold" /> AMAZON
              </a>
            )}
          </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ModuleNav({ prev, next }: { prev: ModuleStub | null; next: ModuleStub | null }) {
  const prevBuilt = prev ? BUILT_SLUGS.has(prev.slug) : false;
  const nextBuilt = next ? BUILT_SLUGS.has(next.slug) : false;
  return (
    <nav style={{
      display:       'grid',
      gridTemplateColumns: '1fr 1fr',
      gap:           16,
      marginTop:     48,
      paddingTop:    24,
      borderTop:     '1px solid var(--border-primary)',
    }}>
      {prev && prevBuilt ? (
        <Link href={`/vienna-school/${prev.slug}`} style={{
          padding:    '14px 18px',
          border:     '1px solid var(--border-primary)',
          background: 'var(--bg-card)',
          textDecoration: 'none',
          display:    'block',
        }}>
          <div style={{
            fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em',
            color: 'var(--text-muted)', marginBottom: 4,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <CaretLeft size={11} /> PREVIOUS · MODULE {String(prev.number).padStart(2, '0')}
          </div>
          <div style={{
            fontFamily: HEADING_FONT, fontSize: 17, fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            {prev.title}
          </div>
        </Link>
      ) : prev ? (
        <div style={{
          padding:    '14px 18px',
          border:     '1px dashed var(--border-subtle)',
          background: 'transparent',
        }}>
          <div style={{
            fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em',
            color: 'var(--text-muted)', marginBottom: 4,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Lock size={10} /> COMING SOON · MODULE {String(prev.number).padStart(2, '0')}
          </div>
          <div style={{
            fontFamily: HEADING_FONT, fontSize: 17, fontWeight: 600,
            color: 'var(--text-muted)', fontStyle: 'italic',
          }}>
            {prev.title}
          </div>
        </div>
      ) : (
        <Link href="/vienna-school" style={{
          padding:    '14px 18px',
          border:     '1px solid var(--border-subtle)',
          background: 'transparent',
          textDecoration: 'none',
          display:    'block',
        }}>
          <div style={{
            fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em',
            color: 'var(--text-muted)', marginBottom: 4,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <CaretLeft size={11} /> RETURN
          </div>
          <div style={{
            fontFamily: HEADING_FONT, fontSize: 17, fontWeight: 600,
            color: 'var(--text-secondary)',
          }}>
            Module index
          </div>
        </Link>
      )}

      {next && nextBuilt ? (
        <Link href={`/vienna-school/${next.slug}`} style={{
          padding:    '14px 18px',
          border:     '1px solid var(--accent-primary)',
          background: 'var(--bg-card)',
          textDecoration: 'none',
          display:    'block',
          textAlign:  'right',
        }}>
          <div style={{
            fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em',
            color: 'var(--accent-primary)', marginBottom: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
          }}>
            NEXT · MODULE {String(next.number).padStart(2, '0')} <CaretRight size={11} />
          </div>
          <div style={{
            fontFamily: HEADING_FONT, fontSize: 17, fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            {next.title}
          </div>
        </Link>
      ) : next ? (
        <div style={{
          padding:    '14px 18px',
          border:     '1px dashed var(--border-subtle)',
          background: 'transparent',
          textAlign:  'right',
        }}>
          <div style={{
            fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em',
            color: 'var(--text-muted)', marginBottom: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
          }}>
            COMING SOON · MODULE {String(next.number).padStart(2, '0')} <Lock size={10} />
          </div>
          <div style={{
            fontFamily: HEADING_FONT, fontSize: 17, fontWeight: 600,
            color: 'var(--text-muted)', fontStyle: 'italic',
          }}>
            {next.title}
          </div>
        </div>
      ) : (
        <Link href="/vienna-school" style={{
          padding:    '14px 18px',
          border:     '1px solid var(--accent-primary)',
          background: 'var(--bg-card)',
          textDecoration: 'none',
          display:    'block',
          textAlign:  'right',
        }}>
          <div style={{
            fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em',
            color: 'var(--accent-primary)', marginBottom: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
          }}>
            CURRICULUM COMPLETE <CaretRight size={11} />
          </div>
          <div style={{
            fontFamily: HEADING_FONT, fontSize: 17, fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            Return to the index
          </div>
        </Link>
      )}
    </nav>
  );
}
