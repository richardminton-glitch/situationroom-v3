'use client';

/**
 * DossierClient — the user's curriculum dossier.
 *
 * One-page overview of their Vienna School progress:
 *   - Modules-passed roster with completion stamps
 *   - Reading-ladder roll-up: X / Y books checked off, grouped by module
 *   - Graduation certificate (when complete) with stamp and date
 *
 * Anonymous visitors get a sign-in CTA — the dossier is a personal
 * artefact and the feature is meaningless without an identity to attach
 * to. Note that the field test gating is the same: open prose + interactives,
 * gated quiz + dossier.
 */

import Link from 'next/link';
import { ArrowLeft, GraduationCap, CheckCircle, Circle, BookOpen } from '@phosphor-icons/react';
import {
  MODULES,
  ALL_LADDER_BOOKS,
  TOTAL_LADDER_BOOKS,
  TOTAL_MODULES,
} from '@/content/vienna-school';
import { useVsProgress } from '@/hooks/useVsProgress';
import { useAuth } from '@/components/layout/AuthProvider';

const HEADING_FONT = 'Georgia, serif';
const BODY_FONT    = "'Source Serif 4', Georgia, serif";
const MONO_FONT    = "'IBM Plex Mono', 'SF Mono', Consolas, monospace";

export function DossierClient() {
  const { user, loading: authLoading } = useAuth();
  const {
    modulesCompleted, booksRead,
    completedCount, booksReadCount,
    graduated, graduationDate,
    serverBacked, reset,
  } = useVsProgress();

  if (authLoading) {
    return <FullPageMsg label="Loading dossier…" />;
  }
  if (!user) {
    return <SignInGate />;
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100%' }}>
      {/* ── Crumbs ──────────────────────────────────────────────── */}
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px 24px 0' }}>
        <p style={{ fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.22em', color: 'var(--text-muted)', margin: 0 }}>
          <Link href="/vienna-school" style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={11} weight="bold" /> THE VIENNA SCHOOL
          </Link>
          <span style={{ margin: '0 8px' }}>·</span>
          DOSSIER
        </p>
      </div>

      <header style={{ maxWidth: 980, margin: '0 auto', padding: '16px 24px 24px' }}>
        <h1 style={{
          fontFamily: HEADING_FONT, fontSize: 44, fontWeight: 700,
          color: 'var(--text-primary)', margin: 0,
          lineHeight: 1.05, letterSpacing: '-0.01em',
        }}>
          Your dossier
        </h1>
        <p style={{
          fontFamily: BODY_FONT, fontStyle: 'italic',
          fontSize: 18, color: 'var(--text-secondary)',
          margin: '8px 0 0 0', lineHeight: 1.5,
        }}>
          {user.email}{serverBacked ? ' · synced' : ' · local-only (sign in fully to sync)'}
        </p>
      </header>

      {/* ── Graduation certificate (when complete) ──────────────── */}
      {graduated && graduationDate && (
        <section style={{ maxWidth: 980, margin: '0 auto', padding: '0 24px 32px' }}>
          <div style={{
            position:   'relative',
            border:     '4px double var(--accent-primary)',
            background: 'var(--bg-card)',
            padding:    '28px 32px',
            textAlign:  'center',
            overflow:   'hidden',
          }}>
            <GraduationCap size={48} weight="duotone" style={{ color: 'var(--accent-primary)', margin: '0 auto' }} />
            <p style={{
              fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.24em',
              color: 'var(--accent-primary)', margin: '12px 0 0 0', fontWeight: 600,
            }}>
              CERTIFIED · VIENNA SCHOOL · GRADUATE
            </p>
            <h2 style={{
              fontFamily: HEADING_FONT, fontSize: 28, fontWeight: 700,
              color: 'var(--text-primary)', margin: '8px 0 4px 0',
              lineHeight: 1.1,
            }}>
              You completed the curriculum.
            </h2>
            <p style={{
              fontFamily: BODY_FONT, fontStyle: 'italic', fontSize: 14,
              color: 'var(--text-secondary)', margin: '4px 0 0 0',
            }}>
              All six modules passed. Awarded {new Date(graduationDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
            </p>
            <p style={{
              fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.2em',
              color: 'var(--text-muted)', margin: '14px 0 0 0',
            }}>
              MENGER · BÖHM-BAWERK · MISES · HAYEK · ROTHBARD · HOPPE
            </p>
          </div>
        </section>
      )}

      {/* ── Stats strip ─────────────────────────────────────────── */}
      <section style={{ maxWidth: 980, margin: '0 auto', padding: '0 24px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14,
        }}>
          <Stat label="MODULES PASSED"  value={`${completedCount} / ${TOTAL_MODULES}`} accent={completedCount === TOTAL_MODULES ? 'var(--accent-success)' : 'var(--accent-primary)'} />
          <Stat label="BOOKS CHECKED"   value={`${booksReadCount} / ${TOTAL_LADDER_BOOKS}`} accent="var(--accent-primary)" />
          <Stat label="GRADUATION DATE" value={graduated && graduationDate ? new Date(graduationDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} accent={graduated ? 'var(--accent-success)' : 'var(--text-muted)'} />
          <Stat label="STATUS"          value={serverBacked ? 'SYNCED' : 'LOCAL'} accent={serverBacked ? 'var(--accent-success)' : 'var(--text-muted)'} />
        </div>
      </section>

      {/* ── Modules table ───────────────────────────────────────── */}
      <section style={{ maxWidth: 980, margin: '40px auto 0', padding: '0 24px' }}>
        <h2 style={{
          fontFamily: HEADING_FONT, fontSize: 22, fontWeight: 600,
          color: 'var(--text-primary)', margin: '0 0 14px 0',
        }}>
          Modules
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MODULES.map((m) => {
            const done = modulesCompleted.has(m.slug);
            return (
              <Link
                key={m.slug}
                href={`/vienna-school/${m.slug}`}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  gap:            14,
                  padding:        '14px 16px',
                  border:         done ? '1px solid var(--accent-success)' : '1px solid var(--border-primary)',
                  background:     'var(--bg-card)',
                  textDecoration: 'none',
                }}
              >
                {done
                  ? <CheckCircle size={22} weight="fill"    style={{ color: 'var(--accent-success)', flexShrink: 0 }} />
                  : <Circle      size={22} weight="regular" style={{ color: 'var(--text-muted)',     flexShrink: 0 }} />
                }
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.16em',
                    color: 'var(--text-muted)', marginBottom: 2,
                  }}>
                    MODULE {String(m.number).padStart(2, '0')}
                  </div>
                  <div style={{
                    fontFamily: HEADING_FONT, fontSize: 17, fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}>
                    {m.title}
                  </div>
                  <div style={{
                    fontFamily: BODY_FONT, fontStyle: 'italic', fontSize: 13,
                    color: 'var(--text-secondary)', marginTop: 2,
                  }}>
                    {m.subtitle}
                  </div>
                </div>
                <div style={{
                  fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em',
                  color: done ? 'var(--accent-success)' : 'var(--text-muted)',
                  fontWeight: 600,
                }}>
                  {done ? '✓ PASSED' : 'OPEN'}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Reading log ─────────────────────────────────────────── */}
      <section style={{ maxWidth: 980, margin: '40px auto 0', padding: '0 24px' }}>
        <h2 style={{
          fontFamily: HEADING_FONT, fontSize: 22, fontWeight: 600,
          color: 'var(--text-primary)', margin: '0 0 14px 0',
        }}>
          Reading log
        </h2>
        <p style={{
          fontFamily: BODY_FONT, fontSize: 14, fontStyle: 'italic',
          color: 'var(--text-secondary)', margin: '0 0 16px 0',
        }}>
          Books you've ticked off the reading ladders. Tick more on each module page.
        </p>
        {booksReadCount === 0 ? (
          <div style={{
            border: '1px dashed var(--border-primary)',
            background: 'var(--bg-card)',
            padding: '24px 28px',
            textAlign: 'center',
            fontFamily: BODY_FONT, fontSize: 14, fontStyle: 'italic',
            color: 'var(--text-muted)',
          }}>
            <BookOpen size={28} weight="duotone" style={{ color: 'var(--text-muted)', opacity: 0.6, marginBottom: 8 }} />
            <p style={{ margin: 0 }}>
              No books ticked yet. Each module page has a reading ladder with checkboxes.
            </p>
          </div>
        ) : (
          <ul style={{
            margin: 0, padding: 0, listStyle: 'none',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            {ALL_LADDER_BOOKS.filter((b) => booksRead.has(b.id)).map((b) => (
              <li key={b.id} style={{
                display: 'flex', alignItems: 'baseline', gap: 12,
                padding: '8px 12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
              }}>
                <CheckCircle size={14} weight="fill" style={{ color: 'var(--accent-success)', flexShrink: 0, position: 'relative', top: 2 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: HEADING_FONT, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{b.title}</span>{' '}
                  <span style={{ fontFamily: BODY_FONT, fontStyle: 'italic', fontSize: 13, color: 'var(--text-muted)' }}>{b.author} · {b.year}</span>
                </div>
                <Link href={`/vienna-school/${b.moduleSlug}`} style={{
                  fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.14em',
                  color: 'var(--accent-primary)', textDecoration: 'none',
                }}>
                  MODULE · {b.moduleTitle.toUpperCase()}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Footer / reset ──────────────────────────────────────── */}
      <footer style={{
        maxWidth: 980, margin: '64px auto 0',
        padding:  '32px 24px 80px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <p style={{
          fontFamily: BODY_FONT, fontSize: 13, fontStyle: 'italic',
          color: 'var(--text-muted)', margin: 0,
        }}>
          Resets clear local progress only — graduation history on the server is preserved.
        </p>
        <button
          type="button"
          onClick={reset}
          title="Clear local progress"
          style={{
            padding: '8px 14px',
            fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em',
            background: 'transparent',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-primary)',
            cursor: 'pointer',
          }}
        >
          RESET LOCAL PROGRESS
        </button>
      </footer>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      border:     '1px solid var(--border-primary)',
      background: 'var(--bg-card)',
      padding:    '14px 16px',
    }}>
      <p style={{
        fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em',
        color: 'var(--text-muted)', margin: 0, fontWeight: 600,
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: MONO_FONT, fontSize: 18, fontWeight: 600,
        color: accent, margin: '4px 0 0 0', letterSpacing: '0.04em',
      }}>
        {value}
      </p>
    </div>
  );
}

function FullPageMsg({ label }: { label: string }) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-primary)', minHeight: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
    }}>
      <p style={{ fontFamily: MONO_FONT, fontSize: 11, letterSpacing: '0.16em', color: 'var(--text-muted)' }}>
        {label.toUpperCase()}
      </p>
    </div>
  );
}

function SignInGate() {
  return (
    <div style={{
      backgroundColor: 'var(--bg-primary)', minHeight: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
    }}>
      <div style={{
        maxWidth: 460, width: '100%',
        border: '1px dashed var(--accent-primary)',
        background: 'var(--bg-card)',
        padding: '32px 36px', textAlign: 'center',
      }}>
        <GraduationCap size={48} weight="duotone" style={{ color: 'var(--accent-primary)', margin: '0 auto' }} />
        <p style={{ fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em', color: 'var(--accent-primary)', margin: '12px 0 0 0', fontWeight: 600 }}>
          DOSSIER · SIGN-IN REQUIRED
        </p>
        <h2 style={{
          fontFamily: HEADING_FONT, fontSize: 22, color: 'var(--text-primary)',
          margin: '6px 0 8px 0', fontWeight: 600,
        }}>
          Your dossier needs a name on it.
        </h2>
        <p style={{
          fontFamily: BODY_FONT, fontSize: 14, lineHeight: 1.6,
          color: 'var(--text-secondary)', margin: '0 auto 18px',
          fontStyle: 'italic',
        }}>
          The curriculum is open to everyone — but a personal record of
          your progress, books read, and graduation date needs an account.
          Free, 30 seconds.
        </p>
        <Link
          href="/login"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 22px',
            fontFamily: MONO_FONT, fontSize: 11, letterSpacing: '0.16em', fontWeight: 600,
            backgroundColor: 'var(--accent-primary)',
            color: '#F8F1E3', textDecoration: 'none',
          }}
        >
          SIGN IN TO YOUR DOSSIER
        </Link>
      </div>
    </div>
  );
}
