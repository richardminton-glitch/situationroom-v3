import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ── In-memory server cache ──────────────────────────────────────────────────
// One upstream call per TTL window regardless of how many concurrent users.
// 30 s ISS cache → max ~2,880 upstream calls/day instead of N × 6 per minute.
const TTL_MS = 30_000;

interface CachedIss {
  payload: unknown;
  expiresAt: number;
}

let cache: CachedIss | null = null;
let inflight: Promise<unknown> | null = null;

async function fetchUpstream(): Promise<unknown> {
  const res = await fetch('http://api.open-notify.org/iss-now.json', {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function getIss(): Promise<unknown> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.payload;

  // Coalesce concurrent requests so the cold-cache stampede only fires one upstream fetch
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const payload = await fetchUpstream();
      cache = { payload, expiresAt: Date.now() + TTL_MS };
      return payload;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export async function GET() {
  try {
    const data = await getIss();
    return NextResponse.json(data, {
      // Allow CDN/browser caching for the same window
      headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' },
    });
  } catch {
    // If we have stale data, serve it rather than 502
    if (cache) {
      return NextResponse.json(cache.payload, {
        headers: { 'Cache-Control': 'public, max-age=10' },
      });
    }
    return NextResponse.json({ error: 'ISS data unavailable' }, { status: 502 });
  }
}
