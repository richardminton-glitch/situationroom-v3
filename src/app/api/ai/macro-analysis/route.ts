/**
 * GET  /api/ai/macro-analysis — Serves cached analysis for user's tier
 * POST /api/ai/macro-analysis — Generates fresh analysis at user's tier level
 *
 * Tiered access (all tiers get a button):
 *   General  → high-level overview, 24h cache, ~300 words
 *   Members  → moderate depth, 12h cache, ~500 words
 *   VIP      → full deep-dive, 6h cache, ~700 words
 *
 * Each tier has its own panelId in signalAnnotation for separate caching.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasAccess, isAdmin } from '@/lib/auth/tier';
import { checkAiRateLimit, incrementAiUsage } from '@/lib/auth/rate-limit';
import { prisma } from '@/lib/db';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── Tier Configuration ────────────────────────────────────────────────────

type AnalysisTier = 'general' | 'members' | 'vip';

interface TierConfig {
  panelId: string;
  ttlHours: number;
  maxTokens: number;
  model: string;
  systemPrompt: string;
  analysisInstructions: string;
}

const TIER_CONFIG: Record<AnalysisTier, TierConfig> = {
  general: {
    panelId: 'macro-analysis-general',
    ttlHours: 24,
    maxTokens: 500,
    model: 'grok-3-mini-fast',
    systemPrompt:
      'You are a macro-economic analyst providing concise Bitcoin market context for a general audience. Be direct, plain-spoken, and avoid jargon. State the facts and give a clear bottom-line assessment.',
    analysisInstructions: `Provide a simple, to-the-point macro overview in 3 short sections:

1. **MARKET SNAPSHOT** — Where is BTC right now? How are major risk assets (stocks, gold, dollar) behaving? State the key numbers.

2. **MACRO STANCE** — In plain terms: are global financial conditions helping or hurting Bitcoin right now? Are central banks loosening or tightening? Is the mood risk-on or risk-off?

3. **BOTTOM LINE** — Simple directional call. Is the macro environment bullish, bearish, or neutral for Bitcoin over the next couple of weeks? One clear sentence.

Write 200-300 words total. Keep it simple and direct. No jargon, no hedging. Use the numbers provided.`,
  },
  members: {
    panelId: 'macro-analysis-members',
    ttlHours: 12,
    maxTokens: 900,
    model: 'grok-4-1-fast-non-reasoning',
    systemPrompt:
      'You are a senior macro-economic analyst covering Bitcoin and risk assets. Combine central bank policy, bond yields, equity indices, commodities, and money supply data to assess how the macro environment affects Bitcoin. Be quantitative and decisive. Provide context but stay focused.',
    analysisInstructions: `Provide a detailed macro analysis covering:

1. **MONETARY POLICY** — Central bank stance (Fed, ECB, BOJ, BOE). Rate path direction and what this means for liquidity into risk assets and Bitcoin.

2. **RISK ENVIRONMENT** — Using equity indices, VIX, Fear & Greed, and the dollar together, paint a picture of the current risk environment. Is capital flowing into or out of risk assets?

3. **DOLLAR, YIELDS & COMMODITIES** — How are DXY, US 10Y, gold, and oil positioned? What do these cross-asset signals tell us about the macro regime Bitcoin is operating in?

4. **BITCOIN OUTLOOK** — Based on the above:
   - Short-term (1-2 weeks): directional bias and key levels to watch
   - Medium-term (1-3 months): major catalysts or risks on the horizon
   - Is this a favourable environment to be adding exposure?

Write 400-550 words. Use specific numbers from the data. Direct, intelligence-briefing style. No filler.`,
  },
  vip: {
    panelId: 'macro-analysis-vip',
    ttlHours: 6,
    maxTokens: 1400,
    model: 'grok-4-1-fast-non-reasoning',
    systemPrompt:
      'You are an elite macro-economic strategist and Bitcoin analyst. You combine central bank policy, bond yields, equity indices, commodities, FX, inflation data, M2 money supply, and historical macro precedents to build a comprehensive thesis on Bitcoin\'s position within the global macro cycle. Be direct, quantitative, and decisive. Draw on historical parallels where relevant. Never hedge excessively — give clear directional assessments backed by data and precedent.',
    analysisInstructions: `Provide a comprehensive deep-dive analysis with historical context:

1. **MONETARY POLICY REGIME** — Assess the current global monetary policy stance. Are central banks tightening, pausing, or pivoting? How do balance sheet trends and rate paths affect liquidity? Draw parallels to previous Fed pivot cycles (2019, 2020, 2023) and what followed for BTC.

2. **GLOBAL LIQUIDITY & M2** — Analyse M2 money supply trends across major economies. Is global liquidity expanding or contracting? Reference Bitcoin's historical correlation with M2 expansion phases (2020-2021 cycle, post-2023 expansion) and what the current trajectory implies.

3. **RISK APPETITE & CROSS-ASSET SIGNALS** — Using equity indices, VIX, Fear & Greed, and credit spreads, assess risk appetite. Compare the current VIX/equity setup to similar historical regimes and what followed for Bitcoin.

4. **DOLLAR & YIELDS** — Deep analysis of DXY and the US yield curve. Reference historical DXY/BTC inverse correlation breakdowns and what the current setup implies. Is the yield curve steepening or flattening and what does this signal?

5. **COMMODITIES, INFLATION & REAL YIELDS** — What do gold, oil, and CPI readings tell us about real yield expectations? Reference the gold/BTC ratio and historical inflation-hedge narrative performance.

6. **BITCOIN MACRO THESIS** — Synthesise everything into a comprehensive outlook:
   - **Short-term (1-2 weeks)**: specific directional bias with price context
   - **Medium-term (1-3 months)**: key macro catalysts, risk events, and probable scenarios
   - **Cycle positioning**: where are we in the macro liquidity cycle? Reference previous bull/bear transitions
   - **Accumulation guidance**: specific, actionable — DCA aggressively, hold steady, reduce exposure, or wait for specific conditions

Write 600-800 words. Use specific numbers. Reference historical precedents where they illuminate the current setup. Intelligence-briefing style with conviction.`,
  },
};

/** Analysis tier matches actual subscription — admin bypass only prevents lockout */
function getAnalysisTier(userTier: Tier): AnalysisTier {
  if (hasAccess(userTier, 'vip')) return 'vip';
  if (hasAccess(userTier, 'members')) return 'members';
  return 'general';
}

// ── xAI Grok API call ──────────────────────────────────────────────────────

const GROK_URL = 'https://api.x.ai/v1/chat/completions';

async function callGrok(model: string, systemPrompt: string, userPrompt: string, maxTokens: number): Promise<string | null> {
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
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
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

// ── API response types ──────────────────────────────────────────────────────

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

type CBAssetsResponse = Record<string, { year: number; value: number }[]>;
type CBRatesResponse = Record<string, { time: number; value: number }[]>;
type InflationResponse = Record<string, { time: number; value: number }[]>;
type M2Response = Record<string, { time: number; value: number }[]>;

// ── Cache key — tier-aware windows ──────────────────────────────────────────

function cacheKey(ttlHours: number): string {
  const now = new Date();
  const window = Math.floor(now.getUTCHours() / ttlHours) * ttlHours;
  return `${now.toISOString().slice(0, 10)}-${String(window).padStart(2, '0')}`;
}

// ── Build data section (shared by all tiers) ────────────────────────────────

function buildDataSection(
  snapshot: SnapshotResponse | null,
  cbAssets: CBAssetsResponse | null,
  cbRates: CBRatesResponse | null,
  inflation: InflationResponse | null,
  m2: M2Response | null,
): string {
  const sections: string[] = [];

  // Market Snapshot
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

  // Equity Indices
  if (snapshot?.indices) {
    const indexRows = Object.entries(snapshot.indices).map(([, data]) =>
      `  ${data.name}: ${data.price?.toLocaleString()} (${data.changePct >= 0 ? '+' : ''}${data.changePct?.toFixed(2)}%)`
    );
    if (indexRows.length > 0) sections.push(`EQUITY INDICES:\n${indexRows.join('\n')}`);
  }

  // Commodities
  if (snapshot?.commodities) {
    const commRows = Object.entries(snapshot.commodities)
      .filter(([key]) => !['dxy', 'us10y', 'us2y'].includes(key))
      .map(([, data]) =>
        `  ${data.name}: $${data.price?.toFixed(2)} (${data.changePct >= 0 ? '+' : ''}${data.changePct?.toFixed(2)}%)`
      );
    if (commRows.length > 0) sections.push(`COMMODITIES:\n${commRows.join('\n')}`);
  }

  // FX Pairs
  if (snapshot?.fx) {
    const fxRows = Object.entries(snapshot.fx).map(([, data]) =>
      `  ${data.name}: ${data.price?.toFixed(4)} (${data.changePct >= 0 ? '+' : ''}${data.changePct?.toFixed(2)}%)`
    );
    if (fxRows.length > 0) sections.push(`FX PAIRS:\n${fxRows.join('\n')}`);
  }

  // Live Central Bank Rates
  if (snapshot?.rates && Array.isArray(snapshot.rates) && snapshot.rates.length > 0) {
    const rateRows = snapshot.rates.map((r) =>
      `  ${r.country}: ${r.rate?.toFixed(2)}% (updated: ${r.lastUpdated})`
    );
    sections.push(`CENTRAL BANK POLICY RATES (current):\n${rateRows.join('\n')}`);
  }

  // Historical CB Rates
  if (cbRates && typeof cbRates === 'object') {
    const historicalRows: string[] = [];
    for (const [bank, series] of Object.entries(cbRates)) {
      if (!Array.isArray(series) || series.length === 0) continue;
      const latest = series[series.length - 1];
      const oneYearAgoMs = Date.now() - 365 * 86400_000;
      const yearAgoPoint = series.reduce((closest, pt) =>
        Math.abs(pt.time - oneYearAgoMs) < Math.abs(closest.time - oneYearAgoMs) ? pt : closest
      , series[0]);
      const change = latest.value - yearAgoPoint.value;
      historicalRows.push(`  ${bank}: ${latest.value.toFixed(2)}% (1yr change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}pp)`);
    }
    if (historicalRows.length > 0) {
      sections.push(`CENTRAL BANK RATES (FRED historical):\n${historicalRows.join('\n')}`);
    }
  }

  // Central Bank Balance Sheets
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

  // Inflation
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

  // M2 Money Supply
  if (m2 && typeof m2 === 'object') {
    const m2Rows: string[] = [];
    for (const [country, series] of Object.entries(m2)) {
      if (country === 'error') continue;
      if (!Array.isArray(series) || series.length === 0) continue;
      const latest = series[series.length - 1];
      const sixMonthsAgoMs = Date.now() - 180 * 86400_000;
      const sixMonthPoint = series.reduce((closest, pt) =>
        Math.abs(pt.time - sixMonthsAgoMs) < Math.abs(closest.time - sixMonthsAgoMs) ? pt : closest
      , series[0]);
      const sixMonthChange = ((latest.value - sixMonthPoint.value) / sixMonthPoint.value * 100).toFixed(1);
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

  return sections.join('\n\n');
}

function buildPrompt(dataSection: string, config: TierConfig): string {
  const today = new Date().toISOString().slice(0, 10);
  const dataPresent = dataSection.length > 0;

  return `Date: ${today}

You are reviewing the live macro dashboard for Bitcoin. Below are today's readings from the available macro indicators.
${dataPresent ? '' : '\n⚠ WARNING: No live data was available. Do NOT fabricate numbers — state that data is unavailable.\n'}
${dataSection}

${config.analysisInstructions}

IMPORTANT: Use ONLY the specific numbers provided in the data above. Do not invent, estimate, or assume any values. If a data point is missing, say it is unavailable rather than guessing.`;
}

// ── GET — serve cached analysis for user's tier ─────────────────────────────

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userTier = (session.user.tier as Tier) ?? 'free';
  const admin = isAdmin(session.user.email);

  if (!admin && !hasAccess(userTier, 'general')) {
    return NextResponse.json({ error: 'General access required' }, { status: 403 });
  }

  const aTier = getAnalysisTier(userTier);
  const config = TIER_CONFIG[aTier];
  const valueKey = cacheKey(config.ttlHours);

  const cached = await (prisma as any).signalAnnotation.findUnique({
    where: { panelId_valueKey: { panelId: config.panelId, valueKey } },
  });

  if (cached && (cached as { expiresAt: Date }).expiresAt > new Date()) {
    return NextResponse.json({
      analysis: cached.annotation,
      tier: aTier,
      ttlHours: config.ttlHours,
      cachedAt: cached.generatedAt.toISOString(),
      expiresAt: (cached as { expiresAt: Date }).expiresAt.toISOString(),
      fromCache: true,
    });
  }

  return NextResponse.json({ analysis: null, tier: aTier, ttlHours: config.ttlHours, pending: true });
}

// ── POST — generate fresh analysis for user's tier ──────────────────────────

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userTier = (session.user.tier as Tier) ?? 'free';
  const admin = isAdmin(session.user.email);

  if (!admin && !hasAccess(userTier, 'general')) {
    return NextResponse.json({ error: 'General access required' }, { status: 403 });
  }

  const aTier = getAnalysisTier(userTier);
  const config = TIER_CONFIG[aTier];
  const valueKey = cacheKey(config.ttlHours);

  // ── Cache check ─────────────────────────────────────────────────────────
  const cached = await (prisma as any).signalAnnotation.findUnique({
    where: { panelId_valueKey: { panelId: config.panelId, valueKey } },
  });

  if (cached && (cached as { expiresAt: Date }).expiresAt > new Date()) {
    return NextResponse.json({
      analysis: cached.annotation,
      tier: aTier,
      ttlHours: config.ttlHours,
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
  const [snapshot, cbAssets, cbRates, inflation, m2] = await Promise.all([
    fetchJSON<SnapshotResponse>('/api/data/snapshot'),
    fetchJSON<CBAssetsResponse>('/api/data/cbassets'),
    fetchJSON<CBRatesResponse>('/api/data/cbrates'),
    fetchJSON<InflationResponse>('/api/data/inflation'),
    fetchJSON<M2Response>('/api/data/m2'),
  ]);

  const dataSection = buildDataSection(snapshot, cbAssets, cbRates, inflation, m2);
  const prompt = buildPrompt(dataSection, config);

  console.log(`[MacroAnalysis] Generating ${aTier}-tier analysis (model: ${config.model}, ${config.maxTokens} max tokens, ${config.ttlHours}h TTL)`);

  const text = await callGrok(config.model, config.systemPrompt, prompt, config.maxTokens);

  if (!text) {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
  }

  await incrementAiUsage(session.user.id);

  const expiresAt = new Date(Date.now() + config.ttlHours * 60 * 60 * 1000);
  const generatedAt = new Date();

  await (prisma as any).signalAnnotation.upsert({
    where: { panelId_valueKey: { panelId: config.panelId, valueKey } },
    create: { panelId: config.panelId, valueKey, annotation: text, expiresAt },
    update: { annotation: text, expiresAt, generatedAt },
  });

  return NextResponse.json({
    analysis: text,
    tier: aTier,
    ttlHours: config.ttlHours,
    cachedAt: generatedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    fromCache: false,
  });
}
