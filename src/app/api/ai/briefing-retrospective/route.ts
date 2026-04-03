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

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userTier = (session.user.tier as Tier) ?? 'free';
  if (!hasAccess(userTier, 'general')) {
    return NextResponse.json({ error: 'General tier required' }, { status: 403 });
  }

  let body: { date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { date } = body;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date is required (YYYY-MM-DD)' }, { status: 400 });
  }

  // Fetch past briefing
  const pastBriefing = await prisma.briefing.findFirst({
    where: { date: new Date(date) },
  });
  if (!pastBriefing) {
    return NextResponse.json({ error: `No briefing found for ${date}` }, { status: 404 });
  }

  // Fetch most recent briefing
  const currentBriefing = await prisma.briefing.findFirst({ orderBy: { date: 'desc' } });
  if (!currentBriefing) {
    return NextResponse.json({ error: 'No current briefing available' }, { status: 503 });
  }

  const pastDate = pastBriefing.date.toISOString().slice(0, 10);
  const currentDate = currentBriefing.date.toISOString().slice(0, 10);

  const prompt = `You are reviewing Bitcoin intelligence briefings. Compare:

PAST BRIEFING (${pastDate}):
Headline: ${pastBriefing.headline}
Threat Level: ${pastBriefing.threatLevel}
Conviction: ${pastBriefing.convictionScore}/100
Outlook: ${pastBriefing.outlookSection}

CURRENT BRIEFING (${currentDate}):
Headline: ${currentBriefing.headline}
Threat Level: ${currentBriefing.threatLevel}
Conviction: ${currentBriefing.convictionScore}/100

Assess:
1. Whether the past outlook proved accurate, partially accurate, or was too early/inaccurate
2. What key developments changed the picture (1–2 sentences)
3. One lesson for reading Bitcoin signals from this comparison

Output ONLY valid JSON:
{ "pastSummary": "1-sentence summary of past briefing thesis", "retrospective": "2-3 sentence comparison", "accuracyAssessment": "accurate|partially-accurate|inaccurate|too-early", "lesson": "1 sentence lesson" }`;

  const msg = await getClient().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';

  let parsed: {
    pastSummary: string;
    retrospective: string;
    accuracyAssessment: 'accurate' | 'partially-accurate' | 'inaccurate' | 'too-early';
    lesson: string;
  };
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
  }

  return NextResponse.json(parsed);
}
