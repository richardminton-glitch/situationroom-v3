/**
 * GET  /api/ai/onchain-analysis — Serves cached analysis for user's tier
 * POST /api/ai/onchain-analysis — Generates fresh analysis at user's tier level
 *
 * Tiered access (members+):
 *   Members  → moderate depth, 12h cache, grok-3, ~500 words
 *   VIP      → full deep-dive with historical precedents, 6h cache, grok-3, ~700 words
 *
 * Each tier has its own panelId in signalAnnotation for separate caching.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasAccess, isAdmin } from '@/lib/auth/tier';
import { checkAiRateLimit, incrementAiUsage } from '@/lib/auth/rate-limit';
import { prisma } from '@/lib/db';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── Tier Configuration ────────────────────────────────────────────────────

type AnalysisTier = 'members' | 'vip';

interface TierConfig {
  panelId: string;
  ttlHours: number;
  maxTokens: number;
  model: string;
  systemPrompt: string;
  analysisInstructions: string;
}

const TIER_CONFIG: Record<AnalysisTier, TierConfig> = {
  members: {
    panelId: 'onchain-analysis-members',
    ttlHours: 12,
    maxTokens: 900,
    model: 'grok-3',
    systemPrompt:
      'You are a senior Bitcoin on-chain analyst. You combine on-chain metrics, miner behaviour, and holder dynamics to assess Bitcoin\'s current state and provide directional guidance. Be direct, quantitative, and decisive. State the facts and give clear assessments backed by the data.',
    analysisInstructions: `Provide a detailed on-chain analysis covering:

1. **MARKET REGIME** — Based on the confluence of indicators, what macro regime is Bitcoin in? (Accumulation, markup, distribution, or markdown). Support with specific data points.

2. **MINER HEALTH** — Analyse the hash ribbon and Puell multiple together. Are miners healthy, stressed, or in capitulation? What does this mean for sell pressure?

3. **HOLDER BEHAVIOUR** — What are LTH and STH doing? Is there net accumulation or distribution? What does CDD tell us about conviction?

4. **PRICE OUTLOOK** — Based on all the above:
   - Short-term (1-2 weeks): likely direction
   - Medium-term (1-3 months): accumulation or distribution bias
   - Is this a good time to accumulate, hold, or reduce exposure?

Write 400-550 words. Use specific numbers from the data. Direct, intelligence-briefing style. No filler or excessive hedging.`,
  },
  vip: {
    panelId: 'onchain-analysis-vip',
    ttlHours: 6,
    maxTokens: 1400,
    model: 'grok-3',
    systemPrompt:
      'You are an elite Bitcoin on-chain strategist and cycle analyst. You combine on-chain metrics, miner behaviour, holder dynamics, supply distribution, and historical cycle precedents to build a comprehensive thesis on Bitcoin\'s position within its market cycle. Be direct, quantitative, and decisive. Draw on historical parallels where relevant — reference specific cycle phases (2017 top distribution, 2018-2019 accumulation, 2020 halving rally, 2021 double-top distribution, 2022 capitulation, 2023-2024 recovery). Never hedge excessively — give clear directional assessments backed by data and precedent.',
    analysisInstructions: `Provide a comprehensive deep-dive analysis with historical cycle context:

1. **MARKET REGIME** — Based on the confluence of all indicators, what macro regime is Bitcoin in? (Accumulation, markup, distribution, or markdown). Support your assessment with specific data points. Compare the current indicator readings to similar regimes in previous cycles (2019 accumulation, 2020 early bull, 2021 distribution, 2022 capitulation, 2023 recovery).

2. **MINER HEALTH** — Analyse the hash ribbon and Puell multiple together. Are miners healthy, stressed, or in capitulation? Reference historical miner capitulation events (2018 Q4, 2020 March, 2022 Q4) and what followed for price. What does the current miner setup imply?

3. **HOLDER BEHAVIOUR** — What are LTH and STH doing? Is there net accumulation or distribution? What does CDD tell us about conviction among long-term holders? Compare LTH/STH ratios to previous cycle phases — are we seeing distribution similar to late 2021, or accumulation similar to early 2023?

4. **SUPPLY DYNAMICS** — Using URPD and SOPR, where are the major support/resistance zones by cost basis? What percentage of supply is underwater and what does that imply for selling pressure? Reference historical MVRV levels at cycle tops and bottoms.

5. **PRICE OUTLOOK** — Based on all the above, provide tentative price movement expectations:
   - Short-term (1-2 weeks): likely direction and key levels
   - Medium-term (1-3 months): accumulation/distribution thesis with specific catalysts
   - Cycle positioning: where are we in the ~4-year halving cycle? How does this compare to the same phase in previous cycles?
   - Key invalidation levels that would change the thesis

6. **ACCUMULATION GUIDANCE** — Is this a good time to accumulate? DCA aggressively, hold steady, take profit, or wait for specific conditions? Be direct and specific. Reference what the optimal strategy was at similar on-chain readings in past cycles.

Write 600-800 words. Use specific numbers from the data. Reference historical precedents where they illuminate the current setup. Intelligence-briefing style with conviction.`,
  },
};

/** Analysis tier matches actual subscription — admin bypass only prevents lockout */
function getAnalysisTier(userTier: Tier): AnalysisTier {
  if (hasAccess(userTier, 'vip')) return 'vip';
  return 'members';
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
      console.error(`[OnChainAnalysis] Grok HTTP ${res.status}: ${err.substring(0, 300)}`);
      return null;
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.error('[OnChainAnalysis] Grok request failed:', err);
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

interface HashRibbonData {
  signal: string;
  currentHashrate: number;
  currentMa30: number;
  currentMa60: number;
}

interface PuellData {
  current: number;
  currentZone: string;
  signal: string;
}

interface NetworkSignalsData {
  currentSopr: number;
  soprSignal: string;
  currentActive: number;
  activeTrend: string;
}

interface CDDPoint {
  date: string;
  vocdd: number;
  ma30: number;
}

interface CDDData {
  data: CDDPoint[];
}

interface LTHSTHPoint {
  date: string;
  lth: number;
  sth: number;
  lthPct: number;
  sthPct: number;
  totalSupply: number;
}

interface URPDData {
  currentPrice: number;
  realisedPrice: number;
  inProfit: number;
  atLoss: number;
}

// ── Cache key — tier-aware windows ──────────────────────────────────────────

function cacheKey(ttlHours: number): string {
  const now = new Date();
  const window = Math.floor(now.getUTCHours() / ttlHours) * ttlHours;
  return `${now.toISOString().slice(0, 10)}-${String(window).padStart(2, '0')}`;
}

// ── Build data section (shared by all tiers) ────────────────────────────────

function buildDataSection(
  hashRibbon: HashRibbonData | null,
  puell: PuellData | null,
  network: NetworkSignalsData | null,
  cdd: CDDData | null,
  lthSth: LTHSTHPoint[] | null,
  urpd: URPDData | null,
): string {
  const sections: string[] = [];

  if (hashRibbon) {
    sections.push(`HASH RIBBON:
- Signal: ${hashRibbon.signal.toUpperCase()}
- Current Hashrate: ${hashRibbon.currentHashrate.toFixed(1)} EH/s
- 30d MA: ${hashRibbon.currentMa30.toFixed(1)} EH/s
- 60d MA: ${hashRibbon.currentMa60.toFixed(1)} EH/s
- 30d vs 60d spread: ${((hashRibbon.currentMa30 - hashRibbon.currentMa60) / hashRibbon.currentMa60 * 100).toFixed(2)}%`);
  }

  if (puell) {
    sections.push(`PUELL MULTIPLE:
- Current: ${puell.current.toFixed(3)}
- Zone: ${puell.currentZone.toUpperCase()}
- Signal: ${puell.signal.toUpperCase()}
- Interpretation: ${puell.current < 0.5 ? 'Deep miner capitulation — historically strongest buy zone' : puell.current > 4 ? 'Extreme overvalue — top territory' : puell.current < 1 ? 'Below average miner revenue' : 'Above average miner revenue'}`);
  }

  if (network) {
    sections.push(`SOPR & ACTIVE ADDRESSES:
- SOPR (7d MA): ${network.currentSopr.toFixed(4)}
- SOPR Signal: ${network.soprSignal.toUpperCase()} (${network.currentSopr >= 1 ? 'coins spent at profit' : 'coins spent at loss'})
- Active Addresses: ${(network.currentActive / 1000).toFixed(1)}k
- Address Trend: ${network.activeTrend.toUpperCase()}`);
  }

  if (cdd && cdd.data.length > 0) {
    const latest = cdd.data[cdd.data.length - 1];
    const avg = cdd.data.slice(-7).reduce((s, d) => s + d.vocdd, 0) / 7;
    sections.push(`COIN DAYS DESTROYED (VOCDD):
- Latest daily: ${latest.vocdd.toFixed(0)}
- 30d MA: ${latest.ma30.toFixed(0)}
- 7d average: ${avg.toFixed(0)}
- Status: ${latest.vocdd > latest.ma30 * 1.5 ? 'HOT — old coins moving' : latest.vocdd < latest.ma30 * 0.5 ? 'COLD — dormancy, accumulation' : 'NORMAL'}`);
  }

  if (lthSth && lthSth.length > 0) {
    const latest = lthSth[lthSth.length - 1];
    const earlier = lthSth.length > 30 ? lthSth[lthSth.length - 31] : lthSth[0];
    sections.push(`LTH / STH SUPPLY DISTRIBUTION:
- LTH Supply: ${(latest.lth / 1e6).toFixed(2)}M BTC (${latest.lthPct.toFixed(1)}%)
- STH Supply: ${(latest.sth / 1e6).toFixed(2)}M BTC (${latest.sthPct.toFixed(1)}%)
- Total Circulating: ${(latest.totalSupply / 1e6).toFixed(2)}M BTC
- 30d LTH change: ${((latest.lthPct - earlier.lthPct)).toFixed(2)}pp ${latest.lthPct > earlier.lthPct ? '(accumulating)' : '(distributing)'}`);
  }

  if (urpd) {
    sections.push(`URPD (SUPPLY AT COST BASIS):
- Current Price: $${urpd.currentPrice.toLocaleString()}
- Realised Price: $${urpd.realisedPrice.toLocaleString()}
- MVRV Ratio: ${(urpd.currentPrice / urpd.realisedPrice).toFixed(2)}
- Supply in Profit: ${urpd.inProfit.toFixed(1)}%
- Supply at Loss: ${urpd.atLoss.toFixed(1)}%`);
  }

  return sections.join('\n\n');
}

function buildPrompt(dataSection: string, config: TierConfig): string {
  const today = new Date().toISOString().slice(0, 10);
  const dataPresent = dataSection.length > 0;

  return `Date: ${today}

You are reviewing the COMPLETE live on-chain dashboard for Bitcoin. Below are today's readings from every on-chain indicator available.
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

  if (!admin && !hasAccess(userTier, 'members')) {
    return NextResponse.json({ error: 'Members access required' }, { status: 403 });
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

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userTier = (session.user.tier as Tier) ?? 'free';
  const admin = isAdmin(session.user.email);

  // Admin bypass only for access — content tier follows actual subscription
  if (!admin && !hasAccess(userTier, 'members')) {
    return NextResponse.json({ error: 'Members access required' }, { status: 403 });
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

  // ── Fetch all on-chain data in parallel ─────────────────────────────────
  const [hashRibbon, puell, network, cddData, lthSthRaw, urpd] = await Promise.all([
    fetchJSON<HashRibbonData>('/api/data/hash-ribbon'),
    fetchJSON<PuellData>('/api/data/puell'),
    fetchJSON<NetworkSignalsData>('/api/data/network-signals'),
    fetchJSON<CDDData>('/api/data/cdd'),
    fetchJSON<LTHSTHPoint[]>('/api/data/lth-sth'),
    fetchJSON<URPDData>('/api/data/urpd'),
  ]);

  const dataSection = buildDataSection(hashRibbon, puell, network, cddData, lthSthRaw, urpd);
  const prompt = buildPrompt(dataSection, config);

  console.log(`[OnChainAnalysis] Generating ${aTier}-tier analysis (model: ${config.model}, ${config.maxTokens} max tokens, ${config.ttlHours}h TTL)`);

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
