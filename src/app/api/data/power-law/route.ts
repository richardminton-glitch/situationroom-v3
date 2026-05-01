/**
 * GET /api/data/power-law
 *
 * Bitcoin Power Law model — fits the canonical Santostasi log-log regression
 * to BTC's full price history and exposes the model parameters plus the
 * current channel reading.
 *
 *   log10(price) = α + β · log10(days_since_genesis)
 *
 * Genesis is the genesis block, 2009-01-03. Days are counted as
 * (date - genesis) in calendar days. β typically lands around ~5.7-5.8 with
 * a meaningful sample.
 *
 * Support and resistance are parallel offsets in log-space:
 *   support    = median  − cMin   where cMin = min(residuals)
 *   resistance = median  − cMax   where cMax = max(residuals)
 *
 * (cMin is negative, cMax is positive — both encoded so the client can do
 * `10 ** (α + β·log10(d) + cMin)` directly without sign juggling.)
 *
 * Channel position[t] = (residual_t − cMin) / (cMax − cMin) ∈ [0,1]
 *   0   → on the support line (cycle-bottom envelope)
 *   1   → on the resistance line (cycle-top envelope)
 *   ~0.5→ on the median fair-value fit
 *
 * Reference: Giovanni Santostasi, "The Bitcoin Power Law Theory" (Medium).
 *
 * Cache: 24h file-based — BTC history is refreshed nightly by cron and
 * the model is stable day-to-day.
 */

import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { fetchCoinGeckoHistory } from '@/lib/data/coingecko-history';

export const dynamic = 'force-dynamic';

const CACHE_FILE  = join(process.cwd(), 'data', 'power-law-cache.json');
const ONE_DAY_MS  = 24 * 60 * 60 * 1000;
const GENESIS_ISO = '2009-01-03';

interface BtcPoint { date: string; price: number }

interface PowerLawModel {
  alpha:        number;   // intercept of log10(price) = α + β·log10(days)
  beta:         number;   // slope (the "power" — typically ~5.7-5.8)
  cMin:         number;   // most-negative residual → support offset
  cMax:         number;   // most-positive residual → resistance offset
  genesisDate:  string;   // 2009-01-03
  fitFromDate:  string;   // first BTC date in fit
  fitToDate:    string;   // last BTC date in fit
  fitNDays:     number;
  rSquared:     number;
}

interface PowerLawCurrent {
  date:               string;
  price:              number;
  daysSinceGenesis:   number;
  median:             number;
  support:            number;
  resistance:         number;
  channelPosition:    number;   // 0..1
  daysFromFairValue:  number;   // currentDays − impliedDaysAtPrice — positive = "lagging"
  fairValueDate:      string;   // date when median = current price (could be past or future)
}

interface CachedPayload {
  btc:        BtcPoint[];
  model:      PowerLawModel;
  current:    PowerLawCurrent;
  updatedAt:  string;
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

function readCache(): { data: CachedPayload; mtimeMs: number } | null {
  try {
    const stat = statSync(CACHE_FILE);
    const data = JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as CachedPayload;
    return { data, mtimeMs: stat.mtimeMs };
  } catch { return null; }
}

function writeCache(data: CachedPayload) {
  try {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch (e) {
    console.warn('[power-law] cache write failed:', e);
  }
}

// ── Math ──────────────────────────────────────────────────────────────────────

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + 'T00:00:00Z').getTime();
  const b = new Date(toIso   + 'T00:00:00Z').getTime();
  return Math.round((b - a) / ONE_DAY_MS);
}

function fitOLS(xs: number[], ys: number[]): { alpha: number; beta: number; rSquared: number } {
  const n = xs.length;
  if (n < 2) return { alpha: 0, beta: 0, rSquared: 0 };

  let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
  for (let i = 0; i < n; i++) {
    sumX  += xs[i];
    sumY  += ys[i];
    sumXX += xs[i] * xs[i];
    sumXY += xs[i] * ys[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  const beta  = (sumXY - n * meanX * meanY) / (sumXX - n * meanX * meanX);
  const alpha = meanY - beta * meanX;

  // R² — coefficient of determination
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const yPred = alpha + beta * xs[i];
    ssRes += (ys[i] - yPred) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { alpha, beta, rSquared };
}

function fitPowerLaw(btc: BtcPoint[]): PowerLawModel {
  // Build (log10(days), log10(price)) pairs for every BTC day with price > 0.
  const xs: number[] = [];
  const ys: number[] = [];
  const usedDays: number[]  = [];
  const usedPrices: number[] = [];

  for (const p of btc) {
    if (p.price <= 0) continue;
    const d = daysBetween(GENESIS_ISO, p.date);
    if (d < 1) continue;
    xs.push(Math.log10(d));
    ys.push(Math.log10(p.price));
    usedDays.push(d);
    usedPrices.push(p.price);
  }

  const { alpha, beta, rSquared } = fitOLS(xs, ys);

  // Residuals → support/resistance offsets
  let cMin = Infinity, cMax = -Infinity;
  for (let i = 0; i < xs.length; i++) {
    const yPred = alpha + beta * xs[i];
    const r = ys[i] - yPred;
    if (r < cMin) cMin = r;
    if (r > cMax) cMax = r;
  }
  if (!Number.isFinite(cMin)) cMin = 0;
  if (!Number.isFinite(cMax)) cMax = 0;

  return {
    alpha,
    beta,
    cMin,
    cMax,
    genesisDate: GENESIS_ISO,
    fitFromDate: btc[0]?.date ?? '',
    fitToDate:   btc.at(-1)?.date ?? '',
    fitNDays:    xs.length,
    rSquared,
  };
}

function computeCurrent(btc: BtcPoint[], model: PowerLawModel): PowerLawCurrent {
  const last = btc.at(-1);
  if (!last) {
    return {
      date: '', price: 0, daysSinceGenesis: 0,
      median: 0, support: 0, resistance: 0,
      channelPosition: 0.5, daysFromFairValue: 0, fairValueDate: '',
    };
  }

  const days   = daysBetween(GENESIS_ISO, last.date);
  const logD   = Math.log10(Math.max(days, 1));
  const yPred  = model.alpha + model.beta * logD;
  const median = Math.pow(10, yPred);
  const support    = Math.pow(10, yPred + model.cMin);
  const resistance = Math.pow(10, yPred + model.cMax);

  const residual = Math.log10(last.price) - yPred;
  const span     = model.cMax - model.cMin;
  const channelPosition = span === 0 ? 0.5 : (residual - model.cMin) / span;

  // Fair-value-implied date: solve for d* such that median(d*) = price
  //   alpha + beta·log10(d*) = log10(price)
  //   d* = 10 ** ((log10(price) − alpha) / beta)
  const dStar = Math.pow(10, (Math.log10(last.price) - model.alpha) / model.beta);
  const daysFromFairValue = days - dStar;
  const fairValueMs = new Date(GENESIS_ISO + 'T00:00:00Z').getTime() + dStar * ONE_DAY_MS;
  const fairValueDate = new Date(fairValueMs).toISOString().slice(0, 10);

  return {
    date:              last.date,
    price:             last.price,
    daysSinceGenesis:  days,
    median,
    support,
    resistance,
    channelPosition:   Math.max(0, Math.min(1, channelPosition)),
    daysFromFairValue,
    fairValueDate,
  };
}

// ── Build ────────────────────────────────────────────────────────────────────

async function buildFresh(): Promise<CachedPayload> {
  const btcAll = await fetchCoinGeckoHistory({ full: true });
  if (btcAll.length === 0) throw new Error('BTC history empty');

  // Drop any sub-cent days at the very start — log10 of those is fine but
  // adds disproportionate leverage to the fit. We keep everything from
  // BTC's first listed market price onward (CoinGecko history starts ~$0.05).
  const btc = btcAll.filter((p) => p.price > 0);
  if (btc.length < 100) throw new Error('BTC history too short for power-law fit');

  const model   = fitPowerLaw(btc);
  const current = computeCurrent(btc, model);

  return {
    btc,
    model,
    current,
    updatedAt: new Date().toISOString(),
  };
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  const cached = readCache();
  if (cached && Date.now() - cached.mtimeMs < ONE_DAY_MS) {
    return NextResponse.json(cached.data, {
      headers: {
        'X-Cache':     'HIT',
        'X-Cache-Age': Math.round((Date.now() - cached.mtimeMs) / 3600000) + 'h',
      },
    });
  }

  try {
    const data = await buildFresh();
    writeCache(data);
    return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } });
  } catch (err) {
    console.error('[power-law] fresh build failed:', err);
    if (cached) {
      return NextResponse.json(cached.data, {
        headers: { 'X-Cache': 'STALE', 'X-Cache-Error': String(err) },
      });
    }
    return NextResponse.json({ error: 'Power-law data unavailable' }, { status: 503 });
  }
}
