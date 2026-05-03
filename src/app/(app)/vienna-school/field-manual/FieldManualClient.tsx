'use client';

/**
 * FieldManualClient — the print-friendly aggregated curriculum.
 *
 * Renders all six modules in sequence as continuous prose: cold open,
 * core argument, pull-quotes, reading ladder. Interactives are *replaced*
 * with a "see the live module for the interactive at situationroom.space/
 * vienna-school/{slug}" callout — they don't transfer to print and the
 * link gives the print reader a way back.
 *
 * Optimised for Cmd/Ctrl-P → Save as PDF. The screen presentation also
 * works as a single-scroll long-form for readers who prefer that to the
 * navigated module structure.
 *
 * Spec § 6 calls for a "downloadable PDF Field Manual" for Members tier.
 * Pragmatic implementation: render here, let the browser print engine do
 * the PDF generation. Zero new dependencies, zero server work, and the
 * resulting PDF respects the reader's font and accessibility preferences.
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { Printer, ArrowLeft } from '@phosphor-icons/react';
import { MODULES } from '@/content/vienna-school';
import { ProseParagraph } from '@/components/vienna-school/ModuleProse';

const HEADING_FONT = 'Georgia, serif';
const BODY_FONT    = "'Source Serif 4', Georgia, serif";
const MONO_FONT    = "'IBM Plex Mono', 'SF Mono', Consolas, monospace";

export function FieldManualClient() {
  // Inject a print stylesheet that hides chrome we don't want on paper.
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'vs-fm-print';
    style.textContent = `
      @media print {
        @page { margin: 18mm 16mm; }
        body { background: white !important; }
        .vs-fm-no-print { display: none !important; }
        .vs-fm-module { page-break-before: always; }
        .vs-fm-module:first-child { page-break-before: auto; }
        a { color: #5a4e3c !important; text-decoration: none !important; }
        a[href]::after { content: " (" attr(href) ")"; font-size: 0.7em; color: #8a7e6c; }
        a[href^="#"]::after, a[href^="/"]::after { content: ""; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.getElementById('vs-fm-print')?.remove();
    };
  }, []);

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100%' }}>
      {/* ── Sticky toolbar (hidden in print) ─────────────────────── */}
      <div
        className="vs-fm-no-print"
        style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-primary)',
          padding: '12px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/vienna-school"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.18em',
            color: 'var(--text-muted)', textDecoration: 'none',
          }}
        >
          <ArrowLeft size={11} weight="bold" /> THE VIENNA SCHOOL
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <p style={{
            fontFamily: BODY_FONT, fontSize: 13, fontStyle: 'italic',
            color: 'var(--text-secondary)', margin: 0,
          }}>
            Tip: <kbd style={{ fontFamily: MONO_FONT, fontSize: 11, padding: '1px 6px', border: '1px solid var(--border-primary)', borderRadius: 3, background: 'var(--bg-card)' }}>Ctrl/⌘ + P</kbd> to save as PDF.
          </p>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px',
              fontFamily: MONO_FONT, fontSize: 11, letterSpacing: '0.14em', fontWeight: 600,
              backgroundColor: 'var(--accent-primary)',
              color: '#F8F1E3',
              border: 'none', cursor: 'pointer',
            }}
          >
            <Printer size={12} weight="bold" /> PRINT / SAVE AS PDF
          </button>
        </div>
      </div>

      {/* ── Cover page ───────────────────────────────────────────── */}
      <header style={{
        maxWidth: 720, margin: '0 auto',
        padding: '48px 24px 24px', textAlign: 'center',
      }}>
        <p style={{
          fontFamily: MONO_FONT, fontSize: 11, letterSpacing: '0.22em',
          color: 'var(--text-muted)', margin: 0,
        }}>
          THE SITUATION ROOM · FIELD MANUAL
        </p>
        <h1 style={{
          fontFamily: HEADING_FONT, fontSize: 56, fontWeight: 700,
          color: 'var(--text-primary)', margin: '12px 0 0 0',
          lineHeight: 1.05, letterSpacing: '-0.015em',
        }}>
          The Vienna School
        </h1>
        <p style={{
          fontFamily: BODY_FONT, fontStyle: 'italic',
          fontSize: 22, color: 'var(--text-secondary)',
          margin: '12px 0 0 0', lineHeight: 1.4,
        }}>
          Six modules. The full curriculum, set as a single document for
          long-form reading or printing.
        </p>
        <p style={{
          fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.16em',
          color: 'var(--text-muted)', marginTop: 32,
        }}>
          situationroom.space · {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </p>
      </header>

      {/* ── Table of contents ───────────────────────────────────── */}
      <section style={{
        maxWidth: 720, margin: '24px auto 0',
        padding: '0 24px',
      }}>
        <h2 style={{
          fontFamily: HEADING_FONT, fontSize: 22, fontWeight: 600,
          color: 'var(--text-primary)', margin: '0 0 12px 0',
          paddingBottom: 8, borderBottom: '1px solid var(--border-primary)',
        }}>
          Contents
        </h2>
        <ol style={{
          fontFamily: BODY_FONT, fontSize: 16, lineHeight: 1.9,
          color: 'var(--text-primary)', margin: 0, padding: 0,
          listStyle: 'none',
        }}>
          {MODULES.map((m) => (
            <li key={m.slug} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{
                fontFamily: MONO_FONT, fontSize: 12, letterSpacing: '0.1em',
                color: 'var(--text-muted)', minWidth: 28,
              }}>
                {String(m.number).padStart(2, '0')}
              </span>
              <a href={`#m-${m.slug}`} style={{
                color: 'var(--text-primary)',
                textDecoration: 'none', flex: 1,
              }}>
                <strong style={{ fontWeight: 600 }}>{m.title}</strong>{' '}
                <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>· {m.subtitle}</span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Modules in sequence ─────────────────────────────────── */}
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        {MODULES.map((m) => (
          <section
            key={m.slug}
            id={`m-${m.slug}`}
            className="vs-fm-module"
            style={{ marginTop: 48 }}
          >
            <p style={{
              fontFamily: MONO_FONT, fontSize: 11, letterSpacing: '0.22em',
              color: 'var(--accent-primary)', margin: 0, fontWeight: 600,
            }}>
              MODULE {String(m.number).padStart(2, '0')}
            </p>
            <h2 style={{
              fontFamily: HEADING_FONT, fontSize: 38, fontWeight: 700,
              color: 'var(--text-primary)', margin: '6px 0 4px 0',
              lineHeight: 1.1, letterSpacing: '-0.01em',
            }}>
              {m.title}
            </h2>
            <p style={{
              fontFamily: BODY_FONT, fontStyle: 'italic',
              fontSize: 18, color: 'var(--text-secondary)',
              margin: '0 0 24px 0',
            }}>
              {m.subtitle}
            </p>

            <ProseParagraph dropCap>{m.coldOpen}</ProseParagraph>
            {m.coreArgument.map((p, i) => (
              <ProseParagraph key={i}>{p}</ProseParagraph>
            ))}

            {/* Interactive callout — the print reader gets a pointer back to
                the live page where the dynamic element actually works. */}
            <aside
              className="vs-fm-no-print-bg"
              style={{
                margin: '28px 0',
                padding: '14px 18px',
                borderLeft: '3px solid var(--accent-primary)',
                background: 'var(--bg-card)',
                fontFamily: BODY_FONT, fontStyle: 'italic',
                fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5,
              }}
            >
              <strong style={{
                fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em',
                color: 'var(--accent-primary)', fontWeight: 600,
                marginRight: 8, fontStyle: 'normal',
              }}>
                INTERACTIVE
              </strong>
              This module includes a live interactive element ({interactiveLabel(m.interactive.kind)}).
              Visit{' '}
              <a href={`/vienna-school/${m.slug}`} style={{ color: 'var(--accent-primary)' }}>
                situationroom.space/vienna-school/{m.slug}
              </a>{' '}
              to use it.
            </aside>

            {/* Pull quotes */}
            {m.quotes.map((q, i) => (
              <blockquote
                key={i}
                style={{
                  margin: '20px 0',
                  padding: '4px 0 4px 20px',
                  borderLeft: '3px solid var(--accent-primary)',
                }}
              >
                <p style={{
                  fontFamily: HEADING_FONT, fontStyle: 'italic',
                  fontSize: 18, lineHeight: 1.45,
                  color: 'var(--text-primary)', margin: 0,
                }}>
                  &ldquo;{q.text}&rdquo;
                </p>
                <footer style={{
                  fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em',
                  color: 'var(--text-muted)', marginTop: 6,
                  textTransform: 'uppercase',
                }}>
                  — {q.author}{q.source && <>, <span style={{ fontStyle: 'italic', textTransform: 'none', letterSpacing: '0.02em', fontFamily: BODY_FONT, fontSize: 12 }}>{q.source}</span></>}{q.year && ` · ${q.year}`}
                </footer>
              </blockquote>
            ))}

            {/* Reading ladder — compact */}
            <div style={{
              marginTop: 24, padding: '14px 16px',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-card)',
            }}>
              <p style={{
                fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em',
                color: 'var(--accent-primary)', fontWeight: 600,
                margin: '0 0 8px 0',
              }}>
                READING LADDER
              </p>
              {(['beginner', 'intermediate', 'deep'] as const).map((tier) => (
                <div key={tier} style={{ marginBottom: 8 }}>
                  <p style={{
                    fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.14em',
                    color: 'var(--text-muted)', margin: '6px 0 2px 0', fontWeight: 600,
                    textTransform: 'uppercase',
                  }}>
                    {tier}
                  </p>
                  <ul style={{
                    margin: 0, padding: 0, listStyle: 'none',
                    fontFamily: BODY_FONT, fontSize: 13, lineHeight: 1.5,
                  }}>
                    {m.readingLadder[tier].map((b, i) => (
                      <li key={i} style={{ color: 'var(--text-primary)' }}>
                        <strong style={{ fontWeight: 600 }}>{b.title}</strong>
                        {' '}<span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>{b.author} ({b.year})</span>
                        {b.freePdfLink && <>{' '}<a href={b.freePdfLink} style={{ color: 'var(--accent-success)', fontFamily: MONO_FONT, fontSize: 10 }}>free PDF</a></>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Colophon */}
        <footer style={{
          marginTop: 64, paddingTop: 24,
          borderTop: '1px solid var(--border-primary)',
          textAlign: 'center',
        }}>
          <p style={{
            fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.18em',
            color: 'var(--text-muted)', margin: 0, lineHeight: 1.8,
          }}>
            MENGER · BÖHM-BAWERK · MISES · HAYEK · ROTHBARD · HOPPE
          </p>
          <p style={{
            fontFamily: BODY_FONT, fontSize: 12, fontStyle: 'italic',
            color: 'var(--text-muted)', margin: '12px 0 0 0',
          }}>
            The full curriculum is online at{' '}
            <a href="https://situationroom.space/vienna-school" style={{ color: 'var(--accent-primary)' }}>
              situationroom.space/vienna-school
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}

function interactiveLabel(kind: string): string {
  switch (kind) {
    case 'timeline':                 return 'a 1871→2026 dual-lane timeline of Austrian thinkers vs statist milestones';
    case 'marginal-utility-glasses': return 'a five-glass marginal-utility allocator';
    case 'gold-vs-m2-chart':         return 'the side-by-side gold-stock vs USD-M2 chart with BTC supply, purchasing-power, and log-scale toggles';
    case 'hayekian-triangle':        return 'a sliders-driven Hayekian triangle with malinvestment counter and crash button';
    case 'central-planner-game':     return 'a planner-vs-market simulator with shortages and equilibrium';
    case 'predictions-audit':        return 'a paired mainstream-vs-Austrian predictions audit, 1912→2023';
    default:                         return 'an interactive element';
  }
}
