/**
 * /vienna-school/heretics — bio cards for the school's principal figures.
 *
 * Open-access. Grid of figures with portrait + name + dates + one-liner.
 * Click any card to land on /vienna-school/heretics/[slug] for the full
 * bio, key works, signature quote, and links to the modules where the
 * figure features.
 */

import Link from 'next/link';
import { HERETICS } from '@/content/vienna-school/data/heretics';
import type { Heretic } from '@/content/vienna-school/data/heretics';

const HEADING_FONT = 'Georgia, serif';
const BODY_FONT    = "'Source Serif 4', Georgia, serif";
const MONO_FONT    = "'IBM Plex Mono', 'SF Mono', Consolas, monospace";

export const metadata = {
  title:       'The Heretics · The Vienna School',
  description: 'Bio cards for the principal figures of the Austrian school: Menger, Böhm-Bawerk, Mises, Hayek, Rothbard, Hoppe, Salerno, Hülsmann. Lives, key works, signature quotes.',
};

export default function HereticsIndexPage() {
  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100%' }}>
      <header style={{ maxWidth: 980, margin: '0 auto', padding: '40px 24px 24px' }}>
        <p style={{ fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.22em', color: 'var(--text-muted)', margin: 0 }}>
          <Link href="/vienna-school" style={{ color: 'inherit', textDecoration: 'none' }}>
            ← THE VIENNA SCHOOL
          </Link>
          <span style={{ margin: '0 8px' }}>·</span>
          THE HERETICS
        </p>
        <h1 style={{
          fontFamily: HEADING_FONT, fontSize: 44, fontWeight: 700,
          color: 'var(--text-primary)', margin: '8px 0 0 0',
          lineHeight: 1.1, letterSpacing: '-0.01em',
        }}>
          The Heretics
        </h1>
        <p style={{
          fontFamily: BODY_FONT, fontStyle: 'italic',
          fontSize: 18, color: 'var(--text-secondary)',
          margin: '8px 0 0 0', lineHeight: 1.5, maxWidth: 640,
        }}>
          The men who built the Vienna School and the lineage that
          followed them. Read in this order if you want a 150-year
          intellectual history; read in any order if you just want the
          arguments.
        </p>
      </header>

      <section style={{
        maxWidth: 980, margin: '8px auto 80px',
        padding:  '0 24px',
        display:  'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap:      18,
      }}>
        {HERETICS.map((h) => <HereticCard key={h.slug} heretic={h} />)}
      </section>
    </div>
  );
}

function HereticCard({ heretic: h }: { heretic: Heretic }) {
  return (
    <Link href={`/vienna-school/heretics/${h.slug}`} style={{
      display:        'block',
      border:         '1px solid var(--border-primary)',
      background:     'var(--bg-card)',
      textDecoration: 'none',
    }}>
      <div style={{
        position: 'relative', aspectRatio: '1 / 1',
        background: '#1a1a1a',
        overflow: 'hidden',
      }}>
        {h.portrait ? (
          <img src={h.portrait} alt={`Portrait of ${h.name}`}
               style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <PlaceholderPortrait initial={h.name.split(' ').slice(-1)[0].charAt(0)} />
        )}
      </div>
      <div style={{ padding: '14px 16px' }}>
        <h2 style={{
          fontFamily: HEADING_FONT, fontSize: 19, fontWeight: 600,
          color: 'var(--text-primary)', margin: 0, lineHeight: 1.2,
        }}>
          {h.name}
        </h2>
        <p style={{
          fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em',
          color: 'var(--text-muted)', margin: '4px 0 8px 0',
        }}>
          {h.born}–{h.died ?? 'present'}
        </p>
        <p style={{
          fontFamily: BODY_FONT, fontSize: 13, fontStyle: 'italic',
          color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0,
        }}>
          {h.oneLine}
        </p>
        <p style={{
          marginTop: 10,
          fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.16em',
          color: 'var(--accent-primary)', fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          READ THE BIO →
        </p>
      </div>
    </Link>
  );
}

function PlaceholderPortrait({ initial }: { initial: string }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(135deg, #2a1f12 0%, #4a3c28 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#b89456',
      fontFamily: HEADING_FONT,
      fontSize: 96, fontWeight: 600,
      letterSpacing: '-0.02em',
    }}>
      {initial}
    </div>
  );
}
