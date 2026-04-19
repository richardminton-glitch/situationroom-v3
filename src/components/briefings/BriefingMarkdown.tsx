import React from 'react';

// ── Inline node types ─────────────────────────────────────────
// Note: bold is NOT rendered in briefing body prose. Grok occasionally
// wraps lead sentences in ** for visual emphasis, which doesn't belong
// in a long-form prose briefing. All ** are stripped before parseInline.
type InlineNode =
  | { type: 'text';     content: string }
  | { type: 'citation'; n: string; url: string }
  | { type: 'link';     label: string; url: string };

// Grok sometimes echoes the section name as a leading label before the prose
// (e.g. "Market Conditions Large holders distribute..."). The section header
// is already rendered by the parent, so strip any known label at the very start.
const LEADING_SECTION_LABEL =
  /^\s*(?:[IVX]+\.\s*)?(?:Market Conditions|Network Health|Geopolitical Watch|Macro Pulse|Outlook)\s*[:\-–—]?\s+/i;

// Trailing self-referential meta parenthetical — e.g.
// "(152 words)" or "(The paragraph above is 152 words. …)"
const TRAILING_META_PAREN =
  /\s*\([^()]*(?:\d+\s+words?|paragraph above|word count)[^()]*\)\s*$/i;

function cleanModelArtifacts(text: string): string {
  let cleaned = text;
  cleaned = cleaned.replace(TRAILING_META_PAREN, '');
  cleaned = cleaned.replace(/\s*\(\d+\s+words?\)/gi, '');
  cleaned = cleaned.replace(/\s*Sources?\s*(?:integrated|cited|used)?:\s*\[.+$/is, '');
  cleaned = cleaned.replace(LEADING_SECTION_LABEL, '');
  return cleaned.trim();
}

/**
 * Briefings are prose-only — strip all `**` markers so Grok's decorative
 * lead-sentence bolding doesn't render. Leaves citations and links intact.
 */
function stripBoldMarkers(text: string): string {
  return text.replace(/\*\*/g, '');
}

/**
 * Plain-text cleaner for contexts that don't render markdown
 * (headlines, page metadata, signed-out headline preview).
 * Removes bold markers, inline links → label, citations, and the
 * word-count parenthetical.
 */
export function stripBriefingMarkdown(text: string): string {
  return text
    .replace(/\[\[(\d+)\]\]\([^)]*\)/g, '')   // [[n]](url) citation → drop
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')   // [label](url) → label
    .replace(/\*\*/g, '')                       // all bold markers (matched or orphan)
    .replace(/\s*\(\d+\s+words?\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Parse inline markdown:
 *  - [[n]](url) — numbered citation → superscript link
 *  - [label](url) — standard markdown link → inline link
 *
 * Bold (`**...**`) is intentionally NOT supported — callers strip all `**`
 * before calling this (see stripBoldMarkers in the main component).
 */
function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const citeMatch  = /\[\[(\d+)\]\]\(([^)]+)\)/.exec(remaining);
    const linkMatch  = /\[([^\]]+?)\]\(([^)]+)\)/.exec(remaining);

    // Avoid double-matching: if linkMatch overlaps with citeMatch at same index, prefer citeMatch
    const citeIdx = citeMatch ? citeMatch.index : Infinity;
    const linkIdx = (linkMatch && (citeIdx === Infinity || linkMatch.index !== citeIdx)) ? linkMatch.index : Infinity;

    const minIdx = Math.min(citeIdx, linkIdx);

    if (minIdx === Infinity) {
      nodes.push({ type: 'text', content: remaining });
      break;
    }

    if (minIdx === citeIdx) {
      if (citeIdx > 0) nodes.push({ type: 'text', content: remaining.slice(0, citeIdx) });
      nodes.push({ type: 'citation', n: citeMatch![1], url: citeMatch![2] });
      remaining = remaining.slice(citeIdx + citeMatch![0].length);
    } else {
      if (linkIdx > 0) nodes.push({ type: 'text', content: remaining.slice(0, linkIdx) });
      nodes.push({ type: 'link', label: linkMatch![1], url: linkMatch![2] });
      remaining = remaining.slice(linkIdx + linkMatch![0].length);
    }
  }

  return nodes;
}

function renderNodes(nodes: InlineNode[], baseKey: number): React.ReactNode[] {
  return nodes.map((node, i) => {
    const key = baseKey * 1000 + i;
    if (node.type === 'text')     return <React.Fragment key={key}>{node.content}</React.Fragment>;
    if (node.type === 'citation') {
      return (
        <sup key={key} style={{ marginLeft: '1px' }}>
          <a
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: '0.75em' }}
          >
            [{node.n}]
          </a>
        </sup>
      );
    }
    if (node.type === 'link') {
      return (
        <a
          key={key}
          href={node.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--accent-primary)', textDecoration: 'none', borderBottom: '1px solid var(--border-subtle)' }}
        >
          {node.label}
        </a>
      );
    }
    return null;
  });
}

interface Props {
  content: string;
  /** Override the default paragraph style — useful when embedding inside
   *  a panel with its own sizing (e.g. dashboard briefing panel). */
  paragraphStyle?: React.CSSProperties;
}

export function BriefingMarkdown({ content, paragraphStyle }: Props) {
  const cleaned    = cleanModelArtifacts(content);
  const paragraphs = cleaned
    .split(/\n\n+/)
    .map((p) => stripBoldMarkers(p.trim()))
    .filter(Boolean);

  const paraStyle: React.CSSProperties = paragraphStyle ?? {
    fontFamily: 'var(--font-body)',
    fontSize:   '15px',
    lineHeight: 1.75,
    color:      'var(--text-primary)',
  };

  if (paragraphs.length === 0) {
    return <p style={paraStyle}>{renderNodes(parseInline(cleaned), 0)}</p>;
  }

  return (
    <div className="space-y-4">
      {paragraphs.map((p, i) => (
        <p key={i} style={paraStyle}>
          {renderNodes(parseInline(p), i)}
        </p>
      ))}
    </div>
  );
}
