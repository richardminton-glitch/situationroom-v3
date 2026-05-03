/**
 * /vienna-school/heretics/[slug] — individual heretic bio page.
 *
 * Full editorial treatment: portrait, dates, multi-paragraph bio,
 * signature pull-quote, key works with mises.org / Amazon links,
 * and links back to the modules where the figure features.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { HERETIC_BY_SLUG, HERETICS } from '@/content/vienna-school/data/heretics';
import type { Heretic } from '@/content/vienna-school/data/heretics';
import { MODULE_BY_SLUG } from '@/content/vienna-school';

const HEADING_FONT = 'Georgia, serif';
const BODY_FONT    = "'Source Serif 4', Georgia, serif";
const MONO_FONT    = "'IBM Plex Mono', 'SF Mono', Consolas, monospace";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return HERETICS.map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const h = HERETIC_BY_SLUG[slug];
  if (!h) return { title: 'Heretic not found · The Vienna School' };
  return {
    title:       `${h.name} · The Heretics · The Vienna School`,
    description: `${h.oneLine} — ${h.born}–${h.died ?? 'present'}. Bio, key works, signature quote.`,
  };
}

export default async function HereticDetailPage({ params }: Props) {
  const { slug } = await params;
  const h = HERETIC_BY_SLUG[slug];
  if (!h) notFound();

  return (
    <article style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100%' }}>
      <header style={{ maxWidth: 920, margin: '0 auto', padding: '32px 24px 0' }}>
        <p style={{ fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.22em', color: 'var(--text-muted)', margin: 0 }}>
          <Link href="/vienna-school/heretics" style={{ color: 'inherit', textDecoration: 'none' }}>
            ← THE HERETICS
          </Link>
        </p>
      </header>

      {/* ── Portrait + bio header ───────────────────────────────── */}
      <section style={{
        maxWidth: 920, margin: '24px auto 0',
        padding:  '0 24px',
        display:  'grid',
        gridTemplateColumns: 'minmax(0, 280px) 1fr',
        gap: 28, alignItems: 'start',
      }} className="vs-heretic-grid">
        <div style={{
          aspectRatio: '1 / 1',
          background: '#1a1a1a',
          overflow: 'hidden',
          border: '1px solid var(--border-primary)',
        }}>
          {h.portrait ? (
            <img src={h.portrait} alt={`Portrait of ${h.name}`}
                 style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(135deg, #2a1f12 0%, #4a3c28 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#b89456',
              fontFamily: HEADING_FONT, fontSize: 144, fontWeight: 600,
            }}>
              {h.name.split(' ').slice(-1)[0].charAt(0)}
            </div>
          )}
        </div>

        <div>
          <p style={{
            fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.18em',
            color: 'var(--text-muted)', margin: 0,
          }}>
            {h.born}–{h.died ?? 'PRESENT'}
          </p>
          <h1 style={{
            fontFamily: HEADING_FONT, fontSize: 44, fontWeight: 700,
            color: 'var(--text-primary)', margin: '6px 0 6px 0',
            lineHeight: 1.05, letterSpacing: '-0.01em',
          }}>
            {h.name}
          </h1>
          <p style={{
            fontFamily: BODY_FONT, fontStyle: 'italic',
            fontSize: 17, color: 'var(--text-secondary)',
            margin: 0, lineHeight: 1.4,
          }}>
            {h.oneLine}
          </p>

          {h.modules.length > 0 && (
            <p style={{
              fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em',
              color: 'var(--text-muted)', marginTop: 18,
            }}>
              FEATURES IN MODULES:{' '}
              {h.modules.map((mSlug, i) => {
                const m = MODULE_BY_SLUG[mSlug];
                if (!m) return null;
                return (
                  <span key={mSlug}>
                    <Link href={`/vienna-school/${mSlug}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                      {String(m.number).padStart(2, '0')} · {m.title.toUpperCase()}
                    </Link>
                    {i < h.modules.length - 1 && <span style={{ color: 'var(--text-muted)' }}>{' · '}</span>}
                  </span>
                );
              })}
            </p>
          )}
        </div>
      </section>

      {/* ── Bio ───────────────────────────────────────────────── */}
      <section style={{ maxWidth: 720, margin: '32px auto 0', padding: '0 24px' }}>
        {h.bio.map((p, i) => (
          <p key={i} style={{
            fontFamily: BODY_FONT, fontSize: 17, lineHeight: 1.7,
            color: 'var(--text-primary)', margin: '0 0 18px 0',
          }}>
            {p}
          </p>
        ))}
      </section>

      {/* ── Signature quote ───────────────────────────────────── */}
      {h.signature && (
        <section style={{ maxWidth: 720, margin: '24px auto 0', padding: '0 24px' }}>
          <blockquote style={{
            margin: 0, padding: '8px 0 8px 24px',
            borderLeft: '4px solid var(--accent-primary)',
          }}>
            <p style={{
              fontFamily: HEADING_FONT, fontStyle: 'italic',
              fontSize: 22, lineHeight: 1.4,
              color: 'var(--text-primary)', margin: 0,
            }}>
              &ldquo;{h.signature.text}&rdquo;
            </p>
            <footer style={{
              fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em',
              color: 'var(--text-muted)', marginTop: 8, textTransform: 'uppercase',
            }}>
              — {h.signature.author}, {h.signature.source}{h.signature.year && ` · ${h.signature.year}`}
            </footer>
          </blockquote>
        </section>
      )}

      {/* ── Key works ────────────────────────────────────────── */}
      <section style={{ maxWidth: 720, margin: '40px auto 0', padding: '0 24px' }}>
        <h2 style={{
          fontFamily: HEADING_FONT, fontSize: 24, fontWeight: 600,
          color: 'var(--text-primary)', margin: '0 0 14px 0',
        }}>
          Key works
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {h.keyWorks.map((w, i) => (
            <div key={i} style={{
              border:     '1px solid var(--border-primary)',
              background: 'var(--bg-card)',
              padding:    '14px 16px',
            }}>
              <h3 style={{
                fontFamily: HEADING_FONT, fontSize: 16, fontWeight: 600,
                color: 'var(--text-primary)', margin: 0,
              }}>
                {w.title}
              </h3>
              <p style={{
                fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.12em',
                color: 'var(--text-muted)', margin: '2px 0 6px 0',
              }}>
                {w.year}
              </p>
              <p style={{
                fontFamily: BODY_FONT, fontSize: 13, fontStyle: 'italic',
                color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 8px 0',
              }}>
                {w.oneLine}
              </p>
              <div style={{ display: 'flex', gap: 12, fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.1em' }}>
                {w.freePdfLink && (
                  <a href={w.freePdfLink} target="_blank" rel="noopener noreferrer"
                     style={{ color: 'var(--accent-success)', textDecoration: 'none' }}>
                    ↓ FREE · MISES.ORG
                  </a>
                )}
                {w.amazonLink && (
                  <a href={w.amazonLink} target="_blank" rel="noopener noreferrer"
                     style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                    ↗ AMAZON
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ maxWidth: 720, margin: '48px auto 80px', padding: '0 24px' }}>
        <Link href="/vienna-school/heretics" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '10px 16px',
          fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em', fontWeight: 600,
          background: 'var(--bg-card)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-primary)',
          textDecoration: 'none',
        }}>
          ← ALL HERETICS
        </Link>
      </footer>
    </article>
  );
}
