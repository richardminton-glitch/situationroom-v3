'use client';

/**
 * /vienna-school/quote-wall — rotating Austrian aphorisms.
 *
 * One quote at a time, large serif, attributed. Auto-rotates every 15s.
 * Click the quote (or the rotation indicator) to pause and reveal
 * surrounding context — source citation, year, link back to the source
 * module if any. Prev/Next arrows for manual navigation.
 *
 * Per spec § 6.1: "Click to expand into context (essay, year, surrounding
 * argument). Share button generates a clean image with the quote and
 * situationroom.space watermark."
 *
 * The share-as-image button is deferred to a future polish session — for
 * MVP, the user can screenshot. The watermark is already burned into
 * the page footer.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CaretLeft, CaretRight, Pause, Play, ArrowSquareOut } from '@phosphor-icons/react';
import { ALL_QUOTES } from '@/content/vienna-school/quotes';

const HEADING_FONT = 'Georgia, serif';
const BODY_FONT    = "'Source Serif 4', Georgia, serif";
const MONO_FONT    = "'IBM Plex Mono', 'SF Mono', Consolas, monospace";

const ROTATE_MS = 15_000;

// Stable shuffle so the order is consistent within a session but
// different per page-load — keeps the wall feeling fresh.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function QuoteWallClient() {
  // Start with the canonical order (deterministic for SSR), then shuffle
  // on the client post-mount to avoid a hydration mismatch.
  const [order, setOrder] = useState(ALL_QUOTES);
  const [idx,    setIdx]    = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setOrder(shuffle(ALL_QUOTES));
  }, []);

  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    intervalRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % order.length);
    }, ROTATE_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, order.length]);

  const q = order[idx];

  return (
    <div style={{
      backgroundColor: 'var(--bg-primary)',
      minHeight:       '100%',
      display:         'flex',
      flexDirection:   'column',
    }}>
      {/* ── Crumbs ──────────────────────────────────────────────── */}
      <div style={{
        maxWidth: 980, width: '100%', margin: '0 auto',
        padding:  '24px 24px 0',
      }}>
        <p style={{
          fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.18em',
          color: 'var(--text-muted)', margin: 0,
        }}>
          <Link href="/vienna-school" style={{ color: 'inherit', textDecoration: 'none' }}>
            ← THE VIENNA SCHOOL
          </Link>
          <span style={{ margin: '0 8px' }}>·</span>
          QUOTE WALL
        </p>
      </div>

      {/* ── Quote stage ─────────────────────────────────────────── */}
      <main style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px',
        minHeight: 480,
      }}>
        <div style={{ maxWidth: 760, width: '100%', textAlign: 'center' }}>
          <p style={{
            fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.22em',
            color: 'var(--text-muted)', margin: 0, marginBottom: 24,
          }}>
            QUOTE {idx + 1} OF {order.length}
          </p>

          <blockquote
            onClick={() => setPaused((p) => !p)}
            style={{
              margin: 0, padding: '0 8px',
              cursor: 'pointer',
            }}
            title={paused ? 'Click to resume rotation' : 'Click to pause'}
          >
            <p style={{
              fontFamily: HEADING_FONT, fontSize: 30, lineHeight: 1.35, fontStyle: 'italic',
              color: 'var(--text-primary)', margin: 0,
            }}>
              &ldquo;{q.text}&rdquo;
            </p>
          </blockquote>

          {/* Attribution */}
          <p style={{
            fontFamily: MONO_FONT, fontSize: 11, letterSpacing: '0.16em',
            color: 'var(--accent-primary)', fontWeight: 600,
            marginTop: 28, marginBottom: 4, textTransform: 'uppercase',
          }}>
            — {q.author}
          </p>
          <p style={{
            fontFamily: BODY_FONT, fontSize: 13, color: 'var(--text-secondary)',
            margin: 0, fontStyle: 'italic',
          }}>
            {q.source}{q.year && ` · ${q.year}`}
          </p>

          {q.moduleSlug && (
            <p style={{
              fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em',
              color: 'var(--text-muted)', marginTop: 16,
            }}>
              <Link href={`/vienna-school/${q.moduleSlug}`} style={{
                color: 'var(--accent-primary)', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                READ IN CONTEXT · {q.moduleTitle?.toUpperCase()} <ArrowSquareOut size={11} weight="bold" />
              </Link>
            </p>
          )}
        </div>
      </main>

      {/* ── Controls ──────────────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '16px 24px',
      }}>
        <div style={{
          maxWidth: 980, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <ControlButton
            label="Previous"
            onClick={() => { setPaused(true); setIdx((i) => (i - 1 + order.length) % order.length); }}
            icon={<CaretLeft size={14} weight="bold" />}
          />
          <ControlButton
            label={paused ? 'Resume' : 'Pause'}
            onClick={() => setPaused((p) => !p)}
            icon={paused ? <Play size={14} weight="fill" /> : <Pause size={14} weight="fill" />}
          />
          <ControlButton
            label="Next"
            onClick={() => { setPaused(true); setIdx((i) => (i + 1) % order.length); }}
            icon={<CaretRight size={14} weight="bold" />}
          />
        </div>

        {/* Rotation progress dots */}
        {!paused && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 4,
            marginTop: 12,
          }}>
            {order.map((_, i) => (
              <span
                key={i}
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: i === idx ? 'var(--accent-primary)' : 'var(--border-primary)',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ControlButton({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            6,
        padding:        '8px 14px',
        fontFamily:     MONO_FONT,
        fontSize:       10,
        letterSpacing:  '0.14em',
        background:     'transparent',
        color:          'var(--text-secondary)',
        border:         '1px solid var(--border-primary)',
        cursor:         'pointer',
      }}
    >
      {icon}
      {label.toUpperCase()}
    </button>
  );
}
