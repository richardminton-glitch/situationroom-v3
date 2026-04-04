'use client';

/**
 * NetworkCanvas2D — two-tier orbital node system rendered on 2D canvas.
 *
 * Hierarchy:
 *   COORDINATOR (1)  — slow drift, r=20, triple ring
 *   AGENTS (4)       — independent drift in home zones, r=12, double rings
 *   SUB-AGENTS (16)  — orbit parent agent (4 per agent), r=5.5-8, single ring
 *
 * Event cascades fire bottom-up: sub -> agent -> coordinator.
 * Particles use a pre-allocated pool of 60. No ambient cascades.
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

// Threat-driven parameters computed each frame
const THREAT_SCORE_MAP = {
  coordGlowMult: (score: number) => 2.5 + (score / 100) * 3.0,        // 2.5 -> 5.5
  edgeBrightness: (score: number) => 0.14 + (score / 100) * 0.41,      // 14% -> 55%
  subOrbitMult:   (score: number) => 1.0 + (score / 100) * 1.2,        // 1.0 -> 2.2
  coordPulseHz:   (score: number) => 0.5 + (score / 100) * 2.5,        // 0.5 -> 3.0 Hz
};

const THREAT_RING_COLORS: Record<ThreatState, string> = {
  QUIET: '#00e5c8', MONITORING: '#00e5c8',
  ELEVATED: '#f0a500', ALERT: '#f0a500',
  CRITICAL: '#e03030',
};

const FLOW_LABELS = ['RATE SIGNAL', 'BTC \u0394', '', 'RISK Tier '];

// ── Hex-alpha helper ─────────────────────────────────────────────────────────

function ha(n: number): string {
  return Math.floor(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
}

// ── Node ─────────────────────────────────────────────────────────────────────

type NodeType = 'coord' | 'agent' | 'sub';

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
  _subs: CNode[] = []; _agents: CNode[] = [];
  phase: number; act: number;
  oA: number; oR: number; oRY: number; oSpd: number;
  dR: number; dSpd: number;

  constructor(c: NodeCfg) {
    this.bx = c.bx || 0; this.by = c.by || 0;
    this.x = this.bx; this.y = this.by;
    this.r = c.r || 4; this.col = c.col || '#fff';
    this.type = c.type || 'sub'; this.label = c.label ?? null;
    this.parent = c.parent || null;
    this.phase = c.phase ?? Math.random() * Math.PI * 2; this.act = 0;
    this.oA = c.oA ?? Math.random() * Math.PI * 2;
    this.oR = c.oR || 40;
    this.oRY = c.oRY ?? this.oR * 0.6;
    this.oSpd = c.oSpd ?? (0.007 + Math.random() * 0.009) * (Math.random() > 0.5 ? 1 : -1);
    this.dR = c.dR || 0; this.dSpd = c.dSpd || 0.00025;
  }

  dc(): number {
    return ({ sub: 0.011, agent: 0.0045, coord: 0.003 } as Record<NodeType, number>)[this.type] || 0.01;
  }

  update(t: number, threatScore: number) {
    if (this.parent) {
      const orbitMult = this.type === 'sub' ? THREAT_SCORE_MAP.subOrbitMult(threatScore) : 1;
      this.oA += this.oSpd * (1 + this.parent.act * 0.5) * orbitMult;
      this.x = this.parent.x + Math.cos(this.oA) * this.oR;
      this.y = this.parent.y + Math.sin(this.oA) * this.oRY;
    } else {
      this.x = this.bx + Math.sin(t * this.dSpd + this.phase) * this.dR;
      this.y = this.by + Math.cos(t * this.dSpd * 1.12 + this.phase * 1.4) * this.dR * 0.76;
    }
    this.act = Math.max(0, this.act - this.dc());
  }

  draw(ctx: CanvasRenderingContext2D, t: number, threatScore: number, threatState: ThreatState) {
    const { x, y, r, col, act, phase, type, label } = this;
    const pulseHz = type === 'coord' ? THREAT_SCORE_MAP.coordPulseHz(threatScore) : 0.9;
    const pulse = Math.sin(t * pulseHz * 0.002 + phase) * 0.5 + 0.5;
    const dr = r * (1 + pulse * 0.08 + act * 0.42);

    // Rings
    if (type === 'coord') {
      const ringCol = THREAT_RING_COLORS[threatState];
      [5.5, 3.6, 2.2].forEach((m, i) => {
        ctx.beginPath(); ctx.arc(x, y, dr * m + act * 10 * (2 - i), 0, Math.PI * 2);
        ctx.strokeStyle = ringCol + ha((0.03 + act * 0.1 - i * 0.005) * 255);
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

    // Sub-agent threat arc — segmented arc representing threat level
    if (type === 'sub') {
      const arcR = dr * 3.2 + act * 5;
      const segments = 8;
      const segAngle = (Math.PI * 2) / segments;
      const filled = Math.round((threatScore / 100) * segments);
      const arcCol = threatScore < 36 ? '#00e5c8' : threatScore < 56 ? '#f0a500' : '#e03030';
      const rotOffset = -Math.PI / 2 + phase * 0.5; // slight per-node rotation

      for (let i = 0; i < segments; i++) {
        const startA = rotOffset + i * segAngle + 0.06;
        const endA = rotOffset + (i + 1) * segAngle - 0.06;
        ctx.beginPath();
        ctx.arc(x, y, arcR, startA, endA);
        if (i < filled) {
          ctx.strokeStyle = arcCol + ha((0.5 + act * 0.3) * 255);
        } else {
          ctx.strokeStyle = '#ffffff' + ha(0.06 * 255);
        }
        ctx.lineWidth = 1.5; ctx.stroke();
      }
    }

    // Core rendering
    if (type === 'coord') {
      ctx.beginPath(); ctx.arc(x, y, dr, 0, Math.PI * 2);
      ctx.shadowBlur = Math.min(40, 20 + act * 48 + pulse * 7);
      ctx.shadowColor = col;
      ctx.fillStyle = col; ctx.fill(); ctx.shadowBlur = 0;
    } else if (type === 'agent') {
      ctx.beginPath(); ctx.arc(x, y, dr, 0, Math.PI * 2);
      ctx.shadowBlur = Math.min(25, 14 + act * 30);
      ctx.shadowColor = col;
      ctx.fillStyle = col; ctx.fill(); ctx.shadowBlur = 0;
    } else {
      // Sub-agent: fake glow with second circle, no shadowBlur
      ctx.shadowBlur = 0;
      const glowR = dr * 1.6;
      ctx.beginPath(); ctx.arc(x, y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = col + ha(0.15 * 255); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, dr, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Specular highlight
    if (type !== 'sub') {
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

// ── Particle (pooled) ────────────────────────────────────────────────────────

class CPart {
  active = false;
  col = '#fff'; p = 0; spd = 0.005; sz = 1.5;
  sx = 0; sy = 0; tx = 0; ty = 0; cx = 0; cy = 0;
  trail: { x: number; y: number }[] = [];

  reset(from: CNode, to: CNode, col: string, spd?: number, sz?: number) {
    this.active = true; this.col = col; this.p = 0;
    this.spd = spd || 0.006; this.sz = sz || (0.7 + Math.random() * 2);
    this.sx = from.x; this.sy = from.y;
    this.tx = to.x; this.ty = to.y;
    const mx = (this.sx + this.tx) / 2, my = (this.sy + this.ty) / 2;
    this.cx = mx + (Math.random() - 0.5) * 80 + (this.sy - this.ty) * 0.2;
    this.cy = my + (Math.random() - 0.5) * 80 + (this.tx - this.sx) * 0.2;
    this.trail = [];
    return this;
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
    if (this.trail.length > 8) this.trail.pop();
    if (this.p >= 1) { this.active = false; return false; }
    return true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Trail — no shadowBlur
    this.trail.forEach((pt, i) => {
      const a = (1 - i / this.trail.length) * 0.45;
      const s = this.sz * (1 - i / this.trail.length) * 0.7;
      if (s < 0.15) return;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, s, 0, Math.PI * 2);
      ctx.fillStyle = this.col + ha(a * 255); ctx.fill();
    });
    // Head — limited shadowBlur
    const { x, y } = this.pos();
    ctx.beginPath(); ctx.arc(x, y, this.sz, 0, Math.PI * 2);
    ctx.shadowBlur = 8; ctx.shadowColor = this.col;
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.shadowBlur = 0;
  }
}

function createPool(size: number): CPart[] {
  return Array.from({ length: size }, () => new CPart());
}

function takeParticle(pool: CPart[]): CPart | null {
  for (const p of pool) { if (!p.active) return p; }
  return null;
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
  ripples: Ripple[];
  dust: Dust[];
}

interface LiveData {
  btcPrice: number; btcDelta: number;
  dxyPrice: number; dxyDelta: number;
  fearGreed: number | null;
  convictionScore: number | null;
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
    for (let j = 0; j < 4; j++) {
      const sr = 50 + j * 14 + Math.random() * 26;
      const s = new CNode({
        r: 5.5 + Math.random() * 2.5, col: COLS[ai], type: 'sub', parent: ag,
        oR: sr, oRY: sr * 0.58,
        oSpd: (0.009 + Math.random() * 0.009) * (j % 2 ? 1 : -1),
        oA: (j / 4) * Math.PI * 2 + ai * 0.78,
      });
      ag._subs.push(s); subs.push(s);
    }
  });

  const allNodes = [coord, ...agents, ...subs];
  coord._agents = agents;

  const dust: Dust[] = Array.from({ length: 140 }, () => ({
    fx: Math.random(), fy: Math.random(),
    vx: (Math.random() - 0.5) * 6e-5, vy: (Math.random() - 0.5) * 6e-5,
    r: 0.3 + Math.random() * 0.85, ph: Math.random() * Math.PI * 2,
    tc: Math.random() > 0.65,
  }));

  return { W, H, allNodes, agents, coord, ripples: [], dust };
}

// ── Event cascade ────────────────────────────────────────────────────────────

function fireEventCascade(s: SceneState, agentIdx: number, pool: CPart[]) {
  const agent = s.agents[agentIdx];
  if (!agent) return;
  const coord = s.coord;

  // Activate 2-3 random sub-agents
  const shuffled = [...agent._subs].sort(() => Math.random() - 0.5);
  const activeSubs = shuffled.slice(0, 2 + (Math.random() > 0.5 ? 1 : 0));

  activeSubs.forEach((sub, i) => {
    setTimeout(() => {
      sub.act = 1;
      s.ripples.push({ x: sub.x, y: sub.y, r: sub.r, col: sub.col, life: 1 });
      // 3 particles sub -> agent
      for (let p = 0; p < 3; p++) {
        setTimeout(() => {
          const part = takeParticle(pool);
          if (part) part.reset(sub, agent, sub.col, 0.008 + Math.random() * 0.006);
        }, p * 80);
      }
    }, i * 150);
  });

  // Agent activation + particles to coordinator
  setTimeout(() => {
    agent.act = 1;
    s.ripples.push({ x: agent.x, y: agent.y, r: agent.r, col: agent.col, life: 1.3 });
    for (let p = 0; p < 5; p++) {
      setTimeout(() => {
        const part = takeParticle(pool);
        if (part) part.reset(agent, coord, agent.col, 0.005 + Math.random() * 0.003);
      }, p * 80);
    }
    setTimeout(() => {
      coord.act = Math.min(1, coord.act + 0.5);
      s.ripples.push({ x: coord.x, y: coord.y, r: coord.r, col: coord.col, life: 1.5 });
    }, 500);
  }, activeSubs.length * 150 + 300);
}

// ── Data overlay drawing ─────────────────────────────────────────────────────

function drawDataOverlays(
  ctx: CanvasRenderingContext2D,
  s: SceneState,
  t: number,
  threatScore: number,
  threatState: ThreatState,
  data: LiveData,
) {
  const coord = s.coord;

  // -- PRICE agent (index 1) --
  const priceAgent = s.agents[1];
  if (priceAgent && data.btcPrice > 0) {
    const py = priceAgent.y + priceAgent.r * 3.6 + 22;
    ctx.font = '700 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = priceAgent.col + 'cc';
    ctx.fillText('$' + data.btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 }), priceAgent.x, py);

    ctx.font = '700 7px monospace';
    const dCol = data.btcDelta >= 0 ? '#00e5c8' : '#e03030';
    ctx.fillStyle = dCol + 'cc';
    const sign = data.btcDelta >= 0 ? '+' : '';
    ctx.fillText(sign + data.btcDelta.toFixed(2) + '%', priceAgent.x, py + 10);

    // Volatility arc
    const absD = Math.abs(data.btcDelta);
    const arcR = priceAgent.r * 4;
    const arcLen = Math.min(360, absD * 40) * (Math.PI / 180);
    const arcCol = absD < 2 ? '#00e5c8' : absD < 5 ? '#f0a500' : '#e03030';
    ctx.beginPath();
    ctx.arc(priceAgent.x, priceAgent.y, arcR, -Math.PI / 2, -Math.PI / 2 + arcLen);
    ctx.strokeStyle = arcCol + ha(0.6 * 255); ctx.lineWidth = 2; ctx.stroke();
  }

  // -- MACRO agent (index 0) --
  const macroAgent = s.agents[0];
  if (macroAgent && data.dxyPrice > 0) {
    const my = macroAgent.y + macroAgent.r * 3.6 + 22;
    ctx.font = '700 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = macroAgent.col + ha(0.7 * 255);
    ctx.fillText('DXY ' + data.dxyPrice.toFixed(1), macroAgent.x, my);
  }

  // -- SENTIMENT agent (index 2) --
  const sentAgent = s.agents[2];
  if (sentAgent && data.fearGreed != null) {
    const sy = sentAgent.y + sentAgent.r * 3.6 + 22;
    const fg = data.fearGreed;
    const fgLabel = fg < 25 ? 'FEAR' : fg > 50 ? 'GREED' : 'NEUTRAL';
    ctx.font = '700 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = sentAgent.col + 'cc';
    ctx.fillText('F&G ' + fg.toFixed(0) + ' ' + fgLabel, sentAgent.x, sy);
  }

  // -- RISK agent (index 3) --
  const riskAgent = s.agents[3];
  if (riskAgent) {
    const ry = riskAgent.y + riskAgent.r * 3.6 + 22;
    ctx.font = '700 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = riskAgent.col + 'cc';
    ctx.fillText('THREAT: ' + threatState, riskAgent.x, ry);
  }

  // -- COORDINATOR conviction arc --
  if (data.convictionScore != null) {
    const cScore = data.convictionScore;
    const arcR = coord.r * 4.2;
    const segAngle = (Math.PI * 2) / 10;
    const filled = Math.round(cScore / 10);
    const segCol = cScore > 70 ? '#00e5c8' : cScore >= 40 ? '#f0a500' : '#e03030';

    for (let i = 0; i < 10; i++) {
      const startA = -Math.PI / 2 + i * segAngle + 0.03;
      const endA = -Math.PI / 2 + (i + 1) * segAngle - 0.03;
      ctx.beginPath();
      ctx.arc(coord.x, coord.y, arcR, startA, endA);
      if (i < filled) {
        ctx.strokeStyle = segCol + ha(0.7 * 255);
      } else {
        ctx.strokeStyle = '#ffffff' + ha(0.08 * 255);
      }
      ctx.lineWidth = 2.5; ctx.stroke();
    }

    ctx.font = '700 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = segCol + 'cc';
    ctx.fillText('CONVICTION ' + cScore.toFixed(0), coord.x, coord.y - arcR - 6);
  }

  // -- Flow direction labels on agent->coordinator bezier midpoints --
  const flowAlpha = Math.sin(t * 0.0016) * 0.5 + 0.5;
  s.agents.forEach((ag, i) => {
    const mx = (ag.x + coord.x) / 2 + (ag.y - coord.y) * 0.16;
    const my = (ag.y + coord.y) / 2 + (coord.x - ag.x) * 0.16;
    let lbl = FLOW_LABELS[i];
    if (i === 2 && data.fearGreed != null) {
      lbl = 'F&G ' + data.fearGreed.toFixed(0);
    } else if (i === 3) {
      const tierNum = threatState === 'QUIET' ? 1 : threatState === 'MONITORING' ? 2 : threatState === 'ELEVATED' ? 3 : threatState === 'ALERT' ? 4 : 5;
      lbl = 'RISK Tier ' + tierNum;
    }
    ctx.font = '700 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = ag.col + ha(0.4 * flowAlpha * 255);
    ctx.fillText(lbl, mx, my);
  });

  // -- Data feed pulse dots: sub -> agent continuous looping dots --
  s.agents.forEach((ag, ai) => {
    ag._subs.forEach((sub, si) => {
      // Each sub gets its own phase offset so dots don't all move together
      const phase = ai * 1.2 + si * 0.8;
      const progress = (t * 0.0005 * (1 + ag.act * 2) + phase) % 1;
      const dx = sub.x + (ag.x - sub.x) * progress;
      const dy = sub.y + (ag.y - sub.y) * progress;
      const dotAlpha = Math.sin(progress * Math.PI) * 0.55; // fade at ends
      ctx.beginPath(); ctx.arc(dx, dy, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = ag.col + ha(dotAlpha * 255); ctx.fill();

      // Second dot offset by half cycle for denser feel
      const p2 = (progress + 0.5) % 1;
      const dx2 = sub.x + (ag.x - sub.x) * p2;
      const dy2 = sub.y + (ag.y - sub.y) * p2;
      const a2 = Math.sin(p2 * Math.PI) * 0.3;
      ctx.beginPath(); ctx.arc(dx2, dy2, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = ag.col + ha(a2 * 255); ctx.fill();
    });
  });

  // -- Agent -> coordinator pulse dots --
  s.agents.forEach((ag, ai) => {
    const phase = ai * 1.7;
    const progress = (t * 0.0003 * (1 + ag.act * 2) + phase) % 1;
    const mx = (ag.x + coord.x) / 2 + (ag.y - coord.y) * 0.16;
    const my = (ag.y + coord.y) / 2 + (coord.x - ag.x) * 0.16;
    // Bezier position along the curve
    const px = (1 - progress) * (1 - progress) * ag.x + 2 * (1 - progress) * progress * mx + progress * progress * coord.x;
    const py = (1 - progress) * (1 - progress) * ag.y + 2 * (1 - progress) * progress * my + progress * progress * coord.y;
    const dotAlpha = Math.sin(progress * Math.PI) * 0.5;
    ctx.beginPath(); ctx.arc(px, py, 2.0, 0, Math.PI * 2);
    ctx.fillStyle = ag.col + ha(dotAlpha * 255); ctx.fill();
  });
}

// ── Frame rendering ──────────────────────────────────────────────────────────

function renderFrame(
  ctx: CanvasRenderingContext2D, s: SceneState, t: number,
  threatScore: number, threatState: ThreatState,
  liveData: LiveData,
  pool: CPart[],
  frameCount: number,
) {
  const { W, H } = s;
  ctx.fillStyle = '#07090e'; ctx.fillRect(0, 0, W, H);

  // Count active particles
  let activeCount = 0;
  for (const p of pool) { if (p.active) activeCount++; }

  // Dot grid — skip when many particles active
  if (activeCount <= 40) {
    ctx.fillStyle = 'rgba(0,229,200,0.02)';
    for (let gx = 44; gx < W; gx += 44) {
      for (let gy = 44; gy < H; gy += 44) {
        ctx.beginPath(); ctx.arc(gx, gy, 0.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // Update nodes — sub-agents only every other frame for performance
  s.allNodes.forEach(n => {
    if (n.type === 'sub' && frameCount % 2 !== 0) {
      // Odd frame: skip orbital position update, still decay activation
      n.act = Math.max(0, n.act - n.dc());
    } else {
      n.update(t, threatScore);
    }
  });

  // Edges: sub -> agent
  s.allNodes.filter(n => n.type === 'sub').forEach(n => {
    if (n.parent) edge(ctx, n, n.parent, 0.085 + n.act * 0.25, 0.55, n.col);
  });
  // Edges: agent -> coordinator (threat-driven brightness)
  s.agents.forEach(ag => {
    const a = THREAT_SCORE_MAP.edgeBrightness(threatScore) + ag.act * 0.22;
    edge(ctx, ag, s.coord, a, 0.9 + ag.act * 2.8, ag.col);
  });
  // Edges: agent <-> agent (dashed)
  for (let i = 0; i < s.agents.length; i++) {
    for (let j = i + 1; j < s.agents.length; j++) {
      edge(ctx, s.agents[i], s.agents[j], 0.04, 0.28, '#aaa', true);
    }
  }

  // Particles (from pool)
  for (const p of pool) {
    if (!p.active) continue;
    p.update();
    p.draw(ctx);
  }

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
  (['sub', 'agent', 'coord'] as NodeType[]).forEach(tp =>
    s.allNodes.filter(n => n.type === tp).forEach(n => n.draw(ctx, t, threatScore, threatState))
  );

  // Data overlays
  drawDataOverlays(ctx, s, t, threatScore, threatState, liveData);

  // Vignette
  const vg = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.2, W * 0.5, H * 0.5, H * 0.92);
  vg.addColorStop(0, 'rgba(7,9,14,0)');
  vg.addColorStop(1, 'rgba(7,9,14,0.72)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

// ── Component ────────────────────────────────────────────────────────────────

interface NetworkCanvas2DProps {
  threatState: ThreatState;
  threatScore: number;
  events: AgentEvent[];
  btcPrice: number;
  btcDelta: number;
  dxyPrice: number;
  dxyDelta: number;
  fearGreed: number | null;
  convictionScore: number | null;
}

export default function NetworkCanvas2D({
  threatState, threatScore, events,
  btcPrice, btcDelta, dxyPrice, dxyDelta, fearGreed, convictionScore,
}: NetworkCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneState | null>(null);
  const poolRef = useRef<CPart[]>(createPool(100));
  const threatRef = useRef<ThreatState>(threatState);
  const threatScoreRef = useRef<number>(threatScore);
  const processedRef = useRef(new Set<string>());
  const initialised = useRef(false);
  const prevBtcRef = useRef<number>(0);

  // Live data ref for the render loop
  const dataRef = useRef<LiveData>({
    btcPrice: 0, btcDelta: 0, dxyPrice: 0, dxyDelta: 0,
    fearGreed: null, convictionScore: null,
  });

  // Keep threat state current for the render loop
  useEffect(() => { threatRef.current = threatState; }, [threatState]);
  useEffect(() => { threatScoreRef.current = threatScore; }, [threatScore]);

  // Update data ref when props change
  useEffect(() => {
    dataRef.current = { btcPrice, btcDelta, dxyPrice, dxyDelta, fearGreed, convictionScore };
  }, [btcPrice, btcDelta, dxyPrice, dxyDelta, fearGreed, convictionScore]);

  // BTC price trigger — fire particles on significant moves
  useEffect(() => {
    const scene = sceneRef.current;
    const pool = poolRef.current;
    if (!scene || !initialised.current || btcPrice === 0) return;

    const prev = prevBtcRef.current;
    prevBtcRef.current = btcPrice;
    if (prev === 0) return;

    const pctChange = Math.abs(btcPrice - prev) / prev;
    if (pctChange > 0.005) {
      const priceAgent = scene.agents[1];
      if (!priceAgent) return;
      const coord = scene.coord;
      const headCol = btcPrice > prev ? '#f0a500' : '#e03030';

      // Fire particles from subs inward to PRICE agent
      priceAgent._subs.forEach((sub, i) => {
        setTimeout(() => {
          const part = takeParticle(pool);
          if (part) part.reset(sub, priceAgent, headCol, 0.008 + Math.random() * 0.004);
        }, i * 60);
      });

      // Then 3 particles from PRICE agent to coordinator
      setTimeout(() => {
        for (let p = 0; p < 3; p++) {
          setTimeout(() => {
            const part = takeParticle(pool);
            if (part) part.reset(priceAgent, coord, headCol, 0.005 + Math.random() * 0.003);
          }, p * 80);
        }
      }, 350);
    }
  }, [btcPrice]);

  // Process incoming events -> trigger cascades
  useEffect(() => {
    const scene = sceneRef.current;
    const pool = poolRef.current;
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
      fireEventCascade(scene, idx, pool);
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

    const pool = poolRef.current;

    // Resize handler
    const ro = new ResizeObserver(() => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      scene = buildScene(canvas, ctx);
      sceneRef.current = scene;
    });
    ro.observe(canvas.parentElement || canvas);

    // ── Ambient particle flow ──
    // Continuous trickle: random sub→agent particles every 1.5–3s
    const ambientTimers: ReturnType<typeof setTimeout>[] = [];
    const scheduleAmbientParticle = () => {
      const delay = 1500 + Math.random() * 1500;
      const timer = setTimeout(() => {
        const s = sceneRef.current;
        if (s) {
          const agIdx = Math.floor(Math.random() * s.agents.length);
          const ag = s.agents[agIdx];
          const sub = ag._subs[Math.floor(Math.random() * ag._subs.length)];
          if (sub) {
            const part = takeParticle(pool);
            if (part) part.reset(sub, ag, ag.col, 0.005 + Math.random() * 0.004, 1.0 + Math.random() * 0.8);
          }
        }
        scheduleAmbientParticle();
      }, delay);
      ambientTimers.push(timer);
    };
    // Start 3 staggered ambient streams for density
    for (let i = 0; i < 3; i++) {
      setTimeout(() => scheduleAmbientParticle(), i * 800);
    }

    // Agent→coordinator trickle: every 2.5–5s
    const scheduleAgentToCoord = () => {
      const delay = 2500 + Math.random() * 2500;
      const timer = setTimeout(() => {
        const s = sceneRef.current;
        if (s) {
          const agIdx = Math.floor(Math.random() * s.agents.length);
          const ag = s.agents[agIdx];
          const part = takeParticle(pool);
          if (part) part.reset(ag, s.coord, ag.col, 0.004 + Math.random() * 0.003, 1.2 + Math.random() * 1.0);
        }
        scheduleAgentToCoord();
      }, delay);
      ambientTimers.push(timer);
    };
    // Start 2 staggered agent→coord streams
    for (let i = 0; i < 2; i++) {
      setTimeout(() => scheduleAgentToCoord(), i * 1200);
    }

    // ── Heartbeat cascade: every 8–15s, fire a full cascade on a random agent
    const scheduleHeartbeat = () => {
      const delay = 8000 + Math.random() * 7000;
      const timer = setTimeout(() => {
        const s = sceneRef.current;
        if (s) {
          const agIdx = Math.floor(Math.random() * s.agents.length);
          fireEventCascade(s, agIdx, pool);
        }
        scheduleHeartbeat();
      }, delay);
      ambientTimers.push(timer);
    };
    scheduleHeartbeat();

    // Animation loop
    let animId: number;
    let frameCount = 0;

    const frame = (ts: number) => {
      const s = sceneRef.current;
      if (!s || s.W === 0) { animId = requestAnimationFrame(frame); return; }

      renderFrame(
        ctx, s, ts,
        threatScoreRef.current, threatRef.current,
        dataRef.current, pool, frameCount,
      );

      frameCount++;
      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      ambientTimers.forEach(clearTimeout);
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
