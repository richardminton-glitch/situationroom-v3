/**
 * GET  /api/ai/onchain-analysis — Serves cached cron-generated analysis (members)
 * POST /api/ai/onchain-analysis — VIP-only on-demand Grok-3 deep dive
 *
 * Tiered access:
 *   Members  → cron-generated detailed analysis (onchain-deep-analysis-members)
 *   VIP      → on-demand full analysis (onchain-deep-analysis)
 *
 * Cache: 6 hours. Cron runs every 6h for members.
 * VIP users can force-refresh within their 6h window.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasAccess, isAdmin } from '@/lib/auth/tier';
import { checkAiRateLimit, incrementAiUsage } from '@/lib/auth/rate-limit';
import { prisma } from '@/lib/db';
import type { Tier } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PANEL_ID = 'onchain-deep-analysis';
const TTL_HOURS = 6;

// ── Grok-3 direct call (higher quality than grok-4-1-fast) ──────────────────

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
              'You are a senior Bitcoin on-chain analyst and price analysis expert. You combine on-chain metrics, miner behaviour, holder dynamics, and supply distribution to assess Bitcoin\'s current state and provide tentative price movement and accumulation guidance. Be direct, quantitative, and decisive. Never hedge excessively — give clear directional assessments backed by the data.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1200,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error(`[OnChainAnalysis] Grok-3 HTTP ${res.status}: ${err.substring(0, 300)}`);
      return null;
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.error('[OnChainAnalysis] Grok-3 request failed:', err);
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

function cacheKey(): string {
  // 6-hour windows: 00, 06, 12, 18
  const now = new Date();
  const window = Math.floor(now.getUTCHours() / 6) * 6;
  return `${now.toISOString().slice(0, 10)}-${String(window).padStart(2, '0')}`;
}

function buildPrompt(
  hashRibbon: HashRibbonData | null,
  puell: PuellData | null,
  network: NetworkSignalsData | null,
  cdd: CDDData | null,
  lthSth: LTHSTHPoint[] | null,
  urpd: URPDData | null,
): string {
  const today = new Date().toISOString().slice(0, 10);
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

  return `Date: ${today}

You are reviewing the COMPLETE live on-chain dashboard for Bitcoin. Below are today's readings from every on-chain indicator available.

${sections.join('\n\n')}

Provide a comprehensive deep-dive analysis covering:

1. **MARKET REGIME** — Based on the confluence of all indicators, what macro regime is Bitcoin in? (Accumulation, markup, distribution, or markdown). Support your assessment with specific data points.

2. **MINER HEALTH** — Analyse the hash ribbon and Puell multiple together. Are miners healthy, stressed, or in capitulation? What does this mean for sell pressure?

3. **HOLDER BEHAVIOUR** — What are LTH and STH doing? Is there net accumulation or distribution? What does CDD tell us about conviction among long-term holders?

4. **SUPPLY DYNAMICS** — Using URPD and SOPR, where are the major support/resistance zones by cost basis? What percentage of supply is underwater and what does that imply for selling pressure?

5. **PRICE OUTLOOK** — Based on all the above, provide tentative price movement expectations:
   - Short-term (1-2 weeks): likely direction and key levels
   - Medium-term (1-3 months): accumulation/distribution thesis
   - Key invalidation levels that would change the thesis

6. **ACCUMULATION GUIDANCE** — Is this a good time to accumulate? DCA in, wait, or take profit? Be direct.

Write in a direct, intelligence-briefing style. Use specific numbers from the data. 500-700 words. Do not pad with disclaimers.`;
}

// ── GET — serve cached cron-generated analysis for members ────────────────

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userTier = (session.user.tier as Tier) ?? 'free';
  const admin = isAdmin(session.user.email);

  let tierPanelId: string;
  if (admin || hasAccess(userTier, 'vip')) {
    tierPanelId = PANEL_ID;
  } else if (hasAccess(userTier, 'members')) {
    tierPanelId = 'onchain-deep-analysis-members';
  } else {
    return NextResponse.json({ error: 'Members access required' }, { status: 403 });
  }

  const valueKey = cacheKey();
  const cached = await (prisma as any).signalAnnotation.findUnique({
    where: { panelId_valueKey: { panelId: tierPanelId, valueKey } },
  });

  if (cached && (cached as { expiresAt: Date }).expiresAt > new Date()) {
    return NextResponse.json({
      analysis: cached.annotation,
      cachedAt: cached.generatedAt.toISOString(),
      expiresAt: (cached as { expiresAt: Date }).expiresAt.toISOString(),
      fromCache: true,
    });
  }

  return NextResponse.json({ analysis: null, pending: true });
}

// ── POST — VIP on-demand generation ───────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userTier = (session.user.tier as Tier) ?? 'free';
  const admin = isAdmin(session.user.email);
  if (!admin && !hasAccess(userTier, 'vip')) {
    return NextResponse.json({ error: 'VIP access required' }, { status: 403 });
  }

  const valueKey = cacheKey();
  const force = request.nextUrl.searchParams.get('force') === 'true';

  // ── Cache check — 6-hour TTL ────────────────────────────────────────────
  const cached = await (prisma as any).signalAnnotation.findUnique({
    where: { panelId_valueKey: { panelId: PANEL_ID, valueKey } },
  });

  if (cached && (cached as { expiresAt: Date }).expiresAt > new Date()) {
    // Even with force=true, serve cached if within the 6h window
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

  // ── Fetch all on-chain data in parallel ─────────────────────────────────
  const [hashRibbon, puell, network, cddData, lthSthRaw, urpd] = await Promise.all([
    fetchJSON<HashRibbonData>('/api/data/hash-ribbon'),
    fetchJSON<PuellData>('/api/data/puell'),
    fetchJSON<NetworkSignalsData>('/api/data/network-signals'),
    fetchJSON<CDDData>('/api/data/cdd'),
    fetchJSON<LTHSTHPoint[]>('/api/data/lth-sth'),
    fetchJSON<URPDData>('/api/data/urpd'),
  ]);

  const prompt = buildPrompt(hashRibbon, puell, network, cddData, lthSthRaw, urpd);
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
