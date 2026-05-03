/**
 * ModuleProse — minimal markdown renderer for Vienna School module text.
 *
 * Supports just the small subset we use in module copy:
 *   - paragraphs (already split by the caller)
 *   - *italic* spans
 *   - **bold** spans
 *   - automatic linking of bestiary terms (first match per paragraph
 *     gets a hover tooltip; subsequent occurrences render as plain text
 *     to avoid a forest of dotted underlines)
 *
 * No external markdown lib — keeps the bundle lean and the styling under
 * our direct control. If a future module needs links or lists, extend
 * here rather than reaching for a library.
 */

import type { ReactNode } from 'react';
import { BESTIARY } from '@/content/vienna-school/data/bestiary';
import { BestiaryTooltip } from './BestiaryTooltip';

// Build a single regex matching: **bold**, *italic*, or any bestiary term.
// Sorted longest-first so multi-word terms ("Marginal utility") win over
// single words ("Marginal") that might appear inside them.
const BESTIARY_TERMS = [...BESTIARY]
  .sort((a, b) => b.term.length - a.term.length)
  .map((b) => ({ ...b, regex: new RegExp(`\\b${escapeRegex(b.term)}\\b`, 'i') }));

const TOKENISER = (() => {
  const termsAlt = BESTIARY_TERMS
    .map((b) => `\\b${escapeRegex(b.term)}\\b`)
    .join('|');
  // 1) **bold**, 2) *italic*, 3) bestiary term
  return new RegExp(`(\\*\\*[^*]+\\*\\*)|(\\*[^*]+\\*)|(${termsAlt})`, 'gi');
})();

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface RenderCtx {
  /** Tracks which bestiary slugs have already been linked in this
   *  paragraph so we only wrap the first occurrence. */
  seenSlugs: Set<string>;
  /** Stable key counter — every JSX child needs a unique key. */
  keyCounter: { n: number };
}

function renderInline(text: string, ctx: RenderCtx): ReactNode[] {
  const out: ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  TOKENISER.lastIndex = 0;

  while ((match = TOKENISER.exec(text)) !== null) {
    if (match.index > lastIdx) {
      out.push(text.slice(lastIdx, match.index));
    }

    if (match[1] !== undefined) {
      // **bold** — strip markers
      const inner = match[1].slice(2, -2);
      out.push(
        <strong key={`b-${ctx.keyCounter.n++}`} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
          {inner}
        </strong>,
      );
    } else if (match[2] !== undefined) {
      // *italic* — strip markers
      const inner = match[2].slice(1, -1);
      out.push(
        <em key={`i-${ctx.keyCounter.n++}`} style={{ fontStyle: 'italic' }}>
          {inner}
        </em>,
      );
    } else if (match[3] !== undefined) {
      // bestiary term — find the entry by case-insensitive equality
      const matched = match[3];
      const entry = BESTIARY_TERMS.find((b) => b.regex.test(matched));
      if (entry && !ctx.seenSlugs.has(entry.slug)) {
        ctx.seenSlugs.add(entry.slug);
        out.push(
          <BestiaryTooltip key={`t-${ctx.keyCounter.n++}`} text={matched} entry={entry} />,
        );
      } else {
        // Already linked once in this paragraph, or no entry — render plain.
        out.push(matched);
      }
    }

    lastIdx = TOKENISER.lastIndex;
  }
  if (lastIdx < text.length) {
    out.push(text.slice(lastIdx));
  }
  return out;
}

export function ProseParagraph({ children, dropCap = false }: { children: string; dropCap?: boolean }) {
  const ctx: RenderCtx = { seenSlugs: new Set(), keyCounter: { n: 0 } };
  return (
    <p
      style={{
        fontFamily:    "'Source Serif 4', Georgia, serif",
        fontSize:      17,
        lineHeight:    1.72,
        color:         'var(--text-primary)',
        marginBottom:  18,
      }}
    >
      {dropCap && (
        <span
          style={{
            float:         'left',
            fontFamily:    'Georgia, serif',
            fontSize:      58,
            lineHeight:    0.9,
            paddingRight:  8,
            paddingTop:    4,
            color:         'var(--accent-primary)',
            fontWeight:    700,
          }}
        >
          {children.charAt(0)}
        </span>
      )}
      {dropCap ? renderInline(children.slice(1), ctx) : renderInline(children, ctx)}
    </p>
  );
}
