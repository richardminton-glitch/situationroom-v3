/**
 * GET /api/data/threat-score
 *
 * Computes the current threat score using the same algorithm as the Members Room:
 * RSS headlines -> AgentEvent classification -> exponential decay scoring.
 *
 * **Server-side analysis trigger:** When the threat state changes between
 * consecutive calls, this endpoint auto-generates a Grok AI analysis and
 * persists it to the DB. No client-side POST is needed.
 *
 * Returns: { score: number, state: ThreatState }
 *
 * Called by: DashboardHeader (60s poll), cron (60s), useOpsRoom, WhatChanged.
 */

import { NextResponse } from 'next/server';
import { fetchRSSAll } from '@/lib/data/rss';
import { classifiedToAgentEvent } from '@/lib/room/eventMapper';
import { computeDecayedScore, type ThreatState } from '@/lib/room/threatEngine';
import { callGrokAnalysis } from '@/lib/grok/analysis';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ── Score cache (60s) ─────────────────────────────────────────────────────────
interface ThreatResult {
  score: number;
  state: ThreatState;
  /** Sum of raw decayed impacts before the 100-point cap. Useful for spotting
   *  when the engine is saturated (rawScore >> 100 means many more events are
   *  firing than the display can reflect). */
  rawScore: number;
  /** Total number of events feeding into the score (last 2h). */
  eventCount: number;
  /** Count of events by severity tier — lets us see whether a surge is coming
   *  from Tier 4 shocks or just a lot of Tier 1/2 chatter. */
  tierCounts: { 1: number; 2: number; 3: number; 4: number };
}
let cachedResult: ThreatResult | null = null;
let cachedAt = 0;
const CACHE_TTL = 60_000; // 1 minute

// ── State transition tracking ─────────────────────────────────────────────────
let prevState: ThreatState = 'QUIET';
let analysisInFlight = false;

// ── Analysis persistence (same schema as /api/ai/threat-analysis) ─────────────
const PANEL_ID = 'threat-state';
const VALUE_KEY = 'current';
const MAX_ANALYSES = 6;

interface CachedAnalysis {
  fromState: string;
  toState: string;
  score: number;
  analysis: string;
  timestamp: number;
  headlines: string[];
}

interface ThreatCache {
  state: string;
  score: number;
  updatedAt: number;
  analyses: CachedAnalysis[];
}

async function readCache(): Promise<ThreatCache | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (prisma as any).signalAnnotation.findUnique({
      where: { panelId_valueKey: { panelId: PANEL_ID, valueKey: VALUE_KEY } },
    });
    if (!row) return null;
    return JSON.parse(row.annotation) as ThreatCache;
  } catch {
    return null;
  }
}

async function writeCache(cache: ThreatCache): Promise<void> {
  const annotation = JSON.stringify(cache);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).signalAnnotation.upsert({
    where: { panelId_valueKey: { panelId: PANEL_ID, valueKey: VALUE_KEY } },
    create: { panelId: PANEL_ID, valueKey: VALUE_KEY, annotation, expiresAt },
    update: { annotation, expiresAt, generatedAt: new Date() },
  });
}

/**
 * Fire-and-forget: generate Grok analysis for a state transition,
 * then persist to DB. Runs async — does NOT block the response.
 */
async function triggerAnalysis(
  fromState: ThreatState,
  toState: ThreatState,
  score: number,
  headlines: string[],
) {
  if (analysisInFlight) return; // one at a time
  analysisInFlight = true;

  try {
    const headlinesList = headlines.slice(0, 8).join('\n- ');

    const prompt = `The threat assessment level has shifted from ${fromState} to ${toState} (score: ${score}/100).

Recent intelligence headlines:
- ${headlinesList || 'No specific headlines available'}

Write a 2-3 sentence operational analysis explaining what likely caused this shift. Be specific about the type of events (geopolitical, economic, market-related). Write in a terse military/intelligence briefing style. No preamble.`;

    const analysis = await callGrokAnalysis(prompt, {
      system: 'You are an intelligence analyst in a Bitcoin-focused operations room. You write terse, specific threat assessments in operational language. Never be vague. Reference specific event types.',
      maxTokens: 200,
    });

    if (!analysis) {
      console.error('[threat-score] Grok analysis returned null');
      return;
    }

    // Persist — append to rolling buffer of last 6 analyses
    const cache = await readCache();
    const existingAnalyses = cache?.analyses || [];

    const newAnalysis: CachedAnalysis = {
      fromState,
      toState,
      score,
      analysis,
      timestamp: Date.now(),
      headlines: headlines.slice(0, 5),
    };

    const updatedAnalyses = [...existingAnalyses, newAnalysis].slice(-MAX_ANALYSES);

    await writeCache({
      state: toState,
      score,
      updatedAt: Date.now(),
      analyses: updatedAnalyses,
    });

    console.log(`[threat-score] Analysis generated: ${fromState} -> ${toState} (${score})`);
  } catch (err) {
    console.error('[threat-score] Analysis generation failed:', err);
  } finally {
    analysisInFlight = false;
  }
}

// ── Initialise prevState from DB on cold start ────────────────────────────────
let stateInitialised = false;

async function initialisePrevState() {
  if (stateInitialised) return;
  stateInitialised = true;
  try {
    const cache = await readCache();
    if (cache?.state) {
      prevState = cache.state as ThreatState;
    }
  } catch { /* use default QUIET */ }
}

export async function GET() {
  const now = Date.now();

  // Ensure prevState is loaded from DB on first call
  await initialisePrevState();

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

    const { score, state, rawScore } = computeDecayedScore(events, now);

    // Count events per severity tier so the diagnostic output reveals
    // whether a high score is driven by a handful of shocks or a flood of
    // lower-tier chatter.
    const tierCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const e of events) {
      if (e.tier >= 1 && e.tier <= 4) tierCounts[e.tier as 1 | 2 | 3 | 4]++;
    }

    // ── State transition detection ────────────────────────────────────────
    if (state !== prevState) {
      const recentHeadlines = headlines
        .slice(0, 12)
        .map((h) => h.title);

      // Fire-and-forget — don't block the response
      triggerAnalysis(prevState, state, score, recentHeadlines);
      prevState = state;
    }

    cachedResult = { score, state, rawScore, eventCount: events.length, tierCounts };
    cachedAt = now;

    return NextResponse.json(cachedResult);
  } catch {
    return NextResponse.json(cachedResult ?? { score: 0, state: 'QUIET', rawScore: 0, eventCount: 0, tierCounts: { 1: 0, 2: 0, 3: 0, 4: 0 } });
  }
}
