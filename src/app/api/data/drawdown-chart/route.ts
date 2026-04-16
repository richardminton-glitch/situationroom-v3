import * as fs   from 'fs';
import * as path from 'path';
import { NextResponse } from 'next/server';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DayPrice { date: string; price: number; }

interface CycleDef {
  id:    string;
  label: string;
  from:  string;        // ISO date — start of cycle era (halving date)
  to:    string | null; // ISO date — bear-market low (null = live cycle)
}

export interface CycleMeta {
  id:       string;
  label:    string;
  athDate:  string;
  athPrice: number;
  endDate:  string;
  endPrice: number;
  live:     boolean;
  days:     number;     // total days of data in this cycle from ATH
}

export interface DrawdownChartResponse {
  // Recharts-ready: each row = one day offset from ATH
  // Keys: "day" + one per cycle id (null when cycle had ended)
  data:   Record<string, number | null>[];
  cycles: CycleMeta[];
  maxDay: number;
}

// ── Cycle definitions ─────────────────────────────────────────────────────────
// Cycles are anchored to halving dates; ATH is computed dynamically as the
// highest daily close within each era.

const CYCLE_DEFS: CycleDef[] = [
  { id: 'c2013', label: '2013', from: '2012-11-28', to: '2015-08-24' },
  { id: 'c2017', label: '2017', from: '2016-07-09', to: '2018-12-13' },
  { id: 'c2021', label: '2021', from: '2020-05-11', to: '2022-11-20' },
  { id: 'c2024', label: '2024', from: '2024-04-20', to: null },
];

const MAX_DAYS = 900; // x-axis ceiling

// ── CSV reader ────────────────────────────────────────────────────────────────

function readCsv(): DayPrice[] {
  // Order matters: prefer the runtime-mutable copy in data/ (updated daily
  // by scripts/log-btc-daily-close.js) over the static seed in src/lib/data/.
  // The seed is committed to git for first-boot/CI; the runtime copy stays
  // gitignored so daily appends don't fight `git pull` on deploy.
  const candidates = [
    path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'btc-price-history.csv'),
    path.join(/* turbopackIgnore: true */ process.cwd(), 'src', 'lib', 'data', 'btc-price-history.csv'),
  ];

  for (const p of candidates) {
    try {
      let raw = fs.readFileSync(p, 'utf-8').replace(/^\uFEFF/, '');
      const rows = raw.trim().split('\n').slice(1); // skip header
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
    } catch { /* try next candidate */ }
  }
  return [];
}

// ── In-memory cache (1 h) ─────────────────────────────────────────────────────

let _cache: { data: DrawdownChartResponse; ts: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000;

// ── Compute ───────────────────────────────────────────────────────────────────

function compute(prices: DayPrice[]): DrawdownChartResponse {
  const today = new Date().toISOString().slice(0, 10);

  // Per-cycle drawdown arrays (index = days since ATH)
  const seriesMap: Record<string, (number | null)[]> = {};
  const cycles:    CycleMeta[]                       = [];

  for (const def of CYCLE_DEFS) {
    const endDate     = def.to ?? today;
    const cyclePrices = prices.filter(p => p.date >= def.from && p.date <= endDate);
    if (cyclePrices.length < 2) continue;

    // Find ATH index within the cycle era
    let athIdx = 0;
    for (let i = 1; i < cyclePrices.length; i++) {
      if (cyclePrices[i].price > cyclePrices[athIdx].price) athIdx = i;
    }
    const athDate  = cyclePrices[athIdx].date;
    const athPrice = cyclePrices[athIdx].price;

    // Build drawdown series from ATH onwards
    const fromAth  = cyclePrices.slice(athIdx);
    const series: (number | null)[] = new Array(MAX_DAYS).fill(null);
    for (let i = 0; i < fromAth.length && i < MAX_DAYS; i++) {
      series[i] = +((fromAth[i].price / athPrice - 1) * 100).toFixed(2);
    }

    seriesMap[def.id] = series;
    cycles.push({
      id:       def.id,
      label:    def.label,
      athDate,
      athPrice: +athPrice.toFixed(0),
      endDate:  fromAth[fromAth.length - 1].date,
      endPrice: +fromAth[fromAth.length - 1].price.toFixed(0),
      live:     def.to === null,
      days:     fromAth.length,
    });
  }

  // Determine actual last day needed (trim trailing all-null)
  let maxDay = 0;
  for (const c of cycles) maxDay = Math.max(maxDay, c.days - 1);
  maxDay = Math.min(maxDay, MAX_DAYS - 1);

  // Build combined Recharts-ready array
  const data: Record<string, number | null>[] = [];
  for (let day = 0; day <= maxDay; day++) {
    const row: Record<string, number | null> = { day };
    for (const def of CYCLE_DEFS) {
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
