import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasAccess } from '@/lib/auth/tier';
import { prisma } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
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
  '1d–1w',
  '1w–1m',
  '1m–3m',
  '3m–6m',
  '6m–1yr',
  '1yr–2yr',
  '2yr–3yr',
  '3yr–5yr',
  '5yr+',
];

let _client: Anthropic | null = null;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildPrompt(latestBands: number[], totalBtc: number): string {
  const formatted = BAND_LABELS.map((label, i) => {
    const btc = latestBands[i] ?? 0;
    const pct = totalBtc > 0 ? ((btc / totalBtc) * 100).toFixed(2) : '0.00';
    return `  ${label}: ${pct}% (${btc.toLocaleString()} BTC)`;
  }).join('\n');

  return `You are a Bitcoin UTXO cohort analyst. Below is today's UTXO age band distribution (percentage of supply in each band):

${formatted}

Interpret:
1. Which cohorts are dominant (holding the most supply)
2. Recent changes in young vs old coin activity (1 sentence)
3. Whether this looks like accumulation, distribution, hodling, or capitulation
4. Confidence level (low/medium/high) in your assessment

Output ONLY valid JSON:
{ "analysis": "2-3 sentence analysis", "dominantCohort": "e.g. 1-2 year holders", "implication": "accumulation|distribution|hodling|capitulation", "confidence": "low|medium|high" }`;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userTier = (session.user.tier as Tier) ?? 'free';
  if (!hasAccess(userTier, 'members')) {
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

  // Fetch UTXO age data internally
  let latestBands: number[];
  let totalBtc: number;
  try {
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
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

  // Generate via Claude
  const prompt = buildPrompt(latestBands, totalBtc);
  let text: string;
  try {
    const client = getClient();
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });
    text = (msg.content[0] as { type: 'text'; text: string }).text.trim();
  } catch (err) {
    console.error('[cohort-analysis] Anthropic error:', err);
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }

  // Parse JSON response from Claude
  let parsed: CohortResponse;
  try {
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    console.error('[cohort-analysis] Failed to parse Claude JSON:', text);
    return NextResponse.json({ error: 'AI service returned invalid response' }, { status: 503 });
  }

  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);
  const generatedAt = new Date();

  await (prisma as any).signalAnnotation.upsert({
    where: { panelId_valueKey: { panelId: PANEL_ID, valueKey } },
    create: { panelId: PANEL_ID, valueKey, annotation: text, expiresAt },
    update: { annotation: text, expiresAt, generatedAt },
  });

  return NextResponse.json(parsed);
}
