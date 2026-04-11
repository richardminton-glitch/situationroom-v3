/**
 * Spiral Gauge data — log-polar Bitcoin 4-year cycle chart.
 *
 * Inspired by the "Bitcoin Spiral: 4 Year Cycle" concept (@therationalroot).
 *
 * Encoding:
 *   angle   = time, clockwise, 4 years = one full revolution
 *   radius  = log10(price) mapped to $1–$1M range
 *   colour  = percentile rank of price/200-week MA
 *              (green = near/below MA, red = far above MA)
 */

import * as fs   from 'fs';
import * as path from 'path';
import { NextResponse } from 'next/server';

// ── SVG geometry ──────────────────────────────────────────────────────────────
const SPIRAL_CX     = 170;
const SPIRAL_CY     = 170;
const R_CENTER      = 42;    // centre disc (holds composite score)
const R_INNER       = 50;    // radius when price = $1
const R_OUTER       = 132;   // radius when price = $1 M
const LOG_P_MIN     = 0;     // log10($1)
const LOG_P_MAX     = 6;     // log10($1 M)

// ── Time constants ────────────────────────────────────────────────────────────
const ORIGIN_MS      = new Date('2009-01-03').getTime(); // genesis block
const DAYS_PER_CYCLE = 4 * 365.25;                       // ~4-year halving cycle

// ── Sampling / MA ─────────────────────────────────────────────────────────────
const SAMPLE_DAYS = 7;   // one point per week
const MA_WIN      = 200; // 200-week sliding window

// ── Reference data ────────────────────────────────────────────────────────────
const HALVING_DATES  = ['2012-11-28', '2016-07-09', '2020-05-11', '2024-04-20'];
const PRICE_TICKS    = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

// ── Types ─────────────────────────────────────────────────────────────────────
interface DayPrice { date: string; price: number; }

export interface SpiralSegment {
  x1: number; y1: number;
  x2: number; y2: number;
  color: string;
  date: string;
}

export interface PriceTick  { r: number; label: string; }
export interface HalvingMark { x: number; y: number; year: number; }

export interface SpiralGaugeData {
  segments:     SpiralSegment[];
  tipX:         number;
  tipY:         number;
  tipColor:     string;
  currentPrice: number;
  currentDate:  string;
  priceTicks:   PriceTick[];
  halvings:     HalvingMark[];
  rCenter:      number;
  rOuter:       number;
}

// ── CSV reader ────────────────────────────────────────────────────────────────
function readCsv(): DayPrice[] {
  const candidates = [
    path.join(/* turbopackIgnore: true */ process.cwd(), 'src', 'lib', 'data', 'btc-price-history.csv'),
    path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'btc-price-history.csv'),
  ];
  for (const p of candidates) {
    try {
      let raw = fs.readFileSync(p, 'utf-8').replace(/^\uFEFF/, '');
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

// ── Geometry helpers ──────────────────────────────────────────────────────────
function priceToR(price: number): number {
  const log = Math.log10(Math.max(1, price));
  const t   = Math.min(1, Math.max(0, (log - LOG_P_MIN) / (LOG_P_MAX - LOG_P_MIN)));
  return R_INNER + (R_OUTER - R_INNER) * t;
}

function dateToTheta(dateStr: string): number {
  const days = (new Date(dateStr).getTime() - ORIGIN_MS) / 86400000;
  // Clockwise from top: subtract π/2 so t=0 starts at 12 o'clock
  return (days / DAYS_PER_CYCLE) * 2 * Math.PI - Math.PI / 2;
}

function toXY(dateStr: string, price: number): { x: number; y: number } {
  const theta = dateToTheta(dateStr);
  const r     = priceToR(price);
  return {
    x: +(SPIRAL_CX + r * Math.cos(theta)).toFixed(2),
    y: +(SPIRAL_CY + r * Math.sin(theta)).toFixed(2),
  };
}

// ── Colour: percentile rank of price / 200-week MA ───────────────────────────
function percentileToHsl(pct: number): string {
  let h: number, s: number, l: number;
  if (pct <= 0.5) {
    const t = pct / 0.5;
    h = Math.round(155 - t * (155 - 48));
    s = Math.round(72  + t * (85  - 72));
    l = Math.round(35  + t * (48  - 35));
  } else {
    const t = (pct - 0.5) / 0.5;
    h = Math.round(48  - t * 48);
    s = Math.round(85  + t * (90  - 85));
    l = Math.round(48  - t * (48  - 38));
  }
  return `hsl(${h},${s}%,${l}%)`;
}

// ── Cache ─────────────────────────────────────────────────────────────────────
let _cache: { data: SpiralGaugeData; ts: number } | null = null;
const CACHE_TTL = 3_600_000;

// ── Computation ───────────────────────────────────────────────────────────────
function compute(): SpiralGaugeData {
  const all = readCsv();
  if (!all.length) throw new Error('No price data');

  // Weekly sample
  const weekly: DayPrice[] = [];
  for (let i = 0; i < all.length; i += SAMPLE_DAYS) weekly.push(all[i]);
  const N = weekly.length;

  // 200-week sliding MA
  const ma: number[] = new Array(N);
  let sum = 0;
  for (let i = 0; i < N; i++) {
    sum += weekly[i].price;
    if (i >= MA_WIN) sum -= weekly[i - MA_WIN].price;
    ma[i] = sum / Math.min(i + 1, MA_WIN);
  }

  // Ratios + percentile lookup
  const ratios = weekly.map((w, i) => (ma[i] > 0 ? w.price / ma[i] : 1));
  const sorted  = [...ratios].sort((a, b) => a - b);

  function pct(r: number): number {
    let lo = 0, hi = sorted.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] < r) lo = mid + 1; else hi = mid;
    }
    return lo / (sorted.length - 1);
  }

  // Build point array
  const pts = weekly.map((w, i) => {
    const { x, y } = toXY(w.date, w.price);
    return { x, y, color: percentileToHsl(pct(ratios[i])) };
  });

  // Segments
  const segments: SpiralSegment[] = [];
  for (let i = 1; i < N; i++) {
    segments.push({
      x1: pts[i - 1].x, y1: pts[i - 1].y,
      x2: pts[i].x,     y2: pts[i].y,
      color: pts[i].color,
      date:  weekly[i].date,
    });
  }

  // Price-axis reference ticks
  const priceTicks: PriceTick[] = PRICE_TICKS.map(p => ({
    r:     +priceToR(p).toFixed(1),
    label: p >= 1_000_000 ? '$1M'
         : p >= 1_000     ? `$${p / 1000}k`
         : `$${p}`,
  }));

  // Halving markers (use nearest daily price)
  const halvings: HalvingMark[] = HALVING_DATES.map(hDate => {
    const hMs = new Date(hDate).getTime();
    const near = all.reduce((b, d) =>
      Math.abs(new Date(d.date).getTime() - hMs) <
      Math.abs(new Date(b.date).getTime() - hMs) ? d : b
    );
    const { x, y } = toXY(hDate, near.price);
    return { x, y, year: +hDate.slice(0, 4) };
  });

  const last = pts[N - 1];
  return {
    segments,
    tipX: last.x, tipY: last.y, tipColor: last.color,
    currentPrice: weekly[N - 1].price,
    currentDate:  weekly[N - 1].date,
    priceTicks,
    halvings,
    rCenter: R_CENTER,
    rOuter:  R_OUTER,
  };
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function GET() {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return NextResponse.json(_cache.data, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  }
  try {
    const data = compute();
    _cache = { data, ts: Date.now() };
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
