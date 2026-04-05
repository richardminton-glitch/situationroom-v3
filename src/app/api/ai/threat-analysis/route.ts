/**
 * GET  /api/ai/threat-analysis — returns cached threat state + last 3 analyses
 * POST /api/ai/threat-analysis — generates a new analysis and persists it
 *
 * Uses signalAnnotation table with panelId='threat-state' to persist the
 * current threat level and a rolling buffer of the last 3 AI analyses.
 * This means users see previous analyses instantly when entering the room.
 */

import { NextRequest, NextResponse } from 'next/server';
import { callGrokAnalysis } from '@/lib/grok/analysis';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const PANEL_ID = 'threat-state';
const VALUE_KEY = 'current';
const MAX_ANALYSES = 3;

// In-memory rate guard — prevent duplicate calls within 10s
let lastCallKey = '';
let lastCallTime = 0;
const RATE_GUARD_MS = 10_000;

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
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await (prisma as any).signalAnnotation.upsert({
    where: { panelId_valueKey: { panelId: PANEL_ID, valueKey: VALUE_KEY } },
    create: { panelId: PANEL_ID, valueKey: VALUE_KEY, annotation, expiresAt },
    update: { annotation, expiresAt, generatedAt: new Date() },
  });
}

// ── GET — return cached threat state ─────────────────────────────────────────

export async function GET() {
  const cache = await readCache();

  if (cache) {
    return NextResponse.json({
      state: cache.state,
      score: cache.score,
      updatedAt: cache.updatedAt,
      analyses: cache.analyses,
    });
  }

  return NextResponse.json({
    state: 'QUIET',
    score: 0,
    updatedAt: null,
    analyses: [],
  });
}

// ── POST — generate analysis and persist ─────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromState, toState, score, recentHeadlines } = body;

    if (!fromState || !toState) {
      return NextResponse.json({ error: 'Missing state parameters' }, { status: 400 });
    }

    // Rate guard — deduplicate rapid identical calls
    const callKey = `${fromState}-${toState}-${score}`;
    if (callKey === lastCallKey && (Date.now() - lastCallTime) < RATE_GUARD_MS) {
      // Return the last cached analysis for this transition
      const cache = await readCache();
      const lastMatch = cache?.analyses.findLast(
        (a) => a.fromState === fromState && a.toState === toState
      );
      if (lastMatch) {
        return NextResponse.json({ analysis: lastMatch.analysis, cached: true });
      }
    }
    lastCallKey = callKey;
    lastCallTime = Date.now();

    const headlinesList = (recentHeadlines || []).slice(0, 8).join('\n- ');

    const prompt = `The threat assessment level has shifted from ${fromState} to ${toState} (score: ${score}/100).

Recent intelligence headlines:
- ${headlinesList || 'No specific headlines available'}

Write a 2-3 sentence operational analysis explaining what likely caused this shift. Be specific about the type of events (geopolitical, economic, market-related). Write in a terse military/intelligence briefing style. No preamble.`;

    const analysis = await callGrokAnalysis(prompt, {
      system: 'You are an intelligence analyst in a Bitcoin-focused operations room. You write terse, specific threat assessments in operational language. Never be vague. Reference specific event types.',
      maxTokens: 200,
    });

    if (!analysis) {
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
    }

    // Persist to DB — append to rolling buffer of last 3 analyses
    const cache = await readCache();
    const existingAnalyses = cache?.analyses || [];

    const newAnalysis: CachedAnalysis = {
      fromState,
      toState,
      score,
      analysis,
      timestamp: Date.now(),
      headlines: (recentHeadlines || []).slice(0, 5),
    };

    const updatedAnalyses = [...existingAnalyses, newAnalysis].slice(-MAX_ANALYSES);

    await writeCache({
      state: toState,
      score,
      updatedAt: Date.now(),
      analyses: updatedAnalyses,
    });

    return NextResponse.json({ analysis, cached: false });
  } catch (err) {
    console.error('[ThreatAnalysis] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
