'use client';

/**
 * NetworkCanvas2D — three-tier orbital node system rendered on 2D canvas.
 *
 * Hierarchy:
 *   COORDINATOR (1)  — slow drift, r=20, triple ring
 *   AGENTS (4)       — independent drift in home zones, r=12, double rings
 *   SUB-AGENTS (20)  — orbit parent agent, r=5.5–8, single ring
 *   MICRO-NODES (80) — orbit parent sub-agent, r=1.6–3.8
 *
 * Event cascades fire bottom-up: micro → sub → agent → coordinator.
 * Ported from members-room-prototype.html with threat-state integration.
 */

import { useEffect, useRef } from 'react';
import type { AgentEvent } from '@/lib/room/agentDomains';
import type { ThreatState } from '@/lib/room/threatEngine';

// ── Constants ────────────────────────────────────────────────────────────────

const COLS = ['#f0a500', '#00e5c8', '#9b7fdd', '#e03030'];
const LABS = ['MACRO', 'PRICE', 'SENTIMENT', 'RISK'];
const APOS = [
  { fx: 0.20, fy: 0.70 }, // MACRO  — bottom-left
  { fx: 0.76, fy: 0.30 }, // PRICE  — upper-right
  { fx: 0.72, fy: 0.74 }, // SENT   — lower-right
  { fx: 0.22, fy: 0.26 }, // RISK   — upper-left
];
const DOMAIN_IDX: Record<string, number> = { MACRO: 0, PRICE: 1, SENTIMENT: 2, RISK: 3 };

const THREAT_TIMING: Record<ThreatState, [number, number]> = {
  QUIET:      [4200, 8000],
  MONITORING: [2800, 5400],
  ELEVATED:   [1600, 3600],
  ALERT:      [900,  2200],
  CRITICAL:   [500,  1400],
};

// ── Hex-alpha helper ─────────────────────────────────────────────────────────

function ha(n: number): string {
  return Math.floor(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
}

// ── Node ─────────────────────────────────────────────────────────────────────

type NodeType = 'coord' | 'agent' | 'sub' | 'micro';

interface NodeCfg {
  bx?: number; by?: number; r?: number; col?: string;
  type?: NodeType; label?: string | null; parent?: CNode | null;
  oA?: number; oR?: number; oRY?: number; oSpd?: number;
  dR?: number; dSpd?: number; phase?: number;
}

class CNode {
  bx: number; by: number; x: number; y: number; r: number;
  col: string; type: NodeType; label: string | null;
  parent: CNode | null;
  _subs: CNode[] = []; _micros: CNode[] = []; _agents: CNode[] = [];
  phase: number; act: number;
  oA: number; oR: number; oRY: number; oSpd: number;
  dR: number; dSpd: number;

  constructor(c: NodeCfg) {
    this.bx = c.bx || 0; this.by = c.by || 0;
    this.x = this.bx; this.y = this.by;
    this.r = c.r || 4; this.col = c.col || '#fff';
    this.type = c.type || 'micro'; this.label = c.label ?? null;
    this.parent = c.parent || null;
    this.phase = c.phase ?? Math.random() * Math.PI * 2; this.act = 0;
    this.oA = c.oA ?? Math.random() * Math.PI * 2;
    this.oR = c.oR || 40;
    this.oRY = c.oRY ?? this.oR * 0.6;
    this.oSpd = c.oSpd ?? (0.007 + Math.random() * 0.009) * (Math.random() > 0.5 ? 1 : -1);
    this.dR = c.dR || 0; this.dSpd = c.dSpd || 0.00025;
  }

  dc(): number {
    return ({ micro: 0.022, sub: 0.011, agent: 0.0045, coord: 0.003 } as Record<NodeType, number>)[this.type] || 0.01;
  }

  update(t: number) {
    if (this.parent) {
      this.oA += this.oSpd * (1 + this.parent.act * 0.5);
      this.x = this.parent.x + Math.cos(this.oA) * this.oR;
      this.y = this.parent.y + Math.sin(this.oA) * this.oRY;
    } else {
      this.x = this.bx + Math.sin(t * this.dSpd + this.phase) * this.dR;
      this.y = this.by + Math.cos(t * this.dSpd * 1.12 + this.phase * 1.4) * this.dR * 0.76;
    }
    this.act = Math.max(0, this.act - this.dc());
  }

  draw(ctx: CanvasRenderingContext2D, t: number) {
    const { x, y, r, col, act, phase, type, label } = this;
    const pulse = Math.sin(t * 0.0018 + phase) * 0.5 + 0.5;
    const dr = r * (1 + pulse * 0.08 + act * 0.42);

    // Rings
    if (type === 'coord') {
      [5.5, 3.6, 2.2].forEach((m, i) => {
        ctx.beginPath(); ctx.arc(x, y, dr * m + act * 10 * (2 - i), 0, Math.PI * 2);
        ctx.strokeStyle = col + ha((0.03 + act * 0.1 - i * 0.005) * 255);
        ctx.lineWidth = 0.5; ctx.stroke();
      });
    } else if (type === 'agent') {
      [3.8, 2.4].forEach((m, i) => {
        ctx.beginPath(); ctx.arc(x, y, dr * m + act * 6, 0, Math.PI * 2);
        ctx.strokeStyle = col + ha((0.06 + act * 0.14 - i * 0.01) * 255);
        ctx.lineWidth = 0.7; ctx.stroke();
      });
    } else if (type === 'sub') {
      ctx.beginPath(); ctx.arc(x, y, dr * 2.5 + act * 4, 0, Math.PI * 2);
      ctx.strokeStyle = col + ha((0.08 + act * 0.16) * 255);
      ctx.lineWidth = 0.5; ctx.stroke();
    }

    // Core
    ctx.beginPath(); ctx.arc(x, y, dr, 0, Math.PI * 2);
    const blur = type === 'micro' ? 6 + act * 16
      : type === 'sub' ? 12 + act * 30
      : 20 + act * 48 + pulse * 7;
    ctx.shadowBlur = blur; ctx.shadowColor = col;
    ctx.fillStyle = col; ctx.fill(); ctx.shadowBlur = 0;

    // Specular highlight
    if (type !== 'micro') {
      ctx.beginPath(); ctx.arc(x - dr * 0.22, y - dr * 0.24, dr * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff66'; ctx.fill();
    }

    // Label
    if (label) {
      ctx.font = '700 9px monospace';
      ctx.fillStyle = col + 'cc';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y + dr * 3.6 + 9);
    }
  }
}

// ── Particle ─────────────────────────────────────────────────────────────────

class CPart {
  col: string; p: number; spd: number; sz: number;
  sx: number; sy: number; tx: number; ty: number;
  cx: number; cy: number;
  trail: { x: number; y: number }[] = [];

  constructor(from: CNode, to: CNode, col: string, spd?: number) {
    this.col = col; this.p = 0; this.spd = spd || 0.005;
    this.sz = 0.7 + Math.random() * 2.2;
    this.sx = from.x; this.sy = from.y;
    this.tx = to.x; this.ty = to.y;
    const mx = (this.sx + this.tx) / 2, my = (this.sy + this.ty) / 2;
    this.cx = mx + (Math.random() - 0.5) * 90 + (this.sy - this.ty) * 0.24;
    this.cy = my + (Math.random() - 0.5) * 90 + (this.tx - this.sx) * 0.24;
  }

  pos() {
    const p = this.p;
    return {
      x: (1 - p) * (1 - p) * this.sx + 2 * (1 - p) * p * this.cx + p * p * this.tx,
      y: (1 - p) * (1 - p) * this.sy + 2 * (1 - p) * p * this.cy + p * p * this.ty,
    };
  }

  update(): boolean {
    this.p += this.spd;
    const { x, y } = this.pos();
    this.trail.unshift({ x, y });
    if (this.trail.length > 14) this.trail.pop();
    return this.p < 1;
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.trail.forEach((pt, i) => {
      const a = (1 - i / this.trail.length) * 0.52;
      const s = this.sz * (1 - i / this.trail.length) * 0.74;
      if (s < 0.15) return;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, s, 0, Math.PI * 2);
      ctx.fillStyle = this.col + ha(a * 255); ctx.fill();
    });
    const { x, y } = this.pos();
    ctx.beginPath(); ctx.arc(x, y, this.sz, 0, Math.PI * 2);
    ctx.shadowBlur = 10; ctx.shadowColor = this.col;
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.shadowBlur = 0;
  }
}

// ── Edge drawing ─────────────────────────────────────────────────────────────

function edge(
  ctx: CanvasRenderingContext2D,
  a: CNode, b: CNode,
  alpha: number, lw: number, col: string, dashed?: boolean,
) {
  const mx = (a.x + b.x) / 2 + (a.y - b.y) * 0.16;
  const my = (a.y + b.y) / 2 + (b.x - a.x) * 0.16;
  ctx.beginPath(); ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(mx, my, b.x, b.y);
  if (dashed) ctx.setLineDash([2, 8]);
  ctx.strokeStyle = col + ha(Math.min(255, Math.max(0, alpha * 255)));
  ctx.lineWidth = lw; ctx.stroke(); ctx.setLineDash([]);
}

// ── Ripple type ──────────────────────────────────────────────────────────────

interface Ripple { x: number; y: number; r: number; col: string; life: number; }
interface Dust { fx: number; fy: number; vx: number; vy: number; r: number; ph: number; tc: boolean; }

// ── Scene state ──────────────────────────────────────────────────────────────

interface SceneState {
  W: number; H: number;
  allNodes: CNode[];
  agents: CNode[];
  coord: CNode;
  particles: CPart[];
  ripples: Ripple[];
  dust: Dust[];
}

function buildScene(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): SceneState {
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const coord = new CNode({
    bx: W * 0.5, by: H * 0.48, r: 20, col: '#00e5c8',
    type: 'coord', label: 'COORDINATOR', dR: 9, dSpd: 0.00016,
  });

  const agents = APOS.map((p, i) => new CNode({
    bx: p.fx * W, by: p.fy * H, r: 12, col: COLS[i],
    type: 'agent', label: LABS[i], dR: 22,
    dSpd: 0.00022 + i * 0.00004, phase: i * 1.57,
  }));

  const subs: CNode[] = [];
  agents.forEach((ag, ai) => {
    for (let j = 0; j < 5; j++) {
      const sr = 54 + j * 14 + Math.random() * 12;
      const s = new CNode({
        r: 5.5 + Math.random() * 2.5, col: COLS[ai], type: 'sub', parent: ag,
        oR: sr, oRY: sr * 0.58,
        oSpd: (0.009 + Math.random() * 0.009) * (j % 2 ? 1 : -1),
        oA: (j / 5) * Math.PI * 2 + ai * 0.78,
      });
      ag._subs.push(s); subs.push(s);
    }
  });

  subs.forEach(sub => {
    for (let k = 0; k < 4; k++) {
      const mr = 20 + k * 8 + Math.random() * 10;
      const mc = new CNode({
        r: 1.6 + Math.random() * 2.2, col: sub.col, type: 'micro', parent: sub,
        oR: mr, oRY: mr * 0.55,
        oSpd: (0.016 + Math.random() * 0.016) * (k % 2 ? 1 : -1),
        oA: (k / 4) * Math.PI * 2 + Math.random() * 2,
      });
      sub._micros.push(mc);
    }
  });

  const allNodes = [coord, ...agents, ...subs, ...subs.flatMap(s => s._micros)];
  coord._agents = agents;

  const dust: Dust[] = Array.from({ length: 140 }, () => ({
    fx: Math.random(), fy: Math.random(),
    vx: (Math.random() - 0.5) * 6e-5, vy: (Math.random() - 0.5) * 6e-5,
    r: 0.3 + Math.random() * 0.85, ph: Math.random() * Math.PI * 2,
    tc: Math.random() > 0.65,
  }));

  return { W, H, allNodes, agents, coord, particles: [], ripples: [], dust };
}

// ── Event cascade ────────────────────────────────────────────────────────────

function spawnCascade(s: SceneState, agentIdx: number) {
  const agent = s.agents[agentIdx];
  if (!agent) return;
  const coord = s.coord;
  let maxDelay = 0;

  // Bottom-up: micro → sub → agent → coordinator
  agent._subs.forEach((sub, si) => {
    sub._micros.forEach((mc, mi) => {
      const d = si * 160 + mi * 60 + Math.random() * 60;
      maxDelay = Math.max(maxDelay, d);
      setTimeout(() => {
        mc.act = 1;
        s.ripples.push({ x: mc.x, y: mc.y, r: mc.r, col: mc.col, life: 1 });
        s.particles.push(new CPart(mc, sub, mc.col, 0.012 + Math.random() * 0.008));
      }, d);
    });
    const sd = si * 160 + 340;
    maxDelay = Math.max(maxDelay, sd);
    setTimeout(() => {
      sub.act = 1;
      s.ripples.push({ x: sub.x, y: sub.y, r: sub.r, col: sub.col, life: 1 });
      for (let i = 0; i < 3; i++) {
        setTimeout(() => s.particles.push(new CPart(sub, agent, sub.col, 0.007 + Math.random() * 0.005)), i * 100);
      }
    }, sd);
  });

  setTimeout(() => {
    agent.act = 1;
    s.ripples.push({ x: agent.x, y: agent.y, r: agent.r, col: agent.col, life: 1.3 });
    for (let i = 0; i < 6; i++) {
      setTimeout(() => s.particles.push(new CPart(agent, coord, agent.col, 0.004 + Math.random() * 0.003)), i * 110);
    }
    setTimeout(() => {
      coord.act = Math.min(1, coord.act + 0.65);
      s.ripples.push({ x: coord.x, y: coord.y, r: coord.r, col: coord.col, life: 1.6 });
    }, 680);
  }, maxDelay + 420);
}

// ── Frame rendering ──────────────────────────────────────────────────────────

function renderFrame(
  ctx: CanvasRenderingContext2D, s: SceneState, t: number,
) {
  const { W, H } = s;
  ctx.fillStyle = '#07090e'; ctx.fillRect(0, 0, W, H);

  // Dot grid
  ctx.fillStyle = 'rgba(0,229,200,0.02)';
  for (let gx = 44; gx < W; gx += 44) {
    for (let gy = 44; gy < H; gy += 44) {
      ctx.beginPath(); ctx.arc(gx, gy, 0.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Update all nodes
  s.allNodes.forEach(n => n.update(t));

  // Edges: micro→sub
  s.allNodes.filter(n => n.type === 'micro').forEach(n => {
    if (n.parent) edge(ctx, n, n.parent, 0.055 + n.act * 0.18, 0.28, n.col);
  });
  // Edges: sub→agent
  s.allNodes.filter(n => n.type === 'sub').forEach(n => {
    if (n.parent) edge(ctx, n, n.parent, 0.085 + n.act * 0.25, 0.55, n.col);
  });
  // Edges: agent→coordinator
  s.agents.forEach(ag => {
    const a = (ag.act + s.coord.act) * 0.22;
    edge(ctx, ag, s.coord, 0.14 + a, 0.9 + a * 2.8, ag.col);
  });
  // Edges: agent↔agent (dashed)
  for (let i = 0; i < s.agents.length; i++) {
    for (let j = i + 1; j < s.agents.length; j++) {
      edge(ctx, s.agents[i], s.agents[j], 0.04, 0.28, '#aaa', true);
    }
  }
  // Occasional cross-sub edges
  const sbs = s.allNodes.filter(n => n.type === 'sub');
  for (let i = 0; i < sbs.length; i += 8) {
    if (sbs[i + 7]) edge(ctx, sbs[i], sbs[i + 7], 0.014, 0.18, '#fff', true);
  }

  // Particles
  s.particles = s.particles.filter(p => {
    const ok = p.update(); p.draw(ctx); return ok;
  });
  if (s.particles.length > 220) s.particles = s.particles.slice(-170);

  // Ripples
  s.ripples = s.ripples.filter(r => {
    r.life -= 0.022; r.r += 2.5;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.strokeStyle = r.col + ha(Math.max(0, r.life) * 145);
    ctx.lineWidth = 1; ctx.stroke();
    return r.life > 0;
  });

  // Dust
  s.dust.forEach(p => {
    p.fx += p.vx; p.fy += p.vy;
    if (p.fx < 0) p.fx = 1; if (p.fx > 1) p.fx = 0;
    if (p.fy < 0) p.fy = 1; if (p.fy > 1) p.fy = 0;
    const a = (Math.sin(t * 0.0009 + p.ph) * 0.5 + 0.5) * 0.11;
    ctx.beginPath(); ctx.arc(p.fx * W, p.fy * H, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.tc ? `rgba(240,165,0,${a})` : `rgba(0,229,200,${a})`;
    ctx.fill();
  });

  // Draw nodes layered (back to front)
  (['micro', 'sub', 'agent', 'coord'] as NodeType[]).forEach(tp =>
    s.allNodes.filter(n => n.type === tp).forEach(n => n.draw(ctx, t))
  );

  // Vignette
  const vg = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.2, W * 0.5, H * 0.5, H * 0.92);
  vg.addColorStop(0, 'rgba(7,9,14,0)');
  vg.addColorStop(1, 'rgba(7,9,14,0.72)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

// ── Component ────────────────────────────────────────────────────────────────

interface NetworkCanvas2DProps {
  threatState: ThreatState;
  events: AgentEvent[];
}

export default function NetworkCanvas2D({ threatState, events }: NetworkCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneState | null>(null);
  const threatRef = useRef<ThreatState>(threatState);
  const processedRef = useRef(new Set<string>());
  const initialised = useRef(false);

  // Keep threat state current for the render loop
  useEffect(() => { threatRef.current = threatState; }, [threatState]);

  // Process incoming events → trigger cascades
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // On first batch (SSE backfill), mark all as seen but don't cascade
    if (!initialised.current) {
      initialised.current = true;
      for (const evt of events) processedRef.current.add(evt.id);
      return;
    }

    for (const evt of events) {
      if (processedRef.current.has(evt.id)) continue;
      processedRef.current.add(evt.id);
      const idx = DOMAIN_IDX[evt.primaryDomain] ?? Math.floor(Math.random() * 4);
      spawnCascade(scene, idx);
    }

    if (processedRef.current.size > 600) {
      const arr = Array.from(processedRef.current);
      processedRef.current = new Set(arr.slice(-300));
    }
  }, [events]);

  // Canvas setup + animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let scene = buildScene(canvas, ctx);
    sceneRef.current = scene;
    initialised.current = false;

    // Resize handler
    const ro = new ResizeObserver(() => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      scene = buildScene(canvas, ctx);
      sceneRef.current = scene;
    });
    ro.observe(canvas.parentElement || canvas);

    // Animation loop
    let animId: number;
    let lastAmbient = 0;

    const frame = (ts: number) => {
      const s = sceneRef.current;
      if (!s || s.W === 0) { animId = requestAnimationFrame(frame); return; }

      renderFrame(ctx, s, ts);

      // Ambient cascades — frequency adapts to threat level
      const [minMs, maxMs] = THREAT_TIMING[threatRef.current];
      if (ts - lastAmbient > minMs + Math.random() * (maxMs - minMs)) {
        spawnCascade(s, Math.floor(Math.random() * 4));
        lastAmbient = ts;
      }

      // Random cross-agent particles
      if (Math.random() < 0.018 && s.agents.length > 1) {
        const a = s.agents[Math.floor(Math.random() * s.agents.length)];
        let b = s.agents[Math.floor(Math.random() * s.agents.length)];
        while (b === a) b = s.agents[Math.floor(Math.random() * s.agents.length)];
        s.particles.push(new CPart(a, b, a.col, 0.0025 + Math.random() * 0.002));
      }

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      sceneRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        position: 'absolute',
        inset: 0,
      }}
    />
  );
}
