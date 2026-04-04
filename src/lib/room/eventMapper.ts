/**
 * Maps ClassifiedArticle objects from the RSS pipeline into AgentEvent objects
 * for the reactive intelligence network.
 */

import type { AgentDomain, AgentEvent } from './agentDomains';
import { classifyTier, TIER_IMPACT } from './severityTiers';

interface ClassifiedArticleInput {
  title: string;
  source: string;
  link: string;
  time: number;
  primaryCategory: string;
  secondaryCategories?: string[];
  relevanceToBitcoin: number;
  classificationConfidence: number;
  description?: string;
}

// ── Domain routing keywords ──────────────────────────────────────────────────

const MACRO_KEYWORDS = [
  'monetary policy', 'fed ', 'federal reserve', 'ecb', 'boe', 'boj',
  'central bank', 'yields', 'yield curve', 'dxy', 'dollar index',
  'inflation', 'cpi', 'ppi', 'gdp', 'employment', 'unemployment',
  'rate decision', 'rate hike', 'rate cut', 'fomc', 'taper',
  'quantitative', 'stimulus', 'treasury', 'bond', 'debt ceiling',
  'm2', 'money supply', 'interest rate', 'yen', 'euro',
];

const PRICE_KEYWORDS = [
  'bitcoin', 'btc', 'etf', 'exchange', 'hashrate', 'hash rate',
  'mining', 'halving', 'crypto', 'spot price', 'futures',
  'liquidation', 'whale', 'accumulation', 'outflow', 'inflow',
  'mempool', 'difficulty', 'block reward', 'sats', 'satoshi',
  'lightning network', 'layer 2', 'coinbase', 'binance',
  'microstrategy', 'grayscale', 'blackrock', 'fidelity',
];

const SENTIMENT_KEYWORDS = [
  'narrative', 'social', 'fear', 'greed', 'sentiment', 'mainstream',
  'adoption', 'institutional', 'retail', 'fomo', 'capitulation',
  'media', 'opinion', 'poll', 'survey', 'trust', 'confidence',
  'public', 'regulation', 'regulatory', 'sec ', 'cftc',
  'framework', 'legislation', 'bill', 'law', 'compliance',
  'el salvador', 'legal tender', 'cbdc',
];

const RISK_KEYWORDS = [
  'geopolitical', 'sanctions', 'war', 'energy', 'oil',
  'conflict', 'military', 'nato', 'attack', 'missile',
  'nuclear', 'invasion', 'occupation', 'embargo', 'blockade',
  'coup', 'martial law', 'emergency', 'crisis', 'escalation',
  'cyber', 'hack', 'exploit', 'breach', 'infrastructure',
  'ban', 'government', 'seize', 'freeze', 'shutdown',
  'strait of hormuz', 'south china sea', 'taiwan',
];

const DOMAIN_KEYWORD_MAP: Record<AgentDomain, string[]> = {
  MACRO: MACRO_KEYWORDS,
  PRICE: PRICE_KEYWORDS,
  SENTIMENT: SENTIMENT_KEYWORDS,
  RISK: RISK_KEYWORDS,
};

// ── Category-to-domain base mapping ──────────────────────────────────────────

const CATEGORY_DOMAIN_MAP: Record<string, AgentDomain> = {
  bitcoin: 'PRICE',
  economy: 'MACRO',
  conflict: 'RISK',
  disaster: 'RISK',
  political: 'SENTIMENT',
};

// ── Mapper ───────────────────────────────────────────────────────────────────

function matchDomains(headline: string, category: string): AgentDomain[] {
  const lower = headline.toLowerCase();
  const matched = new Set<AgentDomain>();

  // Category base mapping
  const baseDomain = CATEGORY_DOMAIN_MAP[category];
  if (baseDomain) matched.add(baseDomain);

  // Keyword matching across all domains
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORD_MAP)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        matched.add(domain as AgentDomain);
        break;
      }
    }
  }

  // Fallback: if nothing matched, use category base or default to MACRO
  if (matched.size === 0) {
    matched.add(baseDomain || 'MACRO');
  }

  return Array.from(matched);
}

/**
 * Convert a classified RSS article into an AgentEvent.
 */
export function classifiedToAgentEvent(article: ClassifiedArticleInput): AgentEvent {
  const domains = matchDomains(
    article.title + ' ' + (article.description || ''),
    article.primaryCategory,
  );

  const tier = classifyTier(
    article.title,
    article.relevanceToBitcoin,
    article.classificationConfidence,
    domains.length,
  );

  return {
    id: `evt-${article.time}-${hashCode(article.title)}`,
    headline: article.title,
    source: article.source,
    url: article.link,
    tier,
    domains,
    primaryDomain: domains[0],
    scoreImpact: TIER_IMPACT[tier],
    timestamp: new Date(article.time * 1000).toISOString(),
    category: article.primaryCategory,
    relevance: article.relevanceToBitcoin,
  };
}

/** Simple string hash for dedup IDs */
function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}
