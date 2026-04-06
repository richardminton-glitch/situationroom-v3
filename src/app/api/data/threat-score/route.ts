/**
 * GET /api/data/threat-score
 *
 * Computes the current threat score using the same algorithm as the Members Room:
 * RSS headlines → AgentEvent classification → exponential decay scoring.
 *
 * Returns: { score: number, state: ThreatState }
 *
 * Used by DashboardHeader and WhatChanged for consistent threat display.
 * Cached for 60 seconds to avoid hammering RSS on every page load.
 */

import { NextResponse } from 'next/server';
import { fetchRSSAll } from '@/lib/data/rss';
import { classifiedToAgentEvent } from '@/lib/room/eventMapper';
import { computeDecayedScore, type ThreatState } from '@/lib/room/threatEngine';

export const dynamic = 'force-dynamic';

let cachedResult: { score: number; state: ThreatState } | null = null;
let cachedAt = 0;
const CACHE_TTL = 60_000; // 1 minute

export async function GET() {
  const now = Date.now();

  if (cachedResult && now - cachedAt < CACHE_TTL) {
    return NextResponse.json(cachedResult);
  }

  try {
    const { headlines } = await fetchRSSAll();
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;

    const events = headlines
      .filter((h) => h.time * 1000 > twoHoursAgo)
      .map((h) => classifiedToAgentEvent({
        title: h.title,
        source: h.source,
        link: h.link,
        time: h.time,
        primaryCategory: h.primaryCategory,
        secondaryCategories: h.secondaryCategories || [],
        relevanceToBitcoin: h.relevanceToBitcoin,
        classificationConfidence: h.classificationConfidence,
        description: h.description || '',
      }));

    const { score, state } = computeDecayedScore(events, now);

    cachedResult = { score, state };
    cachedAt = now;

    return NextResponse.json(cachedResult);
  } catch {
    // Return last cached value or zero
    return NextResponse.json(cachedResult ?? { score: 0, state: 'QUIET' });
  }
}
