/**
 * Spiral Gauge data.
 *
 * Reads the long-term BTC price CSV, samples weekly, computes a 200-week
 * moving-average ratio for each point, maps that ratio to a heat colour
 * (green ↔ yellow ↔ orange ↔ red), and returns pre-calculated SVG segment
 * coordinates for the spiral.
 *
 * Radius encoding: log-normalised BTC price — the spiral arm expands
 * outward on bull runs and contracts inward during bear markets, creating
 * a visible "channel" effect that traces actual price history.
 *
 * Colour logic: percentile-rank of price/200wMA across all history, so the
 * colour distribution is always balanced — exactly 50% of points in the
 * green half regardless of current cycle position.
 */

import * as fs   from 'fs';
import * as path from 'path';
import { NextResponse } from 'next/server';

// ── SVG geometry constants ────────────────────────────────────────────────────
const SPIRAL_CX          = 170;
const SPIRAL_CY          = 170;
const R_MIN              = 58;     // innermost radius (just outside centre disc)
const SPIRAL_MAX_R       = 132;   // outermost radius
const SPIRAL_REVOLUTIONS = 4;     // ~one per halving cycle (4 years each)

// ── Sampling / MA ─────────────────────────────────────────────────────────────
const SAMPLE_DAYS = 7;    // one point per week
const MA_WIN      = 200;  // 200-week MA window (in weekly samples)

// ── Types ─────────────────────────────────────────────────────────────────────
interface DayPrice { date: string; price: number; }

export interface SpiralSegment {
  x1: number; y1: number;
  x2: number; y2: number;
  color: string;
  date: string;   // ISO date of segment END point
}

export interface SpiralGaugeData {
  segments:     SpiralSegment[];
  tipX:         number;
  tipY:         number;
  tipColor:     string;
  currentPrice: number;
  currentDate:  string;
}

// ── CSV reader ────────────────────────────────────────────────────────────────
function readCsv(): DayPrice[] {
  const candidates = [
    path.join(process.cwd(), 'src', 'lib', 'data', 'btc-price-history.csv'),
    path.join(process.cwd(), 'data', 'btc-price-history.csv'),
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

// ── Colour mapping (percentile-based) ────────────────────────────────────────
/**
 * Maps a 0–1 percentile rank of price/200wMA to an HSL heat colour.
 * Using percentile ranking guarantees a balanced colour distribution:
 * the bottom 50% of all historical readings map to the green family,
 * and the top 50% map to the orange/red family.
 *
 *  pct = 0.00  →  deep teal-green  (hsl 155, 72%, 35%)
 *  pct = 0.50  →  golden yellow    (hsl 48,  85%, 48%)
 *  pct = 1.00  →  deep red         (hsl 0,   88%, 38%)
 */
function percentileToHsl(pct: number): string {
  let h: number, s: number, l: number;

  if (pct <= 0.5) {
    const t = pct / 0.5;                              // 0→1
    h = Math.round(155 - t * (155 - 48));             // 155→48
    s = Math.round(72  + t * (85  - 72));             // 72→85
    l = Math.round(35  + t * (48  - 35));             // 35→48
  } else {
    const t = (pct - 0.5) / 0.5;                      // 0→1
    h = Math.round(48  - t * 48);                     // 48→0
    s = Math.round(85  + t * (90  - 85));             // 85→90
    l = Math.round(48  - t * (48  - 38));             // 48→38
  }

  return `hsl(${h},${s}%,${l}%)`;
}

// ── Spiral point math (price-encoded radius) ──────────────────────────────────
/**
 * Converts a weekly sample index to (x, y), where:
 *  - theta progresses uniformly around the spiral (time → angle)
 *  - r is derived from log-normalised price (price → radius)
 *
 * This creates a channel that visibly expands on bull runs and
 * contracts during bear markets.
 */
function spiralXY(
  i: number,
  n: number,
  logNormPrice: number,   // 0–1, log-normalised price for this point
): { x: number; y: number } {
  const t     = i / (n - 1);
  const theta = t * SPIRAL_REVOLUTIONS * 2 * Math.PI - Math.PI / 2; // start at top
  const r     = R_MIN + (SPIRAL_MAX_R - R_MIN) * logNormPrice;
  return {
    x: +(SPIRAL_CX + r * Math.cos(theta)).toFixed(2),
    y: +(SPIRAL_CY + r * Math.sin(theta)).toFixed(2),
  };
}

// ── In-memory cache ───────────────────────────────────────────────────────────
let _cache: { data: SpiralGaugeData; ts: number } | null = null;
const CACHE_TTL = 3_600_000; // 1 hour

// ── Computation ───────────────────────────────────────────────────────────────
function compute(): SpiralGaugeData {
  const all = readCsv();
  if (!all.length) throw new Error('No price data');

  // Weekly sample
  const weekly: DayPrice[] = [];
  for (let i = 0; i < all.length; i += SAMPLE_DAYS) weekly.push(all[i]);

  const N = weekly.length;

  // Sliding 200-week MA (in weekly sample space)
  const ma: number[] = new Array(N);
  let windowSum = 0;
  for (let i = 0; i < N; i++) {
    windowSum += weekly[i].price;
    if (i >= MA_WIN) windowSum -= weekly[i - MA_WIN].price;
    ma[i] = windowSum / Math.min(i + 1, MA_WIN);
  }

  // Compute price/MA ratios for ALL points
  const ratios: number[] = new Array(N);
  for (let i = 0; i < N; i++) {
    ratios[i] = ma[i] > 0 ? weekly[i].price / ma[i] : 1;
  }

  // Sort ratios for percentile lookup
  const sortedRatios = [...ratios].sort((a, b) => a - b);

  function getPercentile(r: number): number {
    // Binary search for position in sorted array
    let lo = 0, hi = sortedRatios.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sortedRatios[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    return lo / (sortedRatios.length - 1);
  }

  // Log-normalise prices for radius encoding
  const prices    = weekly.map(w => w.price);
  const logMin    = Math.log(Math.min(...prices));
  const logMax    = Math.log(Math.max(...prices));
  const logRange  = logMax - logMin;

  // Build (x,y,color) per sample
  const pts: { x: number; y: number; color: string }[] = [];
  for (let i = 0; i < N; i++) {
    const logNorm = logRange > 0
      ? (Math.log(weekly[i].price) - logMin) / logRange
      : 0.5;
    const { x, y } = spiralXY(i, N, logNorm);
    const pct = getPercentile(ratios[i]);
    pts.push({ x, y, color: percentileToHsl(pct) });
  }

  // Build segments (each segment = line between adjacent points)
  const segments: SpiralSegment[] = [];
  for (let i = 1; i < N; i++) {
    segments.push({
      x1:    pts[i - 1].x,
      y1:    pts[i - 1].y,
      x2:    pts[i].x,
      y2:    pts[i].y,
      color: pts[i].color,
      date:  weekly[i].date,
    });
  }

  const last = pts[N - 1];

  return {
    segments,
    tipX:         last.x,
    tipY:         last.y,
    tipColor:     last.color,
    currentPrice: weekly[N - 1].price,
    currentDate:  weekly[N - 1].date,
  };
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function GET() {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return NextResponse.json(_cache.data, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  }

  try {
    const data = compute();
    _cache = { data, ts: Date.now() };
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
