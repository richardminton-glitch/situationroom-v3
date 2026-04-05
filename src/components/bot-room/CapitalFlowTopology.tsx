'use client';

/**
 * Capital Flow Topology — Canvas 2D animation.
 *
 * Renders a network graph of BTC vs correlated assets with:
 *   - Node glow + ring + inner dot
 *   - Correlation-weighted edges
 *   - Particle system flowing along edges
 *   - Radar sweep + BTC pulse rings
 *   - Background grid dots + concentric rings
 *
 * Uses ResizeObserver for responsive sizing and rAF for 60 fps rendering.
 */

import { useRef, useEffect } from 'react';
import { C, FONT, TOPO_NODES, TOPO_EDGES } from './constants';

// ── Particle type ──────────────────────────────────────────────────────────────
interface Particle {
  t: number;       // 0–1 position along edge
  speed: number;
  size: number;
  edgeIdx: number;
}

function initParticles(): Particle[] {
  const out: Particle[] = [];
  TOPO_EDGES.forEach((edge, i) => {
    const count = Math.max(1, Math.floor(Math.abs(edge.correlation) * 4));
    for (let j = 0; j < count; j++) {
      out.push({
        t: Math.random(),
        speed: 0.0022 + Math.random() * 0.002,
        size: 1.2 + Math.random() * 0.9,
        edgeIdx: i,
      });
    }
  });
  return out;
}

// ── Node position calculator ───────────────────────────────────────────────────
function nodePositions(w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;
  const Ro = Math.min(w, h) * 0.38;
  const Ri = Ro * 0.46;

  return TOPO_NODES.map(node => {
    if (node.ring === 'center') return { x: cx, y: cy };
    const rad = (node.angle - 90) * Math.PI / 180;
    const r = node.ring === 'inner' ? Ri : Ro;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  });
}

// ── Component ──────────────────────────────────────────────────────────────────
export function CapitalFlowTopology() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles = initParticles();
    let w = 0;
    let h = 0;

    // Resize handling
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        w = entry.contentRect.width;
        h = entry.contentRect.height;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
    });
    ro.observe(container);

    let rafId: number;

    function draw(timestamp: number) {
      if (w === 0 || h === 0) { rafId = requestAnimationFrame(draw); return; }

      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const Ro = Math.min(w, h) * 0.38;
      const Ri = Ro * 0.46;
      const pos = nodePositions(w, h);

      // ── 1. Background grid dots ────────────────────────────────────────
      ctx.fillStyle = 'rgba(0,212,170,0.05)';
      for (let gx = 0; gx < w; gx += 16) {
        for (let gy = 0; gy < h; gy += 16) {
          const dx = gx - cx;
          const dy = gy - cy;
          if (Math.sqrt(dx * dx + dy * dy) < Ro + 16) {
            ctx.fillRect(gx, gy, 1, 1);
          }
        }
      }

      // ── 2. Concentric rings ────────────────────────────────────────────
      const ringR = [Ri * 0.45, Ri, Ro, Ro * 1.1];
      const ringA = [0.12, 0.10, 0.10, 0.05];
      ringR.forEach((r, i) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,212,170,${ringA[i]})`;
        ctx.lineWidth = 0.5;
        if (i === 3) ctx.setLineDash([2, 5]);
        else ctx.setLineDash([]);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // ── 3. Radar sweep ─────────────────────────────────────────────────
      const sweepAngle = ((timestamp / 4500) % (Math.PI * 2)) - Math.PI / 2;
      const fanSpan = 0.45;
      // Gradient fan (6 segments to simulate trailing fade)
      for (let s = 0; s < 6; s++) {
        const t = (s + 1) / 6;
        const a0 = sweepAngle - fanSpan * (1 - s / 6);
        const a1 = sweepAngle - fanSpan * (1 - (s + 1) / 6);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, Ro * 1.1, a0, a1);
        ctx.closePath();
        ctx.fillStyle = `rgba(0,212,170,${(t * 0.11).toFixed(3)})`;
        ctx.fill();
      }
      // Leading edge
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepAngle) * Ro * 1.1, cy + Math.sin(sweepAngle) * Ro * 1.1);
      ctx.strokeStyle = 'rgba(0,212,170,0.3)';
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // ── 4. Edges ───────────────────────────────────────────────────────
      TOPO_EDGES.forEach(edge => {
        const from = pos[edge.from];
        const to = pos[edge.to];
        const ac = Math.abs(edge.correlation);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = edge.correlation >= 0
          ? `rgba(0,212,170,${ac * 0.32})`
          : `rgba(255,107,74,${ac * 0.32})`;
        ctx.lineWidth = ac * 1.7;
        ctx.stroke();
      });

      // ── 5. Particles ──────────────────────────────────────────────────
      particles.forEach(p => {
        const edge = TOPO_EDGES[p.edgeIdx];
        // Advance
        if (edge.correlation >= 0) p.t += p.speed;
        else p.t -= p.speed;
        if (p.t > 1) p.t -= 1;
        if (p.t < 0) p.t += 1;
        // Position
        const from = pos[edge.from];
        const to = pos[edge.to];
        const px = from.x + (to.x - from.x) * p.t;
        const py = from.y + (to.y - from.y) * p.t;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = edge.correlation >= 0
          ? 'rgba(0,220,175,0.95)'
          : 'rgba(255,100,70,0.95)';
        ctx.fill();
      });

      // ── 6. BTC pulse rings ────────────────────────────────────────────
      for (let offset = 0; offset < 2; offset++) {
        const pulseT = ((timestamp / 2200) + offset * 0.5) % 1;
        if (pulseT < 0.8) {
          const r = pulseT * Ri * 0.85;
          const alpha = (1 - pulseT / 0.8) * 0.55;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(247,147,26,${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // ── 7. Nodes ──────────────────────────────────────────────────────
      pos.forEach((p, i) => {
        const node = TOPO_NODES[i];
        const r = node.baseR;

        // Glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
        glow.addColorStop(0, node.color + '44');
        glow.addColorStop(1, node.color + '00');
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Ring
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 2.5, 0, Math.PI * 2);
        ctx.strokeStyle = node.color + '44';
        ctx.lineWidth = 0.7;
        ctx.stroke();

        // Dark fill
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#060a0d';
        ctx.fill();

        // Inner dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // Label — offset outward from canvas centre
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let lx: number, ly: number;
        if (dist > 1) {
          const nx = dx / dist;
          const ny = dy / dist;
          lx = p.x + nx * (r + 9);
          ly = p.y + ny * (r + 9);
        } else {
          lx = p.x;
          ly = p.y + r + 12;
        }
        ctx.font = `${node.ring === 'center' ? 8 : 7}px 'Courier New'`;
        ctx.fillStyle = node.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label, lx, ly);
      });

      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0,
      borderRight: 'none', fontFamily: FONT, backgroundColor: C.bgPrimary,
    }}>
      {/* Header */}
      <div style={{
        height: '28px', display: 'flex', alignItems: 'center', gap: '6px',
        padding: '0 10px', borderBottom: `1px solid ${C.border}`,
      }}>
        <span className="br-blink" style={{ width: '4px', height: '4px', borderRadius: '50%', background: C.teal, display: 'inline-block' }} />
        <span style={{ fontSize: '7px', letterSpacing: '0.12em', color: C.textDim }}>CAPITAL FLOW TOPOLOGY</span>
      </div>

      {/* Canvas */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
      </div>

      {/* Legend */}
      <div style={{
        height: '22px', display: 'flex', alignItems: 'center',
        padding: '0 10px', borderTop: `1px solid ${C.border}`, justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '7px', color: C.textDim, letterSpacing: '0.08em' }}>
            <span style={{ width: '12px', height: '1px', background: C.teal, display: 'inline-block' }} />
            Positive
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '7px', color: C.textDim, letterSpacing: '0.08em' }}>
            <span style={{ width: '12px', height: '1px', background: C.coral, display: 'inline-block' }} />
            Inverse
          </span>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '7px', color: C.textDim, letterSpacing: '0.08em' }}>
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: C.btcOrange, display: 'inline-block' }} />
          BTC anchor
        </span>
      </div>
    </div>
  );
}
