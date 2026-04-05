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

const BASE = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Actual API response types (matching what the endpoints really return) ──

// /api/data/snapshot — nested object
interface TickerData {
  name: string;
  price: number;
  changePct: number;
}
interface CentralBankRate {
  country: string;
  rate: number;
  lastUpdated: string;
}
interface SnapshotResponse {
  btcMarket: { price: number; change24h: number; change7d: number; change30d: number; marketCap: number; volume24h: number } | null;
  fearGreed: { value: number; classification: string } | null;
  indices: Record<string, TickerData> | null;
  commodities: Record<string, TickerData> | null;
  fx: Record<string, TickerData> | null;
  rates: CentralBankRate[] | null;
  timestamp: number;
}

// /api/data/cbassets — Record keyed by bank name
type CBAssetsResponse = Record<string, { year: number; value: number }[]>;

// /api/data/cbrates — Record keyed by bank name
type CBRatesResponse = Record<string, { time: number; value: number }[]>;

// /api/data/inflation — Record keyed by country
type InflationResponse = Record<string, { time: number; value: number }[]>;

// /api/data/m2 — Record keyed by country (values indexed to 100)
type M2Response = Record<string, { time: number; value: number }[]>;


function cacheKey(): string {
  const now = new Date();
  const window = Math.floor(now.getUTCHours() / 6) * 6;
  return `${now.toISOString().slice(0, 10)}-${String(window).padStart(2, '0')}`;
}

function buildPrompt(
  snapshot: SnapshotResponse | null,
  cbAssets: CBAssetsResponse | null,
  cbRates: CBRatesResponse | null,
  inflation: InflationResponse | null,
  m2: M2Response | null,
): string {
  const today = new Date().toISOString().slice(0, 10);
  const sections: string[] = [];

  // ── Market Snapshot (from /api/data/snapshot) ──
  if (snapshot) {
    const btc = snapshot.btcMarket;
    const fg = snapshot.fearGreed;
    const sp500 = snapshot.indices?.sp500;
    const vix = snapshot.indices?.vix;
    const gold = snapshot.commodities?.gold;
    const dxy = snapshot.commodities?.dxy;
    const us10y = snapshot.commodities?.us10y;
    const oil = snapshot.commodities?.['crude-oil'];

    const rows: string[] = [];
    if (btc) {
      rows.push(`- BTC Price: $${btc.price?.toLocaleString() ?? '—'}`);
      rows.push(`- BTC 24h Change: ${btc.change24h?.toFixed(2) ?? '—'}%`);
    }
    if (fg) rows.push(`- Fear & Greed: ${fg.value} (${fg.classification})`);
    if (sp500) rows.push(`- S&P 500: ${sp500.price?.toLocaleString()} (${sp500.changePct >= 0 ? '+' : ''}${sp500.changePct?.toFixed(2)}%)`);
    if (vix) rows.push(`- VIX: ${vix.price?.toFixed(2)}`);
    if (gold) rows.push(`- Gold: $${gold.price?.toFixed(0)} (${gold.changePct >= 0 ? '+' : ''}${gold.changePct?.toFixed(2)}%)`);
    if (dxy) rows.push(`- DXY: ${dxy.price?.toFixed(2)} (${dxy.changePct >= 0 ? '+' : ''}${dxy.changePct?.toFixed(2)}%)`);
    if (us10y) rows.push(`- US 10Y Yield: ${us10y.price?.toFixed(2)}%`);
    if (oil) rows.push(`- Oil (WTI): $${oil.price?.toFixed(2)} (${oil.changePct >= 0 ? '+' : ''}${oil.changePct?.toFixed(2)}%)`);

    if (rows.length > 0) sections.push(`MARKET SNAPSHOT:\n${rows.join('\n')}`);
  }

  // ── Equity Indices (from snapshot.indices) ──
  if (snapshot?.indices) {
    const idx = snapshot.indices;
    const indexRows = Object.entries(idx).map(([, data]) =>
      `  ${data.name}: ${data.price?.toLocaleString()} (${data.changePct >= 0 ? '+' : ''}${data.changePct?.toFixed(2)}%)`
    );
    if (indexRows.length > 0) sections.push(`EQUITY INDICES:\n${indexRows.join('\n')}`);
  }

  // ── Commodities (from snapshot.commodities) ──
  if (snapshot?.commodities) {
    const comms = snapshot.commodities;
    const commRows = Object.entries(comms)
      .filter(([key]) => !['dxy', 'us10y', 'us2y'].includes(key)) // yields/DXY shown in snapshot
      .map(([, data]) =>
        `  ${data.name}: $${data.price?.toFixed(2)} (${data.changePct >= 0 ? '+' : ''}${data.changePct?.toFixed(2)}%)`
      );
    if (commRows.length > 0) sections.push(`COMMODITIES:\n${commRows.join('\n')}`);
  }

  // ── FX Pairs (from snapshot.fx) ──
  if (snapshot?.fx) {
    const fxRows = Object.entries(snapshot.fx).map(([, data]) =>
      `  ${data.name}: ${data.price?.toFixed(4)} (${data.changePct >= 0 ? '+' : ''}${data.changePct?.toFixed(2)}%)`
    );
    if (fxRows.length > 0) sections.push(`FX PAIRS:\n${fxRows.join('\n')}`);
  }

  // ── Live Central Bank Rates (from snapshot.rates) ──
  if (snapshot?.rates && Array.isArray(snapshot.rates) && snapshot.rates.length > 0) {
    const rateRows = snapshot.rates.map((r) =>
      `  ${r.country}: ${r.rate?.toFixed(2)}% (updated: ${r.lastUpdated})`
    );
    sections.push(`CENTRAL BANK POLICY RATES (current):\n${rateRows.join('\n')}`);
  }

  // ── Historical CB Rates (from /api/data/cbrates — FRED) ──
  if (cbRates && typeof cbRates === 'object') {
    const historicalRows: string[] = [];
    for (const [bank, series] of Object.entries(cbRates)) {
      if (!Array.isArray(series) || series.length === 0) continue;
      const latest = series[series.length - 1];
      // Find value from ~1 year ago
      const oneYearAgoMs = Date.now() - 365 * 86400_000;
      const yearAgoPoint = series.reduce((closest, pt) =>
        Math.abs(pt.time - oneYearAgoMs) < Math.abs(closest.time - oneYearAgoMs) ? pt : closest
      , series[0]);
      const change = latest.value - yearAgoPoint.value;
      historicalRows.push(`  ${bank}: ${latest.value.toFixed(2)}% (1yr change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}pp)`);
    }
    if (historicalRows.length > 0) {
      sections.push(`CENTRAL BANK RATES (FRED historical, latest available):\n${historicalRows.join('\n')}`);
    }
  }

  // ── Central Bank Balance Sheets (from /api/data/cbassets — FRED) ──
  if (cbAssets && typeof cbAssets === 'object') {
    const assetRows: string[] = [];
    for (const [bank, series] of Object.entries(cbAssets)) {
      if (!Array.isArray(series) || series.length === 0) continue;
      const latest = series[series.length - 1];
      const prev = series.length >= 2 ? series[series.length - 2] : null;
      const yoyChange = prev ? ((latest.value - prev.value) / prev.value * 100).toFixed(1) : '—';
      assetRows.push(`  ${bank}: $${latest.value.toFixed(2)}T (${latest.year}, YoY: ${yoyChange}%)`);
    }
    if (assetRows.length > 0) {
      sections.push(`CENTRAL BANK BALANCE SHEETS:\n${assetRows.join('\n')}`);
    }
  }

  // ── Inflation (from /api/data/inflation — FRED) ──
  if (inflation && typeof inflation === 'object') {
    const inflRows: string[] = [];
    for (const [country, series] of Object.entries(inflation)) {
      if (!Array.isArray(series) || series.length === 0) continue;
      const latest = series[series.length - 1];
      const date = new Date(latest.time).toISOString().slice(0, 7);
      inflRows.push(`  ${country}: ${latest.value.toFixed(1)}% (${date})`);
    }
    if (inflRows.length > 0) {
      sections.push(`INFLATION (CPI YoY):\n${inflRows.join('\n')}`);
    }
  }

  // ── M2 Money Supply (from /api/data/m2 — indexed to 100) ──
  if (m2 && typeof m2 === 'object') {
    const m2Rows: string[] = [];
    for (const [country, series] of Object.entries(m2)) {
      if (country === 'error') continue; // skip error field
      if (!Array.isArray(series) || series.length === 0) continue;
      const latest = series[series.length - 1];
      // Find 6-month-ago point
      const sixMonthsAgoMs = Date.now() - 180 * 86400_000;
      const sixMonthPoint = series.reduce((closest, pt) =>
        Math.abs(pt.time - sixMonthsAgoMs) < Math.abs(closest.time - sixMonthsAgoMs) ? pt : closest
      , series[0]);
      const sixMonthChange = ((latest.value - sixMonthPoint.value) / sixMonthPoint.value * 100).toFixed(1);
      // Find 1-year-ago point
      const oneYearAgoMs = Date.now() - 365 * 86400_000;
      const yearAgoPoint = series.reduce((closest, pt) =>
        Math.abs(pt.time - oneYearAgoMs) < Math.abs(closest.time - oneYearAgoMs) ? pt : closest
      , series[0]);
      const yoyChange = ((latest.value - yearAgoPoint.value) / yearAgoPoint.value * 100).toFixed(1);
      m2Rows.push(`  ${country}: index ${latest.value.toFixed(1)} (6m: ${sixMonthChange}%, YoY: ${yoyChange}%)`);
    }
    if (m2Rows.length > 0) {
      sections.push(`GLOBAL M2 MONEY SUPPLY (indexed, base=100):\n${m2Rows.join('\n')}`);
    }
  }

  const dataPresent = sections.length > 0;

  return `Date: ${today}

You are reviewing the COMPLETE live macro dashboard for Bitcoin. Below are today's readings from every macro indicator available.
${dataPresent ? '' : '\n⚠ WARNING: No live data was available. Do NOT fabricate numbers — state that data is unavailable.\n'}
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

IMPORTANT: Use ONLY the specific numbers provided in the data above. Do not invent, estimate, or assume any values. If a data point is missing, say it is unavailable rather than guessing.

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
  // Snapshot contains: btcMarket, indices, commodities, fx, rates, fearGreed
  // FRED endpoints: cbassets, cbrates, inflation, m2
  const [snapshot, cbAssets, cbRates, inflation, m2] = await Promise.all([
    fetchJSON<SnapshotResponse>('/api/data/snapshot'),
    fetchJSON<CBAssetsResponse>('/api/data/cbassets'),
    fetchJSON<CBRatesResponse>('/api/data/cbrates'),
    fetchJSON<InflationResponse>('/api/data/inflation'),
    fetchJSON<M2Response>('/api/data/m2'),
  ]);

  const prompt = buildPrompt(snapshot, cbAssets, cbRates, inflation, m2);

  // Log data availability for debugging
  console.log('[MacroAnalysis] Data availability:', {
    snapshot: !!snapshot,
    snapshotFields: snapshot ? {
      btcMarket: !!snapshot.btcMarket,
      indices: !!snapshot.indices,
      commodities: !!snapshot.commodities,
      fx: !!snapshot.fx,
      rates: !!snapshot.rates,
      fearGreed: !!snapshot.fearGreed,
    } : null,
    cbAssets: !!cbAssets && Object.keys(cbAssets).length,
    cbRates: !!cbRates && Object.keys(cbRates).length,
    inflation: !!inflation && Object.keys(inflation).length,
    m2: !!m2 && Object.keys(m2).length,
    baseUrl: BASE,
  });

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
