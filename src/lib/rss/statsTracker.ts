/**
 * In-process rate limiting and classification statistics.
 * No Redis dependency — module-level state survives across requests
 * within the same Node.js process.
 */

// ── Rate limiting ─────────────────────────────────────────────────────────────

const MAX_GROK_CALLS_PER_HOUR = 120;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Sorted ascending array of call timestamps
const grokTimestamps: number[] = [];

/**
 * Check if a Grok call is within rate limit and, if so, record it.
 * Returns true when the call is allowed.
 */
export function checkAndRecordAICall(): boolean {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Evict entries outside the rolling window
  while (grokTimestamps.length > 0 && grokTimestamps[0] < windowStart) {
    grokTimestamps.shift();
  }

  if (grokTimestamps.length >= MAX_GROK_CALLS_PER_HOUR) {
    console.warn('[Classifier] Grok rate limit reached — falling back to keyword');
    return false;
  }

  grokTimestamps.push(now);
  return true;
}

export function getGrokCallsLastHour(): number {
  const windowStart = Date.now() - WINDOW_MS;
  return grokTimestamps.filter((t) => t >= windowStart).length;
}

// ── Classification stats ──────────────────────────────────────────────────────

interface StatEntry {
  timestamp: number;
  category: string;
  method: string;
  confidence: number;
  relevanceToBitcoin: number;
  isHighRelevance: boolean;
}

const statBuffer: StatEntry[] = [];
const MAX_BUFFER_SIZE = 5_000;

export function recordStat(entry: Omit<StatEntry, 'timestamp'>): void {
  statBuffer.push({ ...entry, timestamp: Date.now() });
  // Rolling window — evict oldest when buffer is full
  if (statBuffer.length > MAX_BUFFER_SIZE) {
    statBuffer.shift();
  }
}

// ── Stats aggregation ─────────────────────────────────────────────────────────

export interface ClassificationStats {
  totalBuffered: number;
  last24h: {
    total: number;
    byCategory: Record<string, number>;
    byMethod: Record<string, number>;
    avgConfidence: number;
    avgRelevanceToBitcoin: number;
    highRelevanceCount: number;
  };
  grokCallsLastHour: number;
}

export function getStats(): ClassificationStats {
  const windowStart = Date.now() - 24 * 60 * 60 * 1000;
  const recent = statBuffer.filter((s) => s.timestamp >= windowStart);

  const byCategory: Record<string, number> = {
    bitcoin: 0, conflict: 0, disaster: 0, economy: 0, political: 0,
  };
  const byMethod: Record<string, number> = {
    source_map: 0, keyword: 0, ai: 0, cache: 0, keyword_fallback: 0,
  };

  let sumConf = 0;
  let sumRel  = 0;
  let highRel = 0;

  for (const s of recent) {
    byCategory[s.category] = (byCategory[s.category] ?? 0) + 1;
    byMethod[s.method]     = (byMethod[s.method]     ?? 0) + 1;
    sumConf += s.confidence;
    sumRel  += s.relevanceToBitcoin;
    if (s.isHighRelevance) highRel++;
  }

  const n = recent.length || 1;

  return {
    totalBuffered: statBuffer.length,
    last24h: {
      total: recent.length,
      byCategory,
      byMethod,
      avgConfidence:         Math.round((sumConf / n) * 100) / 100,
      avgRelevanceToBitcoin: Math.round((sumRel  / n) * 10)  / 10,
      highRelevanceCount:    highRel,
    },
    grokCallsLastHour: getGrokCallsLastHour(),
  };
}
