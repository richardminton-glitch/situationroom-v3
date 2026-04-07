/**
 * GET /api/lnm/candles?interval=5&limit=96
 *
 * Proxy for LN Markets v3 public candles endpoint.
 * Caches for 30 seconds to avoid hammering upstream.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const LNM_BASE = 'https://api.lnmarkets.com/v3';
const CACHE_TTL_MS = 30_000;

let cache: { data: unknown; expiresAt: number } | null = null;

export async function GET(request: NextRequest) {
  const interval = request.nextUrl.searchParams.get('interval') || '5';
  const limit = request.nextUrl.searchParams.get('limit') || '96';

  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json(cache.data, { headers: { 'X-Cache': 'HIT' } });
  }

  try {
    const url = `${LNM_BASE}/futures/candles?interval=${encodeURIComponent(interval)}&limit=${encodeURIComponent(limit)}`;
    const res = await fetch(url, { next: { revalidate: 0 } });

    if (!res.ok) {
      return NextResponse.json({ error: 'Upstream error' }, { status: res.status });
    }

    const json = await res.json();
    const candles = json.data ?? json;

    cache = { data: candles, expiresAt: Date.now() + CACHE_TTL_MS };

    return NextResponse.json(candles, { headers: { 'X-Cache': 'MISS' } });
  } catch (err) {
    console.error('[lnm/candles]', err);
    return NextResponse.json({ error: 'Failed to fetch candles' }, { status: 502 });
  }
}
