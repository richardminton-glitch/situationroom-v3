/**
 * GET /api/cron/ai-analysis
 *
 * Generates tier-specific AI analyses every 6 hours:
 *   - macro-deep-analysis-general  (General tier, ~300 words)
 *   - macro-deep-analysis-members  (Members tier, ~500 words)
 *   - onchain-deep-analysis-members (Members tier, ~500 words)
 *
 * VIP analyses remain on-demand via POST endpoints.
 * Called by system crontab at 00:05, 06:05, 12:05, 18:05 UTC.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const GROK_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = 'grok-3';
const TTL_HOURS = 6;

const BASE =
  process.env.NEXT_PUBLIC_BASE_URL ||
  `http://localhost:${process.env.PORT || 3000}`;

// ── Helpers ─────────────────────────────────────────────────────────────────

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function callGrok3(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<string | null> {
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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(50_000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error(
        `[CronAI] Grok-3 HTTP ${res.status}: ${err.substring(0, 300)}`,
      );
      return null;
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.error('[CronAI] Grok-3 request failed:', err);
    return null;
  }
}

function cacheKey(): string {
  const now = new Date();
  const window = Math.floor(now.getUTCHours() / 6) * 6;
  return `${now.toISOString().slice(0, 10)}-${String(window).padStart(2, '0')}`;
}

function ha(n: number): string {
  return Math.floor(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, '0');
}

// ── Types (matching what the data endpoints actually return) ────────────────

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
  btcMarket: {
    price: number;
    change24h: number;
    change7d: number;
    change30d: number;
    marketCap: number;
    volume24h: number;
  } | null;
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

// ── Macro data section builder ──────────────────────────────────────────────

function buildMacroDataSections(
  snapshot: SnapshotResponse | null,
  cbAssets: CBAssetsResponse | null,
  cbRates: CBRatesResponse | null,
  inflation: InflationResponse | null,
  m2: M2Response | null,
): string {
  const sections: string[] = [];

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
    if (sp500)
      rows.push(
        `- S&P 500: ${sp500.price?.toLocaleString()} (${sp500.changePct >= 0 ? '+' : ''}${sp500.changePct?.toFixed(2)}%)`,
      );
    if (vix) rows.push(`- VIX: ${vix.price?.toFixed(2)}`);
    if (gold)
      rows.push(
        `- Gold: $${gold.price?.toFixed(0)} (${gold.changePct >= 0 ? '+' : ''}${gold.changePct?.toFixed(2)}%)`,
      );
    if (dxy)
      rows.push(
        `- DXY: ${dxy.price?.toFixed(2)} (${dxy.changePct >= 0 ? '+' : ''}${dxy.changePct?.toFixed(2)}%)`,
      );
    if (us10y) rows.push(`- US 10Y Yield: ${us10y.price?.toFixed(2)}%`);
    if (oil)
      rows.push(
        `- Oil (WTI): $${oil.price?.toFixed(2)} (${oil.changePct >= 0 ? '+' : ''}${oil.changePct?.toFixed(2)}%)`,
      );
    if (rows.length > 0) sections.push(`MARKET SNAPSHOT:\n${rows.join('\n')}`);
  }

  if (snapshot?.indices) {
    const indexRows = Object.entries(snapshot.indices).map(
      ([, data]) =>
        `  ${data.name}: ${data.price?.toLocaleString()} (${data.changePct >= 0 ? '+' : ''}${data.changePct?.toFixed(2)}%)`,
    );
    if (indexRows.length > 0)
      sections.push(`EQUITY INDICES:\n${indexRows.join('\n')}`);
  }

  if (snapshot?.commodities) {
    const commRows = Object.entries(snapshot.commodities)
      .filter(([key]) => !['dxy', 'us10y', 'us2y'].includes(key))
      .map(
        ([, data]) =>
          `  ${data.name}: $${data.price?.toFixed(2)} (${data.changePct >= 0 ? '+' : ''}${data.changePct?.toFixed(2)}%)`,
      );
    if (commRows.length > 0)
      sections.push(`COMMODITIES:\n${commRows.join('\n')}`);
  }

  if (snapshot?.fx) {
    const fxRows = Object.entries(snapshot.fx).map(
      ([, data]) =>
        `  ${data.name}: ${data.price?.toFixed(4)} (${data.changePct >= 0 ? '+' : ''}${data.changePct?.toFixed(2)}%)`,
    );
    if (fxRows.length > 0) sections.push(`FX PAIRS:\n${fxRows.join('\n')}`);
  }

  if (
    snapshot?.rates &&
    Array.isArray(snapshot.rates) &&
    snapshot.rates.length > 0
  ) {
    const rateRows = snapshot.rates.map(
      (r) => `  ${r.country}: ${r.rate?.toFixed(2)}% (updated: ${r.lastUpdated})`,
    );
    sections.push(
      `CENTRAL BANK POLICY RATES (current):\n${rateRows.join('\n')}`,
    );
  }

  if (cbRates && typeof cbRates === 'object') {
    const historicalRows: string[] = [];
    for (const [bank, series] of Object.entries(cbRates)) {
      if (!Array.isArray(series) || series.length === 0) continue;
      const latest = series[series.length - 1];
      const oneYearAgoMs = Date.now() - 365 * 86400_000;
      const yearAgoPoint = series.reduce(
        (closest, pt) =>
          Math.abs(pt.time - oneYearAgoMs) < Math.abs(closest.time - oneYearAgoMs)
            ? pt
            : closest,
        series[0],
      );
      const change = latest.value - yearAgoPoint.value;
      historicalRows.push(
        `  ${bank}: ${latest.value.toFixed(2)}% (1yr change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}pp)`,
      );
    }
    if (historicalRows.length > 0) {
      sections.push(
        `CENTRAL BANK RATES (FRED historical):\n${historicalRows.join('\n')}`,
      );
    }
  }

  if (cbAssets && typeof cbAssets === 'object') {
    const assetRows: string[] = [];
    for (const [bank, series] of Object.entries(cbAssets)) {
      if (!Array.isArray(series) || series.length === 0) continue;
      const latest = series[series.length - 1];
      const prev = series.length >= 2 ? series[series.length - 2] : null;
      const yoyChange = prev
        ? (((latest.value - prev.value) / prev.value) * 100).toFixed(1)
        : '—';
      assetRows.push(
        `  ${bank}: $${latest.value.toFixed(2)}T (${latest.year}, YoY: ${yoyChange}%)`,
      );
    }
    if (assetRows.length > 0) {
      sections.push(`CENTRAL BANK BALANCE SHEETS:\n${assetRows.join('\n')}`);
    }
  }

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

  if (m2 && typeof m2 === 'object') {
    const m2Rows: string[] = [];
    for (const [country, series] of Object.entries(m2)) {
      if (country === 'error') continue;
      if (!Array.isArray(series) || series.length === 0) continue;
      const latest = series[series.length - 1];
      const sixMonthsAgoMs = Date.now() - 180 * 86400_000;
      const sixMonthPoint = series.reduce(
        (closest, pt) =>
          Math.abs(pt.time - sixMonthsAgoMs) < Math.abs(closest.time - sixMonthsAgoMs)
            ? pt
            : closest,
        series[0],
      );
      const sixMonthChange = (
        ((latest.value - sixMonthPoint.value) / sixMonthPoint.value) *
        100
      ).toFixed(1);
      const oneYearAgoMs = Date.now() - 365 * 86400_000;
      const yearAgoPoint = series.reduce(
        (closest, pt) =>
          Math.abs(pt.time - oneYearAgoMs) < Math.abs(closest.time - oneYearAgoMs)
            ? pt
            : closest,
        series[0],
      );
      const yoyChange = (
        ((latest.value - yearAgoPoint.value) / yearAgoPoint.value) *
        100
      ).toFixed(1);
      m2Rows.push(
        `  ${country}: index ${latest.value.toFixed(1)} (6m: ${sixMonthChange}%, YoY: ${yoyChange}%)`,
      );
    }
    if (m2Rows.length > 0) {
      sections.push(
        `GLOBAL M2 MONEY SUPPLY (indexed, base=100):\n${m2Rows.join('\n')}`,
      );
    }
  }

  return sections.join('\n\n');
}

// ── On-chain data section builder ───────────────────────────────────────────

function buildOnchainDataSections(
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
- 30d vs 60d spread: ${(((hashRibbon.currentMa30 - hashRibbon.currentMa60) / hashRibbon.currentMa60) * 100).toFixed(2)}%`);
  }

  if (puell) {
    const interp =
      puell.current < 0.5
        ? 'Deep miner capitulation — historically strongest buy zone'
        : puell.current > 4
          ? 'Extreme overvalue — top territory'
          : puell.current < 1
            ? 'Below average miner revenue'
            : 'Above average miner revenue';
    sections.push(`PUELL MULTIPLE:
- Current: ${puell.current.toFixed(3)}
- Zone: ${puell.currentZone.toUpperCase()}
- Signal: ${puell.signal.toUpperCase()}
- Interpretation: ${interp}`);
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
    const status =
      latest.vocdd > latest.ma30 * 1.5
        ? 'HOT — old coins moving'
        : latest.vocdd < latest.ma30 * 0.5
          ? 'COLD — dormancy, accumulation'
          : 'NORMAL';
    sections.push(`COIN DAYS DESTROYED (VOCDD):
- Latest daily: ${latest.vocdd.toFixed(0)}
- 30d MA: ${latest.ma30.toFixed(0)}
- 7d average: ${avg.toFixed(0)}
- Status: ${status}`);
  }

  if (lthSth && lthSth.length > 0) {
    const latest = lthSth[lthSth.length - 1];
    const earlier =
      lthSth.length > 30 ? lthSth[lthSth.length - 31] : lthSth[0];
    sections.push(`LTH / STH SUPPLY DISTRIBUTION:
- LTH Supply: ${(latest.lth / 1e6).toFixed(2)}M BTC (${latest.lthPct.toFixed(1)}%)
- STH Supply: ${(latest.sth / 1e6).toFixed(2)}M BTC (${latest.sthPct.toFixed(1)}%)
- Total Circulating: ${(latest.totalSupply / 1e6).toFixed(2)}M BTC
- 30d LTH change: ${(latest.lthPct - earlier.lthPct).toFixed(2)}pp ${latest.lthPct > earlier.lthPct ? '(accumulating)' : '(distributing)'}`);
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

// ── Tier-specific prompt builders ───────────────────────────────────────────

const MACRO_SYSTEM =
  'You are a senior macro-economic analyst and Bitcoin strategist. You combine central bank policy, bond yields, equity indices, commodities, FX movements, inflation data, and global money supply to assess how the macro environment affects Bitcoin. Be direct, quantitative, and decisive. Never hedge excessively — give clear directional assessments backed by the data.';

const ONCHAIN_SYSTEM =
  "You are a senior Bitcoin on-chain analyst and price analysis expert. You combine on-chain metrics, miner behaviour, holder dynamics, and supply distribution to assess Bitcoin's current state and provide tentative price movement and accumulation guidance. Be direct, quantitative, and decisive. Never hedge excessively — give clear directional assessments backed by the data.";

function macroGeneralPrompt(dataSections: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `Date: ${today}

You are reviewing live macro data for Bitcoin. Below are today's readings.
${!dataSections ? '\nWARNING: No live data was available. State that data is unavailable.\n' : ''}
${dataSections}

Provide a concise macro briefing:

1. **MARKET OVERVIEW** — Key moves across rates, equities, commodities, and FX. What is the dominant macro narrative today?

2. **BITCOIN POSITION** — How do current macro conditions affect Bitcoin? Is the environment broadly supportive or hostile for risk assets?

3. **KEY WATCH** — The single most important macro development to monitor in the near term.

IMPORTANT: Use ONLY the specific numbers provided. Do not invent data. 200-300 words. Direct intelligence-briefing style. No disclaimers.`;
}

function macroMembersPrompt(dataSections: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `Date: ${today}

You are reviewing the live macro dashboard for Bitcoin. Below are today's readings from every macro indicator available.
${!dataSections ? '\nWARNING: No live data was available. State that data is unavailable.\n' : ''}
${dataSections}

Provide a detailed macro analysis covering:

1. **MONETARY POLICY** — Global central bank stance. Are they tightening, pausing, or easing? How do balance sheet trends and rate paths affect liquidity?

2. **LIQUIDITY & M2** — Money supply trends. Is M2 expanding or contracting? Implications for Bitcoin's liquidity correlation.

3. **RISK APPETITE** — Equity indices, VIX, and Fear & Greed. Risk-on or risk-off? How does this position Bitcoin?

4. **DOLLAR & YIELDS** — DXY and US 10Y yield setup. Implications for BTC.

5. **BITCOIN MACRO OUTLOOK** — Short-term (1-2 weeks) and medium-term (1-3 months) directional assessment with key catalysts and risks.

IMPORTANT: Use ONLY the specific numbers provided. Do not invent data. 400-500 words. Direct intelligence-briefing style. No disclaimers.`;
}

function onchainMembersPrompt(dataSections: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `Date: ${today}

You are reviewing the live on-chain dashboard for Bitcoin. Below are today's readings from every on-chain indicator available.

${dataSections}

Provide a detailed on-chain analysis covering:

1. **MARKET REGIME** — Based on the confluence of indicators, what regime is Bitcoin in? (Accumulation, markup, distribution, or markdown). Support with specific data.

2. **MINER HEALTH** — Hash ribbon and Puell multiple assessment. Capitulation, stress, or healthy? Sell-pressure implications.

3. **HOLDER BEHAVIOUR** — LTH/STH dynamics and CDD conviction signals. Net accumulation or distribution?

4. **SUPPLY & PRICE OUTLOOK** — URPD cost basis zones, SOPR. Short-term (1-2 weeks) and medium-term (1-3 months) directional assessment with key levels.

IMPORTANT: Use ONLY the specific numbers provided. Do not invent data. 400-500 words. Direct intelligence-briefing style. No disclaimers.`;
}

// ── Main handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const valueKey = cacheKey();
  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);

  // Skip if already generated for this window
  const existing = await (prisma as any).signalAnnotation.findUnique({
    where: {
      panelId_valueKey: {
        panelId: 'macro-deep-analysis-general',
        valueKey,
      },
    },
  });
  if (existing && (existing as { expiresAt: Date }).expiresAt > new Date()) {
    return NextResponse.json({
      status: 'already_generated',
      window: valueKey,
    });
  }

  console.log(`[CronAI] Generating tier analyses for window ${valueKey}`);

  // Fetch ALL data in parallel (macro + on-chain)
  const [snapshot, cbAssets, cbRates, inflation, m2, hashRibbon, puell, network, cddData, lthSthRaw, urpd] =
    await Promise.all([
      fetchJSON<SnapshotResponse>('/api/data/snapshot'),
      fetchJSON<CBAssetsResponse>('/api/data/cbassets'),
      fetchJSON<CBRatesResponse>('/api/data/cbrates'),
      fetchJSON<InflationResponse>('/api/data/inflation'),
      fetchJSON<M2Response>('/api/data/m2'),
      fetchJSON<HashRibbonData>('/api/data/hash-ribbon'),
      fetchJSON<PuellData>('/api/data/puell'),
      fetchJSON<NetworkSignalsData>('/api/data/network-signals'),
      fetchJSON<CDDData>('/api/data/cdd'),
      fetchJSON<LTHSTHPoint[]>('/api/data/lth-sth'),
      fetchJSON<URPDData>('/api/data/urpd'),
    ]);

  console.log('[CronAI] Data availability:', {
    snapshot: !!snapshot,
    cbAssets: !!cbAssets && Object.keys(cbAssets).length,
    cbRates: !!cbRates && Object.keys(cbRates).length,
    inflation: !!inflation && Object.keys(inflation).length,
    m2: !!m2 && Object.keys(m2).length,
    hashRibbon: !!hashRibbon,
    puell: !!puell,
    network: !!network,
    cdd: !!cddData,
    lthSth: !!lthSthRaw && (Array.isArray(lthSthRaw) ? lthSthRaw.length : 0),
    urpd: !!urpd,
  });

  // Build data sections once per domain
  const macroData = buildMacroDataSections(snapshot, cbAssets, cbRates, inflation, m2);
  const onchainData = buildOnchainDataSections(
    hashRibbon,
    puell,
    network,
    cddData,
    lthSthRaw,
    urpd,
  );

  // Generate all 3 analyses (sequential to avoid Grok rate limits)
  const results: Record<string, boolean> = {};

  const generalMacro = await callGrok3(
    MACRO_SYSTEM,
    macroGeneralPrompt(macroData),
    400,
  );
  results['macro-general'] = !!generalMacro;

  const membersMacro = await callGrok3(
    MACRO_SYSTEM,
    macroMembersPrompt(macroData),
    700,
  );
  results['macro-members'] = !!membersMacro;

  const membersOnchain = await callGrok3(
    ONCHAIN_SYSTEM,
    onchainMembersPrompt(onchainData),
    700,
  );
  results['onchain-members'] = !!membersOnchain;

  // Store all generated analyses
  const generatedAt = new Date();
  const stores = [
    { panelId: 'macro-deep-analysis-general', text: generalMacro },
    { panelId: 'macro-deep-analysis-members', text: membersMacro },
    { panelId: 'onchain-deep-analysis-members', text: membersOnchain },
  ];

  for (const { panelId, text } of stores) {
    if (text) {
      await (prisma as any).signalAnnotation.upsert({
        where: { panelId_valueKey: { panelId, valueKey } },
        create: { panelId, valueKey, annotation: text, expiresAt },
        update: { annotation: text, expiresAt, generatedAt },
      });
    }
  }

  console.log('[CronAI] Generation complete:', results);

  return NextResponse.json({
    success: true,
    window: valueKey,
    results,
  });
}
