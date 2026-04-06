/**
 * GET  /api/ai/threat-analysis — returns cached threat state + last 6 analyses
 *
 * Analysis generation now happens server-side in /api/data/threat-score when
 * a state transition is detected. This endpoint is read-only — the panel
 * polls it every 15 seconds to pick up new entries.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const PANEL_ID = 'threat-state';
const VALUE_KEY = 'current';

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (prisma as any).signalAnnotation.findUnique({
      where: { panelId_valueKey: { panelId: PANEL_ID, valueKey: VALUE_KEY } },
    });

    if (row) {
      const cache = JSON.parse(row.annotation);
      return NextResponse.json({
        state: cache.state,
        score: cache.score,
        updatedAt: cache.updatedAt,
        analyses: cache.analyses || [],
      });
    }
  } catch {
    // fall through
  }

  return NextResponse.json({
    state: 'QUIET',
    score: 0,
    updatedAt: null,
    analyses: [],
  });
}
