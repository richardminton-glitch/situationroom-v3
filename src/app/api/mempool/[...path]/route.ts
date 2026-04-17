import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Proxy for mempool.space API.
//
// Why: the UTXO Cosmography page fetches 1000+ parent-tx lookups per block
// load, which instantly trips mempool.space's per-IP 429 limit. This proxy
// adds four layers of relief:
//
//   1. L1 in-memory cache keyed by path+query. Confirmed blocks/txs are
//      immutable, so they cache effectively forever; live endpoints (tip,
//      mempool, fees) get short TTLs.
//   2. L2 Postgres cache (DataCache table) for immutable paths only —
//      survives PM2 restarts/deploys and is shared across cluster workers,
//      so a block someone viewed yesterday doesn't re-hit upstream.
//   3. Concurrency gate: only MAX_CONCURRENT upstream requests in flight
//      at once, queued server-side. Clients can fire freely — the proxy
//      smooths the load and we stay under mempool.space's rate limit.
//   4. In-flight request coalescing: if two clients ask for the same URL
//      simultaneously, we issue one upstream fetch and fan the result out.

const BASE = 'https://mempool.space/api';
const MAX_CONCURRENT = 2;
const MAX_CACHE_ENTRIES = 50_000;
const UPSTREAM_TIMEOUT_MS = 15_000;
const RETRY_429_BACKOFFS_MS = [500, 1200, 2500]; // 3 retries max

// L2 (Postgres) persistent cache. Confirmed Bitcoin data never mutates, so
// the 90-day TTL is purely a self-cleaning bound — entries re-fetch and
// re-cache naturally if someone still cares 90 days later. Key prefix
// namespaces DataCache so this coexists with other consumers.
const L2_KEY_PREFIX = 'mempool:';
const L2_TTL_MS = 90 * 24 * 60 * 60 * 1000;

interface CacheEntry {
  body: string;
  contentType: string;
  expiresAt: number; // Infinity for immutable entries
}

interface UpstreamResult {
  body: string;
  contentType: string;
  status: number;
}

const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<UpstreamResult>>();

let inFlight = 0;
const waiters: Array<() => void> = [];

function acquire(): Promise<void> {
  return new Promise((resolve) => {
    if (inFlight < MAX_CONCURRENT) {
      inFlight++;
      resolve();
    } else {
      waiters.push(() => { inFlight++; resolve(); });
    }
  });
}

function release(): void {
  inFlight--;
  const next = waiters.shift();
  if (next) next();
}

function setCache(key: string, entry: CacheEntry): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, entry);
}

function ttlMsForPath(path: string): number {
  // Immutable: confirmed blocks and transactions never change.
  if (/^block\/[0-9a-f]{64}(\/txs(\/\d+)?)?$/i.test(path)) return Infinity;
  if (/^block-height\/\d+$/.test(path)) return Infinity;
  if (/^tx\/[0-9a-f]{64}$/i.test(path)) return Infinity;

  // Live network data: short TTLs.
  if (path === 'blocks/tip/height') return 10_000;
  if (path === 'mempool') return 30_000;
  if (path === 'v1/fees/recommended') return 30_000;
  if (/^v1\/mining\/hashrate\//.test(path)) return 5 * 60_000;

  return 15_000;
}

// Only immutable paths get L2 persistence — live endpoints would churn
// the DB for short-TTL data that's cheap to re-fetch anyway.
function isImmutablePath(path: string): boolean {
  return ttlMsForPath(path) === Infinity;
}

async function readFromL2(cacheKey: string): Promise<{ body: string; contentType: string } | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (prisma as any).dataCache.findUnique({
      where: { key: L2_KEY_PREFIX + cacheKey },
    });
    if (!row || row.expiresAt < new Date()) return null;
    return JSON.parse(row.data) as { body: string; contentType: string };
  } catch {
    return null;
  }
}

async function writeToL2(cacheKey: string, body: string, contentType: string): Promise<void> {
  try {
    const payload = JSON.stringify({ body, contentType });
    const expiresAt = new Date(Date.now() + L2_TTL_MS);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).dataCache.upsert({
      where:  { key: L2_KEY_PREFIX + cacheKey },
      create: { key: L2_KEY_PREFIX + cacheKey, data: payload, expiresAt },
      update: { data: payload, expiresAt },
    });
  } catch { /* non-fatal — L1 still serves */ }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');
  const qs = req.nextUrl.search;
  const cacheKey = pathStr + qs;

  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return new NextResponse(cached.body, {
      status: 200,
      headers: { 'Content-Type': cached.contentType, 'X-Proxy-Cache': 'HIT-L1' },
    });
  }

  // L2 Postgres lookup for immutable paths. On hit, hydrate L1 so the next
  // N requests for this key skip the DB roundtrip.
  if (isImmutablePath(pathStr)) {
    const l2 = await readFromL2(cacheKey);
    if (l2) {
      setCache(cacheKey, { body: l2.body, contentType: l2.contentType, expiresAt: Infinity });
      return new NextResponse(l2.body, {
        status: 200,
        headers: { 'Content-Type': l2.contentType, 'X-Proxy-Cache': 'HIT-L2' },
      });
    }
  }

  let upstreamPromise = pending.get(cacheKey);
  if (!upstreamPromise) {
    upstreamPromise = (async (): Promise<UpstreamResult> => {
      await acquire();
      try {
        const attempts = RETRY_429_BACKOFFS_MS.length + 1;
        for (let i = 0; i < attempts; i++) {
          const res = await fetch(`${BASE}/${pathStr}${qs}`, {
            signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
            headers: { 'User-Agent': 'situationroom-proxy/1.0' },
          });
          const contentType = res.headers.get('content-type') ?? 'text/plain';
          const body = await res.text();
          if (res.status !== 429 || i === attempts - 1) {
            return { body, contentType, status: res.status };
          }
          await new Promise((r) => setTimeout(r, RETRY_429_BACKOFFS_MS[i]));
        }
        // Unreachable, loop always returns on final iteration.
        throw new Error('retry loop exhausted');
      } finally {
        release();
      }
    })();
    pending.set(cacheKey, upstreamPromise);
    upstreamPromise.finally(() => pending.delete(cacheKey));
  }

  try {
    const { body, contentType, status } = await upstreamPromise;
    if (status < 200 || status >= 300) {
      return new NextResponse(body, {
        status,
        headers: { 'Content-Type': contentType, 'X-Proxy-Cache': 'MISS' },
      });
    }
    const ttl = ttlMsForPath(pathStr);
    if (ttl > 0) {
      setCache(cacheKey, {
        body,
        contentType,
        expiresAt: ttl === Infinity ? Infinity : now + ttl,
      });
    }
    // Persist immutable responses to L2 (fire-and-forget). Subsequent
    // deploys / cluster-worker cold-starts will read from Postgres
    // instead of paying upstream latency again.
    if (ttl === Infinity) {
      writeToL2(cacheKey, body, contentType).catch(() => { /* non-fatal */ });
    }
    return new NextResponse(body, {
      status: 200,
      headers: { 'Content-Type': contentType, 'X-Proxy-Cache': 'MISS' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return new NextResponse(`Proxy error: ${msg}`, { status: 502 });
  }
}
