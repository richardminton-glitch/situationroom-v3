import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasAccess } from '@/lib/auth/tier';
import { prisma } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

let _client: Anthropic | null = null;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userTier = (session.user.tier as Tier) ?? 'free';
  if (!hasAccess(userTier, 'general')) {
    return NextResponse.json({ error: 'General tier required' }, { status: 403 });
  }

  const panelId = 'bitcoin-argument';
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Cache check — TTL 12 hours
  const cached = await (prisma as any).signalAnnotation.findUnique({
    where: { panelId_valueKey: { panelId, valueKey: today } },
  });
  if (cached && cached.expiresAt > new Date()) {
    const parsed = JSON.parse(cached.annotation);
    return NextResponse.json({ ...parsed, updatedAt: cached.generatedAt, cached: true });
  }

  // Fetch latest briefing
  const briefing = await prisma.briefing.findFirst({ orderBy: { date: 'desc' } });
  if (!briefing) {
    return NextResponse.json({ error: 'No briefing data available' }, { status: 503 });
  }

  const prompt = `You are a thoughtful Bitcoin analyst writing for intelligent skeptics. Based on today's data:

Macro context: ${briefing.macroSection}
Network health: ${briefing.networkSection}
Threat level: ${briefing.threatLevel}
Conviction score: ${briefing.convictionScore}/100

Construct a 3-point case FOR holding Bitcoin right now, grounded in the actual data above. Each point should be 1–2 sentences. Then provide a 1-sentence honest counterpoint — what could prove this wrong.

Output ONLY valid JSON:
{ "points": [{"title": "...", "body": "..."}, ...], "counterpoint": "..." }`;

  const msg = await getClient().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';

  let parsed: { points: Array<{ title: string; body: string }>; counterpoint: string };
  try {
    // Strip potential markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
  }

  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
  const annotation = JSON.stringify(parsed);

  await (prisma as any).signalAnnotation.upsert({
    where: { panelId_valueKey: { panelId, valueKey: today } },
    create: { panelId, valueKey: today, annotation, expiresAt },
    update: { annotation, expiresAt, generatedAt: new Date() },
  });

  return NextResponse.json({ ...parsed, updatedAt: new Date().toISOString(), cached: false });
}
