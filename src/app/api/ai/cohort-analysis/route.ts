import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasAccess, isAdmin } from '@/lib/auth/tier';
import { checkAiRateLimit, incrementAiUsage } from '@/lib/auth/rate-limit';
import { prisma } from '@/lib/db';
import { callGrokAnalysisJSON } from '@/lib/grok/analysis';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

const PANEL_ID = 'cohort-analysis';
const TTL_HOURS = 6;

interface AgeBandPoint {
  date: string;
  bands: number[];
}

interface CohortResponse {
  analysis: string;
  dominantCohort: string;
  implication: 'accumulation' | 'distribution' | 'hodling' | 'capitulation';
  confidence: 'low' | 'medium' | 'high';
}

const BAND_LABELS = [
  '<1d',
  '1d-1w',
  '1w-1m',
  '1m-3m',
  '3m-6m',
  '6m-1yr',
  '1yr-2yr',
  '2yr-3yr',
  '3yr-5yr',
  '5yr+',
];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildPrompt(latestBands: number[], totalBtc: number): string {
  const formatted = BAND_LABELS.map((label, i) => {
    const btc = latestBands[i] ?? 0;
    const pct = totalBtc > 0 ? ((btc / totalBtc) * 100).toFixed(2) : '0.00';
    return `  ${label}: ${pct}% (${btc.toLocaleString()} BTC)`;
  }).join('\n');

  const today = new Date().toISOString().slice(0, 10);

  return `You are a Bitcoin UTXO cohort analyst. Today's date is ${today}. Below is today's LIVE UTXO age band distribution (percentage of supply in each band):

${formatted}

Interpret:
1. Which cohorts are dominant (holding the most supply)
2. Recent changes in young vs old coin activity (1 sentence)
3. Whether this looks like accumulation, distribution, hodling, or capitulation
4. Confidence level (low/medium/high) in your assessment

Output ONLY valid JSON:
{ "analysis": "2-3 sentence analysis", "dominantCohort": "e.g. 1-2 year holders", "implication": "accumulation|distribution|hodling|capitulation", "confidence": "low|medium|high" }`;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userTier = (session.user.tier as Tier) ?? 'free';
  if (!isAdmin(session.user.email) && !hasAccess(userTier, 'members')) {
    return NextResponse.json({ error: 'Members tier required' }, { status: 403 });
  }

  const valueKey = todayKey();

  // Cache check — TTL 6 hours
  const cached = await (prisma as any).signalAnnotation.findUnique({
    where: { panelId_valueKey: { panelId: PANEL_ID, valueKey } },
  });
  if (cached && cached.expiresAt > new Date()) {
    try {
      const parsed: CohortResponse = JSON.parse(cached.annotation);
      return NextResponse.json(parsed);
    } catch {
      // Fall through to regenerate
    }
  }

  // Rate limit check
  const rateCheck = await checkAiRateLimit(session.user.id, userTier, session.user.email);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Daily AI limit reached', resetAt: rateCheck.resetAt }, { status: 429 });
  }

  // Fetch UTXO age data internally
  let latestBands: number[];
  let totalBtc: number;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `http://localhost:${process.env.PORT ?? '3000'}`;
    const res = await fetch(`${baseUrl}/api/data/utxo-age?days=7`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`utxo-age HTTP ${res.status}`);

    const data: AgeBandPoint[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('utxo-age returned empty data');
    }

    // Use the most recent day's bands
    const latest = data[data.length - 1];
    latestBands = latest.bands;
    totalBtc = latestBands.reduce((sum, v) => sum + (v ?? 0), 0);
  } catch (err) {
    console.error('[cohort-analysis] Failed to fetch utxo-age:', err);
    return NextResponse.json({ error: 'Unable to retrieve UTXO data' }, { status: 503 });
  }

  // Generate via Grok
  const prompt = buildPrompt(latestBands, totalBtc);
  const parsed = await callGrokAnalysisJSON<CohortResponse>(prompt, {
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
    where: { panelId_valueKey: { panelId: PANEL_ID, valueKey } },
    create: { panelId: PANEL_ID, valueKey, annotation: JSON.stringify(parsed), expiresAt },
    update: { annotation: JSON.stringify(parsed), expiresAt, generatedAt },
  });

  return NextResponse.json(parsed);
}
