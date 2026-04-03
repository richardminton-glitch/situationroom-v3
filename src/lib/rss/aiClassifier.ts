/**
 * Grok AI classifier for RSS articles.
 *
 * Uses callGrokClassifier() from the existing Grok client — same API key,
 * no new client, no new secrets.
 *
 * Called only when:
 *   - source map sets alwaysClassify AND keyword confidence < 0.75
 *   - OR keyword result is ambiguous (top two scores within 0.15)
 *   - AND article is < 24h old
 *   - AND rate limit allows
 */

import { createHash } from 'crypto';
import { callGrokClassifier } from '@/lib/grok/client';
import { checkAndRecordAICall } from './statsTracker';
import type { Category } from './sourceMap';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AIClassificationResult {
  primary: Category;
  secondaries: Category[];
  confidence: number;
  relevanceToBitcoin: number;
  reasoning: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = new Set<Category>([
  'bitcoin', 'conflict', 'disaster', 'economy', 'political',
]);

/**
 * Stable hash used as DB cache key and dedup key.
 * Hash of (title | feedUrl) — feedUrl anchors the hash to the source.
 */
export function contentHash(title: string, feedUrl: string): string {
  return createHash('sha256').update(`${title}|${feedUrl}`).digest('hex');
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(title: string, description: string, source: string): string {
  return `You are classifying news articles for a Bitcoin and global macro intelligence platform.

Source: ${source}
Headline: ${title}
Description: ${description || '(none)'}

Classify into exactly ONE primary category and optionally up to 3 secondary categories from:
- bitcoin: Bitcoin, Lightning Network, crypto (BTC-focused)
- conflict: War, military action, terrorism, sanctions, armed forces
- disaster: Natural disasters, accidents, pandemics, humanitarian crises
- economy: Markets, central banks, inflation, trade, companies, commodities
- political: Elections, legislation, government policy, geopolitics, diplomacy

Classification rules:
- If Bitcoin is mentioned substantively, bitcoin wins over economy
- Conflict wins over economy when war/military action is the primary driver (e.g. oil rising due to Hormuz = conflict primary, economy secondary)
- Political wins over economy when government action is the cause (tariffs, sanctions, legislation)
- Disaster wins when a physical event is the story

Also score relevance_to_bitcoin (0-10):
10 = directly affects Bitcoin price/utility
7-9 = strong macro relevance (Fed, energy crisis, major conflict)
4-6 = moderate (dollar, gold, regulation)
1-3 = weak (general business)
0 = irrelevant (sport, celebrity, lifestyle)

Respond with valid JSON only, no other text:
{"primary":"category","secondaries":[],"confidence":0.90,"relevance_to_bitcoin":5,"reasoning":"one sentence"}`;
}

// ── Parser ────────────────────────────────────────────────────────────────────

function parseResult(raw: string): AIClassificationResult | null {
  try {
    const json = JSON.parse(raw);

    const primary = json.primary as Category;
    if (!VALID_CATEGORIES.has(primary)) {
      console.warn(`[AIClassifier] Invalid primary category: ${primary}`);
      return null;
    }

    const secondaries: Category[] = (Array.isArray(json.secondaries) ? json.secondaries : [])
      .filter((c: unknown): c is Category => VALID_CATEGORIES.has(c as Category))
      .filter((c: Category) => c !== primary)
      .slice(0, 3);

    return {
      primary,
      secondaries,
      confidence:        Math.min(1, Math.max(0, Number(json.confidence)        || 0.70)),
      relevanceToBitcoin: Math.min(10, Math.max(0, Math.round(Number(json.relevance_to_bitcoin) || 5))),
      reasoning:         String(json.reasoning || '').substring(0, 200),
    };
  } catch {
    return null;
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Classify a single article with Grok.
 * Returns null if rate-limited, API fails, or response is unparseable.
 * Caller must handle null by falling back to keyword result.
 */
export async function classifyWithGrok(
  title: string,
  description: string,
  source: string,
): Promise<AIClassificationResult | null> {
  if (!checkAndRecordAICall()) return null;

  const prompt = buildPrompt(title, description, source);

  try {
    const raw = await callGrokClassifier(prompt);
    if (!raw) return null;

    const result = parseResult(raw);
    if (!result) {
      console.warn('[AIClassifier] Could not parse response:', raw.substring(0, 150));
    }
    return result;
  } catch (err) {
    console.error('[AIClassifier] classifyWithGrok failed:', err);
    return null;
  }
}
