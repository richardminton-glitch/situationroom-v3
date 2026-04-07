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
 * Extract headline from Agent 5 output.
 * Looks for "HEADLINE: ..." prefix, falls back to last non-empty line.
 */
export function extractHeadline(outlookContent: string): { headline: string; cleanContent: string } {
  const headlineMatch = outlookContent.match(/HEADLINE:\s*(.+)/i);

  if (headlineMatch) {
    const headline = headlineMatch[1].trim().substring(0, 280);
    const cleanContent = outlookContent.substring(0, headlineMatch.index).trim();
    return { headline, cleanContent };
  }

  // Fallback: use last non-empty line
  const lines = outlookContent.trim().split('\n').filter((l) => l.trim());
  const headline = (lines[lines.length - 1] || 'Daily Briefing')
    .replace(/^[#*_\s]+/, '')
    .substring(0, 280);

  return { headline, cleanContent: outlookContent.trim() };
}

/**
 * Legacy keyword-based threat level computation.
 *
 * @deprecated Replaced by the unified Members Room decay algorithm.
 *   See `computeDecayedScore` in `@/lib/room/threatEngine`. This function is
 *   retained only for historical reference and is no longer called anywhere
 *   in the runtime.
 */
export function computeThreatLevel(): { level: string; score: number } {
  return { level: 'QUIET', score: 0 };
}
