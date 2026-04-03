/**
 * Keyword scoring engine for RSS article classification.
 *
 * Each category has a high/medium/low keyword set.
 * Score = sum of matched keyword weights, normalised so that
 * hitting ~30% of the total possible weight = confidence 1.0.
 *
 * Match against (headline + ". " + description).toLowerCase()
 */

import type { Category } from './sourceMap';

// ── Keyword sets ──────────────────────────────────────────────────────────────

type KeywordTier = { high: string[]; medium: string[]; low: string[] };

const KEYWORD_SETS: Record<Category, KeywordTier> = {
  bitcoin: {
    high: [
      'bitcoin', 'btc', 'satoshi', 'lightning network',
      'hodl', 'sats', 'mempool', 'halving',
      'proof of work', 'nakamoto', 'taproot', 'segwit',
      'ordinals', 'runes', 'lightning channel', 'hash rate',
    ],
    medium: [
      'crypto', 'cryptocurrency', 'digital asset',
      'coinbase', 'microstrategy', 'grayscale',
      'bitcoin etf', 'spot etf', 'mstr', 'ibit', 'fbtc',
      'self custody', 'cold storage', 'hardware wallet',
      'on-chain', 'mining pool', 'block reward',
    ],
    low: [
      'digital currency', 'blockchain technology',
      'decentralised', 'distributed ledger', 'web3',
    ],
  },

  conflict: {
    high: [
      'war', 'attack', 'missile', 'airstrike', 'bombing',
      'troops', 'military operation', 'invasion',
      'casualties', 'killed', 'wounded', 'ceasefire',
      'naval blockade', 'strait of hormuz', 'frontline',
      'offensive', 'artillery', 'drone strike',
      'warship', 'fighter jet', 'nuclear threat',
    ],
    medium: [
      'sanctions', 'tensions', 'threat', 'military',
      'forces', 'weapons', 'armed', 'deployment',
      'iran', 'israel', 'ukraine', 'russia', 'hamas',
      'hezbollah', 'nato', 'coup', 'regime', 'insurgency',
      'rebel', 'militia', 'siege', 'blockade',
    ],
    low: [
      'security', 'defence', 'intelligence', 'espionage',
      'propaganda', 'cyber attack', 'hack',
    ],
  },

  disaster: {
    high: [
      'earthquake', 'tsunami', 'hurricane', 'flood',
      'wildfire', 'eruption', 'explosion', 'pandemic',
      'outbreak', 'famine', 'drought', 'catastrophe',
      'death toll', 'evacuation', 'destroyed', 'collapse',
      'derailment', 'shipwreck', 'crash landing',
    ],
    medium: [
      'storm', 'tornado', 'cyclone', 'avalanche',
      'landslide', 'fire', 'accident', 'emergency',
      'missing', 'rescue', 'relief', 'humanitarian',
      'survivors', 'rubble', 'displaced',
    ],
    low: [
      'climate', 'warning', 'alert', 'risk',
      'damage', 'contamination', 'pollution',
    ],
  },

  economy: {
    high: [
      'inflation', 'interest rate', 'federal reserve',
      'ecb', 'central bank', 'gdp', 'recession',
      'unemployment', 'cpi', 'fed rate', 'market crash',
      'stock market', 'earnings', 'tariff', 'trade war',
      'oil price', 'dollar index', 'treasury yield',
      'bond market', 'fomc', 'rate cut', 'rate hike',
      'quantitative easing', 'balance sheet',
    ],
    medium: [
      'economy', 'economic', 'trade', 'exports', 'imports',
      'supply chain', 'manufacturing', 'employment',
      'housing market', 'mortgage', 'investment', 'ipo',
      'hedge fund', 'bank', 'shares', 'nasdaq', 'dow jones',
      's&p 500', 'ftse', 'dax', 'nikkei', 'commodities',
      'gold', 'silver', 'copper', 'natural gas',
    ],
    low: [
      'business', 'company', 'market', 'financial',
      'growth', 'forecast', 'analyst', 'quarter',
      'startup', 'acquisition', 'merger',
    ],
  },

  political: {
    high: [
      'election', 'president', 'prime minister',
      'congress', 'parliament', 'senate', 'vote',
      'legislation', 'law', 'policy', 'government',
      'minister', 'cabinet', 'diplomat', 'treaty',
      'trump', 'biden', 'starmer', 'macron', 'modi',
      'xi jinping', 'putin', 'netanyahu', 'zelensky',
    ],
    medium: [
      'political', 'politician', 'party', 'opposition',
      'democracy', 'authoritarian', 'protest', 'reform',
      'regulation', 'foreign policy', 'summit', 'sanctions',
      'administration', 'executive order', 'bill', 'hearing',
      'impeachment', 'indictment', 'arrest warrant',
    ],
    low: [
      'leader', 'official', 'spokesperson',
      'statement', 'announcement', 'speech', 'briefing',
    ],
  },
};

// ── Weights and normalisation ─────────────────────────────────────────────────

const WEIGHTS = { high: 0.4, medium: 0.2, low: 0.1 } as const;

/** Max achievable raw score for a keyword tier. */
function maxRaw(tier: KeywordTier): number {
  return (
    tier.high.length   * WEIGHTS.high   +
    tier.medium.length * WEIGHTS.medium +
    tier.low.length    * WEIGHTS.low
  );
}

/**
 * Score text against one category's keyword tier.
 * Normalised so that hitting ~30% of max possible weight = 1.0.
 */
function scoreCategory(lower: string, tier: KeywordTier): number {
  let raw = 0;
  for (const kw of tier.high)   if (lower.includes(kw)) raw += WEIGHTS.high;
  for (const kw of tier.medium) if (lower.includes(kw)) raw += WEIGHTS.medium;
  for (const kw of tier.low)    if (lower.includes(kw)) raw += WEIGHTS.low;

  const target = maxRaw(tier) * 0.30;
  return target > 0 ? Math.min(1, raw / target) : 0;
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface ScorerResult {
  scores: Record<Category, number>;
  primary: Category;
  primaryConfidence: number;
  secondaries: Category[];
  /** Top two scores within 0.15 of each other — Grok should decide. */
  ambiguous: boolean;
}

// ── Main scorer ───────────────────────────────────────────────────────────────

export function scoreArticle(text: string): ScorerResult {
  const lower = text.toLowerCase();
  const cats: Category[] = ['bitcoin', 'conflict', 'disaster', 'economy', 'political'];

  const scores = Object.fromEntries(
    cats.map((c) => [c, scoreCategory(lower, KEYWORD_SETS[c])])
  ) as Record<Category, number>;

  const sorted = [...cats].sort((a, b) => scores[b] - scores[a]);
  const primary = sorted[0];
  const runner  = sorted[1];

  const ambiguous = scores[primary] > 0 && (scores[primary] - scores[runner]) < 0.15;

  const secondaries = sorted
    .slice(1)
    .filter((c) => scores[c] >= 0.15)
    .slice(0, 3);

  return {
    scores,
    primary,
    primaryConfidence: scores[primary],
    secondaries,
    ambiguous,
  };
}

// ── Bitcoin relevance scorer ──────────────────────────────────────────────────
// Used when Grok is not called — estimates how much a BTC watcher cares (0-10).

const HIGH_IMPACT_TERMS = [
  'federal reserve', 'rate cut', 'rate hike', 'fomc',
  'strait of hormuz', 'oil price', 'energy crisis',
  'dollar index', 'dxy', 'inflation', 'cpi',
  'strategic reserve', 'bitcoin reserve', 'etf',
  'blackrock', 'fidelity', 'microstrategy',
];

const MID_IMPACT_TERMS = [
  'gold', 'sanctions', 'iran', 'russia', 'china',
  'trade war', 'tariff', 'treasury', 'yield curve',
];

const NOISE_TERMS = [
  'nfl', 'nba', 'football', 'celebrity', 'oscar',
  'grammy', 'reality tv', 'dating', 'recipe', 'cooking',
];

export function calculateBitcoinRelevance(
  scores: Record<Category, number>,
  text: string,
): number {
  let relevance = scores.bitcoin * 10;
  const lower = text.toLowerCase();

  for (const t of HIGH_IMPACT_TERMS) if (lower.includes(t)) relevance += 1.5;
  for (const t of MID_IMPACT_TERMS)  if (lower.includes(t)) relevance += 0.7;
  for (const t of NOISE_TERMS)       if (lower.includes(t)) relevance -= 4;

  return Math.max(0, Math.min(10, Math.round(relevance)));
}
