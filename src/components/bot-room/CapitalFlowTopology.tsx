'use client';

/**
 * Capital Flow Nexus — full-width animated Canvas 2D visualization.
 *
 * Displays all 28 heatmap tickers across 5 asset-class zones with live
 * data-driven flow animations simulating capital movement between zones.
 *
 * Zones (L→R): Global Indices | US Indices | BTC Ecosystem | FX & Yields | Commodities
 *
 * BTC sits at the center of a circular constellation of BTC-correlated equities.
 * Bezier flow channels connect adjacent zones. Particle direction and intensity
 * are driven by relative zone performance from the live data snapshot.
 *
 * Uses ResizeObserver + rAF for responsive 60fps rendering.
 * Consumes live data via the shared DataProvider context.
 */

import { useRef, useEffect } from 'react';
import { useData } from '@/components/layout/DataProvider';
import { C, FONT } from './constants';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FlowTicker {
  label: string;
  src: 'btcMarket' | 'indices' | 'commodities' | 'fx' | 'btcEquities';
  key: string;
}

interface Zone {
  id: string;
  label: string;
  color: string;
  xPct: number;   // x-center as fraction of canvas width
  tickers: FlowTicker[];
}

interface NodePos {
  x: number;
  y: number;
  zone: number;
  tickerIdx: number;
  isBtcCenter: boolean;
  angle?: number;  // radians — only for BTC ring nodes
}

interface Particle {
  channel: number; // 0-3 = zone channels, 4-10 = BTC equity connections
  t: number;       // 0–1 position along path
  speed: number;
  size: number;
}

// ── Zone Definitions (all 28 heatmap tickers) ─────────────────────────────────

const ZONES: Zone[] = [
  {
    id: 'global', label: 'GLOBAL', color: '#4a9eff', xPct: 0.08,
    tickers: [
      { label: 'FTSE', src: 'indices',     key: 'ftse' },
      { label: 'DAX',  src: 'indices',     key: 'dax' },
      { label: 'N225', src: 'indices',     key: 'nikkei' },
      { label: 'HSI',  src: 'indices',     key: 'hsi' },
    ],
  },
  {
    id: 'us', label: 'US INDICES', color: '#00d4aa', xPct: 0.25,
    tickers: [
      { label: 'NDX', src: 'indices', key: 'nasdaq' },
      { label: 'SPX', src: 'indices', key: 'sp500' },
      { label: 'DJI', src: 'indices', key: 'dji' },
      { label: 'VIX', src: 'indices', key: 'vix' },
    ],
  },
  {
    id: 'btc', label: 'BTC ECOSYSTEM', color: '#f7931a', xPct: 0.50,
    tickers: [
      { label: 'BTC',  src: 'btcMarket',   key: '' },
      { label: 'MSTR', src: 'btcEquities', key: 'mstr' },
      { label: 'COIN', src: 'btcEquities', key: 'coin' },
      { label: 'IBIT', src: 'btcEquities', key: 'ibit' },
      { label: 'MARA', src: 'btcEquities', key: 'mara' },
      { label: 'RIOT', src: 'btcEquities', key: 'riot' },
      { label: 'CLSK', src: 'btcEquities', key: 'clsk' },
      { label: 'HUT',  src: 'btcEquities', key: 'hut' },
    ],
  },
  {
    id: 'fx', label: 'FX & YIELDS', color: '#ff6b4a', xPct: 0.75,
    tickers: [
      { label: 'DXY', src: 'commodities', key: 'dxy' },
      { label: 'EUR', src: 'fx',          key: 'eur' },
      { label: 'JPY', src: 'fx',          key: 'jpy' },
      { label: 'GBP', src: 'fx',          key: 'gbp' },
      { label: 'CNY', src: 'fx',          key: 'cny' },
      { label: '10Y', src: 'commodities', key: 'us10y' },
      { label: '2Y',  src: 'commodities', key: 'us2y' },
    ],
  },
  {
    id: 'commodities', label: 'COMMODITIES', color: '#ffd700', xPct: 0.92,
    tickers: [
      { label: 'GOLD', src: 'commodities', key: 'gold' },
      { label: 'SLVR', src: 'commodities', key: 'silver' },
      { label: 'OIL',  src: 'commodities', key: 'crude-oil' },
      { label: 'NGAS', src: 'commodities', key: 'natural-gas' },
      { label: 'CPPR', src: 'commodities', key: 'copper' },
    ],
  },
];

const ZONE_CHANNEL_COUNT = 4;   // adjacent zone-to-zone channels
const BTC_EQUITY_COUNT = 7;     // BTC center → each equity
const CHANNEL_PAIRS: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4]];

// ── Data Helpers ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveChange(t: FlowTicker, data: any): number | null {
  if (!data) return null;
  if (t.src === 'btcMarket') return data.btcMarket?.change24h ?? null;
  const bucket = data[t.src];
  if (!bucket) return null;
  const entry = (bucket as Record<string, { changePct: number }>)[t.key];
  if (!entry) return null;
  return entry.changePct * 100;   // decimal ratio → percentage points
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function zoneAvg(zone: Zone, data: any): number {
  let sum = 0, count = 0;
  for (const t of zone.tickers) {
    const v = resolveChange(t, data);
    if (v !== null) { sum += v; count++; }
  }
  return count > 0 ? sum / count : 0;
}

// ── Bezier Interpolation ──────────────────────────────────────────────────────

function cubic(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CapitalFlowTopology() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const { data }     = useData();
  const dataRef      = useRef(data);
  dataRef.current    = data;

  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0;

    // ── Initialise particles ──────────────────────────────────────────
    const particles: Particle[] = [];
    for (let i = 0; i < ZONE_CHANNEL_COUNT; i++) {
      for (let j = 0; j < 8; j++) {
        particles.push({
          channel: i,
          t: Math.random(),
          speed: 0.0016 + Math.random() * 0.0022,
          size: 1.1 + Math.random() * 1.0,
        });
      }
    }
    for (let i = 0; i < BTC_EQUITY_COUNT; i++) {
      for (let j = 0; j < 3; j++) {
        particles.push({
          channel: ZONE_CHANNEL_COUNT + i,
          t: Math.random(),
          speed: 0.0022 + Math.random() * 0.002,
          size: 0.9 + Math.random() * 0.8,
        });
      }
    }

    // ── Resize observer ───────────────────────────────────────────────
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        w = entry.contentRect.width;
        h = entry.contentRect.height;
        const dpr = window.devicePixelRatio || 1;
        canvas.width  = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width  = `${w}px`;
        canvas.style.height = `${h}px`;
      }
    });
    ro.observe(container);

    // ── Node layout computation ───────────────────────────────────────
    function computeNodes(): NodePos[] {
      const nodes: NodePos[] = [];
      const cy     = h / 2;
      const topPad = 28;   // space for zone label
      const botPad = 8;

      for (let zi = 0; zi < ZONES.length; zi++) {
        const zone = ZONES[zi];
        const zx   = zone.xPct * w;

        if (zone.id === 'btc') {
          // BTC center + equities in circular ring
          const ringR = Math.min(w * 0.105, (h - topPad - botPad) * 0.36);
          nodes.push({ x: zx, y: cy, zone: zi, tickerIdx: 0, isBtcCenter: true });
          for (let i = 1; i < zone.tickers.length; i++) {
            const angle = ((i - 1) / 7) * Math.PI * 2 - Math.PI / 2;
            nodes.push({
              x: zx + ringR * Math.cos(angle),
              y: cy + ringR * Math.sin(angle),
              zone: zi, tickerIdx: i, isBtcCenter: false, angle,
            });
          }
        } else {
          // Vertical column layout
          const count   = zone.tickers.length;
          const usableH = h - topPad - botPad;
          const spacing  = usableH / (count + 1);
          for (let i = 0; i < count; i++) {
            nodes.push({
              x: zx,
              y: topPad + spacing * (i + 1),
              zone: zi, tickerIdx: i, isBtcCenter: false,
            });
          }
        }
      }
      return nodes;
    }

    // ── Flow channel bezier bow ───────────────────────────────────────
    function bowOffset(channelIdx: number): number {
      return (channelIdx % 2 === 0 ? -1 : 1) * Math.min(h * 0.13, 38);
    }

    // ── Main draw loop ────────────────────────────────────────────────
    let rafId: number;

    function draw(timestamp: number) {
      if (w === 0 || h === 0) { rafId = requestAnimationFrame(draw); return; }

      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const snap  = dataRef.current;
      const nodes = computeNodes();
      const cy    = h / 2;

      // ───────────── 1. Scan-line background ─────────────────────────
      ctx.globalAlpha = 0.02;
      ctx.fillStyle = '#00d4aa';
      for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
      ctx.globalAlpha = 1;

      // ───────────── 2. Zone divider lines ───────────────────────────
      const divX = [0.165, 0.375, 0.625, 0.835];
      ctx.setLineDash([2, 6]);
      ctx.lineWidth = 1;
      for (const d of divX) {
        ctx.beginPath();
        ctx.moveTo(d * w, 6);
        ctx.lineTo(d * w, h - 4);
        ctx.strokeStyle = 'rgba(0,212,170,0.05)';
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // ───────────── 3. Horizontal scan beam ─────────────────────────
      const beamY = ((timestamp / 3500) % 1) * h;
      const beam  = ctx.createLinearGradient(0, beamY - 30, 0, beamY + 30);
      beam.addColorStop(0,   'rgba(0,212,170,0)');
      beam.addColorStop(0.5, 'rgba(0,212,170,0.045)');
      beam.addColorStop(1,   'rgba(0,212,170,0)');
      ctx.fillStyle = beam;
      ctx.fillRect(0, beamY - 30, w, 60);

      // ───────────── 4. Zone spines (vertical connection within cols)
      for (const zi of [0, 1, 3, 4]) {
        const zoneNodes = nodes.filter(n => n.zone === zi);
        if (zoneNodes.length < 2) continue;
        const x    = ZONES[zi].xPct * w;
        const topY = zoneNodes[0].y;
        const botY = zoneNodes[zoneNodes.length - 1].y;
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x, botY);
        ctx.strokeStyle = ZONES[zi].color + '12';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ───────────── 5. BTC pulse rings ──────────────────────────────
      const btcNode = nodes.find(n => n.isBtcCenter);
      if (btcNode) {
        const maxR = Math.min(w * 0.14, h * 0.44);
        for (let off = 0; off < 3; off++) {
          const pt = ((timestamp / 2800) + off * 0.33) % 1;
          if (pt < 0.85) {
            const r     = pt * maxR;
            const alpha = (1 - pt / 0.85) * 0.25;
            ctx.beginPath();
            ctx.arc(btcNode.x, btcNode.y, r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(247,147,26,${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      // ───────────── 6. Zone flow channel curves ─────────────────────
      const zoneCX = ZONES.map(z => z.xPct * w);

      for (let ci = 0; ci < CHANNEL_PAIRS.length; ci++) {
        const [fi, ti] = CHANNEL_PAIRS[ci];
        const fx  = zoneCX[fi], tx = zoneCX[ti];
        const mx  = (fx + tx) / 2;
        const bow = bowOffset(ci);

        ctx.beginPath();
        ctx.moveTo(fx, cy);
        ctx.bezierCurveTo(mx, cy + bow, mx, cy + bow, tx, cy);
        ctx.strokeStyle = 'rgba(0,212,170,0.055)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // BTC-equity connection lines
      if (btcNode) {
        const eqNodes = nodes.filter(n => n.zone === 2 && !n.isBtcCenter);
        for (const en of eqNodes) {
          ctx.beginPath();
          ctx.moveTo(btcNode.x, btcNode.y);
          ctx.lineTo(en.x, en.y);
          ctx.strokeStyle = 'rgba(247,147,26,0.07)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // ───────────── 7. Flow particles ───────────────────────────────
      const btcEqNodes = btcNode
        ? nodes.filter(n => n.zone === 2 && !n.isBtcCenter)
        : [];

      for (const p of particles) {
        if (p.channel < ZONE_CHANNEL_COUNT) {
          // Zone-to-zone channel particle
          const [fi, ti] = CHANNEL_PAIRS[p.channel];
          const fromAvg = zoneAvg(ZONES[fi], snap);
          const toAvg   = zoneAvg(ZONES[ti], snap);
          const forward = toAvg >= fromAvg;

          p.t += p.speed * (forward ? 1 : -1);
          if (p.t > 1) p.t -= 1;
          if (p.t < 0) p.t += 1;

          const fx  = zoneCX[fi], tx = zoneCX[ti];
          const mx  = (fx + tx) / 2;
          const bow = bowOffset(p.channel);
          const px  = cubic(p.t, fx, mx, mx, tx);
          const py  = cubic(p.t, cy, cy + bow, cy + bow, cy);

          const intensity = Math.min(Math.abs(toAvg - fromAvg) / 2.5, 1);
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fillStyle = forward
            ? `rgba(0,212,170,${(0.3 + intensity * 0.65).toFixed(2)})`
            : `rgba(255,107,74,${(0.3 + intensity * 0.65).toFixed(2)})`;
          ctx.fill();
        } else {
          // BTC-equity particle
          const eqIdx = p.channel - ZONE_CHANNEL_COUNT;
          const en    = btcEqNodes[eqIdx];
          if (btcNode && en) {
            const ticker  = ZONES[2].tickers[eqIdx + 1];
            const chg     = resolveChange(ticker, snap) ?? 0;
            const forward = chg >= 0;

            p.t += p.speed * (forward ? 1 : -1);
            if (p.t > 1) p.t -= 1;
            if (p.t < 0) p.t += 1;

            const px = btcNode.x + (en.x - btcNode.x) * p.t;
            const py = btcNode.y + (en.y - btcNode.y) * p.t;

            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, Math.PI * 2);
            ctx.fillStyle = forward
              ? 'rgba(247,147,26,0.7)'
              : 'rgba(255,107,74,0.6)';
            ctx.fill();
          }
        }
      }

      // ───────────── 8. Nodes ────────────────────────────────────────
      for (const node of nodes) {
        const zone    = ZONES[node.zone];
        const ticker  = zone.tickers[node.tickerIdx];
        const changePct = resolveChange(ticker, snap);
        const baseR   = node.isBtcCenter ? 10 : 5;

        // Subtle size pulse based on change magnitude
        const absPct  = changePct !== null ? Math.abs(changePct) : 0;
        const pulse   = Math.sin(timestamp / 900 + node.tickerIdx * 1.7) * 0.4;
        const r       = baseR + pulse * Math.min(absPct / 5, 1);

        // Node colour: teal if up, coral if down, zone colour if flat/no data
        let nc = zone.color;
        if (changePct !== null) {
          nc = changePct > 0 ? C.teal : changePct < 0 ? C.coral : zone.color;
        }

        // Scan-beam proximity highlight
        const beamDist  = Math.abs(beamY - node.y);
        const beamBoost = beamDist < 25 ? (1 - beamDist / 25) * 0.25 : 0;

        // Outer glow
        const glowR = r * 3.5;
        const glow  = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowR);
        const glowAlpha = Math.round((0.19 + beamBoost) * 255).toString(16).padStart(2, '0');
        glow.addColorStop(0, nc + glowAlpha);
        glow.addColorStop(1, nc + '00');
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Outer ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 2.5, 0, Math.PI * 2);
        ctx.strokeStyle = nc + '44';
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // Dark fill
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#060a0d';
        ctx.fill();

        // Inner coloured dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = nc;
        ctx.fill();

        // ── Label placement ──
        ctx.font = `${node.isBtcCenter ? 10 : 9}px 'Courier New'`;
        ctx.fillStyle = nc;

        if (node.isBtcCenter) {
          // BTC label centred below
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(ticker.label, node.x, node.y + r + 5);
          // Change %
          if (changePct !== null) {
            ctx.font      = "8px 'Courier New'";
            ctx.fillStyle = changePct >= 0 ? C.teal + 'bb' : C.coral + 'bb';
            ctx.fillText(
              changePct >= 0 ? `+${changePct.toFixed(1)}%` : `${changePct.toFixed(1)}%`,
              node.x, node.y + r + 17,
            );
          }
        } else if (node.angle !== undefined) {
          // BTC ring node — radial label outward
          const cos  = Math.cos(node.angle);
          const sin  = Math.sin(node.angle);
          const lDist = r + 11;
          const lx   = node.x + cos * lDist;
          const ly   = node.y + sin * lDist;
          ctx.textAlign    = cos > 0.3 ? 'left' : cos < -0.3 ? 'right' : 'center';
          ctx.textBaseline = sin > 0.3 ? 'top'  : sin < -0.3 ? 'bottom' : 'middle';
          ctx.fillText(ticker.label, lx, ly);
        } else {
          // Column node — label to the right for left zones, left for right zones
          const rightSide = node.zone <= 1;
          ctx.textBaseline = 'middle';
          if (rightSide) {
            ctx.textAlign = 'left';
            ctx.fillText(ticker.label, node.x + r + 6, node.y);
          } else {
            ctx.textAlign = 'right';
            ctx.fillText(ticker.label, node.x - r - 6, node.y);
          }
          // Change % on opposite side
          if (changePct !== null) {
            ctx.font      = "8px 'Courier New'";
            ctx.fillStyle = changePct >= 0 ? C.teal + 'aa' : C.coral + 'aa';
            if (rightSide) {
              ctx.textAlign = 'right';
              ctx.fillText(
                changePct >= 0 ? `+${changePct.toFixed(1)}%` : `${changePct.toFixed(1)}%`,
                node.x - r - 6, node.y,
              );
            } else {
              ctx.textAlign = 'left';
              ctx.fillText(
                changePct >= 0 ? `+${changePct.toFixed(1)}%` : `${changePct.toFixed(1)}%`,
                node.x + r + 6, node.y,
              );
            }
          }
        }
      }

      // ───────────── 9. Zone labels (top) ────────────────────────────
      ctx.textBaseline = 'top';
      ctx.textAlign    = 'center';
      for (const z of ZONES) {
        ctx.font      = "bold 9px 'Courier New'";
        ctx.fillStyle = z.color + '66';
        ctx.fillText(z.label, z.xPct * w, 6);
      }

      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafId); ro.disconnect(); };
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0,
      fontFamily: FONT, backgroundColor: C.bgPrimary,
    }}>
      {/* Header */}
      <div style={{
        height: '28px', display: 'flex', alignItems: 'center', gap: '6px',
        padding: '0 10px', borderBottom: `1px solid ${C.border}`,
      }}>
        <span
          className="br-blink"
          style={{
            width: '4px', height: '4px', borderRadius: '50%',
            background: C.teal, display: 'inline-block',
          }}
        />
        <span style={{ fontSize: '9px', letterSpacing: '0.14em', color: C.textDim }}>
          CAPITAL FLOW NEXUS
        </span>
      </div>

      {/* Canvas */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
      </div>

      {/* Legend */}
      <div style={{
        height: '22px', display: 'flex', alignItems: 'center',
        padding: '0 10px', borderTop: `1px solid ${C.border}`, gap: '12px',
      }}>
        {ZONES.map(z => (
          <span
            key={z.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '9px', color: C.textDim, letterSpacing: '0.06em',
            }}
          >
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: z.color, display: 'inline-block', opacity: 0.7,
            }} />
            {z.label}
          </span>
        ))}
      </div>
    </div>
  );
}
