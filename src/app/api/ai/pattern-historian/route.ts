import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasAccess } from '@/lib/auth/tier';
import { checkAiRateLimit, incrementAiUsage } from '@/lib/auth/rate-limit';
import { prisma } from '@/lib/db';
import { callGrokAnalysisJSON } from '@/lib/grok/analysis';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

const TTL_HOURS = 24;

const SUPPORTED_PATTERNS = new Set([
  'hash-ribbon-crossover',
  'mvrv-reset',
  'puell-capitulation',
  'sopr-recovery',
  'fear-greed-extreme',
]);

interface PatternResponse {
  historicalContext: string;
  medianReturn30d: string;
  medianReturn90d: string;
  medianReturn180d: string;
  caveats: string;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildPrompt(patternName: string, currentData: Record<string, number | string>): string {
  const dataFormatted = Object.entries(currentData)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');

  return `You are a Bitcoin on-chain historian. The pattern "${patternName}" has just fired with the following data:
${dataFormatted}

Drawing on Bitcoin's historical price and on-chain data (2013-present), provide:
1. When this pattern last fired and what happened (2-3 sentences)
2. Estimated median returns 30/90/180 days after this pattern historically (give specific % ranges, acknowledge uncertainty)
3. What makes the current macro context different (1-2 sentences)

Output ONLY valid JSON matching this exact schema:
{ "historicalContext": "...", "medianReturn30d": "...", "medianReturn90d": "...", "medianReturn180d": "...", "caveats": "..." }`;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userTier = (session.user.tier as Tier) ?? 'free';
  if (!hasAccess(userTier, 'members')) {
    return NextResponse.json({ error: 'Members tier required' }, { status: 403 });
  }

  let body: { patternName?: string; currentData?: Record<string, number | string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { patternName, currentData } = body;

  if (!patternName || !SUPPORTED_PATTERNS.has(patternName)) {
    return NextResponse.json(
      {
        error: 'Unsupported pattern',
        supported: Array.from(SUPPORTED_PATTERNS),
      },
      { status: 400 },
    );
  }

  if (!currentData || typeof currentData !== 'object') {
    return NextResponse.json({ error: 'currentData object is required' }, { status: 400 });
  }

  const panelId = `pattern-historian-${patternName}`;
  const valueKey = todayKey();

  // Cache check — TTL 24 hours
  const cached = await (prisma as any).signalAnnotation.findUnique({
    where: { panelId_valueKey: { panelId, valueKey } },
  });
  if (cached && cached.expiresAt > new Date()) {
    try {
      const parsed: PatternResponse = JSON.parse(cached.annotation);
      return NextResponse.json({ pattern: patternName, ...parsed });
    } catch {
      // Fall through to regenerate if cached annotation is malformed
    }
  }

  // Rate limit check
  const rateCheck = await checkAiRateLimit(session.user.id, userTier, session.user.email);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Daily AI limit reached', resetAt: rateCheck.resetAt }, { status: 429 });
  }

  // Generate via Grok
  const prompt = buildPrompt(patternName, currentData);
  const parsed = await callGrokAnalysisJSON<PatternResponse>(prompt, {
    maxTokens: 512,
    timeoutMs: 30_000,
  });

  if (!parsed) {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }

  await incrementAiUsage(session.user.id);

  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);
  const generatedAt = new Date();

  await (prisma as any).signalAnnotation.upsert({
    where: { panelId_valueKey: { panelId, valueKey } },
    create: { panelId, valueKey, annotation: JSON.stringify(parsed), expiresAt },
    update: { annotation: JSON.stringify(parsed), expiresAt, generatedAt },
  });

  return NextResponse.json({ pattern: patternName, ...parsed });
}
