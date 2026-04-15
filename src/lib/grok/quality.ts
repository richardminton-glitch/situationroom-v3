/**
 * Post-generation quality checks: banned phrases and citation verification.
 */

const BANNED_PHRASES = [
  'remains to be seen',
  'it is worth noting',
  'signals caution',
  'near-term',
  'focus remains on',
  'this could suggest',
  'it is important to',
];

/**
 * Check text for banned phrases and return violations.
 */
export function checkBannedPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.filter((phrase) => lower.includes(phrase));
}

/**
 * Strip banned phrases from text (replace with empty string).
 */
export function stripBannedPhrases(text: string): string {
  let result = text;
  for (const phrase of BANNED_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    result = result.replace(regex, '');
  }
  // Clean up double spaces
  return result.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Strip all markdown artifacts from an extracted headline so we never
 * persist literal `**`, citation links, or parenthetical word counts
 * to the Briefing.headline column.
 */
function cleanHeadline(raw: string): string {
  return raw
    .replace(/\[\[(\d+)\]\]\([^)]*\)/g, '')   // [[n]](url) citation
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')   // [label](url) → label
    .replace(/\*\*/g, '')                       // all ** (matched or orphan)
    .replace(/^[#*_\s]+/, '')                   // leading markdown chars
    .replace(/\s*\(\d+\s+words?\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .substring(0, 280);
}

/**
 * Extract headline from Agent 5 output.
 * Looks for "HEADLINE: ..." prefix, falls back to last non-empty line.
 */
export function extractHeadline(outlookContent: string): { headline: string; cleanContent: string } {
  const headlineMatch = outlookContent.match(/HEADLINE:\s*(.+)/i);

  if (headlineMatch) {
    const headline = cleanHeadline(headlineMatch[1]);
    const cleanContent = outlookContent.substring(0, headlineMatch.index).trim();
    return { headline, cleanContent };
  }

  // Fallback: use last non-empty line
  const lines = outlookContent.trim().split('\n').filter((l) => l.trim());
  const headline = cleanHeadline(lines[lines.length - 1] || 'Daily Briefing');

  return { headline, cleanContent: outlookContent.trim() };
}
