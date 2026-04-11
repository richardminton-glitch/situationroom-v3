/**
 * Spiral Gauge data.
 *
 * Reads the long-term BTC price CSV, samples weekly, computes a 200-week
 * moving-average ratio for each point, maps that ratio to a heat colour
 * (green ↔ yellow ↔ orange ↔ red), and returns pre-calculated SVG segment
 * coordinates for the Archimedean spiral.
 *
 * Colour logic mirrors the "200-week MA Heatmap" concept:
 *   price/MA  < 1.0  →  green family (undervalued)
 *   price/MA  ~ 1.0  →  yellow (fair value)
 *   price/MA  > 2.0  →  orange → red (overvalued)
 */

import * as fs   from 'fs';
import * as path from 'path';
import { NextResponse } from 'next/server';

// ── SVG geometry constants ────────────────────────────────────────────────────
const SPIRAL_CX          = 170;
const SPIRAL_CY          = 170;
const SPIRAL_MAX_R       = 135;    // outer edge of spiral arm
const SPIRAL_REVOLUTIONS = 5;      // full turns from centre to edge

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

// ── Colour mapping ────────────────────────────────────────────────────────────
/**
 * Maps price / 200-week MA ratio to an HSL heat colour.
 *
 *  ratio  ≤ 0.3  →  deep teal-green  (hsl 155, 72%, 35%)
 *  ratio  = 1.0  →  golden yellow    (hsl 48,  85%, 48%)
 *  ratio  ≥ 4.0  →  deep red         (hsl 0,   88%, 38%)
 */
function ratioToHsl(ratio: number): string {
  let h: number, s: number, l: number;

  if (ratio <= 0.3) {
    h = 155; s = 72; l = 35;
  } else if (ratio <= 1.0) {
    const t = (ratio - 0.3) / 0.7;          // 0→1
    h = Math.round(155 - t * (155 - 48));    // 155→48
    s = Math.round(72  - t * (72  - 85));    // 72→85
    l = Math.round(35  + t * (48  - 35));    // 35→48
  } else if (ratio <= 2.0) {
    const t = (ratio - 1.0) / 1.0;
    h = Math.round(48  - t * (48  - 18));    // 48→18
    s = Math.round(85  + t * (90  - 85));    // 85→90
    l = Math.round(48  - t * (48  - 50));    // 48→50
  } else if (ratio <= 4.0) {
    const t = (ratio - 2.0) / 2.0;
    h = Math.round(18  - t * 18);            // 18→0
    s = 90;
    l = Math.round(50  - t * (50  - 38));    // 50→38
  } else {
    h = 0; s = 90; l = 38;
  }

  return `hsl(${h},${s}%,${l}%)`;
}

// ── Spiral point math ─────────────────────────────────────────────────────────
function spiralXY(i: number, n: number): { x: number; y: number } {
  const t     = i / (n - 1);
  const theta = t * SPIRAL_REVOLUTIONS * 2 * Math.PI - Math.PI / 2; // start at top
  const r     = t * SPIRAL_MAX_R;
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

  // Build (x,y,color) per sample
  const pts: { x: number; y: number; color: string }[] = [];
  for (let i = 0; i < N; i++) {
    const { x, y } = spiralXY(i, N);
    const ratio     = ma[i] > 0 ? weekly[i].price / ma[i] : 1;
    pts.push({ x, y, color: ratioToHsl(ratio) });
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
