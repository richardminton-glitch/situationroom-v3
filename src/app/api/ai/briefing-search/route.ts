/**
 * POST /api/ai/briefing-search
 *
 * Natural language search across the briefing archive.
 * VIP only. Returns matching briefings + AI-synthesised pattern observation.
 *
 * Body: { query: string }
 * Returns: { matches: BriefingMatch[], synthesis: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { hasAccess } from '@/lib/auth/tier';
import { prisma } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
import type { Tier } from '@/types';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

// Simple in-memory cache: queryHash → { result, ts }
const cache = new Map<string, { result: object; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24hr

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const userTier = (user.tier as Tier) ?? 'free';
  if (!hasAccess(userTier, 'vip')) {
    return NextResponse.json({ error: 'VIP tier required' }, { status: 403 });
  }

  const { query } = await request.json();
  if (!query || typeof query !== 'string' || query.trim().length < 3) {
    return NextResponse.json({ error: 'Query must be at least 3 characters' }, { status: 400 });
  }

  const trimmedQuery = query.trim().slice(0, 200);

  // Check cache
  const cacheKey = trimmedQuery.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.result);
  }

  try {
    // Fetch all briefings (up to 90 days) with full content for search
    const briefings = await prisma.briefing.findMany({
      select: {
        date: true,
        headline: true,
        threatLevel: true,
        convictionScore: true,
        marketSection: true,
        networkSection: true,
        geopoliticalSection: true,
        macroSection: true,
        outlookSection: true,
        dataSnapshotJson: true,
      },
      orderBy: { date: 'desc' },
      take: 90,
    });

    if (briefings.length === 0) {
      return NextResponse.json({ matches: [], synthesis: 'No briefings available to search.' });
    }

    // Build compressed archive for Claude context
    const archiveSummary = briefings.map((b) => {
      const dateStr = b.date.toISOString().split('T')[0];
      let snapshot = '';
      try {
        const data = JSON.parse(b.dataSnapshotJson);
        const parts: string[] = [];
        if (data.btcPrice) parts.push(`BTC:$${Math.round(data.btcPrice)}`);
        if (data.fearGreed) parts.push(`F&G:${data.fearGreed}`);
        if (data.hashrateEH) parts.push(`HR:${data.hashrateEH.toFixed(0)}EH`);
        if (data.mvrv) parts.push(`MVRV:${data.mvrv.toFixed(2)}`);
        if (data.convictionScore) parts.push(`Conv:${data.convictionScore}`);
        snapshot = parts.join(' ');
      } catch { /* skip */ }

      return `[${dateStr}] THREAT:${b.threatLevel} CONV:${Math.round(b.convictionScore)} ${snapshot}
HEADLINE: ${b.headline}
MARKET: ${(b.marketSection || '').slice(0, 300)}
NETWORK: ${(b.networkSection || '').slice(0, 200)}
GEO: ${(b.geopoliticalSection || '').slice(0, 200)}
MACRO: ${(b.macroSection || '').slice(0, 200)}
OUTLOOK: ${(b.outlookSection || '').slice(0, 200)}`;
    }).join('\n---\n');

    const client = getClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system: `You are Situation Room's briefing archive analyst. You search through daily Bitcoin & macro intelligence briefings to answer user queries.

Rules:
- Return ONLY relevant briefing dates, key data points, and a concise synthesis
- If the query asks "when was X last this low/high", find the specific date and reading
- If asking about patterns, identify recurring themes across briefings
- Be precise with dates and numbers
- Keep synthesis under 150 words
- Format matches as structured data the client can render
- If no briefings match, say so clearly`,
      messages: [{
        role: 'user',
        content: `BRIEFING ARCHIVE (${briefings.length} days):\n\n${archiveSummary}\n\n---\n\nUSER QUERY: "${trimmedQuery}"\n\nRespond with JSON only:\n{\n  "matches": [\n    { "date": "YYYY-MM-DD", "headline": "...", "relevance": "1-sentence reason this matches", "keyData": "relevant metric values" }\n  ],\n  "synthesis": "Cross-briefing observation answering the query (max 150 words)"\n}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse Claude's JSON response
    let parsed;
    try {
      // Extract JSON from possible markdown code blocks
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { matches: [], synthesis: text };
    } catch {
      parsed = { matches: [], synthesis: text };
    }

    const result = {
      matches: (parsed.matches || []).slice(0, 10),
      synthesis: parsed.synthesis || 'No pattern identified.',
      queryUsed: trimmedQuery,
      briefingsSearched: briefings.length,
    };

    // Cache result
    cache.set(cacheKey, { result, ts: Date.now() });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[briefing-search]', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
