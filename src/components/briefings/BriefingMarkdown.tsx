import React from 'react';

// ── Inline node types ─────────────────────────────────────────
type InlineNode =
  | { type: 'text';     content: string }
  | { type: 'bold';     content: string }
  | { type: 'citation'; n: string; url: string }
  | { type: 'link';     label: string; url: string };

/**
 * Clean model artifacts from section text:
 *  - Strip "(198 words)" word counts (anywhere in text)
 *  - Strip trailing "Sources integrated: [Name](url), ..." blocks
 *  - Strip trailing "Sources: [Name](url), ..." blocks
 */
function cleanModelArtifacts(text: string): string {
  let cleaned = text;
  // Remove word count parenthetical anywhere
  cleaned = cleaned.replace(/\s*\(\d+\s+words?\)/gi, '');
  // Remove trailing "Sources integrated:" / "Sources:" / "Source:" block
  cleaned = cleaned.replace(/\s*Sources?\s*(?:integrated|cited|used)?:\s*\[.+$/is, '');
  return cleaned.trim();
}

/**
 * If a paragraph has an odd number of `**` markers (unbalanced),
 * strip them all. Otherwise the lazy-pair regex in parseInline will
 * mis-match the orphan with an earlier opener and bold the wrong span,
 * or leave literal `**` in the rendered output.
 */
function balanceBoldMarkers(text: string): string {
  const count = (text.match(/\*\*/g) || []).length;
  if (count % 2 === 0) return text;
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
 *  - **bold**
 *  - [[n]](url) — numbered citation → superscript link
 *  - [label](url) — standard markdown link → inline link
 */
function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const boldMatch  = /\*\*([^*]+?)\*\*/.exec(remaining);
    const citeMatch  = /\[\[(\d+)\]\]\(([^)]+)\)/.exec(remaining);
    const linkMatch  = /\[([^\]]+?)\]\(([^)]+)\)/.exec(remaining);

    // Avoid double-matching: if linkMatch overlaps with citeMatch at same index, prefer citeMatch
    const boldIdx = boldMatch ? boldMatch.index : Infinity;
    const citeIdx = citeMatch ? citeMatch.index : Infinity;
    const linkIdx = (linkMatch && (citeIdx === Infinity || linkMatch.index !== citeIdx)) ? linkMatch.index : Infinity;

    const minIdx = Math.min(boldIdx, citeIdx, linkIdx);

    if (minIdx === Infinity) {
      nodes.push({ type: 'text', content: remaining });
      break;
    }

    if (minIdx === citeIdx) {
      if (citeIdx > 0) nodes.push({ type: 'text', content: remaining.slice(0, citeIdx) });
      nodes.push({ type: 'citation', n: citeMatch![1], url: citeMatch![2] });
      remaining = remaining.slice(citeIdx + citeMatch![0].length);
    } else if (minIdx === boldIdx) {
      if (boldIdx > 0) nodes.push({ type: 'text', content: remaining.slice(0, boldIdx) });
      nodes.push({ type: 'bold', content: boldMatch![1] });
      remaining = remaining.slice(boldIdx + boldMatch![0].length);
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
    if (node.type === 'bold')     return <strong key={key}>{node.content}</strong>;
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
    .map((p) => balanceBoldMarkers(p.trim()))
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
