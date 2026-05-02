/**
 * /api/data/cash-isa — UK Cash ISA real-returns series.
 *
 * Pure compute over a hardcoded annual table; no external fetches. Cached
 * via standard HTTP headers since the underlying ONS / BoE prints only
 * change on a quarterly cadence.
 */

import { NextResponse } from 'next/server';
import { computeCashIsaSeries } from '@/lib/data/uk-cash-isa';

export const dynamic = 'force-static';

export async function GET() {
  const payload = computeCashIsaSeries();
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
