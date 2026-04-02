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
 * Compute threat level from news headlines using keyword severity matching.
 */
const SEVERITY_RULES = [
  { level: 'critical', regex: /\b(nuclear|wmd|chemical weapon|biological weapon|world war|nato.*attack|invaded|mass casualty|genocide)\b/i, score: 10 },
  { level: 'severe', regex: /\b(missile attack|airstrike|bombing|troops deployed|war escalat|invasion|blockade|martial law|state of emergency)\b/i, score: 7 },
  { level: 'high', regex: /\b(killed|dead|death toll|casualties|strike|drone strike|assassination|hostage|siege|artillery)\b/i, score: 5 },
  { level: 'elevated', regex: /\b(threaten|ultimatum|mobiliz|sanctions|retaliat|provocation|incursion|clash|skirmish|ceasefire.*broke)\b/i, score: 3 },
  { level: 'guarded', regex: /\b(tension|standoff|dispute|warning|protest|unrest|crisis|emergency)\b/i, score: 1.5 },
];

export function computeThreatLevel(headlines: string[]): { level: string; score: number } {
  let totalScore = 0;
  const items = headlines.slice(0, 50);

  for (let i = 0; i < items.length; i++) {
    const recencyWeight = 1 - (i / items.length) * 0.5;
    const title = items[i];

    for (const rule of SEVERITY_RULES) {
      if (rule.regex.test(title)) {
        totalScore += rule.score * recencyWeight;
        break; // Only count highest severity match per headline
      }
    }
  }

  const normalized = Math.min(100, Math.round(totalScore * 1.2));

  let level: string;
  if (normalized <= 15) level = 'LOW';
  else if (normalized <= 30) level = 'GUARDED';
  else if (normalized <= 50) level = 'ELEVATED';
  else if (normalized <= 70) level = 'HIGH';
  else if (normalized <= 85) level = 'SEVERE';
  else level = 'CRITICAL';

  return { level, score: normalized };
}
