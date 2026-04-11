'use client';

import { useState, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTier }         from '@/hooks/useTier';
import { useTheme }        from '@/components/layout/ThemeProvider';
import { UpgradePrompt }   from '@/components/auth/UpgradePrompt';
import type { BtcSignalResponse }  from '@/app/api/btc-signal/route';
import type { DistributionPoint }  from '@/lib/data/daily-snapshot';
import { DCA_CROSSOVER, compositeToSellMult, compositeToExitTier } from '@/lib/signals/dca-exit-utils';
import { VIPEmailSignup } from './VIPEmailSignup';

const FONT      = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";
const LS_SELL   = 'sr-dca-base-sell';
const LS_PERIOD = 'sr-dca-out-period';

type Period = '1Y' | '3Y' | '5Y' | 'ALL';
const PERIODS: { label: Period; years: number | null }[] = [
  { label: '1Y', years: 1 }, { label: '3Y', years: 3 },
  { label: '5Y', years: 5 }, { label: 'ALL', years: null },
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

function shiftYears(dateStr: string, years: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

function getXTicks(data: DistributionPoint[], period: Period): string[] {
  const seen = new Set<string>();
  const ticks: string[] = [];
  for (const row of data) {
    let key: string;
    if      (period === '1Y') key = row.date.slice(0, 7);
    else if (period === '3Y') { const [y, m] = row.date.split('-'); key = `${y}-Q${Math.floor((+m - 1) / 3)}`; }
    else                      key = row.date.slice(0, 4);
    if (!seen.has(key)) { seen.add(key); ticks.push(row.date); }
  }
  return ticks;
}

function formatXTick(dateStr: string, period: Period): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (period === '1Y') return d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  if (period === '3Y') return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
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

  const isVip = canAccess('vip');

  const [period, setPeriod] = useState<Period>('5Y');
  const [baseSell, setBaseSell] = useState(baseAmount);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_SELL);
      if (stored) {
        const n = parseInt(stored, 10);
        if (!isNaN(n) && n > 0) { setBaseSell(n); return; }
      }
      setBaseSell(baseAmount);
    } catch { setBaseSell(baseAmount); }
    try {
      const p = localStorage.getItem(LS_PERIOD) as Period | null;
      if (p && PERIODS.some(x => x.label === p)) setPeriod(p);
    } catch { /* noop */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep baseSell in sync when baseAmount changes (unless user has overridden)
  useEffect(() => {
    try { if (!localStorage.getItem(LS_SELL)) setBaseSell(baseAmount); }
    catch { setBaseSell(baseAmount); }
  }, [baseAmount]);

  function handleSellChange(val: string) {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0 && n <= 9_999_999) {
      setBaseSell(n);
      try { localStorage.setItem(LS_SELL, String(n)); } catch { /* noop */ }
    }
  }

  function handlePeriod(p: Period) {
    setPeriod(p);
    try { localStorage.setItem(LS_PERIOD, p); } catch { /* noop */ }
  }

  const composite    = data.composite;
  const sellMult     = compositeToSellMult(composite);
  const exitTier     = compositeToExitTier(composite);
  const mode         = modeInfo(composite, isDark);
  const inExitZone   = composite < DCA_CROSSOVER;
  const nearCrossover = !inExitZone && composite < 0.85;

  const recommendedSell = Math.round(baseSell * sellMult);
  const recommendedBtc  = sellMult > 0 ? recommendedSell / data.btcPrice : 0;

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

  // ── Chart data ─────────────────────────────────────────────────────────────
  const history = data.distributionHistory ?? [];
  const scale   = baseSell / 100;
  const lastDate = history.at(-1)?.date ?? '';
  const cutoff   = period === 'ALL' || !lastDate ? '' : shiftYears(lastDate, PERIODS.find(p => p.label === period)!.years!);

  type ChartRow = DistributionPoint & { weeklyUsd: number };
  const chartData: ChartRow[] = (() => {
    const raw = period === 'ALL' ? history : history.filter(r => r.date >= cutoff);
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
      return { ...r, weeklyUsd: Math.max(0, delta) * scale };
    });
  })();

  const xTicks = getXTicks(chartData, period);

  // All-time USD/BTC efficiency advantage
  const allLast    = history.at(-1);
  const effSignal  = allLast && allLast.btcSignal  > 0 ? allLast.usdSignal  / allLast.btcSignal  : 0;
  const effVanilla = allLast && allLast.btcVanilla > 0 ? allLast.usdVanilla / allLast.btcVanilla : 0;
  const effAdvPct  = effVanilla > 0 ? ((effSignal - effVanilla) / effVanilla) * 100 : 0;

  // Periods that were in exit territory
  const exitWeeks = history.filter(r => r.sellMult > 0).length;
  const totalWeeks = history.length;

  if (tierLoading) return null;

  return (
    <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-subtle)', fontFamily: FONT }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--text-secondary)' }}>
          DCA EXIT STRATEGY
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {effAdvPct > 0 && (
            <span style={{ fontSize: 10, color: tealColor, letterSpacing: '0.08em' }}>
              +{effAdvPct.toFixed(1)}% MORE $ PER BTC (ALL-TIME)
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

          {/* Calculator row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* Base sell input */}
            <div style={{ padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.1em', marginBottom: 8 }}>BASE SELL / WEEK</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>$</span>
                <input
                  type="number" min={1} max={9999999} value={baseSell}
                  onChange={e => handleSellChange(e.target.value)}
                  style={{ width: 112, fontSize: 15, fontFamily: FONT, background: 'var(--bg-card)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', padding: '4px 8px', outline: 'none', transition: 'none' }}
                  onFocus={e => { e.currentTarget.style.borderColor = isDark ? '#00d4c8' : '#4a7c59'; }}
                  onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
                />
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                Your base weekly distribution amount · multiplied by exit signal
              </div>
            </div>

            {/* This week recommendation */}
            <div style={{
              padding: '14px 16px',
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
                    ≈ {recommendedBtc.toFixed(4)} BTC · {sellMult.toFixed(1)}× your ${baseSell.toLocaleString()} base
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
                    tickFormatter={v => formatUsd(v * scale, true)}
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
            {effAdvPct > 0 && (
              <span style={{ fontSize: 10, color: tealColor, letterSpacing: '0.06em', whiteSpace: 'nowrap', marginLeft: 12 }}>
                SIGNAL EXITS: +{effAdvPct.toFixed(1)}% MORE $ PER BTC vs VANILLA
              </span>
            )}
          </div>

          {/* VIP email signup — receive combined in/out signal by email */}
          <VIPEmailSignup baseAmount={baseSell} />

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
