'use client';

/**
 * BestiaryTooltip — wraps a known Austrian-school term in module prose
 * with an underline + hover/focus tooltip showing the bestiary entry's
 * definition. Click navigates to the full bestiary card.
 *
 * Auto-mounted by ProseParagraph when it detects a term match in the
 * paragraph text. Only the *first* match per paragraph is wrapped so
 * the prose doesn't turn into a forest of dotted underlines.
 */

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { BestiaryEntry } from '@/content/vienna-school/data/bestiary';

interface Props {
  /** The matched substring as it appears in the prose, preserving case. */
  text:  string;
  /** The bestiary entry being referenced. */
  entry: BestiaryEntry;
}

export function BestiaryTooltip({ text, entry }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  // Close on outside click / Esc.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span
      ref={wrapperRef}
      style={{ position: 'relative', display: 'inline' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={`/vienna-school/bestiary#${entry.slug}`}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{
          color:                'inherit',
          textDecoration:       'none',
          borderBottom:         '1px dotted var(--accent-primary)',
          paddingBottom:        1,
          cursor:               'help',
        }}
        aria-describedby={`bestiary-${entry.slug}-desc`}
      >
        {text}
      </Link>

      {open && (
        <span
          role="tooltip"
          id={`bestiary-${entry.slug}-desc`}
          style={{
            position:     'absolute',
            zIndex:       50,
            bottom:       'calc(100% + 8px)',
            left:         '50%',
            transform:    'translateX(-50%)',
            width:        320,
            maxWidth:     '92vw',
            padding:      '12px 14px',
            background:   'var(--bg-primary)',
            border:       '1px solid var(--accent-primary)',
            boxShadow:    '0 6px 20px rgba(0,0,0,0.10)',
            fontFamily:   'inherit',
            color:        'var(--text-primary)',
            display:      'block',
            cursor:       'default',
          }}
        >
          <span style={{
            display:        'block',
            fontFamily:     "'IBM Plex Mono', 'SF Mono', Consolas, monospace",
            fontSize:       9,
            letterSpacing:  '0.18em',
            color:          'var(--accent-primary)',
            fontWeight:     600,
            textTransform:  'uppercase',
            marginBottom:   2,
          }}>
            BESTIARY · {entry.term}
          </span>
          <span style={{
            display:    'block',
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontSize:   13,
            lineHeight: 1.5,
            color:      'var(--text-secondary)',
            fontStyle:  'italic',
          }}>
            {entry.definition}
          </span>
          <span style={{
            display:        'block',
            fontFamily:     "'IBM Plex Mono', 'SF Mono', Consolas, monospace",
            fontSize:       9,
            letterSpacing:  '0.14em',
            color:          'var(--text-muted)',
            marginTop:      8,
          }}>
            CLICK TO READ THE FULL ENTRY →
          </span>
        </span>
      )}
    </span>
  );
}
