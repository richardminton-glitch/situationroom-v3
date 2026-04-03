/**
 * GET /api/data/hash-ribbon
 * Returns 90 days of Bitcoin hash rate history with 30d/60d moving averages.
 * Hash Ribbon signal: 30d MA crossing above 60d MA = miner capitulation recovery.
 *
 * Data sources (in priority order):
 *  1. BRK (bitview.space) — `hashrate` series (H/s, daily)
 *  2. Blockchain.info charts API — fallback
 *
 * Cache: file-based, 1-hour TTL.
 */

import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const ONE_HOUR   = 60 * 60 * 1000;
const CACHE_FILE = join(process.cwd(), 'data', 'hash-ribbon-cache.json');
const GENESIS_MS = Date.UTC(2009, 0, 3);
const BRK_BASE   = 'https://bitview.space/api/series/bulk';
const DISPLAY_DAYS = 90;
const FETCH_DAYS   = DISPLAY_DAYS + 60; // 60d warm-up for MA

export interface HashRibbonPoint {
  date: string;
  hashrate: number;  // EH/s
  ma30:     number;  // 30d simple MA
  ma60:     number;  // 60d simple MA
}

export interface HashRibbonResponse {
  data:             HashRibbonPoint[];
  signal:           'bullish' | 'bearish' | 'neutral';
  currentHashrate:  number;  // EH/s
  currentMa30:      number;
  currentMa60:      number;
}

function sma(values: number[], window: number): number[] {
  return values.map((_, i) => {
    if (i < window - 1) return NaN;
    let s = 0;
    for (let j = i - window + 1; j <= i; j++) s += values[j];
    return s / window;
  });
}

function offsetToDate(offset: number): string {
  return new Date(GENESIS_MS + offset * 86_400_000).toISOString().slice(0, 10);
}

// ── BRK fetch ─────────────────────────────────────────────────────────────────

async function fetchFromBRK(): Promise<HashRibbonResponse> {
  const probeUrl = `https://bitview.space/api/series/hashrate/day1?limit=1`;
  const probeRes = await fetch(probeUrl, { signal: AbortSignal.timeout(8_000) });
  if (!probeRes.ok) throw new Error(`BRK probe: HTTP ${probeRes.status}`);
  const probe = (await probeRes.json()) as { total: number };
  const total  = probe.total;
  const start  = Math.max(0, total - FETCH_DAYS);

  const url    = `${BRK_BASE}?series=hashrate&index=day1&start=${start}&limit=${FETCH_DAYS}`;
  const res    = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`BRK bulk: HTTP ${res.status}`);

  const bulk   = (await res.json()) as Array<{ start: number; data: (number | null)[] }>;
  const series = Array.isArray(bulk) ? bulk[0] : (bulk as unknown as { start: number; data: (number | null)[] });
  if (!series?.data?.length) throw new Error('BRK: empty hashrate series');

  const rawEH    = series.data.map((v) => (v ?? 0) / 1e18);
  const ma30vals = sma(rawEH, 30);
  const ma60vals = sma(rawEH, 60);
  const dataStart = series.start;

  const points: HashRibbonPoint[] = [];
  const startIdx = rawEH.length - DISPLAY_DAYS;
  for (let i = Math.max(0, startIdx); i < rawEH.length; i++) {
    const ma30 = ma30vals[i];
    const ma60 = ma60vals[i];
    if (isNaN(ma30) || isNaN(ma60)) continue;
    points.push({
      date:     offsetToDate(dataStart + i),
      hashrate: Math.round(rawEH[i] * 10) / 10,
      ma30:     Math.round(ma30 * 10) / 10,
      ma60:     Math.round(ma60 * 10) / 10,
    });
  }

  if (points.length < 20) throw new Error('BRK: insufficient hashrate points');

  const last   = points[points.length - 1];
  const signal = last.ma30 > last.ma60 ? 'bullish' : last.ma30 < last.ma60 ? 'bearish' : 'neutral';

  return { data: points, signal, currentHashrate: last.hashrate, currentMa30: last.ma30, currentMa60: last.ma60 };
}

// ── Blockchain.info fallback ──────────────────────────────────────────────────

async function fetchFromBlockchainInfo(): Promise<HashRibbonResponse> {
  const url = `https://api.blockchain.info/charts/hash-rate?timespan=180days&format=json&cors=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`blockchain.info: HTTP ${res.status}`);

  const json = (await res.json()) as { values: { x: number; y: number }[] };
  const vals  = json.values;
  // blockchain.info returns GH/s historically
  const rawEH    = vals.map((v) => v.y / 1e9);   // GH/s → EH/s
  const ma30vals = sma(rawEH, 30);
  const ma60vals = sma(rawEH, 60);

  const points: HashRibbonPoint[] = vals
    .map((v, i) => ({
      date:     new Date(v.x * 1000).toISOString().slice(0, 10),
      hashrate: Math.round(rawEH[i] * 10) / 10,
      ma30:     Math.round((ma30vals[i] ?? 0) * 10) / 10,
      ma60:     Math.round((ma60vals[i] ?? 0) * 10) / 10,
    }))
    .filter((p) => p.ma30 > 0 && p.ma60 > 0)
    .slice(-DISPLAY_DAYS);

  const last   = points[points.length - 1];
  const signal = last?.ma30 > last?.ma60 ? 'bullish' : last?.ma30 < last?.ma60 ? 'bearish' : 'neutral';

  return {
    data: points,
    signal,
    currentHashrate: last?.hashrate ?? 0,
    currentMa30: last?.ma30 ?? 0,
    currentMa60: last?.ma60 ?? 0,
  };
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

function readCache(): { data: HashRibbonResponse; fetchedAt: number } | null {
  try {
    const stat = statSync(CACHE_FILE);
    const json = JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as HashRibbonResponse;
    return { data: json, fetchedAt: stat.mtimeMs };
  } catch {
    return null;
  }
}

function writeCache(data: HashRibbonResponse) {
  try {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch (e) {
    console.warn('[hash-ribbon] Could not write cache:', e);
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET() {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < ONE_HOUR) {
    return NextResponse.json(cached.data);
  }

  let result: HashRibbonResponse;
  try {
    result = await fetchFromBRK();
  } catch (brkErr) {
    console.warn('[hash-ribbon] BRK failed, trying fallback:', (brkErr as Error).message);
    try {
      result = await fetchFromBlockchainInfo();
    } catch (fbErr) {
      console.error('[hash-ribbon] Both sources failed:', (fbErr as Error).message);
      if (cached) return NextResponse.json(cached.data);
      return NextResponse.json(
        { data: [], signal: 'neutral', currentHashrate: 0, currentMa30: 0, currentMa60: 0 },
        { status: 503 }
      );
    }
  }

  writeCache(result);
  return NextResponse.json(result);
}
