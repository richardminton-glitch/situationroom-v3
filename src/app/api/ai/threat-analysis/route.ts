import { NextRequest, NextResponse } from 'next/server';
import { callGrokAnalysis } from '@/lib/grok/analysis';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Simple in-memory cache to avoid hammering the API
let lastAnalysis: { key: string; text: string; timestamp: number } | null = null;
const CACHE_TTL = 300_000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromState, toState, score, recentHeadlines } = body;

    if (!fromState || !toState) {
      return NextResponse.json({ error: 'Missing state parameters' }, { status: 400 });
    }

    // Check cache
    const cacheKey = `${fromState}-${toState}-${score}`;
    if (lastAnalysis && lastAnalysis.key === cacheKey && (Date.now() - lastAnalysis.timestamp) < CACHE_TTL) {
      return NextResponse.json({ analysis: lastAnalysis.text, cached: true });
    }

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

    // Cache result
    lastAnalysis = { key: cacheKey, text: analysis, timestamp: Date.now() };

    return NextResponse.json({ analysis, cached: false });
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
