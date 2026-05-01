'use client';

import { useEffect, useState } from 'react';
import { useData } from '@/components/layout/DataProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = 'parchment' | 'dark';

interface BlockSummary {
  height: number;
  timestamp: number;       // unix seconds
  totalFeesBTC: number;
  poolName: string;
}

// ─── Theme tokens ─────────────────────────────────────────────────────────────

function tokens(mode: Mode) {
  if (mode === 'dark') {
    return {
      text:       '#e0f0f0',
      textMuted:  '#6b9a8b',
      textDim:    '#3a6660',
      border:     '#1a3a3a',
      accent:     '#00d4aa',
      accentSoft: 'rgba(0,212,170,0.18)',
      gold:       '#c8960c',
      goldSoft:   'rgba(200,150,12,0.20)',
      arcTrack:   'rgba(107,154,139,0.18)',
      arcEpoch:   '#c8960c',
      arcDiff:    '#00d4aa',
      arcSupply:  '#7a9aa8',
      font:       "'IBM Plex Mono', 'Courier New', monospace",
      heading:    "Georgia, serif",
    };
  }
  return {
    text:       '#2c2416',
    textMuted:  '#8b7355',
    textDim:    '#b8a888',
    border:     '#c8b89a',
    accent:     '#8b6914',
    accentSoft: 'rgba(139,105,20,0.15)',
    gold:       '#c8960c',
    goldSoft:   'rgba(200,150,12,0.18)',
    arcTrack:   'rgba(139,115,85,0.18)',
    arcEpoch:   '#8b6914',
    arcDiff:    '#a87a2a',
    arcSupply:  '#6b9a8b',
    font:       "'IBM Plex Mono', 'Courier New', monospace",
    heading:    "Georgia, serif",
  };
}

// ─── Pure derivations ─────────────────────────────────────────────────────────

const HALVING_INTERVAL = 210_000;
const RETARGET_INTERVAL = 2016;
const TARGET_BLOCK_SECONDS = 600;

function subsidyAt(height: number): number {
  const era = Math.floor(height / HALVING_INTERVAL);
  return 50 / 2 ** era;
}

function epochIndexAt(height: number): number {
  return Math.floor(height / HALVING_INTERVAL); // 0-indexed
}

function supplyAt(height: number): number {
  // Sum of subsidies for blocks 1..height (genesis is unspendable in practice).
  let s = 0;
  let remaining = height;
  let era = 0;
  while (remaining > 0 && era < 33) {
    const blocksInEra = Math.min(HALVING_INTERVAL, remaining);
    s += blocksInEra * (50 / 2 ** era);
    remaining -= blocksInEra;
    era++;
  }
  return s;
}

const EPOCH_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
function romanEpoch(zeroBasedEra: number): string {
  return EPOCH_ROMAN[zeroBasedEra] ?? `${zeroBasedEra + 1}`;
}

// Halving block heights anchor the epoch ribbon. Approximate years from history
// for the past, projected from current tip for the future. Years are labels
// only — the active marker comes from real data.
const EPOCH_MARKERS: { era: number; height: number; year: number }[] = [
  { era: 0, height: 0,         year: 2009 },
  { era: 1, height: 210_000,   year: 2012 },
  { era: 2, height: 420_000,   year: 2016 },
  { era: 3, height: 630_000,   year: 2020 },
  { era: 4, height: 840_000,   year: 2024 },
  { era: 5, height: 1_050_000, year: 2028 },
  { era: 6, height: 1_260_000, year: 2032 },
  { era: 7, height: 1_470_000, year: 2036 },
];

function formatCountdown(blocks: number): { primary: string; secondary: string } {
  const totalMinutes = blocks * (TARGET_BLOCK_SECONDS / 60);
  const totalDays = totalMinutes / (60 * 24);
  if (totalDays >= 365) {
    const years = Math.floor(totalDays / 365);
    const days = Math.floor(totalDays - years * 365);
    return { primary: `${years}Y ${days}D`, secondary: `~${blocks.toLocaleString()} BLOCKS` };
  }
  if (totalDays >= 1) {
    const days = Math.floor(totalDays);
    const hours = Math.floor((totalDays - days) * 24);
    return { primary: `${days}D ${hours}H`, secondary: `~${blocks.toLocaleString()} BLOCKS` };
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.floor(totalMinutes - hours * 60);
  return { primary: `${hours}H ${mins}M`, secondary: `~${blocks.toLocaleString()} BLOCKS` };
}

function formatAgo(timestamp: number): string {
  const diff = Math.max(0, Math.floor(Date.now() / 1000 - timestamp));
  if (diff < 60) return `${diff}S AGO`;
  const m = Math.floor(diff / 60);
  const s = diff - m * 60;
  if (m < 60) return `${m}M ${s.toString().padStart(2, '0')}S AGO`;
  const h = Math.floor(m / 60);
  return `${h}H ${m - h * 60}M AGO`;
}

// ─── SVG arc helpers ──────────────────────────────────────────────────────────
// 0° is at 12 o'clock, increasing clockwise. Arcs sweep 270° opening at top.

const ARC_START = -135; // upper-left
const ARC_SPAN = 270;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, fromAngle: number, toAngle: number): string {
  const start = polar(cx, cy, r, fromAngle);
  const end = polar(cx, cy, r, toAngle);
  const sweep = toAngle - fromAngle;
  const largeArc = Math.abs(sweep) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

// ─── Last block fetch (one mempool.space call via proxy) ──────────────────────

async function fetchLatestBlock(): Promise<BlockSummary | null> {
  try {
    const res = await fetch('/api/mempool/v1/blocks', {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{
      height: number;
      timestamp: number;
      extras?: { totalFees?: number; pool?: { name?: string } };
    }>;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const top = arr[0];
    return {
      height: top.height,
      timestamp: top.timestamp,
      totalFeesBTC: (top.extras?.totalFees ?? 0) / 1e8,
      poolName: top.extras?.pool?.name ?? 'UNKNOWN',
    };
  } catch {
    return null;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { mode?: Mode }

export default function EpochAlmanacChart({ mode = 'parchment' }: Props) {
  const t = tokens(mode);
  const { data } = useData();
  const [latest, setLatest] = useState<BlockSummary | null>(null);
  const [tick, setTick] = useState(0); // forces "X ago" re-render

  // Fetch last block on mount, refresh every 60s. Cached at proxy layer.
  useEffect(() => {
    let alive = true;
    async function load() {
      const b = await fetchLatestBlock();
      if (alive && b) setLatest(b);
    }
    load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Tick every 10s so the "ago" label moves without re-fetching.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const net = data?.btcNetwork;
  const price = data?.btcMarket?.price ?? null;
  const height = latest?.height ?? net?.blockHeight ?? null;

  // Loading skeleton if we have nothing at all.
  if (height == null) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: t.textMuted, fontFamily: t.font, fontSize: 11, letterSpacing: 2,
      }}>
        LOADING TIMECHAIN STATE ···
      </div>
    );
  }

  // Derive everything from height
  const era = epochIndexAt(height);
  const subsidy = subsidyAt(height);
  const nextHalvingHeight = (era + 1) * HALVING_INTERVAL;
  const blocksToHalving = nextHalvingHeight - height;
  const epochProgress = (height - era * HALVING_INTERVAL) / HALVING_INTERVAL;

  const retargetProgress = (height % RETARGET_INTERVAL) / RETARGET_INTERVAL;
  const blocksToRetarget = net?.blocksUntilRetarget ?? RETARGET_INTERVAL - (height % RETARGET_INTERVAL);

  const minedSupply = supplyAt(height);
  const supplyProgress = minedSupply / 21_000_000;
  const supplyPct = supplyProgress * 100;

  const halving = formatCountdown(blocksToHalving);

  const reward = subsidy + (latest?.totalFeesBTC ?? 0);
  const satsPerUsd = price ? Math.round(1e8 / price) : null;

  // Arc geometry — 270° arcs opening at bottom, sized to fill ~480px width
  const SVG_W = 480;
  const SVG_H = 400;
  const cx = SVG_W / 2;
  const cy = 220;
  const R_OUTER = 210;
  const R_MID   = 170;
  const R_INNER = 130;
  const STROKE  = 10;

  function progressArc(r: number, p: number, color: string, key: string) {
    const clamped = Math.max(0, Math.min(1, p));
    const trackTo = ARC_START + ARC_SPAN;
    const fillTo  = ARC_START + ARC_SPAN * clamped;
    return (
      <g key={key}>
        <path
          d={arcPath(cx, cy, r, ARC_START, trackTo)}
          fill="none" stroke={t.arcTrack} strokeWidth={STROKE} strokeLinecap="round"
        />
        {clamped > 0 && (
          <path
            d={arcPath(cx, cy, r, ARC_START, fillTo)}
            fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round"
          />
        )}
      </g>
    );
  }

  return (
    <div style={{
      background: 'transparent', color: t.text, fontFamily: t.font,
      width: '100%', height: '100%', boxSizing: 'border-box',
      padding: '16px',
      display: 'flex', flexDirection: 'column', gap: 0,
    }}>

      {/* HEADER */}
      <div style={{
        position: 'relative',
        fontSize: 9, letterSpacing: 3, color: t.textMuted,
        marginBottom: 8, borderBottom: `1px solid ${t.border}`, paddingBottom: 8,
        textAlign: 'center',
      }}>
        <span>EPOCH ALMANAC — TIMECHAIN STATE</span>
        <span style={{
          position: 'absolute', right: 0, top: 0,
          fontSize: 8, letterSpacing: 1, opacity: latest ? 0.7 : 0.35,
        }}>
          {latest ? 'LIVE' : 'STATIC'}
        </span>
      </div>

      {/* ARCS + COUNTDOWN */}
      <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
        <svg width={SVG_W} height={SVG_H} style={{ display: 'block' }}>
          {/* Hidden label paths — sit in the gaps between arc strokes so the
              curved label text doesn't collide with the arc fills. Each path
              spans the same 270° as the arc so startOffset 50% lands at top. */}
          <defs>
            <path id={`epoch-lbl-${mode}`}
              d={arcPath(cx, cy, R_OUTER - 20, ARC_START, ARC_START + ARC_SPAN)}
              fill="none" />
            <path id={`diff-lbl-${mode}`}
              d={arcPath(cx, cy, R_MID - 20, ARC_START, ARC_START + ARC_SPAN)}
              fill="none" />
            <path id={`supply-lbl-${mode}`}
              d={arcPath(cx, cy, R_INNER - 20, ARC_START, ARC_START + ARC_SPAN)}
              fill="none" />
          </defs>

          {/* Tick marks at the 4 cardinal arc points */}
          {[ARC_START, ARC_START + 90, ARC_START + 180, ARC_START + 270].map((a) => {
            const p1 = polar(cx, cy, R_OUTER + 12, a);
            const p2 = polar(cx, cy, R_OUTER + 4, a);
            return (
              <line key={a} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke={t.textDim} strokeWidth={1} />
            );
          })}

          {/* Arc rings — outer to inner: epoch / difficulty / supply */}
          {progressArc(R_OUTER, epochProgress,    t.arcEpoch,  'epoch')}
          {progressArc(R_MID,   retargetProgress, t.arcDiff,   'diff')}
          {progressArc(R_INNER, supplyProgress,   t.arcSupply, 'supply')}

          {/* Curved arc labels — sit in the inner-edge gap of each arc and
              curve along the same direction as the arc. startOffset 50%
              centres each label at the top (12 o'clock). The percentage is
              folded into the label so we don't need a separate readout. */}
          <text fill={t.textMuted} fontFamily={t.font} fontSize={10}
            fontWeight={700} letterSpacing={4}>
            <textPath href={`#epoch-lbl-${mode}`} startOffset="50%" textAnchor="middle">
              {`EPOCH  ${(epochProgress * 100).toFixed(1)}%`}
            </textPath>
          </text>
          <text fill={t.textMuted} fontFamily={t.font} fontSize={10}
            fontWeight={700} letterSpacing={4}>
            <textPath href={`#diff-lbl-${mode}`} startOffset="50%" textAnchor="middle">
              {`DIFFICULTY  ${(retargetProgress * 100).toFixed(1)}%`}
            </textPath>
          </text>
          <text fill={t.textMuted} fontFamily={t.font} fontSize={10}
            fontWeight={700} letterSpacing={4}>
            <textPath href={`#supply-lbl-${mode}`} startOffset="50%" textAnchor="middle">
              {`SUPPLY  ${supplyPct.toFixed(2)}%`}
            </textPath>
          </text>

          {/* Centre cluster — halving countdown is the headline */}
          <text x={cx} y={cy - 50} textAnchor="middle"
            fill={t.textMuted} fontFamily={t.font} fontSize={8} letterSpacing={2.5}>
            UNTIL HALVING
          </text>
          <text x={cx} y={cy - 16} textAnchor="middle"
            fill={t.text} fontFamily={t.heading} fontSize={30} fontWeight={700} letterSpacing={1}>
            {halving.primary}
          </text>
          <text x={cx} y={cy + 4} textAnchor="middle"
            fill={t.textMuted} fontFamily={t.font} fontSize={9} letterSpacing={2}>
            {halving.secondary}
          </text>

          {/* Sub-line: block height + epoch */}
          <line x1={cx - 64} y1={cy + 22} x2={cx + 64} y2={cy + 22}
            stroke={t.border} strokeWidth={1} />
          <text x={cx} y={cy + 40} textAnchor="middle"
            fill={t.textMuted} fontFamily={t.font} fontSize={8} letterSpacing={2}>
            BLOCK
          </text>
          <text x={cx} y={cy + 58} textAnchor="middle"
            fill={t.text} fontFamily={t.font} fontSize={16} fontWeight={700} letterSpacing={1}>
            {height.toLocaleString()}
          </text>
          <text x={cx} y={cy + 74} textAnchor="middle"
            fill={t.gold} fontFamily={t.heading} fontSize={11} fontWeight={700} letterSpacing={3}>
            EPOCH {romanEpoch(era)}
          </text>
        </svg>
      </div>

      {/* LATEST BLOCK LEDGER ENTRY */}
      <div style={{
        borderTop: `1px solid ${t.border}`, marginTop: 4, paddingTop: 10,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 8, letterSpacing: 2.5, color: t.textMuted, marginBottom: 6 }}>
          LATEST BLOCK
        </div>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'center',
          fontFamily: t.font, gap: 6,
        }}>
          <span style={{ fontSize: 10, color: t.textMuted, letterSpacing: 1 }}>SUBSIDY</span>
          <span style={{ fontSize: 13, color: t.text, fontWeight: 700 }}>
            ₿{subsidy.toFixed(3)}
          </span>
          <span style={{ fontSize: 12, color: t.textDim, padding: '0 4px' }}>+</span>
          <span style={{ fontSize: 10, color: t.textMuted, letterSpacing: 1 }}>FEES</span>
          <span style={{ fontSize: 13, color: t.text, fontWeight: 700 }}>
            ₿{latest ? latest.totalFeesBTC.toFixed(4) : '—'}
          </span>
          <span style={{ fontSize: 12, color: t.textDim, padding: '0 4px' }}>=</span>
          <span style={{ fontSize: 10, color: t.gold, letterSpacing: 1 }}>REWARD</span>
          <span style={{ fontSize: 13, color: t.gold, fontWeight: 700 }}>
            ₿{latest ? reward.toFixed(4) : subsidy.toFixed(3)}
          </span>
        </div>
        <div style={{
          marginTop: 6, fontSize: 9, letterSpacing: 1.5, color: t.textMuted,
          display: 'flex', justifyContent: 'center', gap: 12,
        }}>
          <span>
            MINED BY <span style={{ color: t.text, fontWeight: 700 }}>
              {(latest?.poolName ?? 'UNKNOWN').toUpperCase()}
            </span>
          </span>
          <span style={{ color: t.textDim }}>·</span>
          <span style={{ opacity: tick >= 0 ? 1 : 1 /* keep tick referenced */ }}>
            {latest ? formatAgo(latest.timestamp) : '—'}
          </span>
        </div>
      </div>

      {/* NETWORK STATS GRID (2×2) */}
      <div style={{
        borderTop: `1px solid ${t.border}`, marginTop: 10, paddingTop: 10,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 8, letterSpacing: 2.5, color: t.textMuted, marginBottom: 6 }}>
          NETWORK
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 28, rowGap: 6,
          justifyContent: 'center',
        }}>
          <StatRow label="FEE TIER" value={
            net ? `${net.feeFast} · ${net.feeMed} · ${net.feeSlow}` : '—'
          } unit="sat/vB" t={t} />
          <StatRow label="HASHRATE" value={
            net ? `${net.hashrateEH.toFixed(0)}` : '—'
          } unit="EH/s" t={t} />
          <StatRow label="RETARGET" value={
            `${blocksToRetarget.toLocaleString()}`
          } unit="blocks" t={t} />
          <StatRow label="SATS / $" value={
            satsPerUsd ? satsPerUsd.toLocaleString() : '—'
          } unit="" t={t} />
        </div>
      </div>

      {/* EPOCH RIBBON */}
      <div style={{
        borderTop: `1px solid ${t.border}`, marginTop: 10, paddingTop: 10,
        flex: '1 1 auto', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          fontSize: 8, letterSpacing: 2.5, color: t.textMuted, marginBottom: 8,
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>EPOCH RIBBON</span>
          <span style={{ opacity: 0.6 }}>
            {(supplyPct).toFixed(2)}% OF 21M MINED
          </span>
        </div>
        <EpochRibbon currentEra={era} epochProgress={epochProgress} t={t} />
      </div>
    </div>
  );
}

// ─── Network stat row ─────────────────────────────────────────────────────────

function StatRow({ label, value, unit, t }: {
  label: string; value: string; unit: string;
  t: ReturnType<typeof tokens>;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, justifyContent: 'center' }}>
      <span style={{ fontSize: 8, letterSpacing: 1.5, color: t.textMuted }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: t.text, fontWeight: 700 }}>
        {value}
      </span>
      {unit && (
        <span style={{ fontSize: 8, color: t.textDim, letterSpacing: 1 }}>
          {unit}
        </span>
      )}
    </div>
  );
}

// ─── Epoch Ribbon ─────────────────────────────────────────────────────────────

function EpochRibbon({ currentEra, epochProgress, t }: {
  currentEra: number;
  epochProgress: number;
  t: ReturnType<typeof tokens>;
}) {
  // Render markers I → VIII; current era highlighted; progress within shown
  // as a small fill-bar between current and next markers.
  const VISIBLE = EPOCH_MARKERS.slice(0, 8);
  const W = 480;
  const H = 56;
  const PAD_X = 10;
  const usableW = W - PAD_X * 2;
  const stepX = usableW / (VISIBLE.length - 1);

  function xFor(i: number) { return PAD_X + i * stepX; }

  // Find the current era's index in VISIBLE; if beyond, clamp to last.
  const currentIdx = Math.min(currentEra, VISIBLE.length - 1);
  const fillEndX = currentIdx < VISIBLE.length - 1
    ? xFor(currentIdx) + epochProgress * stepX
    : xFor(currentIdx);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: H, display: 'block' }}
    >
      {/* Base line */}
      <line x1={PAD_X} y1={H / 2} x2={W - PAD_X} y2={H / 2}
        stroke={t.border} strokeWidth={1} />
      {/* Filled portion up to current era + progress */}
      <line x1={PAD_X} y1={H / 2} x2={fillEndX} y2={H / 2}
        stroke={t.gold} strokeWidth={2} strokeLinecap="round" />

      {VISIBLE.map((m, i) => {
        const x = xFor(i);
        const isCurrent = i === currentIdx;
        const isPast = i < currentIdx;
        const r = isCurrent ? 6 : 3;
        const fill = isCurrent ? t.gold : isPast ? t.gold : t.border;
        const stroke = isCurrent ? t.gold : 'none';
        return (
          <g key={m.era}>
            <circle cx={x} cy={H / 2} r={r} fill={fill} stroke={stroke} strokeWidth={1.5} />
            {isCurrent && (
              <circle cx={x} cy={H / 2} r={r + 5} fill="none"
                stroke={t.gold} strokeWidth={1} opacity={0.4} />
            )}
            <text x={x} y={H / 2 - 14} textAnchor="middle"
              fill={isCurrent ? t.gold : t.textMuted}
              fontFamily={t.heading} fontSize={isCurrent ? 13 : 10}
              fontWeight={isCurrent ? 700 : 400} letterSpacing={2}>
              {romanEpoch(m.era)}
            </text>
            <text x={x} y={H / 2 + 18} textAnchor="middle"
              fill={isCurrent ? t.text : t.textMuted}
              fontFamily={t.font} fontSize={8} letterSpacing={1}>
              {m.year}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
