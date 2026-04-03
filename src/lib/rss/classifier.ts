/**
 * RSS classification pipeline — the central orchestrator.
 *
 * For each article the pipeline evaluates in order:
 *   0. DB cache   — 7-day TTL per content hash
 *   1. Source map — high-confidence feeds skip keyword/Grok entirely
 *   2. Keywords   — fast, synchronous score
 *   3. Overrides  — deterministic edge-case rules
 *   4. Grok       — only for ambiguous/low-confidence/alwaysClassify articles
 *
 * Grok calls are fire-and-forget: keyword results are returned immediately
 * and the DB cache is updated in the background. Callers see the improved
 * classification on the next RSS cache refresh (5-min TTL).
 *
 * All DB operations are wrapped in try/catch — the pipeline degrades
 * gracefully if the ClassificationCache table has not yet been migrated.
 */

import { prisma } from '@/lib/db';
import { SOURCE_MAP, type Category, type SourceProfile } from './sourceMap';
import { scoreArticle, calculateBitcoinRelevance, type ScorerResult } from './keywordScorer';
import { classifyWithGrok, contentHash } from './aiClassifier';
import { detectGeoReference } from './geoDetector';
import { recordStat } from './statsTracker';

// ── Public types ──────────────────────────────────────────────────────────────

export interface RawArticle {
  title: string;
  description: string;
  link: string;
  source: string;
  feedUrl: string;
  time: number; // Unix seconds
  /** Category returned by the headline gate (categoriseHeadline) — used as
   *  a low-confidence fallback when keyword scoring produces zero for all categories. */
  feedDefaultCategory: string | null;
}

export type ClassificationMethod =
  | 'source_map'
  | 'keyword'
  | 'ai'
  | 'cache'
  | 'keyword_fallback';

export interface ClassifiedArticle extends RawArticle {
  // ── Backward compat (used by IntelFeedPanel and WirePanel) ──
  category: string;

  // ── Classification ───────────────────────────────────────────
  primaryCategory: Category;
  secondaryCategories: Category[];
  classificationConfidence: number;
  classificationMethod: ClassificationMethod;
  relevanceToBitcoin: number;  // 0-10
  classifiedAt: string;        // ISO datetime

  // ── UI helpers (derived) ─────────────────────────────────────
  categoryDot: string;         // hex colour for dot indicator
  categoryIcon: string;        // ₿ ☠ ⚠ ◈ 🗳
  isHighRelevance: boolean;    // relevanceToBitcoin >= 7
  geoReference: string | null; // readable country/region name
}

export const CATEGORY_UI: Record<Category, { dot: string; icon: string }> = {
  bitcoin:  { dot: '#f7931a', icon: '₿' },
  conflict: { dot: '#cc4444', icon: '☠' },
  disaster: { dot: '#d4762a', icon: '⚠' },
  economy:  { dot: '#8b6914', icon: '◈' },
  political:{ dot: '#4a6fa5', icon: '🗳' },
};

// ── DB cache ──────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedClassification {
  primaryCategory: Category;
  secondaryCategories: Category[];
  confidence: number;
  relevanceToBitcoin: number;
  method: string;
  reasoning: string | null;
}


async function fetchCachedBatch(
  hashes: string[],
): Promise<Map<string, CachedClassification>> {
  if (hashes.length === 0) return new Map();
  try {
    const rows = await prisma.classificationCache.findMany({
      where: {
        contentHash: { in: hashes },
        expiresAt:   { gte: new Date() },
      },
    });
    return new Map(
      rows.map((r) => [
        r.contentHash,
        {
          primaryCategory:     r.primaryCategory as Category,
          secondaryCategories: r.secondaryCategories as Category[],
          confidence:          r.confidence,
          relevanceToBitcoin:  r.relevanceToBitcoin,
          method:              r.method,
          reasoning:           r.reasoning,
        },
      ]),
    );
  } catch {
    // Table not yet migrated — degrade gracefully
    return new Map();
  }
}

async function saveToCache(hash: string, result: CachedClassification): Promise<void> {
  try {
    await prisma.classificationCache.upsert({
      where:  { contentHash: hash },
      update: {
        primaryCategory:    result.primaryCategory,
        secondaryCategories: result.secondaryCategories,
        confidence:         result.confidence,
        relevanceToBitcoin: result.relevanceToBitcoin,
        method:             result.method,
        reasoning:          result.reasoning,
        expiresAt:          new Date(Date.now() + CACHE_TTL_MS),
      },
      create: {
        contentHash:        hash,
        primaryCategory:    result.primaryCategory,
        secondaryCategories: result.secondaryCategories,
        confidence:         result.confidence,
        relevanceToBitcoin: result.relevanceToBitcoin,
        method:             result.method,
        reasoning:          result.reasoning,
        expiresAt:          new Date(Date.now() + CACHE_TTL_MS),
      },
    });
  } catch {
    // Silently ignore — classification works without persistence
  }
}

/** Delete expired entries. Call from an existing cron (e.g. daily-snapshot). */
export async function cleanupExpiredCache(): Promise<void> {
  try {
    const { count } = await prisma.classificationCache.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (count > 0) console.log(`[Classifier] Pruned ${count} expired cache entries`);
  } catch { /* table may not exist */ }
}

// ── Override rules ────────────────────────────────────────────────────────────
// Applied AFTER keyword scoring, BEFORE Grok call.
// Encode deterministic edge-case logic that keywords miss due to co-occurrence.

function applyOverrides(
  scores: Record<Category, number>,
  text: string,
): Partial<{ primary: Category; secondaries: Category[]; confidence: number }> | null {
  const lower = text.toLowerCase();

  // Bitcoin wins over economy when a BTC high-value keyword is present
  if (scores.bitcoin > 0.35 && scores.economy > 0.30) {
    const btcHigh = [
      'bitcoin', 'btc', 'satoshi', 'lightning', 'halving',
      'proof of work', 'mempool', 'taproot', 'segwit', 'ordinals',
    ];
    if (btcHigh.some((t) => lower.includes(t))) {
      return { primary: 'bitcoin', confidence: 0.85 };
    }
  }

  // Conflict wins over economy for energy/war stories
  if (scores.conflict > 0.40 && scores.economy > 0.25) {
    const conflictHigh = [
      'war', 'attack', 'missile', 'airstrike', 'bombing', 'invasion',
      'casualties', 'killed', 'ceasefire', 'artillery', 'drone strike',
    ];
    if (conflictHigh.some((t) => lower.includes(t))) {
      return { primary: 'conflict', secondaries: ['economy'], confidence: 0.80 };
    }
  }

  // Political wins over economy for policy-driven stories
  if (scores.political > 0.35 && scores.economy > 0.30) {
    const policyTerms = [
      'tariff', 'sanction', 'legislation', 'executive order',
      'regulation', 'bill passed',
    ];
    if (policyTerms.some((t) => lower.includes(t))) {
      return { primary: 'political', secondaries: ['economy'], confidence: 0.80 };
    }
  }

  return null;
}

// ── Article builder ───────────────────────────────────────────────────────────

function build(
  article: RawArticle,
  primary: Category,
  secondaries: Category[],
  confidence: number,
  relevanceToBitcoin: number,
  method: ClassificationMethod,
): ClassifiedArticle {
  const ui = CATEGORY_UI[primary];
  return {
    ...article,
    category:               primary,          // backward compat for panels
    primaryCategory:        primary,
    secondaryCategories:    secondaries,
    classificationConfidence: confidence,
    classificationMethod:   method,
    relevanceToBitcoin,
    classifiedAt:           new Date().toISOString(),
    categoryDot:            ui.dot,
    categoryIcon:           ui.icon,
    isHighRelevance:        relevanceToBitcoin >= 7,
    geoReference:           detectGeoReference(article.title),
  };
}

// ── Batch classification ──────────────────────────────────────────────────────

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // skip Grok for articles >24h old

export async function classifyArticles(articles: RawArticle[]): Promise<ClassifiedArticle[]> {
  if (articles.length === 0) return [];

  const now = Date.now();
  const hashes = articles.map((a) => contentHash(a.title, a.feedUrl));

  // ── 0. Batch DB cache lookup ─────────────────────────────────────────────
  const cached = await fetchCachedBatch(hashes);

  // Collect articles that need Grok (processed after returning keyword results)
  const grokQueue: { article: RawArticle; hash: string }[] = [];

  // ── Classify each article ─────────────────────────────────────────────────
  // Returns null for zero-signal articles (all keyword scores = 0). These are
  // filtered out before returning — quality over quantity.
  const results = articles.map((article, i): ClassifiedArticle | null => {
    const hash = hashes[i];
    const hit  = cached.get(hash);

    // ── 0a. Cache hit ──────────────────────────────────────────────────────
    if (hit) {
      recordStat({
        category:          hit.primaryCategory,
        method:            'cache',
        confidence:        hit.confidence,
        relevanceToBitcoin: hit.relevanceToBitcoin,
        isHighRelevance:   hit.relevanceToBitcoin >= 7,
      });
      return build(
        article,
        hit.primaryCategory,
        hit.secondaryCategories,
        hit.confidence,
        hit.relevanceToBitcoin,
        'cache',
      );
    }

    // ── 1. Source map — high-confidence, skip classifier ──────────────────
    const profile: SourceProfile | undefined = SOURCE_MAP[article.feedUrl];
    if (
      profile?.defaultCategory &&
      !profile.alwaysClassify &&
      profile.confidence >= 0.90
    ) {
      const text = `${article.title}. ${article.description}`;
      const btcScores = { bitcoin: 1, conflict: 0, disaster: 0, economy: 0, political: 0 } as Record<Category, number>;
      const relevanceToBitcoin = calculateBitcoinRelevance(btcScores, text);

      void saveToCache(hash, {
        primaryCategory:    profile.defaultCategory,
        secondaryCategories: [],
        confidence:         profile.confidence,
        relevanceToBitcoin,
        method:             'source_map',
        reasoning:          null,
      });

      recordStat({
        category:          profile.defaultCategory,
        method:            'source_map',
        confidence:        profile.confidence,
        relevanceToBitcoin,
        isHighRelevance:   relevanceToBitcoin >= 7,
      });

      return build(
        article,
        profile.defaultCategory,
        [],
        profile.confidence,
        relevanceToBitcoin,
        'source_map',
      );
    }

    // ── 2. Keyword scoring ─────────────────────────────────────────────────
    const text = `${article.title}. ${article.description}`;
    const kw: ScorerResult = scoreArticle(text);

    // ── 3. Zero-signal exclusion ───────────────────────────────────────────
    // If the keyword scorer returns 0 for every category the article has no
    // classifiable signal — exclude it rather than return a meaningless guess.
    if (kw.primaryConfidence < 0.05) {
      return null;
    }

    // ── 4. Override rules ──────────────────────────────────────────────────
    const override = applyOverrides(kw.scores, text);
    const effective = override
      ? {
          primary:    override.primary    ?? kw.primary,
          secondaries: override.secondaries ?? kw.secondaries,
          confidence: override.confidence  ?? kw.primaryConfidence,
        }
      : { primary: kw.primary, secondaries: kw.secondaries, confidence: kw.primaryConfidence };

    const relevanceToBitcoin = calculateBitcoinRelevance(kw.scores, text);

    // ── 4. Does this article need Grok? ───────────────────────────────────
    const isRecent  = (now - article.time * 1000) < STALE_THRESHOLD_MS;
    const needsGrok = isRecent && (
      profile?.alwaysClassify ||
      effective.confidence < 0.75 ||
      kw.ambiguous
    );

    if (needsGrok) {
      // Return keyword result now; Grok will update the DB cache async.
      grokQueue.push({ article, hash });

      recordStat({
        category:          effective.primary,
        method:            'keyword_fallback',
        confidence:        effective.confidence,
        relevanceToBitcoin,
        isHighRelevance:   relevanceToBitcoin >= 7,
      });

      return build(
        article,
        effective.primary,
        effective.secondaries,
        effective.confidence,
        relevanceToBitcoin,
        'keyword_fallback',
      );
    }

    // Keyword result is confident — use it, cache it.
    void saveToCache(hash, {
      primaryCategory:    effective.primary,
      secondaryCategories: effective.secondaries,
      confidence:         effective.confidence,
      relevanceToBitcoin,
      method:             'keyword',
      reasoning:          null,
    });

    recordStat({
      category:          effective.primary,
      method:            'keyword',
      confidence:        effective.confidence,
      relevanceToBitcoin,
      isHighRelevance:   relevanceToBitcoin >= 7,
    });

    return build(
      article,
      effective.primary,
      effective.secondaries,
      effective.confidence,
      relevanceToBitcoin,
      'keyword',
    );
  });

  // ── Fire-and-forget Grok queue ────────────────────────────────────────────
  // Results update the DB cache; available to the next RSS cache refresh.
  if (grokQueue.length > 0) {
    void (async () => {
      for (const { article, hash } of grokQueue) {
        const ai = await classifyWithGrok(
          article.title,
          article.description,
          article.source,
        );
        if (ai) {
          await saveToCache(hash, {
            primaryCategory:    ai.primary,
            secondaryCategories: ai.secondaries,
            confidence:         ai.confidence,
            relevanceToBitcoin: ai.relevanceToBitcoin,
            method:             'ai',
            reasoning:          ai.reasoning,
          });
        }
      }
    })();
  }

  // Filter out null (zero-signal exclusions)
  return results.filter((r): r is ClassifiedArticle => r !== null);
}
