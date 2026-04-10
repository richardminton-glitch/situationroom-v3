/**
 * Server-side data fetcher with caching.
 * All external API calls go through here — no direct client-to-API calls.
 */

interface CacheEntry {
  data: unknown;
  updatedAt: number;
  stale: boolean;
}

const cache = new Map<string, CacheEntry>();

const DEFAULT_TIMEOUT = 15_000;

export async function fetchJSON<T>(
  url: string,
  options: {
    headers?: Record<string, string>;
    timeout?: number;
    cacheKey?: string;
    cacheDuration?: number; // ms
  } = {}
): Promise<T> {
  const { headers, timeout = DEFAULT_TIMEOUT, cacheKey, cacheDuration } = options;

  // Check cache
  if (cacheKey && cacheDuration) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.updatedAt < cacheDuration && !cached.stale) {
      return cached.data as T;
    }
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(url, {
      headers,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    // Update cache
    if (cacheKey) {
      cache.set(cacheKey, { data, updatedAt: Date.now(), stale: false });
    }

    return data as T;
  } catch (error) {
    // Mark cache as stale but keep serving it
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached) {
        cached.stale = true;
        return cached.data as T;
      }
    }
    throw error;
  }
}
