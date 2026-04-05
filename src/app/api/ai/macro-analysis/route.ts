/**
 * POST /api/ai/macro-analysis
 *
 * VIP-only Grok-3 deep dive analysis of all macro indicators.
 * Fetches live data from every macro endpoint, builds a comprehensive
 * prompt, and returns an expert macro-economic analysis with Bitcoin
 * implications and accumulation guidance.
 *
 * Cache: 6 hours. VIP users can force-refresh once per 6-hour window;
 * any call inside that window returns the cached version.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasAccess } from '@/lib/auth/tier';
import { checkAiRateLimit, incrementAiUsage } from '@/lib/auth/rate-limit';
import { prisma } from '@/lib/db';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PANEL_ID = 'macro-deep-analysis';
const TTL_HOURS = 6;

// ── Grok-3 direct call ─────────────────────────────────────────────────────

const GROK_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = 'grok-3';

async function callGrok3(prompt: string): Promise<string | null> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(GROK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a senior macro-economic analyst and Bitcoin strategist. You combine central bank policy, bond yields, equity indices, commodities, FX movements, inflation data, and global money supply to assess how the macro environment affects Bitcoin. Be direct, quantitative, and decisive. Never hedge excessively — give clear directional assessments backed by the data.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1200,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error(`[MacroAnalysis] Grok-3 HTTP ${res.status}: ${err.substring(0, 300)}`);
      return null;
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.error('[MacroAnalysis] Grok-3 request failed:', err);
    return null;
  }
}

// ── Internal data fetchers ──────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Snapshot — BTC price, F&G, DXY, VIX, etc.
interface SnapshotData {
  btcPrice: number;
  btc24hPct: number;
  fearGreed: { value: number; classification: string };
  sp500: number;
  vix: number;
  gold: number;
  dxy: number;
  us10y: number;
  oil: number;
}

// Central bank assets (balance sheets)
interface CBAssetSeries {
  label: string;
  data: { date: string; value: number }[];
}

// Central bank rates
interface CBRateSeries {
  label: string;
  data: { date: string; value: number }[];
}

// Inflation data
interface InflationSeries {
  country: string;
  data: { date: string; value: number }[];
}

// M2 money supply
interface M2Series {
  label: string;
  data: { date: string; value: number }[];
}

// Market indices
interface MarketIndex {
  name: string;
  price: number;
  change_pct: number;
}

// Commodities
interface Commodity {
  name: string;
  price: number;
  change_pct: number;
}

function cacheKey(): string {
  const now = new Date();
  const window = Math.floor(now.getUTCHours() / 6) * 6;
  return `${now.toISOString().slice(0, 10)}-${String(window).padStart(2, '0')}`;
}

function buildPrompt(
  snapshot: SnapshotData | null,
  cbAssets: CBAssetSeries[] | null,
  cbRates: CBRateSeries[] | null,
  inflation: InflationSeries[] | null,
  m2: M2Series[] | null,
  indices: MarketIndex[] | null,
  commodities: Commodity[] | null,
): string {
  const today = new Date().toISOString().slice(0, 10);
  const sections: string[] = [];

  if (snapshot) {
    sections.push(`MARKET SNAPSHOT:
- BTC Price: $${snapshot.btcPrice?.toLocaleString() ?? '—'}
- BTC 24h Change: ${snapshot.btc24hPct?.toFixed(2) ?? '—'}%
- Fear & Greed: ${snapshot.fearGreed?.value ?? '—'} (${snapshot.fearGreed?.classification ?? '—'})
- S&P 500: ${snapshot.sp500?.toLocaleString() ?? '—'}
- VIX: ${snapshot.vix?.toFixed(2) ?? '—'}
- Gold: $${snapshot.gold?.toFixed(0) ?? '—'}
- DXY: ${snapshot.dxy?.toFixed(2) ?? '—'}
- US 10Y Yield: ${snapshot.us10y?.toFixed(2) ?? '—'}%
- Oil (WTI): $${snapshot.oil?.toFixed(2) ?? '—'}`);
  }

  if (indices && indices.length > 0) {
    const rows = indices.map((i) => `  ${i.name}: ${i.price?.toLocaleString()} (${i.change_pct >= 0 ? '+' : ''}${i.change_pct?.toFixed(2)}%)`);
    sections.push(`EQUITY INDICES:\n${rows.join('\n')}`);
  }

  if (commodities && commodities.length > 0) {
    const rows = commodities.map((c) => `  ${c.name}: $${c.price?.toFixed(2)} (${c.change_pct >= 0 ? '+' : ''}${c.change_pct?.toFixed(2)}%)`);
    sections.push(`COMMODITIES:\n${rows.join('\n')}`);
  }

  if (cbRates && cbRates.length > 0) {
    const latestRates = cbRates.map((s) => {
      const latest = s.data?.[s.data.length - 1];
      return latest ? `  ${s.label}: ${latest.value?.toFixed(2)}%` : null;
    }).filter(Boolean);
    if (latestRates.length > 0) {
      sections.push(`CENTRAL BANK POLICY RATES:\n${latestRates.join('\n')}`);
    }
  }

  if (cbAssets && cbAssets.length > 0) {
    const assetRows = cbAssets.map((s) => {
      const latest = s.data?.[s.data.length - 1];
      const yearAgo = s.data?.find((d) => d.date <= new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10));
      const yoyChange = latest && yearAgo ? ((latest.value - yearAgo.value) / yearAgo.value * 100).toFixed(1) : '—';
      return latest ? `  ${s.label}: $${(latest.value / 1e12).toFixed(2)}T (YoY: ${yoyChange}%)` : null;
    }).filter(Boolean);
    if (assetRows.length > 0) {
      sections.push(`CENTRAL BANK BALANCE SHEETS:\n${assetRows.join('\n')}`);
    }
  }

  if (inflation && inflation.length > 0) {
    const inflRows = inflation.map((s) => {
      const latest = s.data?.[s.data.length - 1];
      return latest ? `  ${s.country}: ${latest.value?.toFixed(1)}%` : null;
    }).filter(Boolean);
    if (inflRows.length > 0) {
      sections.push(`INFLATION (CPI YoY):\n${inflRows.join('\n')}`);
    }
  }

  if (m2 && m2.length > 0) {
    const m2Rows = m2.map((s) => {
      const latest = s.data?.[s.data.length - 1];
      const sixMonthsAgo = s.data && s.data.length > 6 ? s.data[s.data.length - 7] : null;
      const change = latest && sixMonthsAgo ? ((latest.value - sixMonthsAgo.value) / sixMonthsAgo.value * 100).toFixed(1) : '—';
      return latest ? `  ${s.label}: $${(latest.value / 1e12).toFixed(2)}T (6m change: ${change}%)` : null;
    }).filter(Boolean);
    if (m2Rows.length > 0) {
      sections.push(`GLOBAL M2 MONEY SUPPLY:\n${m2Rows.join('\n')}`);
    }
  }

  return `Date: ${today}

You are reviewing the COMPLETE live macro dashboard for Bitcoin. Below are today's readings from every macro indicator available.

${sections.join('\n\n')}

Provide a comprehensive deep-dive analysis covering:

1. **MONETARY POLICY REGIME** — Assess the current global monetary policy stance. Are central banks tightening, pausing, or easing? How do balance sheet trends and rate paths affect liquidity conditions for risk assets?

2. **LIQUIDITY & M2** — Analyse global money supply trends. Is M2 expanding or contracting? What does this mean for Bitcoin's historical correlation with global liquidity?

3. **RISK APPETITE** — Using equity indices, VIX, and Fear & Greed together, assess current market risk appetite. Is the environment risk-on or risk-off? How does this position Bitcoin?

4. **DOLLAR & YIELDS** — Analyse DXY and US 10Y yield trends. A strong dollar and rising yields typically pressure BTC — what is the current setup?

5. **COMMODITIES & INFLATION** — What do gold, oil, and inflation readings tell us about real yield expectations and the inflation hedge narrative for Bitcoin?

6. **BITCOIN MACRO OUTLOOK** — Based on all the above, provide:
   - Short-term (1-2 weeks): how macro conditions favour or pressure BTC
   - Medium-term (1-3 months): key macro catalysts and risks
   - Accumulation guidance: is the macro backdrop favourable for adding BTC exposure?

Write in a direct, intelligence-briefing style. Use specific numbers from the data. 500-700 words. Do not pad with disclaimers.`;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userTier = (session.user.tier as Tier) ?? 'free';
  if (!hasAccess(userTier, 'vip')) {
    return NextResponse.json({ error: 'VIP access required' }, { status: 403 });
  }

  const valueKey = cacheKey();

  // ── Cache check — 6-hour TTL ────────────────────────────────────────────
  const cached = await (prisma as any).signalAnnotation.findUnique({
    where: { panelId_valueKey: { panelId: PANEL_ID, valueKey } },
  });

  if (cached && (cached as { expiresAt: Date }).expiresAt > new Date()) {
    return NextResponse.json({
      analysis: cached.annotation,
      cachedAt: cached.generatedAt.toISOString(),
      expiresAt: (cached as { expiresAt: Date }).expiresAt.toISOString(),
      fromCache: true,
    });
  }

  // ── Rate limit ──────────────────────────────────────────────────────────
  const rateCheck = await checkAiRateLimit(session.user.id, userTier, session.user.email);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Daily AI limit reached', resetAt: rateCheck.resetAt }, { status: 429 });
  }

  // ── Fetch all macro data in parallel ────────────────────────────────────
  const [snapshot, cbAssets, cbRates, inflation, m2, indices, commodities] = await Promise.all([
    fetchJSON<SnapshotData>('/api/data/snapshot'),
    fetchJSON<CBAssetSeries[]>('/api/data/cbassets'),
    fetchJSON<CBRateSeries[]>('/api/data/cbrates'),
    fetchJSON<InflationSeries[]>('/api/data/inflation'),
    fetchJSON<M2Series[]>('/api/data/m2'),
    fetchJSON<MarketIndex[]>('/api/data/charts?type=indices'),
    fetchJSON<Commodity[]>('/api/data/charts?type=commodities'),
  ]);

  const prompt = buildPrompt(snapshot, cbAssets, cbRates, inflation, m2, indices, commodities);
  const text = await callGrok3(prompt);

  if (!text) {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }

  await incrementAiUsage(session.user.id);

  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);
  const generatedAt = new Date();

  await (prisma as any).signalAnnotation.upsert({
    where: { panelId_valueKey: { panelId: PANEL_ID, valueKey } },
    create: { panelId: PANEL_ID, valueKey, annotation: text, expiresAt },
    update: { annotation: text, expiresAt, generatedAt },
  });

  return NextResponse.json({
    analysis: text,
    cachedAt: generatedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    fromCache: false,
  });
}
