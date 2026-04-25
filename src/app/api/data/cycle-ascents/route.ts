/**
 * GET /api/data/cycle-ascents
 *
 * The inverse of /api/data/drawdown-chart. Each series tracks the rally
 * from a cycle low to the next cycle ATH, expressed as a *multiple of
 * the cycle low* (1x at start, climbing to ~7x for 2024 and ~600x for
 * 2013). Log scale on the consumer end keeps the four cycles visually
 * comparable despite the wildly different absolute returns.
 *
 * Anchors are hand-set per cycle low/top. The 2024 cycle's ATH is
 * 2025-10-06 ($124,725); the next cycle low has not yet happened, so
 * there is no live ascent series — all four are completed historicals.
 */

import * as fs   from 'fs';
import * as path from 'path';
import { NextResponse } from 'next/server';

interface DayPrice { date: string; price: number; }

interface AscentDef {
  id:    string;
  label: string;
  from:  string; // cycle low date
  to:    string; // next cycle ATH date
}

export interface AscentMeta {
  id:        string;
  label:     string;
  lowDate:   string;
  lowPrice:  number;
  topDate:   string;
  topPrice:  number;
  multiple:  number; // top / low
  days:      number;
}

export interface CycleAscentsResponse {
  data:   Record<string, number | null>[];
  cycles: AscentMeta[];
  maxDay: number;
}

// Cycle-low → next-cycle-ATH anchors. Lows lifted from the existing
// drawdown chart's `to` dates; tops are the in-cycle ATH closes.
const ASCENT_DEFS: AscentDef[] = [
  { id: 'a2013', label: '2013', from: '2011-11-18', to: '2013-12-04' },
  { id: 'a2017', label: '2017', from: '2015-08-24', to: '2017-12-16' },
  { id: 'a2021', label: '2021', from: '2018-12-13', to: '2021-11-08' },
  { id: 'a2024', label: '2024', from: '2022-11-20', to: '2025-10-06' },
];

const MAX_DAYS = 1200;

// ── CSV reader (same dual-candidate strategy as drawdown route) ───────────────

function readCsv(): DayPrice[] {
  const candidates = [
    path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'btc-price-history.csv'),
    path.join(/* turbopackIgnore: true */ process.cwd(), 'src', 'lib', 'data', 'btc-price-history.csv'),
  ];

  for (const p of candidates) {
    try {
      const raw = fs.readFileSync(p, 'utf-8').replace(/^\uFEFF/, '');
      const rows = raw.trim().split('\n').slice(1);
      const result: DayPrice[] = [];
      for (const row of rows) {
        const [dateStr, priceStr] = row.trim().split(',');
        if (!dateStr || !priceStr) continue;
        const parts = dateStr.split('/');
        if (parts.length !== 3) continue;
        const [dd, mm, yyyy] = parts;
        const date  = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        const price = parseFloat(priceStr);
        if (!isNaN(price) && price > 0) result.push({ date, price });
      }
      return result.sort((a, b) => a.date.localeCompare(b.date));
    } catch { /* try next */ }
  }
  return [];
}

// ── Cache ─────────────────────────────────────────────────────────────────────

let _cache: { data: CycleAscentsResponse; ts: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1h

// ── Compute ───────────────────────────────────────────────────────────────────

function compute(prices: DayPrice[]): CycleAscentsResponse {
  const seriesMap: Record<string, (number | null)[]> = {};
  const cycles:    AscentMeta[]                       = [];

  for (const def of ASCENT_DEFS) {
    const cyclePrices = prices.filter(p => p.date >= def.from && p.date <= def.to);
    if (cyclePrices.length < 2) continue;

    // Anchor low: the first observation at or after `from` (use that price
    // as the denominator). If the CSV's earliest row is later than `from`,
    // we still anchor at whatever we have — the multiple is still meaningful
    // relative to that starting point.
    const lowPrice = cyclePrices[0].price;
    const lowDate  = cyclePrices[0].date;

    // Top: max within window (matches the user's "next cycle top" framing
    // even if the in-window high doesn't fall exactly on `def.to`).
    let topIdx = 0;
    for (let i = 1; i < cyclePrices.length; i++) {
      if (cyclePrices[i].price > cyclePrices[topIdx].price) topIdx = i;
    }
    const topDate  = cyclePrices[topIdx].date;
    const topPrice = cyclePrices[topIdx].price;

    // Truncate at the in-window top so the line ends at the ATH, not later
    const upToTop = cyclePrices.slice(0, topIdx + 1);
    const series: (number | null)[] = new Array(MAX_DAYS).fill(null);
    for (let i = 0; i < upToTop.length && i < MAX_DAYS; i++) {
      series[i] = +(upToTop[i].price / lowPrice).toFixed(3);
    }

    seriesMap[def.id] = series;
    cycles.push({
      id:       def.id,
      label:    def.label,
      lowDate,
      lowPrice: +lowPrice.toFixed(2),
      topDate,
      topPrice: +topPrice.toFixed(0),
      multiple: +(topPrice / lowPrice).toFixed(1),
      days:     upToTop.length,
    });
  }

  let maxDay = 0;
  for (const c of cycles) maxDay = Math.max(maxDay, c.days - 1);
  maxDay = Math.min(maxDay, MAX_DAYS - 1);

  const data: Record<string, number | null>[] = [];
  for (let day = 0; day <= maxDay; day++) {
    const row: Record<string, number | null> = { day };
    for (const def of ASCENT_DEFS) {
      row[def.id] = seriesMap[def.id]?.[day] ?? null;
    }
    data.push(row);
  }

  return { data, cycles, maxDay };
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET() {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return NextResponse.json(_cache.data, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  }

  const prices = readCsv();
  if (!prices.length) {
    return NextResponse.json({ error: 'Price history unavailable' }, { status: 500 });
  }

  const result = compute(prices);
  _cache = { data: result, ts: Date.now() };

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
