/**
 * RSS source profiles — maps feed URLs to default classification hints.
 * Used by the classifier pipeline to short-circuit high-confidence sources.
 *
 * Feeds sourced from src/lib/data/rss.ts RSS_FEEDS array (17 feeds).
 */

export type Category = 'bitcoin' | 'conflict' | 'disaster' | 'economy' | 'political';

export interface SourceProfile {
  /** Category this feed defaults to, or null if genuinely mixed. */
  defaultCategory: Category | null;
  /** 0–1 confidence in defaultCategory. Only honoured when alwaysClassify=false. */
  confidence: number;
  /** true = always run full classifier regardless of confidence. */
  alwaysClassify: boolean;
}

/**
 * Key = exact feed URL as declared in RSS_FEEDS.
 * Covers all 17 feeds. Any URL not in this map gets keyword-classified.
 */
export const SOURCE_MAP: Record<string, SourceProfile> = {

  // ── Bitcoin-specific — high confidence, skip classifier ──────────────────

  'https://bitcoinmagazine.com/.rss/full/': {
    defaultCategory: 'bitcoin',
    confidence: 0.98,
    alwaysClassify: false,
  },
  'https://cointelegraph.com/rss/tag/bitcoin': {
    defaultCategory: 'bitcoin',
    confidence: 0.95,
    alwaysClassify: false,
  },

  // ── Bitcoin-biased but publishes macro/economy too ───────────────────────

  'https://decrypt.co/feed': {
    defaultCategory: 'bitcoin',
    confidence: 0.80,
    alwaysClassify: true,
  },
  'https://www.coindesk.com/arc/outboundfeeds/rss/': {
    defaultCategory: 'bitcoin',
    confidence: 0.80,
    alwaysClassify: true,
  },

  // ── Conflict-focused — reliable single category ──────────────────────────

  'https://www.crisisgroup.org/rss-0': {
    defaultCategory: 'conflict',
    confidence: 0.90,
    alwaysClassify: false,
  },

  // ── Economy-biased — always classify (overlaps political/conflict) ────────

  'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362': {
    defaultCategory: 'economy',
    confidence: 0.75,
    alwaysClassify: true,
  },
  'https://feeds.marketwatch.com/marketwatch/topstories/': {
    defaultCategory: 'economy',
    confidence: 0.75,
    alwaysClassify: true,
  },
  'https://feeds.reuters.com/reuters/businessNews': {
    defaultCategory: 'economy',
    confidence: 0.75,
    alwaysClassify: true,
  },
  'https://feeds.bbci.co.uk/news/business/rss.xml': {
    defaultCategory: 'economy',
    confidence: 0.70,
    alwaysClassify: true,
  },
  'https://www.theguardian.com/uk/business/rss': {
    defaultCategory: 'economy',
    confidence: 0.70,
    alwaysClassify: true,
  },

  // ── High variance — always classify ──────────────────────────────────────

  'https://feeds.feedburner.com/zerohedge/feed': {
    defaultCategory: null,
    confidence: 0,
    alwaysClassify: true,
  },

  // ── Mixed world/political news — always classify ─────────────────────────

  'https://feeds.reuters.com/reuters/topNews': {
    defaultCategory: null,
    confidence: 0,
    alwaysClassify: true,
  },
  'https://feeds.bbci.co.uk/news/world/rss.xml': {
    defaultCategory: null,
    confidence: 0,
    alwaysClassify: true,
  },
  'https://www.aljazeera.com/xml/rss/all.xml': {
    defaultCategory: null,
    confidence: 0,
    alwaysClassify: true,
  },
  'https://feeds.npr.org/1004/rss.xml': {
    defaultCategory: null,
    confidence: 0,
    alwaysClassify: true,
  },
  'https://www.theguardian.com/world/rss': {
    defaultCategory: null,
    confidence: 0,
    alwaysClassify: true,
  },
  'https://feeds.skynews.com/feeds/rss/world.xml': {
    defaultCategory: null,
    confidence: 0,
    alwaysClassify: true,
  },
};
