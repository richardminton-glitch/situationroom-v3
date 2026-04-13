'use client';

import React, { useState, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
} from 'recharts';
import { useTier }         from '@/hooks/useTier';
import { useTheme }        from '@/components/layout/ThemeProvider';
import { useIsMobile }     from '@/hooks/useIsMobile';
import { UpgradePrompt }   from '@/components/auth/UpgradePrompt';
import type { BtcSignalResponse }  from '@/app/api/btc-signal/route';
import type { DistributionPoint }  from '@/lib/data/daily-snapshot';
import { DCA_CROSSOVER, compositeToSellMult, compositeToExitTier, compositeToExcessRate } from '@/lib/signals/dca-exit-utils';
import { VIPEmailSignup } from './VIPEmailSignup';

const FONT      = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";
const LS_PERIOD = 'sr-dca-out-period';

type Period = '1Y' | '2Y' | '3Y' | '4Y' | '5Y';
const PERIODS: { label: Period; years: number }[] = [
  { label: '1Y', years: 1 }, { label: '2Y', years: 2 },
  { label: '3Y', years: 3 }, { label: '4Y', years: 4 },
  { label: '5Y', years: 5 },
];

// ── Spectrum constants ────────────────────────────────────────────────────────
// Visual range of the spectrum bar: 0 → MAX_VIZ composite
const MAX_VIZ = 2.5;

// ── Helpers ───────────────────────────────────────────────────────────────────

function spectrumPct(composite: number): number {
  // Maps composite 0→MAX_VIZ to 0→100% (left = distribute, right = accumulate)
  return Math.min(Math.max((composite / MAX_VIZ) * 100, 0), 100);
}

function crossoverPct(): number {
  return spectrumPct(DCA_CROSSOVER);
}

function modeInfo(composite: number, isDark: boolean): {
  label: string;
  sublabel: string;
  colour: string;
} {
  const teal    = isDark ? '#00d4c8' : '#4a7c59';
  const neutral = isDark ? '#8aaba6' : '#5a4e3c';
  const amber   = isDark ? '#c4885a' : '#b8860b';
  const midDang = isDark ? '#d08060' : '#a05020';
  const coral   = isDark ? '#d06050' : '#9b3232';

  if (composite >= 1.5) return { label: 'ACCUMULATE',       sublabel: 'Signal strongly in buy zone',       colour: teal };
  if (composite >= 1.15) return { label: 'DCA NORMALLY',    sublabel: 'Signal in buy zone',                colour: teal };
  if (composite >= 0.85) return { label: 'MILD DCA',        sublabel: 'Buy zone, approaching crossover',   colour: neutral };
  if (composite >= DCA_CROSSOVER) return { label: 'APPROACHING CROSSOVER', sublabel: 'Reduce buy size — exits may start soon', colour: amber };
  if (composite >= 0.55) return { label: 'LIGHT EXITS',     sublabel: 'Just past crossover — begin exiting', colour: amber };
  if (composite >= 0.40) return { label: 'BUILD EXITS',     sublabel: 'Distribution territory — increase exits', colour: midDang };
  if (composite >= 0.25) return { label: 'INCREASE EXITS',  sublabel: 'Signal deep in distribution zone',  colour: coral };
  return                         { label: 'HEAVY DISTRIBUTION', sublabel: 'Maximum exit signal',            colour: coral };
}

function formatUsd(v: number, compact = false): string {
  if (compact) {
    if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1) + 'M';
    if (v >= 1_000)     return '$' + (v / 1_000).toFixed(0) + 'K';
    return '$' + v.toFixed(0);
  }
  return '$' + Math.round(v).toLocaleString('en-US');
}

function formatPrice(v: number): string {
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)     return '$' + (v / 1_000).toFixed(0) + 'K';
  return '$' + v.toFixed(0);
}

function formatBtc(v: number): string {
  if (v >= 1)    return v.toFixed(3) + ' BTC';
  if (v >= 0.01) return v.toFixed(4) + ' BTC';
  return v.toFixed(6) + ' BTC';
}

function shiftYears(dateStr: string, years: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

function getXTicks(data: { date: string }[], period: Period): string[] {
  const seen = new Set<string>();
  const ticks: string[] = [];
  for (const row of data) {
    let key: string;
    if      (period === '1Y') key = row.date.slice(0, 7);
    else if (period === '2Y' || period === '3Y') { const [y, m] = row.date.split('-'); key = `${y}-Q${Math.floor((+m - 1) / 3)}`; }
    else                      key = row.date.slice(0, 4);
    if (!seen.has(key)) { seen.add(key); ticks.push(row.date); }
  }
  return ticks;
}

function formatXTick(dateStr: string, period: Period): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (period === '1Y') return d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  if (period === '2Y' || period === '3Y') return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  return String(d.getUTCFullYear());
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  data:       BtcSignalResponse;
  baseAmount: number;
}

export function DCAOutSection({ data, baseAmount }: Props) {
  const { canAccess, loading: tierLoading } = useTier();
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';
  const isMobile = useIsMobile();

  const isVip = canAccess('vip');

  const [period, setPeriod] = useState<Period>('5Y');

  useEffect(() => {
    try {
      const p = localStorage.getItem(LS_PERIOD) as Period | null;
      if (p && PERIODS.some(x => x.label === p)) setPeriod(p);
    } catch { /* noop */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePeriod(p: Period) {
    setPeriod(p);
    try { localStorage.setItem(LS_PERIOD, p); } catch { /* noop */ }
  }

  const composite    = data.composite;
  const sellMult     = compositeToSellMult(composite);
  const exitTier     = compositeToExitTier(composite);
  const exitRate     = compositeToExcessRate(composite);
  const mode         = modeInfo(composite, isDark);
  const inExitZone   = composite < DCA_CROSSOVER;
  const nearCrossover = !inExitZone && composite < 0.85;

  const stackHistory = data.stackingHistory ?? [];
  const history      = data.distributionHistory ?? [];
  const buyScale     = baseAmount / 100;

  // Recommended sell: fraction of excess BTC currently held
  const latestStack = stackHistory.length > 0 ? stackHistory[stackHistory.length - 1] : null;
  const latestDist  = history.length > 0 ? history[history.length - 1] : null;

  const excessBtcHeld = latestStack && latestDist
    ? Math.max(0, latestStack.btcSignal - latestStack.btcVanilla - latestDist.btcSignal) * buyScale
    : 0;

  const recommendedSellBtc = excessBtcHeld * exitRate;
  const recommendedSell    = recommendedSellBtc * data.btcPrice;
  const recommendedBtc     = recommendedSellBtc;

  const cPct   = spectrumPct(composite);
  const xPct   = crossoverPct();

  // Theme-derived colors
  const tealColor   = isDark ? '#00d4c8' : '#4a7c59';
  const amberColor  = isDark ? '#c4885a' : '#b8860b';
  const coralColor  = isDark ? '#d06050' : '#9b3232';
  const tooltipBg   = isDark ? 'rgba(21,29,37,0.97)' : 'rgba(248,241,227,0.97)';
  const gridStroke  = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
  const axisStroke  = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';
  const priceStroke = isDark ? 'rgba(200,230,227,0.2)' : 'rgba(60,80,60,0.2)';
  const crossoverMarker = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
  const vipOverlayBg = isDark ? 'rgba(9,13,18,0.45)' : 'rgba(248,241,227,0.6)';
  const periodActiveBg = isDark ? 'rgba(0,212,200,0.12)' : 'rgba(74,124,89,0.12)';

  // ── ChartTooltip — defined inside component to access isDark ──────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const sig  = payload.find((p: any) => p.dataKey === 'weeklyUsd');
    const prc  = payload.find((p: any) => p.dataKey === 'price');
    const comp = payload.find((p: any) => p.dataKey === 'composite');
    return (
      <div style={{ background: tooltipBg, border: `1px solid ${axisStroke}`, padding: '8px 12px', fontFamily: FONT, fontSize: 12, color: 'var(--text-primary)', letterSpacing: '0.06em', lineHeight: 1.8 }}>
        <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
        {comp && <div style={{ color: comp.value < DCA_CROSSOVER ? coralColor : tealColor }}>COMPOSITE  {Number(comp.value).toFixed(3)}×</div>}
        {sig  && sig.value > 0 && <div style={{ color: amberColor }}>EXITS      {formatUsd(Number(sig.value))}</div>}
        {sig  && sig.value === 0 && <div style={{ color: 'var(--text-muted)' }}>NO EXIT (accumulate zone)</div>}
        {prc  && <div style={{ color: 'var(--text-secondary)' }}>BTC        {formatPrice(Number(prc.value))}</div>}
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function PortfolioTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const btcSig = payload.find((p: any) => p.dataKey === 'netBtcSig');
    const btcVan = payload.find((p: any) => p.dataKey === 'netBtcVan');
    const usdS   = payload.find((p: any) => p.dataKey === 'usdSig');
    return (
      <div style={{ background: tooltipBg, border: `1px solid ${axisStroke}`, padding: '8px 12px', fontFamily: FONT, fontSize: 10, color: 'var(--text-primary)', letterSpacing: '0.06em', lineHeight: 1.8 }}>
        <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
        {btcSig && <div style={{ color: tealColor }}>SIGNAL BTC  {formatBtc(Number(btcSig.value))}</div>}
        {btcVan && <div style={{ color: 'var(--text-muted)' }}>VANILLA BTC {formatBtc(Number(btcVan.value))}</div>}
        {usdS   && <div style={{ color: amberColor }}>USD EXITS   {formatUsd(Number(usdS.value))}</div>}
      </div>
    );
  }

  // ── Chart data ─────────────────────────────────────────────────────────────
  const lastDate = history.at(-1)?.date ?? '';
  const cutoff   = lastDate ? shiftYears(lastDate, PERIODS.find(p => p.label === period)!.years) : '';

  type ChartRow = DistributionPoint & { weeklyUsd: number };
  const chartData: ChartRow[] = (() => {
    const raw = history.filter(r => r.date >= cutoff);
    // For period slices, the first row has a large *cumulative* usdSignal going back to
    // history start. We need the row immediately before the cutoff as a baseline so
    // the first bar only shows that week's exit delta, not the running total.
    let baseline = 0;
    if (period !== 'ALL' && raw.length > 0) {
      const prevRow = history.filter(r => r.date < raw[0].date).at(-1);
      if (prevRow) baseline = prevRow.usdSignal;
    }
    return raw.map((r, i) => {
      const prev  = i > 0 ? raw[i - 1] : null;
      const delta = prev ? r.usdSignal - prev.usdSignal : r.usdSignal - baseline;
      return { ...r, weeklyUsd: Math.max(0, delta) * buyScale };
    });
  })();

  const xTicks = getXTicks(chartData, period);

  // Period-filtered history
  const periodHistory = cutoff ? history.filter(r => r.date >= cutoff) : history;
  const periodStart   = cutoff ? history.filter(r => r.date < cutoff).at(-1) : null;
  const periodEnd     = periodHistory.at(-1);

  // Period-aware efficiency: total USD captured from excess BTC
  const { periodUsdSig, periodBtcSig, noExitsInPeriod } = (() => {
    if (!periodEnd) return { periodUsdSig: 0, periodBtcSig: 0, noExitsInPeriod: true };
    const usdSig = (periodEnd.usdSignal - (periodStart?.usdSignal ?? 0));
    const btcSig = (periodEnd.btcSignal - (periodStart?.btcSignal ?? 0));
    return { periodUsdSig: usdSig, periodBtcSig: btcSig, noExitsInPeriod: btcSig < 0.000001 };
  })();

  // Period-aware exit weeks count
  const exitWeeks  = periodHistory.filter(r => r.sellMult > 0).length;
  const totalWeeks = periodHistory.length;

  // Combined portfolio chart — in-period re-simulation.
  // The all-time distribution history includes exits from pre-period excess
  // (e.g. 2021 exits clearing 2013-2020 accumulated BTC).  Using it directly
  // for a period-zeroed chart produces misleading convergence.  Instead we
  // re-simulate the period from scratch: track only the BTC bought/sold since
  // the period start and apply compositeToExcessRate() week-by-week so the
  // teal line genuinely reflects what a fresh-start investor would see.
  const { portData, totalUsdSigIn, totalUsdVanIn } = (() => {
    if (!stackHistory.length || !history.length) return { portData: [], totalUsdSigIn: 0, totalUsdVanIn: 0 };
    const startIdx = cutoff ? stackHistory.findIndex(s => s.date >= cutoff) : 0;
    if (startIdx < 0) return { portData: [], totalUsdSigIn: 0, totalUsdVanIn: 0 };

    const prevStack = startIdx > 0 ? stackHistory[startIdx - 1] : null;
    const sBuyBase  = prevStack?.btcSignal  ?? 0;
    const sVanBase  = prevStack?.btcVanilla ?? 0;

    // Re-simulate in-period exits fresh (independent of all-time distribution)
    let inPeriodSold = 0;
    let inPeriodUsd  = 0;
    let totalUsdSigIn = 0;
    let totalUsdVanIn = 0;

    const data2 = stackHistory.slice(startIdx).map((s, i) => {
      const d = history[startIdx + i];
      if (!d) return null;

      // Accumulate USD invested each week (at user's baseAmount scale)
      const weeklyMult  = Math.max(0.1, Math.min(5.0, d.composite));
      totalUsdVanIn    += 100 * buyScale;
      totalUsdSigIn    += 100 * weeklyMult * buyScale;

      const inBought  = s.btcSignal  - sBuyBase;   // BTC bought by signal since period start
      const inVanilla = s.btcVanilla - sVanBase;    // BTC bought by vanilla since period start

      // In-period excess: signal bought more than vanilla, minus what was already exited
      const inExcess = Math.max(0, inBought - inVanilla - inPeriodSold);

      // Sell a fraction of in-period excess this week when composite is in exit zone
      const wExitRate = compositeToExcessRate(d.composite);
      const soldThisWeek = inExcess * wExitRate;
      inPeriodSold += soldThisWeek;
      inPeriodUsd  += soldThisWeek * s.price;

      return {
        date:      s.date,
        netBtcSig: Math.max(0, (inBought - inPeriodSold) * buyScale),
        netBtcVan: Math.max(0, inVanilla  * buyScale),
        usdSig:    inPeriodUsd * buyScale,
      };
    }).filter((r): r is NonNullable<typeof r> => r !== null);

    return { portData: data2, totalUsdSigIn, totalUsdVanIn };
  })();

  const portEnd      = portData.at(-1);
  const portBtcSig   = portEnd?.netBtcSig ?? 0;
  const portBtcVan   = portEnd?.netBtcVan ?? 0;
  const portUsdSig   = portEnd?.usdSig    ?? 0;
  const portTotalSig = portBtcSig * data.btcPrice + portUsdSig;
  const portTotalVan = portBtcVan * data.btcPrice;
  const portXTicks   = getXTicks(portData, period);

  // Average cost per BTC: for signal, net cost = total invested minus exits recouped
  const sigAvgCost = portBtcSig > 0 ? (totalUsdSigIn - portUsdSig) / portBtcSig : 0;
  const vanAvgCost = portBtcVan > 0 ? totalUsdVanIn / portBtcVan : 0;

  if (tierLoading) return null;

  return (
    <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-subtle)', fontFamily: FONT }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--text-secondary)' }}>
          DCA EXIT STRATEGY
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!noExitsInPeriod && isVip && (
            <span style={{ fontSize: 10, color: tealColor, letterSpacing: '0.08em' }}>
              EXCESS BTC CAPTURED: {formatBtc(periodBtcSig * buyScale)} → {formatUsd(periodUsdSig * buyScale, true)} · {period}
            </span>
          )}
          {noExitsInPeriod && isVip && history.length > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              NO EXITS IN {period}
            </span>
          )}
          {!isVip && (
            <span style={{ fontSize: 10, color: amberColor, letterSpacing: '0.1em', padding: '2px 8px', border: '1px solid rgba(196,136,90,0.3)', background: 'rgba(196,136,90,0.06)' }}>
              VIP ONLY
            </span>
          )}
        </div>
      </div>

      {/* ── POSITION SPECTRUM — always visible ─────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 10, letterSpacing: '0.1em' }}>
          <span style={{ color: coralColor }}>DISTRIBUTE</span>
          <span style={{ color: 'var(--text-secondary)' }}>CROSSOVER {DCA_CROSSOVER.toFixed(2)}×</span>
          <span style={{ color: tealColor }}>ACCUMULATE</span>
        </div>

        {/* Spectrum bar */}
        <div style={{ position: 'relative', height: 12, borderRadius: 1, overflow: 'visible' }}>
          {/* Background gradient: coral → amber → teal */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(to right, ${coralColor} 0%, ${amberColor} 28%, ${isDark ? '#8aaba6' : '#5a7a5c'} 45%, ${tealColor} 100%)`,
            opacity: 0.25,
          }} />
          {/* Crossover marker */}
          <div style={{
            position: 'absolute', top: -4, bottom: -4,
            left: `${xPct}%`,
            width: 1,
            background: crossoverMarker,
          }} />
          {/* Current position marker */}
          <div style={{
            position: 'absolute',
            left: `${cPct}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 14, height: 14,
            borderRadius: '50%',
            background: mode.colour,
            border: `2px solid var(--bg-primary)`,
            boxShadow: `0 0 8px ${mode.colour}88`,
            zIndex: 2,
          }} />
        </div>

        {/* Tick labels */}
        <div style={{ position: 'relative', height: 16, marginTop: 4, fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          {[0, 0.5, DCA_CROSSOVER, 1.0, 1.5, 2.0, 2.5].map(v => (
            <span key={v} style={{
              position: 'absolute',
              left: `${spectrumPct(v)}%`,
              transform: 'translateX(-50%)',
              color: Math.abs(v - composite) < 0.05 ? mode.colour : 'var(--text-muted)',
            }}>
              {v.toFixed(v === DCA_CROSSOVER ? 2 : 1)}
            </span>
          ))}
        </div>
      </div>

      {/* Status box */}
      <div style={{
        padding:    '12px 16px',
        background: `rgba(${inExitZone ? '208,96,80' : nearCrossover ? '196,136,90' : '0,212,200'}, 0.05)`,
        border:     `1px solid rgba(${inExitZone ? '208,96,80' : nearCrossover ? '196,136,90' : '0,212,200'}, 0.15)`,
        borderLeft: `3px solid ${mode.colour}`,
        marginBottom: 16,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 12, color: mode.colour, fontWeight: 600, letterSpacing: '0.1em', marginBottom: 3 }}>
            {mode.label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>
            {mode.sublabel}
          </div>
          {!inExitZone && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginTop: 4 }}>
              Exits begin at {DCA_CROSSOVER.toFixed(2)}× — signal currently at {composite.toFixed(3)}×
              {' '}({(((composite - DCA_CROSSOVER) / DCA_CROSSOVER) * 100).toFixed(0)}% above crossover)
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: 2 }}>
            {inExitZone ? 'EXIT MULT' : 'SELL MULT'}
          </div>
          <div style={{ fontSize: 24, color: inExitZone ? mode.colour : 'var(--text-muted)', fontWeight: 600, letterSpacing: '-0.01em' }}>
            {inExitZone ? `${sellMult.toFixed(1)}×` : '—'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            {inExitZone ? exitTier : 'no exits'}
          </div>
        </div>
      </div>

      {/* ── VIP GATED: calculator + chart ──────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <div style={{
          filter:        isVip ? 'none' : 'blur(5px)',
          userSelect:    isVip ? 'auto' : 'none',
          pointerEvents: isVip ? 'auto' : 'none',
        }}>

          {/* This week recommendation */}
          <div style={{
            padding: '14px 16px',
            marginBottom: 16,
            background: inExitZone ? 'rgba(196,136,90,0.05)' : 'var(--bg-card)',
            border: inExitZone ? '1px solid rgba(196,136,90,0.2)' : '1px solid var(--border-subtle)',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.1em', marginBottom: 8 }}>THIS WEEK — SELL</div>
            {inExitZone ? (
              <>
                <div style={{ fontSize: 24, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '0.02em', marginBottom: 4 }}>
                  {formatUsd(recommendedSell)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  ≈ {formatBtc(recommendedBtc)} · {(exitRate * 100).toFixed(0)}% of excess · {formatBtc(excessBtcHeld)} available
                </div>
                <div style={{ fontSize: 10, color: mode.colour, letterSpacing: '0.08em', marginTop: 6 }}>
                  {exitTier.toUpperCase()}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 20, color: 'var(--text-muted)', letterSpacing: '0.02em', marginBottom: 4 }}>
                  $0
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Signal in accumulate zone — no exits this week
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginTop: 6 }}>
                  Exits begin when composite falls below {DCA_CROSSOVER.toFixed(2)}×
                </div>
              </>
            )}
          </div>

          {/* Chart: weekly exit amounts over time */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <span style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>
                  WEEKLY EXIT AMOUNTS · WHEN SIGNAL CROSSED BELOW {DCA_CROSSOVER.toFixed(2)}×
                </span>
                {totalWeeks > 0 && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 12, letterSpacing: '0.06em' }}>
                    {exitWeeks} / {totalWeeks} weeks had exits ({((exitWeeks / totalWeeks) * 100).toFixed(0)}%)
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 0 }}>
                {PERIODS.map(p => (
                  <button key={p.label} onClick={() => handlePeriod(p.label)} style={{ padding: '3px 9px', fontSize: 11, letterSpacing: '0.1em', fontFamily: FONT, cursor: 'pointer', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'}`, background: period === p.label ? periodActiveBg : 'transparent', color: period === p.label ? tealColor : 'var(--text-muted)', transition: 'none' }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 52, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="date"
                    ticks={xTicks}
                    tickFormatter={v => formatXTick(v, period)}
                    tick={{ fontFamily: FONT, fontSize: 11, fill: 'var(--text-secondary)', letterSpacing: 1 }}
                    axisLine={{ stroke: axisStroke }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left" domain={[0, 'auto']}
                    tickFormatter={v => formatUsd(v, true)}
                    tick={{ fontFamily: FONT, fontSize: 10, fill: 'var(--text-secondary)' }}
                    axisLine={false} tickLine={false} width={52}
                  />
                  <YAxis
                    yAxisId="right" orientation="right"
                    tickFormatter={formatPrice}
                    tick={{ fontFamily: FONT, fontSize: 11, fill: 'var(--text-muted)' }}
                    axisLine={false} tickLine={false} width={52}
                  />
                  {/* Crossover reference line on composite axis — we use a ref for context */}
                  <Tooltip content={<ChartTooltip />} />
                  {/* BTC price — muted context */}
                  <Line
                    yAxisId="right" type="monotone" dataKey="price"
                    stroke={priceStroke} strokeWidth={1} dot={false} isAnimationActive={false}
                  />
                  {/* Weekly exit amounts — amber bars when exits happened, invisible otherwise */}
                  <Bar
                    yAxisId="left" dataKey="weeklyUsd"
                    fill={amberColor} opacity={0.75}
                    isAnimationActive={false}
                    maxBarSize={6}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.1em' }}>
                NO EXIT DATA FOR PERIOD
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', margin: 0 }}>
              EXITS TRIGGER WHEN COMPOSITE DROPS BELOW {DCA_CROSSOVER.toFixed(2)}× · SAME SIGNAL, INVERTED LOGIC · NOT FINANCIAL ADVICE
            </p>
            {!noExitsInPeriod && (
              <span style={{ fontSize: 10, color: tealColor, letterSpacing: '0.06em', whiteSpace: 'nowrap', marginLeft: 12 }}>
                EXCESS BTC CAPTURED: {formatBtc(periodBtcSig * buyScale)} → {formatUsd(periodUsdSig * buyScale, true)} · {period}
              </span>
            )}
            {noExitsInPeriod && history.length > 0 && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', whiteSpace: 'nowrap', marginLeft: 12 }}>
                NO SIGNAL EXITS IN {period} PERIOD
              </span>
            )}
          </div>

          {/* ── COMBINED PORTFOLIO CHART ─────────────────────────────────── */}
          {portData.length > 0 && (
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid var(--border-subtle)` }}>

              {/* Header + summary cards */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  COMBINED PORTFOLIO · BUY + EXIT SIMULATION
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                  ${baseAmount.toLocaleString()}/week DCA in · exits auto-sized to excess BTC · at current BTC price
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {/* Signal strategy card */}
                <div style={{ padding: '10px 14px', background: isDark ? 'rgba(0,212,200,0.04)' : 'rgba(74,124,89,0.05)', border: `1px solid ${isDark ? 'rgba(0,212,200,0.12)' : 'rgba(74,124,89,0.2)'}` }}>
                  <div style={{ fontSize: 9, color: tealColor, letterSpacing: '0.12em', marginBottom: 8 }}>SIGNAL STRATEGY · {period}</div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' as const }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 2 }}>BTC REMAINING</div>
                      <div style={{ fontSize: 15, color: tealColor, fontWeight: 600 }}>{formatBtc(portBtcSig)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 2 }}>USD FROM EXITS</div>
                      <div style={{ fontSize: 15, color: amberColor, fontWeight: 600 }}>{formatUsd(portUsdSig)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 2 }}>TOTAL VALUE</div>
                      <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 600 }}>{formatUsd(portTotalSig)}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', marginTop: 2 }}>
                        {formatUsd(portBtcSig * data.btcPrice, true)} BTC + {formatUsd(portUsdSig, true)} exits
                      </div>
                    </div>
                    {sigAvgCost > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 2 }}>AVG COST/BTC</div>
                        <div style={{ fontSize: 15, color: tealColor, fontWeight: 600 }}>{formatUsd(sigAvgCost)}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', marginTop: 2 }}>
                          net of exits
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {/* Vanilla comparison card */}
                <div style={{ padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 8 }}>VANILLA DCA · {period}</div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' as const }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 2 }}>BTC ACCUMULATED</div>
                      <div style={{ fontSize: 15, color: 'var(--text-secondary)', fontWeight: 600 }}>{formatBtc(portBtcVan)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 2 }}>USD FROM EXITS</div>
                      <div style={{ fontSize: 15, color: 'var(--text-muted)', fontWeight: 600 }}>(no exits)</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 2 }}>TOTAL VALUE</div>
                      <div style={{ fontSize: 15, color: 'var(--text-secondary)', fontWeight: 600 }}>{formatUsd(portTotalVan)}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', marginTop: 2 }}>
                        {formatUsd(portTotalVan, true)} BTC only
                      </div>
                    </div>
                    {vanAvgCost > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 2 }}>AVG COST/BTC</div>
                        <div style={{ fontSize: 15, color: 'var(--text-secondary)', fontWeight: 600 }}>{formatUsd(vanAvgCost)}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', marginTop: 2 }}>
                          no exits
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Chart */}
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={portData} margin={{ top: 4, right: 60, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="date"
                    ticks={portXTicks}
                    tickFormatter={v => formatXTick(v, period)}
                    tick={{ fontFamily: FONT, fontSize: 11, fill: 'var(--text-secondary)' }}
                    axisLine={{ stroke: axisStroke }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="btc" orientation="left"
                    tickFormatter={v => v >= 0.01 ? v.toFixed(2) : v.toFixed(4)}
                    tick={{ fontFamily: FONT, fontSize: 10, fill: 'var(--text-secondary)' }}
                    axisLine={false} tickLine={false} width={52}
                    label={{ value: 'BTC', angle: -90, position: 'insideLeft', offset: 14, style: { fontFamily: FONT, fontSize: 9, fill: 'var(--text-muted)' } }}
                  />
                  <YAxis
                    yAxisId="usd" orientation="right"
                    tickFormatter={v => formatUsd(v, true)}
                    tick={{ fontFamily: FONT, fontSize: 10, fill: 'var(--text-muted)' }}
                    axisLine={false} tickLine={false} width={60}
                    label={{ value: 'USD', angle: 90, position: 'insideRight', offset: 14, style: { fontFamily: FONT, fontSize: 9, fill: 'var(--text-muted)' } }}
                  />
                  <Tooltip content={<PortfolioTooltip />} />
                  {/* Vanilla BTC — grey reference */}
                  <Area
                    yAxisId="btc" type="monotone" dataKey="netBtcVan"
                    stroke={isDark ? 'rgba(180,180,180,0.35)' : 'rgba(100,100,100,0.3)'}
                    fill={isDark ? 'rgba(180,180,180,0.06)' : 'rgba(100,100,100,0.05)'}
                    strokeWidth={1} dot={false} isAnimationActive={false}
                  />
                  {/* Signal net BTC — teal highlight */}
                  <Area
                    yAxisId="btc" type="monotone" dataKey="netBtcSig"
                    stroke={tealColor}
                    fill={isDark ? 'rgba(0,212,200,0.1)' : 'rgba(74,124,89,0.1)'}
                    strokeWidth={2} dot={false} isAnimationActive={false}
                  />
                  {/* USD from exits — amber dashed line */}
                  <Line
                    yAxisId="usd" type="monotone" dataKey="usdSig"
                    stroke={amberColor} strokeWidth={1.5} strokeDasharray="4 2"
                    dot={false} isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' as const }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 16, height: 2, background: tealColor }} />
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>SIGNAL NET BTC</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 16, height: 2, background: isDark ? 'rgba(180,180,180,0.5)' : 'rgba(100,100,100,0.4)' }} />
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>VANILLA BTC (NO EXITS)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 16, height: 0, borderBottom: `2px dashed ${amberColor}` }} />
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>SIGNAL USD FROM EXITS</span>
                </div>
              </div>
            </div>
          )}

          {/* FAQ */}
          <DCAFaqSection isDark={isDark} />

          {/* VIP email signup — receive combined in/out signal by email */}
          <VIPEmailSignup baseAmount={baseAmount} />

        </div>

        {/* VIP overlay */}
        {!isVip && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: vipOverlayBg }}>
            <UpgradePrompt requiredTier="vip" featureName="DCA Exit Strategy" variant="overlay" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQ_ITEMS: { q: string; a: React.ReactNode }[] = [
  {
    q: 'What is the core idea behind this strategy?',
    a: (
      <>
        The strategy has two phases that work as a closed loop:
        <br /><br />
        <strong>Phase 1 — Accumulate:</strong> When on-chain signals show Bitcoin is undervalued, the signal buys <em>more</em> than vanilla DCA each week. Over a bear market or early bull, you build up a meaningful &ldquo;bonus&rdquo; BTC stack above what plain weekly buying would have given you.
        <br /><br />
        <strong>Phase 2 — Distribute the bonus:</strong> When on-chain signals show the market is overheating, the strategy systematically sells <em>only that bonus BTC</em> — never touching the core vanilla-equivalent position. You end the cycle with roughly the same BTC as if you had just vanilla DCA&rsquo;d the whole time, but you also have significant USD captured from selling the bonus at peak prices.
        <br /><br />
        The result: same BTC, extra cash. No timing the market, no discretion required.
      </>
    ),
  },
  {
    q: 'What powers the composite score?',
    a: (
      <>
        Two on-chain indicators are blended in a 5:1 weighted ratio:
        <br /><br />
        <strong>200-Week Moving Average Ratio</strong> — price divided by the 200-week (≈4-year) rolling average. Ratios at or below 1.0× have historically marked deep value. Ratios above 2–3× have historically marked overvaluation and preceded major drawdowns.
        <br /><br />
        <strong>Puell Multiple</strong> — the USD value of daily miner issuance divided by its 365-day average. Low values (&lt;0.8×) mean miners are earning far below normal — historically a strong buy signal. High values (&gt;2.0×) mean miners are earning well above normal — historically a reliable distribution signal.
        <br /><br />
        The two are combined and normalised against their own expanding historical mean, producing a single composite score that is anchored to context rather than absolute price levels.
      </>
    ),
  },
  {
    q: 'How are weekly buy amounts calculated?',
    a: 'The composite maps onto a stepped multiplier table calibrated against historical Bitcoin cycles. A high composite (deep value) increases your weekly buy. A low composite (overheated) reduces it. Your BASE BUY/WEEK × that week\'s multiplier = your recommended purchase. The only input you set is a comfortable recurring base amount — the signal handles the rest automatically.',
  },
  {
    q: 'How are exit amounts calculated? Is there a separate sell input?',
    a: (
      <>
        No separate sell input is needed. Exits are <em>auto-sized</em> to your actual excess position.
        <br /><br />
        When the composite drops below 0.70×, the strategy calculates how much more BTC you hold than vanilla DCA would have accumulated — your &ldquo;excess&rdquo;. Each week in exit territory, it sells a small percentage of that excess, scaling with how far below the crossover the signal has fallen:
        <br /><br />
        • <strong>0.55–0.70×</strong> — 4% of excess per week (light exits)
        <br />
        • <strong>0.40–0.55×</strong> — 7% per week
        <br />
        • <strong>0.25–0.40×</strong> — 11% per week
        <br />
        • <strong>below 0.25×</strong> — 15% per week (heavy distribution)
        <br /><br />
        The moment your excess reaches zero — meaning your net BTC equals vanilla — exits stop automatically. You cannot accidentally sell below your vanilla baseline.
      </>
    ),
  },
  {
    q: 'Why does this produce the same BTC as vanilla at the end?',
    a: 'Because exits are strictly bounded by the excess. The signal DCA-in built up bonus BTC above the vanilla baseline. The DCA-out only ever sells that bonus. Once the bonus is gone, there is nothing left to sell. You end with the vanilla baseline intact plus whatever USD the bonus generated when it was sold at elevated market prices. The combined portfolio chart shows this directly — teal net BTC converging toward the grey vanilla line as the bonus is distributed.',
  },
  {
    q: 'What does the combined portfolio chart show?',
    a: (
      <>
        The chart models the full strategy from the start of the selected period, scaled to your base weekly buy amount:
        <br /><br />
        <strong>Teal line</strong> — signal net BTC: total bought via signal DCA-in, minus BTC sold via exits. This starts above vanilla (bonus accumulation phase) and converges toward it as exits distribute the bonus during overheated periods.
        <br />
        <strong>Grey line</strong> — vanilla BTC: same weekly buy amount, held entirely, no exits ever.
        <br />
        <strong>Amber dashed line</strong> — USD accumulating from signal exits over the period.
        <br /><br />
        The summary cards show end-of-period totals: signal BTC remaining + USD captured vs vanilla BTC total value.
      </>
    ),
  },
  {
    q: 'What if the market never gets overheated in a given period?',
    a: 'If the composite never drops below 0.70× during the selected window, no exits trigger and the signal simply continues accumulating. The DCA-out section will show \u201cno signal exits in period\u201d and the teal BTC line will track above vanilla the entire time \u2014 reflecting pure accumulation with no distribution yet. The bonus builds and waits for the next overheated cycle to be distributed.',
  },
  {
    q: 'How do I follow this week to week in practice?',
    a: 'Check the signal once per week — Monday works well since signals compute from Sunday\'s close. If the composite is above 0.70×, make your DCA-in purchase at the recommended amount. If it is below 0.70×, make your DCA-out sale at the recommended amount. The VIP email signal delivers both numbers directly to your inbox so you never need to remember to check. Set a base amount, subscribe, and let the signal handle the scaling.',
  },
  {
    q: 'Is this financial advice?',
    a: 'No. This is a backtested quantitative signal tool provided for educational and informational purposes only. On-chain indicators do not guarantee future performance. Bitcoin is highly volatile and you can lose the full value of any position. Past cycle behaviour is not a reliable guide to future returns. Never deploy capital you cannot afford to lose, and always conduct your own independent research before making any investment decision.',
  },
];

function DCAFaqSection({ isDark }: { isDark: boolean }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const teal   = isDark ? '#00d4c8' : '#4a7c59';
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const hoverBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

  return (
    <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
      <div style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--text-secondary)', marginBottom: 16, fontFamily: FONT }}>
        HOW THE STRATEGY WORKS · FAQ
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = openIdx === i;
          return (
            <div
              key={i}
              style={{ borderBottom: `1px solid ${border}` }}
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                style={{
                  width:          '100%',
                  display:        'flex',
                  justifyContent: 'space-between',
                  alignItems:     'center',
                  padding:        '11px 0',
                  background:     isOpen ? hoverBg : 'transparent',
                  border:         'none',
                  cursor:         'pointer',
                  fontFamily:     FONT,
                  textAlign:      'left',
                  gap:            12,
                  transition:     'none',
                }}
              >
                <span style={{
                  fontSize:      12,
                  color:         isOpen ? teal : 'var(--text-primary)',
                  letterSpacing: '0.04em',
                  lineHeight:    1.5,
                }}>
                  {item.q}
                </span>
                <span style={{
                  fontSize:   14,
                  color:      isOpen ? teal : 'var(--text-muted)',
                  flexShrink: 0,
                  lineHeight: 1,
                  transform:  isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                }}>
                  +
                </span>
              </button>

              {isOpen && (
                <div style={{
                  paddingBottom: 14,
                  paddingRight:  24,
                  fontSize:      12,
                  fontFamily:    FONT,
                  color:         'var(--text-secondary)',
                  letterSpacing: '0.03em',
                  lineHeight:    1.75,
                }}>
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14, fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', fontFamily: FONT }}>
        SIGNALS ARE BACKTESTED AGAINST HISTORICAL BITCOIN CYCLES · NOT FINANCIAL ADVICE · PAST PERFORMANCE IS NOT INDICATIVE OF FUTURE RESULTS
      </div>
    </div>
  );
}
