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

import { useEffect, useRef, useState, useCallback } from 'react';
import type { AgentEvent } from '@/lib/room/agentDomains';
import type { ThreatState } from '@/lib/room/threatEngine';

// ── Constants ────────────────────────────────────────────────────────────────

// 5 threat-domain agents feeding the Threat Assessment Module
const AGENT_KEYS = ['GEOPOLITICAL', 'ECONOMIC', 'BITCOIN', 'DISASTER', 'POLITICAL'];
const LABS = ['GEOPOLITICAL', 'ECONOMIC', 'BITCOIN', 'DISASTER', 'POLITICAL'];
// Default dim colour when domain has no threat contribution
const DEFAULT_AGENT_COL = '#3d9090';
const APOS = [
  { fx: 0.18, fy: 0.68 }, // GEOPOLITICAL — lower-left
  { fx: 0.78, fy: 0.28 }, // ECONOMIC     — upper-right
  { fx: 0.80, fy: 0.72 }, // BITCOIN      — lower-right
  { fx: 0.20, fy: 0.28 }, // DISASTER     — upper-left
  { fx: 0.50, fy: 0.82 }, // POLITICAL    — bottom-centre
];
// Map event domains to agent indices
const DOMAIN_IDX: Record<string, number> = {
  GEOPOLITICAL: 0, ECONOMIC: 1, BITCOIN: 2, DISASTER: 3, POLITICAL: 4,
};
const COORD_COLOR = '#f0a500'; // orange Threat Assessment Module

// Threat-driven parameters computed each frame
const THREAT_SCORE_MAP = {
  coordGlowMult: (score: number) => 2.5 + (score / 100) * 3.0,        // 2.5 -> 5.5
  edgeBrightness: (score: number) => 0.14 + (score / 100) * 0.41,      // 14% -> 55%
  subOrbitMult:   (score: number) => 1.0 + (score / 100) * 1.2,        // 1.0 -> 2.2
  coordPulseHz:   (score: number) => 0.5 + (score / 100) * 2.5,        // 0.5 -> 3.0 Hz
};

const FLOW_LABELS = ['INTEL', 'MACRO', 'CHAIN', 'HAZARD', 'LEGAL'];

// ── Hex-alpha helper ─────────────────────────────────────────────────────────

function ha(n: number): string {
  return Math.floor(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
}

/** Threat-to-colour (hex): 0→teal, ~20→amber, 40+→red */
function threatToColor(impact: number): string {
  // Normalise to 0–1 range (40 = max single-domain contribution for full red)
  const s = Math.max(0, Math.min(1, impact / 40));
  let r: number, g: number, b: number;
  if (s <= 0.5) {
    // Teal (#00e5c8) → amber (#f0a500)
    const t = s / 0.5;
    r = Math.round(0 + (240 - 0) * t);
    g = Math.round(229 + (165 - 229) * t);
    b = Math.round(200 + (0 - 200) * t);
  } else {
    // Amber (#f0a500) → red (#e03030)
    const t = (s - 0.5) / 0.5;
    r = Math.round(240 + (224 - 240) * t);
    g = Math.round(165 + (48 - 165) * t);
    b = Math.round(0 + (48 - 0) * t);
  }
  return '#' + ha(r) + ha(g) + ha(b);
}

// ── Recon probe state ────────────────────────────────────────────────────────

interface ReconProbe {
  sub: CNode;                // the travelling sub-agent
  homeAgent: CNode;          // original parent
  targetAgent: CNode;        // agent being visited
  phase: 'outbound' | 'orbit' | 'return';
  progress: number;          // 0→1 within current phase
  orbitAngle: number;        // for orbiting the target
  startX: number; startY: number;  // launch position
  returnX: number; returnY: number; // return target
  originalParent: CNode;     // restore after mission
  originalOA: number;        // restore orbital angle
  originalOR: number;        // restore orbital radius
  originalORY: number;
  originalOSpd: number;
}

// ── Cross-domain data bridge state ───────────────────────────────────────────

interface DataBridge {
  subA: CNode;
  subB: CNode;
  life: number;    // 1→0
  colA: string;
  colB: string;
  particlePhases: number[];  // individual particle progress values
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
  _onRecon = false; // true when this sub is on a reconnaissance mission
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
      const ringCol = COORD_COLOR;
      [5.5, 3.6, 2.2].forEach((m, i) => {
        ctx.beginPath(); ctx.arc(x, y, dr * m + act * 10 * (2 - i), 0, Math.PI * 2);
        ctx.strokeStyle = ringCol + ha((0.03 + act * 0.1 - i * 0.005) * 255);
        ctx.lineWidth = 0.5; ctx.stroke();
      });
    } else if (type === 'agent') {
      [3.8, 2.4].forEach((m, i) => {
        ctx.beginPath(); ctx.arc(x, y, dr * m + act * 6, 0, Math.PI * 2);
        ctx.strokeStyle = col + ha((0.14 + act * 0.14 - i * 0.02) * 255);
        ctx.lineWidth = 0.7; ctx.stroke();
      });
    } else if (type === 'sub') {
      ctx.beginPath(); ctx.arc(x, y, dr * 2.5 + act * 4, 0, Math.PI * 2);
      ctx.strokeStyle = col + ha((0.16 + act * 0.16) * 255);
      ctx.lineWidth = 0.5; ctx.stroke();
    }

    // Core rendering
    if (type === 'coord') {
      ctx.beginPath(); ctx.arc(x, y, dr, 0, Math.PI * 2);
      ctx.shadowBlur = Math.min(40, 20 + act * 48 + pulse * 7);
      ctx.shadowColor = col;
      ctx.fillStyle = col; ctx.fill(); ctx.shadowBlur = 0;
    } else if (type === 'agent') {
      ctx.beginPath(); ctx.arc(x, y, dr, 0, Math.PI * 2);
      ctx.shadowBlur = Math.min(30, 18 + act * 30);
      ctx.shadowColor = col;
      ctx.fillStyle = col; ctx.fill(); ctx.shadowBlur = 0;
    } else {
      // Sub-agent: fake glow with second circle, no shadowBlur
      ctx.shadowBlur = 0;
      const glowR = dr * 1.6;
      ctx.beginPath(); ctx.arc(x, y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = col + ha(0.25 * 255); ctx.fill();
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
  reconProbes: ReconProbe[];
  dataBridges: DataBridge[];
}

/** Per-domain threat contribution (decaying sum per domain) */
interface DomainContribution {
  domain: string;
  score: number;  // decayed impact sum for this domain
}

interface LiveData {
  btcPrice: number; btcDelta: number;
  dxyPrice: number; dxyDelta: number;
  fearGreed: number | null;
  domainContributions: DomainContribution[];
}

function buildScene(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): SceneState {
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const coord = new CNode({
    bx: W * 0.5, by: H * 0.44, r: 20, col: COORD_COLOR,
    type: 'coord', label: 'THREAT ASSESSOR', dR: 9, dSpd: 0.00016,
  });

  // Agents start dim — colour updated each frame from domain contribution
  const agents = APOS.map((p, i) => new CNode({
    bx: p.fx * W, by: p.fy * H, r: 12, col: DEFAULT_AGENT_COL,
    type: 'agent', label: LABS[i], dR: 22,
    dSpd: 0.00022 + i * 0.00003, phase: i * 1.26,
  }));

  const subs: CNode[] = [];
  agents.forEach((ag, ai) => {
    for (let j = 0; j < 3; j++) {
      const sr = 50 + j * 18 + Math.random() * 22;
      const s = new CNode({
        r: 5.5 + Math.random() * 2.5, col: DEFAULT_AGENT_COL, type: 'sub', parent: ag,
        oR: sr, oRY: sr * 0.58,
        oSpd: (0.009 + Math.random() * 0.009) * (j % 2 ? 1 : -1),
        oA: (j / 3) * Math.PI * 2 + ai * 0.63,
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

  return { W, H, allNodes, agents, coord, ripples: [], dust, reconProbes: [], dataBridges: [] };
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

  // -- Update agent + sub colours from domain threat contribution --
  s.agents.forEach((ag, ai) => {
    const domainKey = AGENT_KEYS[ai];
    const contrib = data.domainContributions.find(d => d.domain === domainKey);
    const domainScore = contrib ? contrib.score : 0;
    const newCol = domainScore > 0.1 ? threatToColor(domainScore) : DEFAULT_AGENT_COL;
    ag.col = newCol;
    // Only update subs that are not on a recon probe (those keep target colour)
    ag._subs.forEach(sub => {
      if (!sub._onRecon) sub.col = newCol;
    });
  });

  // -- Agent threat contribution arcs --
  const totalThreat = threatScore;
  s.agents.forEach((ag, ai) => {
    const domainKey = AGENT_KEYS[ai];
    const contrib = data.domainContributions.find(d => d.domain === domainKey);
    const domainScore = contrib ? contrib.score : 0;

    // Show domain contribution beneath agent label
    if (domainScore > 0) {
      const labelY = ag.y + ag.r * 3.6 + 22;
      ctx.font = '700 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = ag.col + 'cc';
      ctx.fillText('+' + domainScore.toFixed(1), ag.x, labelY);

      // Percentage of total
      const pct = totalThreat > 0 ? (domainScore / totalThreat) * 100 : 0;
      ctx.font = '700 7px monospace';
      ctx.fillStyle = ag.col + '99';
      ctx.fillText(pct.toFixed(0) + '% OF TOTAL', ag.x, labelY + 11);
    }

    // Agent threat contribution arc — 10 segments
    // Arc fill = domain's proportion of max possible contribution (capped at 100%)
    const segments = 10;
    const segAngle = (Math.PI * 2) / segments;
    const arcR = ag.r * 4.8;
    const fillPct = Math.min(1, domainScore / 40); // 40 = tier 4 max impact
    const filled = Math.round(fillPct * segments);
    for (let i = 0; i < segments; i++) {
      const startA = -Math.PI / 2 + i * segAngle + 0.04;
      const endA = -Math.PI / 2 + (i + 1) * segAngle - 0.04;
      ctx.beginPath();
      ctx.arc(ag.x, ag.y, arcR, startA, endA);
      if (i < filled) {
        ctx.strokeStyle = ag.col + ha((0.55 + ag.act * 0.25) * 255);
      } else {
        ctx.strokeStyle = '#ffffff' + ha(0.10 * 255);
      }
      ctx.lineWidth = 2; ctx.stroke();
    }
  });

  // -- THREAT ASSESSOR arc (orange) — overall threat score --
  {
    const arcR = coord.r * 4.2;
    const segAngle = (Math.PI * 2) / 10;
    const filled = Math.round(threatScore / 10);

    for (let i = 0; i < 10; i++) {
      const startA = -Math.PI / 2 + i * segAngle + 0.03;
      const endA = -Math.PI / 2 + (i + 1) * segAngle - 0.03;
      ctx.beginPath();
      ctx.arc(coord.x, coord.y, arcR, startA, endA);
      if (i < filled) {
        ctx.strokeStyle = COORD_COLOR + ha(0.7 * 255);
      } else {
        ctx.strokeStyle = '#ffffff' + ha(0.08 * 255);
      }
      ctx.lineWidth = 2.5; ctx.stroke();
    }

    ctx.font = '700 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = COORD_COLOR + 'cc';
    ctx.fillText('THREAT ' + threatScore, coord.x, coord.y - arcR - 6);
  }

  // -- Flow direction labels on agent->coordinator bezier midpoints --
  const flowAlpha = Math.sin(t * 0.0016) * 0.5 + 0.5;
  s.agents.forEach((ag, i) => {
    const mx = (ag.x + coord.x) / 2 + (ag.y - coord.y) * 0.16;
    const my = (ag.y + coord.y) / 2 + (coord.x - ag.x) * 0.16;
    const lbl = FLOW_LABELS[i] || '';
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
  // Subs on recon missions are positioned by the probe system, not orbital update
  s.allNodes.forEach(n => {
    if (n._onRecon) {
      n.act = Math.max(0, n.act - n.dc());
      return;
    }
    if (n.type === 'sub' && frameCount % 2 !== 0) {
      n.act = Math.max(0, n.act - n.dc());
    } else {
      n.update(t, threatScore);
    }
  });

  // Edges: sub -> agent (skip subs on recon)
  s.allNodes.filter(n => n.type === 'sub' && !n._onRecon).forEach(n => {
    if (n.parent) edge(ctx, n, n.parent, 0.14 + n.act * 0.25, 0.55, n.col);
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

  // ── Recon probes: update + draw ──
  s.reconProbes = s.reconProbes.filter(probe => {
    const spd = 0.008;
    probe.progress += spd;

    if (probe.phase === 'outbound') {
      // Fly from home to target agent
      const p = Math.min(1, probe.progress);
      const eased = p * p * (3 - 2 * p); // smoothstep
      probe.sub.x = probe.startX + (probe.targetAgent.x - probe.startX) * eased;
      probe.sub.y = probe.startY + (probe.targetAgent.y - probe.startY) * eased;
      // Blend colour toward target agent's colour
      probe.sub.col = probe.targetAgent.col;
      if (p >= 1) { probe.phase = 'orbit'; probe.progress = 0; }
    } else if (probe.phase === 'orbit') {
      // Orbit the target agent briefly
      probe.orbitAngle += 0.04;
      const orbitR = 40;
      probe.sub.x = probe.targetAgent.x + Math.cos(probe.orbitAngle) * orbitR;
      probe.sub.y = probe.targetAgent.y + Math.sin(probe.orbitAngle) * orbitR * 0.6;
      probe.sub.col = probe.targetAgent.col;
      // Draw a faint connection line to target
      ctx.beginPath();
      ctx.moveTo(probe.sub.x, probe.sub.y);
      ctx.lineTo(probe.targetAgent.x, probe.targetAgent.y);
      ctx.strokeStyle = probe.targetAgent.col + ha(0.15 * 255);
      ctx.lineWidth = 0.5; ctx.setLineDash([2, 4]); ctx.stroke(); ctx.setLineDash([]);
      if (probe.progress >= 1) {
        probe.phase = 'return'; probe.progress = 0;
        probe.returnX = probe.sub.x; probe.returnY = probe.sub.y;
        // Fire 2 particles from probe back to home agent
        for (let p = 0; p < 2; p++) {
          const part = takeParticle(pool);
          if (part) part.reset(probe.sub, probe.homeAgent, probe.targetAgent.col, 0.007);
        }
      }
    } else {
      // Return home
      const p = Math.min(1, probe.progress);
      const eased = p * p * (3 - 2 * p);
      probe.sub.x = probe.returnX + (probe.homeAgent.x + Math.cos(probe.originalOA) * probe.originalOR - probe.returnX) * eased;
      probe.sub.y = probe.returnY + (probe.homeAgent.y + Math.sin(probe.originalOA) * probe.originalORY - probe.returnY) * eased;
      // Blend colour back
      probe.sub.col = probe.homeAgent.col;
      if (p >= 1) {
        // Restore sub to original orbit
        probe.sub.parent = probe.originalParent;
        probe.sub.oA = probe.originalOA;
        probe.sub.oR = probe.originalOR;
        probe.sub.oRY = probe.originalORY;
        probe.sub.oSpd = probe.originalOSpd;
        probe.sub._onRecon = false;
        probe.sub.act = 0.6;
        return false; // remove probe
      }
    }
    return true;
  });

  // ── Data bridges: update + draw ──
  s.dataBridges = s.dataBridges.filter(bridge => {
    bridge.life -= 0.005;
    if (bridge.life <= 0) return false;

    const ax = bridge.subA.x, ay = bridge.subA.y;
    const bx = bridge.subB.x, by = bridge.subB.y;
    const alpha = Math.min(1, bridge.life * 2) * 0.3;

    // Connection line (thin, dashed)
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
    ctx.strokeStyle = '#ffffff' + ha(alpha * 255);
    ctx.lineWidth = 0.4; ctx.setLineDash([1, 6]); ctx.stroke(); ctx.setLineDash([]);

    // Travelling data dots
    bridge.particlePhases = bridge.particlePhases.map(ph => {
      let np = ph + 0.012;
      if (np > 2) np -= 2; // loop: 0→1 = A→B, 1→2 = B→A
      const forward = np <= 1;
      const p = forward ? np : np - 1;
      const px = forward ? ax + (bx - ax) * p : bx + (ax - bx) * p;
      const py = forward ? ay + (by - ay) * p : by + (ay - by) * p;
      const col = forward ? bridge.colA : bridge.colB;
      const dotAlpha = Math.sin(p * Math.PI) * alpha * 2;
      ctx.beginPath(); ctx.arc(px, py, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = col + ha(Math.max(0, dotAlpha) * 255); ctx.fill();
      return np;
    });

    // Subtle glow at endpoints
    [{ x: ax, y: ay, col: bridge.colA }, { x: bx, y: by, col: bridge.colB }].forEach(ep => {
      ctx.beginPath(); ctx.arc(ep.x, ep.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = ep.col + ha(alpha * 0.3 * 255); ctx.fill();
    });

    return true;
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
  domainContributions?: DomainContribution[];
}

export default function NetworkCanvas2D({
  threatState, threatScore, events,
  btcPrice, btcDelta, dxyPrice, dxyDelta, fearGreed,
  domainContributions,
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
    fearGreed: null, domainContributions: [],
  });

  // Keep threat state current for the render loop
  useEffect(() => { threatRef.current = threatState; }, [threatState]);
  useEffect(() => { threatScoreRef.current = threatScore; }, [threatScore]);

  // Update data ref when props change
  useEffect(() => {
    dataRef.current = {
      btcPrice, btcDelta, dxyPrice, dxyDelta, fearGreed,
      domainContributions: domainContributions ?? [],
    };
  }, [btcPrice, btcDelta, dxyPrice, dxyDelta, fearGreed, domainContributions]);

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
      const btcAgent = scene.agents[2]; // BITCOIN agent
      if (!btcAgent) return;
      const coord = scene.coord;
      const headCol = btcPrice > prev ? '#00e5c8' : '#e03030';

      // Fire particles from subs inward to BITCOIN agent
      btcAgent._subs.forEach((sub, i) => {
        setTimeout(() => {
          const part = takeParticle(pool);
          if (part) part.reset(sub, btcAgent, headCol, 0.008 + Math.random() * 0.004);
        }, i * 60);
      });

      // Then 3 particles from BITCOIN agent to coordinator
      setTimeout(() => {
        for (let p = 0; p < 3; p++) {
          setTimeout(() => {
            const part = takeParticle(pool);
            if (part) part.reset(btcAgent, coord, headCol, 0.005 + Math.random() * 0.003);
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
      const idx = DOMAIN_IDX[evt.primaryDomain] ?? Math.floor(Math.random() * 5);
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

    // ── Recon probes: every 12–25s, a sub-agent visits another agent's orbit
    const scheduleRecon = () => {
      const delay = 12000 + Math.random() * 13000;
      const timer = setTimeout(() => {
        const s = sceneRef.current;
        if (s && s.reconProbes.length < 2) { // max 2 simultaneous probes
          // Pick a random agent and one of its subs
          const srcIdx = Math.floor(Math.random() * s.agents.length);
          const srcAgent = s.agents[srcIdx];
          // Only pick subs not already on recon
          const availSubs = srcAgent._subs.filter(sub => !sub._onRecon);
          if (availSubs.length > 0) {
            const sub = availSubs[Math.floor(Math.random() * availSubs.length)];
            // Pick a different target agent
            let tgtIdx = srcIdx;
            while (tgtIdx === srcIdx) tgtIdx = Math.floor(Math.random() * s.agents.length);
            const tgtAgent = s.agents[tgtIdx];

            // Detach sub from orbit and create probe
            sub._onRecon = true;
            s.reconProbes.push({
              sub,
              homeAgent: srcAgent,
              targetAgent: tgtAgent,
              phase: 'outbound',
              progress: 0,
              orbitAngle: Math.random() * Math.PI * 2,
              startX: sub.x, startY: sub.y,
              returnX: 0, returnY: 0,
              originalParent: sub.parent!,
              originalOA: sub.oA,
              originalOR: sub.oR,
              originalORY: sub.oRY,
              originalOSpd: sub.oSpd,
            });
            sub.parent = null; // detach from orbit
            sub.act = 0.8;
            // Ripple at departure
            s.ripples.push({ x: sub.x, y: sub.y, r: sub.r, col: srcAgent.col, life: 0.8 });
          }
        }
        scheduleRecon();
      }, delay);
      ambientTimers.push(timer);
    };
    scheduleRecon();

    // ── Data bridges: every 5–10s, two subs from different agents exchange data
    const scheduleBridge = () => {
      const delay = 5000 + Math.random() * 5000;
      const timer = setTimeout(() => {
        const s = sceneRef.current;
        if (s && s.dataBridges.length < 3) { // max 3 simultaneous bridges
          // Pick two random agents
          const idxA = Math.floor(Math.random() * s.agents.length);
          let idxB = idxA;
          while (idxB === idxA) idxB = Math.floor(Math.random() * s.agents.length);
          const agA = s.agents[idxA];
          const agB = s.agents[idxB];
          // Pick a sub from each (not on recon)
          const subA = agA._subs.find(sub => !sub._onRecon);
          const subB = agB._subs.find(sub => !sub._onRecon);
          if (subA && subB) {
            s.dataBridges.push({
              subA, subB,
              life: 1,
              colA: agA.col,
              colB: agB.col,
              particlePhases: [0, 0.33, 0.66, 1.0, 1.33, 1.66], // 6 dots, staggered
            });
            // Brief activation flash on both subs
            subA.act = Math.min(1, subA.act + 0.4);
            subB.act = Math.min(1, subB.act + 0.4);
          }
        }
        scheduleBridge();
      }, delay);
      ambientTimers.push(timer);
    };
    scheduleBridge();

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

  // ── Coordinator hover detection ──
  const [coordHover, setCoordHover] = useState(false);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const s = sceneRef.current;
    if (!s) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const dx = mx - s.coord.x;
    const dy = my - s.coord.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hitRadius = s.coord.r * 5.5; // generous hit area
    if (dist < hitRadius) {
      if (!coordHover) setCoordHover(true);
      setHoverPos({ x: s.coord.x, y: s.coord.y });
    } else {
      if (coordHover) setCoordHover(false);
    }
  }, [coordHover]);

  const handleMouseLeave = useCallback(() => {
    setCoordHover(false);
  }, []);

  // Build hover overlay data
  const hoverData = dataRef.current;
  const stateColor = ({ QUIET: '#00e5c8', MONITORING: '#00e5c8', ELEVATED: '#f0a500', ALERT: '#f07000', CRITICAL: '#e03030' } as Record<string, string>)[threatState] || '#00e5c8';
  const DOMAIN_LABELS: Record<string, { label: string; color: string }> = {
    GEOPOLITICAL: { label: 'GEOPOLITICAL', color: '#e03030' },
    ECONOMIC: { label: 'ECONOMIC', color: '#f0a500' },
    BITCOIN: { label: 'BITCOIN', color: '#00e5c8' },
    DISASTER: { label: 'DISASTER', color: '#9b7fdd' },
    POLITICAL: { label: 'POLITICAL', color: '#4a9eff' },
  };
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: coordHover ? 'pointer' : 'default',
        }}
      />

      {/* Threat Assessment Module hover overlay */}
      {coordHover && (
        <div
          style={{
            position: 'absolute',
            left: hoverPos.x + 30,
            top: hoverPos.y - 80,
            background: 'rgba(9, 13, 18, 0.92)',
            border: '1px solid rgba(240, 165, 0, 0.3)',
            padding: '10px 14px',
            fontFamily: "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace",
            pointerEvents: 'none',
            zIndex: 20,
            minWidth: 220,
          }}
        >
          {/* Title */}
          <div style={{ fontSize: 9, letterSpacing: '0.14em', color: '#8494a7', marginBottom: 6 }}>
            THREAT ASSESSMENT MODULE
          </div>

          {/* Composite threat score */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span style={{
              fontSize: 22, fontWeight: 700, color: stateColor,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {threatScore}
            </span>
            <span style={{ fontSize: 9, color: '#8494a7' }}>/100</span>
            <span style={{
              fontSize: 8, letterSpacing: '0.08em',
              color: stateColor,
              background: stateColor + '26',
              padding: '1px 5px',
            }}>
              {threatState}
            </span>
          </div>

          {/* Domain contribution bars */}
          <div style={{ fontSize: 8, letterSpacing: '0.1em', color: '#5e7080', marginBottom: 4 }}>
            DOMAIN CONTRIBUTIONS
          </div>
          {hoverData.domainContributions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {AGENT_KEYS.map((key) => {
                const contrib = hoverData.domainContributions.find(d => d.domain === key);
                const score = contrib ? contrib.score : 0;
                const pct = threatScore > 0 ? (score / threatScore) * 100 : 0;
                const barW = 120;
                const filledW = Math.min(barW, (score / 40) * barW); // 40 = max tier impact
                const info = DOMAIN_LABELS[key] || { label: key, color: '#8494a7' };
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                      <span style={{ fontSize: 8, letterSpacing: '0.08em', color: info.color }}>
                        {info.label}
                      </span>
                      <span style={{ fontSize: 9, color: score > 0 ? info.color : '#5e7080', fontWeight: 600 }}>
                        {score > 0 ? '+' + score.toFixed(1) : '0'}
                        {pct > 0 && <span style={{ color: '#5e7080', marginLeft: 4, fontWeight: 400 }}>{pct.toFixed(0)}%</span>}
                      </span>
                    </div>
                    <div style={{ width: barW, height: 3, background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
                      <div style={{
                        width: filledW, height: '100%',
                        background: info.color,
                        opacity: 0.7,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 9, color: '#5e7080' }}>NO ACTIVE THREATS</div>
          )}

          {/* Methodology note */}
          <div style={{ fontSize: 7, color: '#4d6070', marginTop: 6, lineHeight: '10px' }}>
            Exponential decay · 3h half-life · Recalculated every second
          </div>
        </div>
      )}
    </div>
  );
}
