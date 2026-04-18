/**
 * Email-safe markdown renderer for AI-generated briefing sections.
 *
 * The dashboard component `src/components/briefings/BriefingMarkdown.tsx`
 * does the same job for the in-app view (returns React nodes). This module
 * mirrors that logic but emits a raw HTML string suitable for
 * `dangerouslySetInnerHTML` inside React-Email `<Text>` components, with
 * inline styles instead of CSS variables (emails can't use CSS vars).
 *
 * Tokens supported (matches BriefingMarkdown):
 *   **bold**          → <strong>bold</strong>
 *   *italic*          → <em>italic</em>
 *   [[N]](url)        → <sup><a href="url">[N]</a></sup>   (numbered citation)
 *   [label](url)      → <a href="url">label</a>             (inline link)
 *
 * Also strips trailing model artifacts that look ugly in plain rendering:
 *   "(204 words)"     → removed
 *   "Sources: [...]"  → removed (whole trailing block)
 *
 * Output is HTML-escaped at the text-node level so a stray "<" or "&" in
 * Grok output never breaks the email layout. URL hrefs are validated to
 * be http/https/mailto/relative — anything else (e.g. javascript:) is
 * dropped to text.
 */

// ── Inline tokeniser ──────────────────────────────────────────────────────────

type InlineNode =
  | { type: 'text';     content: string }
  | { type: 'bold';     content: string }
  | { type: 'italic';   content: string }
  | { type: 'citation'; n: string; url: string }
  | { type: 'link';     label: string; url: string };

// Grok sometimes echoes the section name as a leading label before the prose
// (e.g. "Market Conditions Large holders distribute..."). The section header
// is already rendered by the parent, so strip any known label at the very start.
const LEADING_SECTION_LABEL =
  /^\s*(?:[IVX]+\.\s*)?(?:Market Conditions|Network Health|Geopolitical Watch|Macro Pulse|Outlook)\s*[:\-–—]?\s+/i;

function cleanModelArtifacts(text: string): string {
  let cleaned = text;
  cleaned = cleaned.replace(/\s*\(\d+\s+words?\)/gi, '');
  cleaned = cleaned.replace(/\s*Sources?\s*(?:integrated|cited|used)?:\s*\[.+$/is, '');
  cleaned = cleaned.replace(/\*\*/g, '');
  cleaned = cleaned.replace(LEADING_SECTION_LABEL, '');
  return cleaned.trim();
}

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const boldMatch = /\*\*([^*]+?)\*\*/.exec(remaining);
    const citeMatch = /\[\[(\d+)\]\]\(([^)]+)\)/.exec(remaining);
    const linkMatch = /\[([^\]]+?)\]\(([^)]+)\)/.exec(remaining);
    // Italic: single asterisk, but NOT a bold marker. Negative lookarounds.
    const italicMatch = /(?<!\*)\*([^*\n]+?)\*(?!\*)/.exec(remaining);

    const boldIdx   = boldMatch ? boldMatch.index : Infinity;
    const citeIdx   = citeMatch ? citeMatch.index : Infinity;
    // Don't double-match: [link](url) and [[1]](url) overlap — prefer cite if same index
    const linkIdx   = (linkMatch && (citeIdx === Infinity || linkMatch.index !== citeIdx))
      ? linkMatch.index
      : Infinity;
    const italicIdx = italicMatch ? italicMatch.index : Infinity;

    const minIdx = Math.min(boldIdx, citeIdx, linkIdx, italicIdx);

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
    } else if (minIdx === linkIdx) {
      if (linkIdx > 0) nodes.push({ type: 'text', content: remaining.slice(0, linkIdx) });
      nodes.push({ type: 'link', label: linkMatch![1], url: linkMatch![2] });
      remaining = remaining.slice(linkIdx + linkMatch![0].length);
    } else {
      if (italicIdx > 0) nodes.push({ type: 'text', content: remaining.slice(0, italicIdx) });
      nodes.push({ type: 'italic', content: italicMatch![1] });
      remaining = remaining.slice(italicIdx + italicMatch![0].length);
    }
  }

  return nodes;
}

// ── HTML emitter ──────────────────────────────────────────────────────────────

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

/**
 * Allow only http(s), mailto, and relative/anchor URLs.
 * Anything else (javascript:, data:, etc.) is rejected to prevent injection.
 */
function safeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (/^(https?:\/\/|mailto:|\/|#)/i.test(trimmed)) {
    return escapeHtml(trimmed);
  }
  return null;
}

const ACCENT     = '#8b6914';
const TEXT_COLOR = '#2c2416';

function renderNodesToHtml(nodes: InlineNode[]): string {
  return nodes.map((node) => {
    if (node.type === 'text') {
      return escapeHtml(node.content);
    }
    if (node.type === 'bold') {
      return `<strong>${escapeHtml(node.content)}</strong>`;
    }
    if (node.type === 'italic') {
      return `<em>${escapeHtml(node.content)}</em>`;
    }
    if (node.type === 'citation') {
      const href = safeUrl(node.url);
      const num  = escapeHtml(node.n);
      if (!href) return `[${num}]`;
      return `<sup style="margin-left:1px"><a href="${href}" target="_blank" rel="noopener noreferrer" style="color:${ACCENT};text-decoration:none;font-size:0.75em">[${num}]</a></sup>`;
    }
    if (node.type === 'link') {
      const href  = safeUrl(node.url);
      const label = escapeHtml(node.label);
      if (!href) return label;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color:${ACCENT};text-decoration:underline">${label}</a>`;
    }
    return '';
  }).join('');
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Render an AI briefing section as email-safe HTML. Splits on blank lines
 * to produce paragraph breaks, parses inline markdown within each paragraph.
 *
 * Returns a single HTML string ready for `dangerouslySetInnerHTML`.
 * Output uses inline styles only — no CSS variables, no class names.
 */
export function renderBriefingHtml(text: string): string {
  if (!text) return '';

  const cleaned = cleanModelArtifacts(text);
  const paragraphs = cleaned.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);

  if (paragraphs.length === 0) {
    return renderNodesToHtml(parseInline(cleaned));
  }

  return paragraphs
    .map((p, i) => {
      const inner = renderNodesToHtml(parseInline(p));
      // First paragraph has no top margin; subsequent ones get 12px gap.
      const marginTop = i === 0 ? '0' : '12px';
      return `<span style="display:block;margin-top:${marginTop};color:${TEXT_COLOR}">${inner}</span>`;
    })
    .join('');
}
