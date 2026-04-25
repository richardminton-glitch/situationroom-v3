/**
 * GET /api/data/ism-cycle
 *
 * Returns the manually-curated ISM Manufacturing PMI dataset that powers
 * the Macro Cycle tool (/tools/macro-cycle). The dataset is admin-edited
 * via POST /api/admin/update-ism — there is no upstream API for free ISM
 * data because ISM revoked FRED redistribution in 2016.
 *
 * Response: IsmCycleData — see src/lib/macro-cycle/types.ts.
 */

import { NextResponse } from 'next/server';
import { readIsmCycle } from '@/lib/macro-cycle/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = readIsmCycle();
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}
