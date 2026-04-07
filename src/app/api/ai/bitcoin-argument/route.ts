import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasAccess, isAdmin } from '@/lib/auth/tier';
import { checkAiRateLimit, incrementAiUsage } from '@/lib/auth/rate-limit';
import { prisma } from '@/lib/db';
import { callGrokAnalysisJSON } from '@/lib/grok/analysis';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userTier = (session.user.tier as Tier) ?? 'free';
  if (!isAdmin(session.user.email) && !hasAccess(userTier, 'members')) {
    return NextResponse.json({ error: 'Members tier required' }, { status: 403 });
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

  // Rate limit check
  const rateCheck = await checkAiRateLimit(session.user.id, userTier, session.user.email);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Daily AI limit reached', resetAt: rateCheck.resetAt }, { status: 429 });
  }

  // Fetch latest briefing
  const briefing = await prisma.briefing.findFirst({ orderBy: { date: 'desc' } });
  if (!briefing) {
    return NextResponse.json({ error: 'No briefing data available' }, { status: 503 });
  }

  const prompt = `You are a thoughtful Bitcoin analyst writing for intelligent skeptics. Today's date is ${today}. Based on today's LIVE data:

Macro context: ${briefing.macroSection}
Network health: ${briefing.networkSection}
Threat level: ${briefing.threatLevel}
Conviction score: ${briefing.convictionScore}/100

Construct a 3-point case FOR holding Bitcoin right now, grounded in the actual data above. Each point should be 1-2 sentences. Then provide a 1-sentence honest counterpoint — what could prove this wrong. All references must be current as of ${today}.

Output ONLY valid JSON:
{ "points": [{"title": "...", "body": "..."}, ...], "counterpoint": "..." }`;

  const parsed = await callGrokAnalysisJSON<{ points: Array<{ title: string; body: string }>; counterpoint: string }>(prompt, {
    maxTokens: 600,
  });

  if (!parsed) {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
  }

  await incrementAiUsage(session.user.id);

  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
  const annotation = JSON.stringify(parsed);

  await (prisma as any).signalAnnotation.upsert({
    where: { panelId_valueKey: { panelId, valueKey: today } },
    create: { panelId, valueKey: today, annotation, expiresAt },
    update: { annotation, expiresAt, generatedAt: new Date() },
  });

  return NextResponse.json({ ...parsed, updatedAt: new Date().toISOString(), cached: false });
}
