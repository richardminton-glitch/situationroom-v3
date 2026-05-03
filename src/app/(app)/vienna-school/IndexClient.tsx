'use client';

/**
 * /vienna-school — index page.
 *
 * Editorial intro, then a 6-card module grid. Cards for unbuilt modules
 * render in a faded "coming soon" state. Module 1 is live as of Session 1;
 * the rest land in subsequent sessions per vienna-school-spec.md §9.
 */

import Link from 'next/link';
import { CaretRight, Lock, CheckCircle, GraduationCap, BookOpenText, Quotes, UsersThree, FilePdf, IdentificationCard } from '@phosphor-icons/react';
import {
  MODULES,
  MODULE_STUB_ORDER,
  BUILT_SLUGS,
  TOTAL_MODULES,
  TOTAL_LADDER_BOOKS,
  type ModuleStub,
} from '@/content/vienna-school';
import { useVsProgress } from '@/hooks/useVsProgress';

const HEADING_FONT = 'Georgia, serif';
const BODY_FONT    = "'Source Serif 4', Georgia, serif";
const MONO_FONT    = "'IBM Plex Mono', 'SF Mono', Consolas, monospace";

export function VienneSchoolIndexClient() {
  const { completedCount, booksReadCount, graduated, graduationDate, isComplete, reset } = useVsProgress();
  const allBuilt = TOTAL_MODULES;

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100%' }}>
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <header
        style={{
          maxWidth:   980,
          margin:     '0 auto',
          padding:    '64px 24px 32px',
        }}
      >
        <p style={{
          fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.22em',
          color: 'var(--text-muted)', margin: 0,
        }}>
          THE SITUATION ROOM · SCHOOLROOM
        </p>
        <h1 style={{
          fontFamily: HEADING_FONT, fontSize: 56, fontWeight: 700,
          color: 'var(--text-primary)', margin: '8px 0 0 0',
          lineHeight: 1.05, letterSpacing: '-0.015em',
        }}>
          The Vienna School
        </h1>
        <p style={{
          fontFamily: BODY_FONT, fontStyle: 'italic',
          fontSize: 22, color: 'var(--text-secondary)',
          margin: '12px 0 0 0', lineHeight: 1.4,
        }}>
          A six-module curriculum on Austrian economics — the analytical lens
          that makes everything else in this room make sense.
        </p>

        <p style={{
          fontFamily: BODY_FONT, fontSize: 17, lineHeight: 1.7,
          color: 'var(--text-primary)', maxWidth: 680,
          marginTop: 28,
        }}>
          Most readers arriving here are Bitcoin-curious but unfamiliar with
          the 150-year tradition that explains why sound money matters in the
          first place. Work through these six modules in order — about an hour
          each — and the rest of the Situation Room will read differently.
          Every chart will have a frame around it. Every policy headline will
          have a translation.
        </p>

        <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <Link
            href="/vienna-school/origin"
            style={{
              display:        'inline-flex',
              alignItems:     'center',
              gap:            8,
              padding:        '12px 28px',
              fontFamily:     MONO_FONT,
              fontSize:       12,
              letterSpacing:  '0.16em',
              fontWeight:     600,
              backgroundColor:'var(--accent-primary)',
              color:          '#F8F1E3',
              textDecoration: 'none',
            }}
          >
            BEGIN MODULE 01 <CaretRight size={12} weight="bold" />
          </Link>
          <span style={{
            fontFamily: MONO_FONT, fontSize: 11, color: 'var(--text-muted)',
            letterSpacing: '0.12em',
          }}>
            FREE · NO ACCOUNT REQUIRED
          </span>
        </div>
      </header>

      {/* ── Graduation banner (post-completion) ────────────────────── */}
      {graduated && (
        <section style={{
          maxWidth: 980, margin: '32px auto 0',
          padding:  '0 24px',
        }}>
          <div style={{
            border:        `2px solid var(--accent-primary)`,
            background:    'var(--bg-card)',
            padding:       '20px 24px',
            display:       'flex',
            alignItems:    'center',
            gap:           18,
            flexWrap:      'wrap',
          }}>
            <GraduationCap size={36} weight="duotone" style={{ color: 'var(--accent-primary)' }} />
            <div style={{ flex: 1, minWidth: 240 }}>
              <p style={{
                fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em',
                color: 'var(--accent-primary)', margin: 0, fontWeight: 600,
              }}>
                VIENNA SCHOOL · GRADUATE
              </p>
              <h3 style={{
                fontFamily: HEADING_FONT, fontSize: 20, fontWeight: 600,
                color: 'var(--text-primary)', margin: '4px 0 0 0',
              }}>
                You finished the curriculum.
              </h3>
              <p style={{
                fontFamily: BODY_FONT, fontSize: 13, color: 'var(--text-secondary)',
                margin: '4px 0 0 0', fontStyle: 'italic',
              }}>
                Stamped {new Date(graduationDate!).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
                The framework is installed. Read the rest of the Situation Room with new eyes.
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              title="Clear your progress and re-take the curriculum"
              style={{
                padding: '8px 14px',
                fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em',
                background: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-primary)',
                cursor: 'pointer',
              }}
            >
              RESET PROGRESS
            </button>
          </div>
        </section>
      )}

      {/* ── Module grid ─────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 980, margin: '40px auto 0',
        padding:  '0 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{
            fontFamily: HEADING_FONT, fontSize: 28, fontWeight: 600,
            color: 'var(--text-primary)', margin: 0,
          }}>
            The curriculum
          </h2>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <p style={{
              fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.16em',
              color: 'var(--text-muted)', margin: 0,
            }}>
              {MODULES.length} OF {TOTAL_MODULES} MODULES LIVE
            </p>
            {completedCount > 0 && (
              <p style={{
                fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.16em',
                color: 'var(--accent-success)', margin: 0, fontWeight: 600,
              }}>
                ✓ {completedCount} OF {allBuilt} PASSED
              </p>
            )}
            {booksReadCount > 0 && (
              <p style={{
                fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.16em',
                color: 'var(--accent-primary)', margin: 0, fontWeight: 600,
              }}>
                {booksReadCount} OF {TOTAL_LADDER_BOOKS} BOOKS
              </p>
            )}
          </div>
        </div>

        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap:                 18,
        }}>
          {MODULE_STUB_ORDER.map((stub) => (
            <ModuleCard
              key={stub.slug}
              stub={stub}
              built={BUILT_SLUGS.has(stub.slug)}
              completed={isComplete(stub.slug)}
            />
          ))}
        </div>
      </section>

      {/* ── Cross-cutting components nav ────────────────────────────── */}
      <section style={{
        maxWidth: 980, margin: '48px auto 0',
        padding:  '0 24px',
      }}>
        <h2 style={{
          fontFamily: HEADING_FONT, fontSize: 22, fontWeight: 600,
          color: 'var(--text-primary)', margin: '0 0 14px 0',
        }}>
          Cross-cutting reference
        </h2>
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap:                 14,
        }}>
          <CrossCard href="/vienna-school/heretics"     icon={<UsersThree size={20} />}         title="The Heretics"   subtitle="Bio cards: Menger, Mises, Hayek, Rothbard, Hoppe…" />
          <CrossCard href="/vienna-school/bestiary"     icon={<BookOpenText size={20} />}       title="The Bestiary"   subtitle="Glossary: praxeology, Cantillon, marginal utility…" />
          <CrossCard href="/vienna-school/quote-wall"   icon={<Quotes size={20} />}             title="The Quote Wall" subtitle="Rotating Austrian aphorisms with full context." />
          <CrossCard href="/vienna-school/field-manual" icon={<FilePdf size={20} />}            title="Field Manual"   subtitle="Whole curriculum as one document. Print or save as PDF." />
          <CrossCard href="/vienna-school/dossier"      icon={<IdentificationCard size={20} />} title="Your Dossier"   subtitle="Modules passed, books ticked, graduation certificate." />
        </div>
      </section>

      {/* ── Footer signature ───────────────────────────────────────── */}
      <footer style={{
        maxWidth: 980, margin: '64px auto 0',
        padding:  '32px 24px 80px',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        <p style={{
          fontFamily:    MONO_FONT, fontSize: 10, letterSpacing: '0.18em',
          color:         'var(--text-muted)', margin: 0, textAlign: 'center',
        }}>
          MENGER · BÖHM-BAWERK · MISES · HAYEK · ROTHBARD · HOPPE
        </p>
      </footer>
    </div>
  );
}

// ── Cross-cutting card ─────────────────────────────────────────────────

function CrossCard({ href, icon, title, subtitle }: { href: string; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Link
      href={href}
      style={{
        display:        'flex',
        alignItems:     'flex-start',
        gap:            12,
        padding:        '16px 18px',
        border:         '1px solid var(--border-primary)',
        background:     'var(--bg-card)',
        textDecoration: 'none',
        transition:     'border-color 0.15s, background 0.15s',
      }}
      className="hover:border-[var(--accent-primary)]"
    >
      <div style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: 2 }}>{icon}</div>
      <div>
        <div style={{
          fontFamily: HEADING_FONT, fontSize: 16, fontWeight: 600,
          color: 'var(--text-primary)', marginBottom: 2,
        }}>
          {title}
        </div>
        <div style={{
          fontFamily: BODY_FONT, fontSize: 12, fontStyle: 'italic',
          color: 'var(--text-muted)', lineHeight: 1.4,
        }}>
          {subtitle}
        </div>
      </div>
    </Link>
  );
}

// ── Module card ─────────────────────────────────────────────────────────

function ModuleCard({ stub, built, completed }: { stub: ModuleStub; built: boolean; completed?: boolean }) {
  const accent = stub.tier === 'free' ? 'var(--accent-success)' : 'var(--accent-primary)';

  if (!built) {
    return (
      <div style={{
        border:     '1px solid var(--border-subtle)',
        background: 'var(--bg-card)',
        opacity:    0.55,
        position:   'relative',
      }}>
        <div style={{ position: 'relative', aspectRatio: '16 / 9', overflow: 'hidden', backgroundColor: '#1a1a1a' }}>
          <img src={stub.hero} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(0.6)' }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(248,241,227,0) 50%, rgba(248,241,227,0.5) 100%)',
          }} />
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div style={{
            fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em',
            color: 'var(--text-muted)', marginBottom: 4,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Lock size={10} /> MODULE {String(stub.number).padStart(2, '0')} · COMING SOON
          </div>
          <div style={{
            fontFamily: HEADING_FONT, fontSize: 19, fontWeight: 600,
            color: 'var(--text-secondary)', marginBottom: 4,
          }}>
            {stub.title}
          </div>
          <div style={{
            fontFamily: BODY_FONT, fontStyle: 'italic', fontSize: 13,
            color: 'var(--text-muted)',
          }}>
            {stub.subtitle}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/vienna-school/${stub.slug}`} style={{
      border:         completed ? '1px solid var(--accent-success)' : '1px solid var(--border-primary)',
      background:     'var(--bg-card)',
      textDecoration: 'none',
      display:        'block',
      transition:     'transform 0.15s, border-color 0.15s',
    }}
      className="hover:scale-[1.01]"
    >
      <div style={{ position: 'relative', aspectRatio: '16 / 9', overflow: 'hidden', backgroundColor: '#1a1a1a' }}>
        <img src={stub.hero} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.5) 100%)',
        }} />
        <div style={{
          position: 'absolute', top: 10, left: 12,
          fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.2em',
          color: '#F8F1E3', fontWeight: 600, opacity: 0.95,
        }}>
          MODULE {String(stub.number).padStart(2, '0')}
        </div>
        {completed && (
          <div
            title="Field test passed"
            style={{
              position: 'absolute', top: 8, right: 8,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--accent-success)',
              color: '#F8F1E3',
            }}
          >
            <CheckCircle size={20} weight="fill" />
          </div>
        )}
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{
          fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.16em',
          color: accent, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase',
        }}>
          {stub.tier === 'free' ? '· OPEN ACCESS' : `· ${stub.tier} TIER`}
        </div>
        <div style={{
          fontFamily: HEADING_FONT, fontSize: 19, fontWeight: 600,
          color: 'var(--text-primary)', marginBottom: 4,
        }}>
          {stub.title}
        </div>
        <div style={{
          fontFamily: BODY_FONT, fontStyle: 'italic', fontSize: 13,
          color: 'var(--text-secondary)', lineHeight: 1.4,
        }}>
          {stub.subtitle}
        </div>
      </div>
    </Link>
  );
}
