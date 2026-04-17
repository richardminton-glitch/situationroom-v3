/**
 * Maps ClassifiedArticle objects from the RSS pipeline into AgentEvent objects
 * for the reactive intelligence network.
 *
 * 5 threat domains: GEOPOLITICAL, ECONOMIC, BITCOIN, DISASTER, POLITICAL
 */

import type { AgentDomain, AgentEvent } from './agentDomains';
import { classifyTier, matchesTerm, TIER_IMPACT } from './severityTiers';

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

const GEOPOLITICAL_KEYWORDS = [
  'geopolitical', 'sanctions', 'war', 'conflict', 'military', 'nato',
  'attack', 'missile', 'nuclear', 'invasion', 'occupation', 'embargo',
  'blockade', 'coup', 'martial law', 'escalation', 'troops',
  'strait of hormuz', 'south china sea', 'taiwan', 'ukraine', 'russia',
  'iran', 'north korea', 'assassination', 'ceasefire', 'insurgent',
  'territorial', 'annex', 'proxy war', 'arms', 'defense',
];

const ECONOMIC_KEYWORDS = [
  'monetary policy', 'fed ', 'federal reserve', 'ecb', 'boe', 'boj',
  'central bank', 'yields', 'yield curve', 'dxy', 'dollar index',
  'inflation', 'cpi', 'ppi', 'gdp', 'employment', 'unemployment',
  'rate decision', 'rate hike', 'rate cut', 'fomc', 'taper',
  'quantitative', 'stimulus', 'treasury', 'bond', 'debt ceiling',
  'm2', 'money supply', 'interest rate', 'yen', 'euro',
  'bank run', 'default', 'contagion', 'market halt', 'recession',
  'credit', 'liquidity', 'solvency', 'bailout', 'banking crisis',
];

const BITCOIN_KEYWORDS = [
  'bitcoin', 'btc', 'etf', 'exchange', 'hashrate', 'hash rate',
  'mining', 'halving', 'crypto', 'spot price', 'futures',
  'liquidation', 'whale', 'accumulation', 'outflow', 'inflow',
  'mempool', 'difficulty', 'block reward', 'sats', 'satoshi',
  'lightning network', 'layer 2', 'coinbase', 'binance',
  'microstrategy', 'grayscale', 'blackrock', 'fidelity',
  'chain halt', 'insolvency', 'hack', 'exploit', 'rug pull',
];

const DISASTER_KEYWORDS = [
  'earthquake', 'tsunami', 'hurricane', 'typhoon', 'volcano',
  'flood', 'wildfire', 'tornado', 'pandemic', 'epidemic',
  'outbreak', 'nuclear accident', 'meltdown', 'radiation',
  'infrastructure failure', 'power grid', 'blackout', 'dam',
  'famine', 'drought', 'climate disaster', 'emergency declared',
  'natural disaster', 'evacuation', 'catastroph', 'devastat',
  'cyber attack', 'ransomware', 'grid failure', 'pipeline',
];

const POLITICAL_KEYWORDS = [
  'regulation', 'regulatory', 'sec ', 'cftc', 'legislation',
  'bill', 'law', 'compliance', 'framework', 'executive order',
  'arrest', 'indictment', 'enforcement', 'ban', 'government',
  'seize', 'freeze', 'shutdown', 'election', 'congress',
  'senate', 'parliament', 'president', 'prime minister',
  'policy', 'cbdc', 'legal tender', 'el salvador',
  'court ruling', 'supreme court', 'antitrust', 'subpoena',
];

const DOMAIN_KEYWORD_MAP: Record<AgentDomain, string[]> = {
  GEOPOLITICAL: GEOPOLITICAL_KEYWORDS,
  ECONOMIC: ECONOMIC_KEYWORDS,
  BITCOIN: BITCOIN_KEYWORDS,
  DISASTER: DISASTER_KEYWORDS,
  POLITICAL: POLITICAL_KEYWORDS,
};

// ── Category-to-domain base mapping ──────────────────────────────────────────

const CATEGORY_DOMAIN_MAP: Record<string, AgentDomain> = {
  bitcoin: 'BITCOIN',
  economy: 'ECONOMIC',
  conflict: 'GEOPOLITICAL',
  disaster: 'DISASTER',
  political: 'POLITICAL',
};

// ── Mapper ───────────────────────────────────────────────────────────────────

function matchDomains(headline: string, category: string): AgentDomain[] {
  const lower = headline.toLowerCase();
  const matched = new Set<AgentDomain>();

  // Category base mapping
  const baseDomain = CATEGORY_DOMAIN_MAP[category];
  if (baseDomain) matched.add(baseDomain);

  // Keyword matching across all domains.
  // Uses word-boundary matching so short keywords like "ban", "war", "arms",
  // "iran" don't phantom-match on "Lebanon", "reward", "farms", "hiring".
  // Previously used substring includes(), which was hitting 3+ domains on
  // benign stories and pinning the threat score via Tier-4 auto-promotion.
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORD_MAP)) {
    for (const kw of keywords) {
      if (matchesTerm(lower, kw)) {
        matched.add(domain as AgentDomain);
        break;
      }
    }
  }

  // Fallback: if nothing matched, use category base or default to ECONOMIC
  if (matched.size === 0) {
    matched.add(baseDomain || 'ECONOMIC');
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
