'use client';

import { useState, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTier }         from '@/hooks/useTier';
import { UpgradePrompt }   from '@/components/auth/UpgradePrompt';
import type { BtcSignalResponse }  from '@/app/api/btc-signal/route';
import type { DistributionPoint }  from '@/lib/data/daily-snapshot';

const FONT      = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";
const LS_SELL   = 'sr-dca-base-sell';
const LS_PERIOD = 'sr-dca-out-period';

type Period = '1Y' | '3Y' | '5Y' | 'ALL';

const PERIODS: { label: Period; years: number | null }[] = [
  { label: '1Y',  years: 1 },
  { label: '3Y',  years: 3 },
  { label: '5Y',  years: 5 },
  { label: 'ALL', years: null },
];

// ── Exit signal logic ─────────────────────────────────────────────────────────

function compositeToExitMult(c: number): number {
  if (c >= 2.0) return 0.2;
  if (c >= 1.5) return 0.5;
  if (c >= 1.15) return 0.8;
  if (c >= 0.85) return 1.0;
  if (c >= 0.5)  return 1.5;
  return 2.5;
}

function compositeToExitTier(c: number): string {
  if (c >= 2.0) return 'Hold';
  if (c >= 1.5) return 'Partial exits';
  if (c >= 1.15) return 'Light exits';
  if (c >= 0.85) return 'Normal distribution';
  if (c >= 0.5)  return 'Increase exits';
  return 'Heavy distribution';
}

function exitColour(mult: number): string {
  if (mult >= 1.5) return '#00d4c8';  // teal  — good time to sell
  if (mult >= 0.8) return '#c4885a';  // amber — neutral
  return '#6b7a8d';                   // muted — not a good time to sell
}

// ── Formatting ────────────────────────────────────────────────────────────────

function formatUsd(v: number): string {
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(2) + 'M';
  if (v >= 1_000)     return '$' + (v / 1_000).toFixed(1) + 'K';
  return '$' + v.toFixed(0);
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

// ── Chart helpers ─────────────────────────────────────────────────────────────

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const sig = payload.find((p: any) => p.dataKey === 'usdSignalScaled');
  const van = payload.find((p: any) => p.dataKey === 'usdVanillaScaled');
  const prc = payload.find((p: any) => p.dataKey === 'price');
  return (
    <div style={{
      background:    'rgba(21,29,37,0.97)',
      border:        '1px solid rgba(255,255,255,0.1)',
      padding:       '8px 12px', fontFamily: FONT, fontSize: 10,
      color: '#e8edf2', letterSpacing: '0.06em', lineHeight: 1.8,
    }}>
      <div style={{ color: '#6b7a8d', marginBottom: 4 }}>{label}</div>
      {sig && <div style={{ color: '#00d4c8' }}>SIGNAL  {formatUsd(sig.value)}</div>}
      {van && <div style={{ color: '#4a5568' }}>VANILLA {formatUsd(van.value)}</div>}
      {prc && <div style={{ color: '#8aaba6' }}>BTC     {formatPrice(prc.value)}</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  data:       BtcSignalResponse;
  baseAmount: number;   // shared base from DCASignalPage — scales all sell recommendations
}

export function DCAOutSection({ data, baseAmount }: Props) {
  const { canAccess, loading: tierLoading } = useTier();
  const isVip = canAccess('vip');

  const [period, setPeriod] = useState<Period>('5Y');

  // Initialise baseSell from localStorage, default to baseAmount
  const [baseSell, setBaseSell] = useState(baseAmount);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_SELL);
      if (stored) {
        const n = parseInt(stored, 10);
        if (!isNaN(n) && n > 0) setBaseSell(n);
        else setBaseSell(baseAmount);
      } else {
        setBaseSell(baseAmount);
      }
      const p = localStorage.getItem(LS_PERIOD) as Period | null;
      if (p && PERIODS.some(x => x.label === p)) setPeriod(p);
    } catch { /* SSR */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep baseSell in sync with baseAmount when baseAmount changes (unless user has set their own)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_SELL);
      if (!stored) setBaseSell(baseAmount);
    } catch { setBaseSell(baseAmount); }
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

  const exitMult = compositeToExitMult(data.composite);
  const exitTier = compositeToExitTier(data.composite);
  const colour   = exitColour(exitMult);

  // Recommended sell this week = baseSell * exitMult
  const recommendedSell = Math.round(baseSell * exitMult);
  // In BTC at current price
  const recommendedBtc  = recommendedSell / data.btcPrice;

  // Distribution chart data — filtered to period, zero-based for non-ALL
  const history = data.distributionHistory ?? [];
  const scale   = baseSell / 100;
  const lastDate = history.at(-1)?.date ?? '';
  const cutoff   = period === 'ALL'
    ? ''
    : shiftYears(lastDate, PERIODS.find(p => p.label === period)!.years!);

  type ChartRow = DistributionPoint & { usdSignalScaled: number; usdVanillaScaled: number };

  let chartData: ChartRow[];
  if (period === 'ALL') {
    chartData = history.map(r => ({
      ...r,
      usdSignalScaled:  r.usdSignal  * scale,
      usdVanillaScaled: r.usdVanilla * scale,
    }));
  } else {
    const raw = history.filter(r => r.date >= cutoff);
    if (raw.length === 0) {
      chartData = [];
    } else {
      const b0s = raw[0].usdSignal;
      const b0v = raw[0].usdVanilla;
      chartData = raw.map(r => ({
        ...r,
        usdSignalScaled:  (r.usdSignal  - b0s) * scale,
        usdVanillaScaled: (r.usdVanilla - b0v) * scale,
      }));
    }
  }

  const xTicks = getXTicks(chartData, period);
  const lastRow = chartData.at(-1);
  const lastSig = lastRow?.usdSignalScaled ?? 0;
  const lastVan = lastRow?.usdVanillaScaled ?? 0;
  const advPct  = lastVan > 0 ? ((lastSig - lastVan) / lastVan) * 100 : 0;

  // USD-per-BTC efficiency advantage from all-time history
  const allLast   = history.at(-1);
  const effSignal  = allLast && allLast.btcSignal  > 0 ? allLast.usdSignal  / allLast.btcSignal  : 0;
  const effVanilla = allLast && allLast.btcVanilla > 0 ? allLast.usdVanilla / allLast.btcVanilla : 0;
  const effAdvPct  = effVanilla > 0 ? ((effSignal - effVanilla) / effVanilla) * 100 : 0;

  if (tierLoading) return null;

  return (
    <div style={{
      paddingTop: 16,
      borderTop:  '1px solid rgba(255,255,255,0.06)',
      fontFamily: FONT,
    }}>

      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 9, letterSpacing: '0.14em', color: '#6b7a8d' }}>
          DCA EXIT STRATEGY
        </span>
        {!isVip && (
          <span style={{ fontSize: 8, color: '#c4885a', letterSpacing: '0.1em', padding: '2px 8px', border: '1px solid rgba(196,136,90,0.3)', background: 'rgba(196,136,90,0.06)' }}>
            VIP ONLY
          </span>
        )}
      </div>

      {/* Current exit signal — always visible as teaser */}
      <div style={{
        display:        'grid',
        gridTemplateColumns: '1fr 1fr',
        gap:            16,
        marginBottom:   16,
      }}>
        {/* Exit signal hero */}
        <div style={{
          padding:    '16px 18px',
          background: 'rgba(255,255,255,0.02)',
          border:     `1px solid rgba(255,255,255,0.06)`,
          borderLeft: `3px solid ${colour}`,
        }}>
          <span style={{ fontSize: 9, letterSpacing: '0.14em', color: '#6b7a8d', display: 'block', marginBottom: 8 }}>
            EXIT SIGNAL
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 36, fontWeight: 600, color: colour, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {exitMult.toFixed(1)}×
            </span>
          </div>
          <span style={{ fontSize: 10, color: colour, letterSpacing: '0.1em', fontWeight: 600, textTransform: 'uppercase' as const }}>
            {exitTier}
          </span>
          <div style={{ marginTop: 8, fontSize: 8, color: '#4a5568', letterSpacing: '0.06em' }}>
            Inverse of buy composite ({data.composite.toFixed(2)}×)
          </div>
        </div>

        {/* Weekly recommendation — blurred for non-VIP */}
        <div style={{ position: 'relative' }}>
          <div style={{
            padding:    '16px 18px',
            background: 'rgba(255,255,255,0.02)',
            border:     '1px solid rgba(255,255,255,0.06)',
            filter:     isVip ? 'none' : 'blur(6px)',
            userSelect: isVip ? 'auto' : 'none',
            pointerEvents: isVip ? 'auto' : 'none',
          }}>
            <span style={{ fontSize: 9, letterSpacing: '0.14em', color: '#6b7a8d', display: 'block', marginBottom: 8 }}>
              THIS WEEK — SELL
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 500, color: '#e8edf2', letterSpacing: '0.02em' }}>
                ${recommendedSell.toLocaleString()}
              </span>
            </div>
            <span style={{ fontSize: 9, color: '#6b7a8d', letterSpacing: '0.06em' }}>
              ≈ {recommendedBtc.toFixed(4)} BTC @ ${data.btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 8, color: '#4a5568', letterSpacing: '0.08em', marginBottom: 4 }}>BASE SELL / WEEK</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#6b7a8d' }}>$</span>
                <input
                  type="number"
                  min={1}
                  max={9999999}
                  value={baseSell}
                  onChange={e => handleSellChange(e.target.value)}
                  style={{
                    width: 112, fontSize: 12, fontFamily: FONT,
                    background: '#0d1520', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#e8edf2', padding: '4px 8px', outline: 'none', transition: 'none',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#00d4c8'; }}
                  onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                />
              </div>
              <div style={{ fontSize: 8, color: '#4a5568', letterSpacing: '0.06em', marginTop: 6 }}>
                {exitMult.toFixed(1)}× your ${baseSell.toLocaleString()} base · {exitTier.toLowerCase()}
              </div>
            </div>
          </div>

          {!isVip && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(9,13,18,0.55)',
            }}>
              <UpgradePrompt requiredTier="vip" featureName="DCA Exit Strategy" variant="overlay" />
            </div>
          )}
        </div>
      </div>

      {/* Distribution chart — blurred + overlay for non-VIP */}
      <div style={{ position: 'relative' }}>
        <div style={{
          filter:     isVip ? 'none' : 'blur(5px)',
          userSelect: isVip ? 'auto' : 'none',
          pointerEvents: isVip ? 'auto' : 'none',
        }}>
          {/* Chart header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <span style={{ fontSize: 9, letterSpacing: '0.12em', color: '#6b7a8d' }}>
                CUMULATIVE USD RECEIVED · SIGNAL vs VANILLA
              </span>
              {effAdvPct > 0 && (
                <span style={{ fontSize: 9, color: '#00d4c8', marginLeft: 12, letterSpacing: '0.06em' }}>
                  +{effAdvPct.toFixed(1)}% MORE $ PER BTC (ALL-TIME)
                </span>
              )}
            </div>
            {/* Period picker */}
            <div style={{ display: 'flex', gap: 0 }}>
              {PERIODS.map(p => (
                <button
                  key={p.label}
                  onClick={() => handlePeriod(p.label)}
                  style={{
                    padding: '3px 9px', fontSize: 9, letterSpacing: '0.1em',
                    fontFamily: FONT, cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: period === p.label ? 'rgba(0,212,200,0.12)' : 'transparent',
                    color:      period === p.label ? '#00d4c8' : '#4a5568',
                    transition: 'none',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {chartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 52, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="distSignalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00d4c8" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#00d4c8" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="distVanillaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4a5568" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4a5568" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    ticks={xTicks}
                    tickFormatter={v => formatXTick(v, period)}
                    tick={{ fontFamily: FONT, fontSize: 9, fill: '#6b7a8d', letterSpacing: 1 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    domain={[0, 'auto']}
                    tickFormatter={v => formatUsd(v)}
                    tick={{ fontFamily: FONT, fontSize: 8, fill: '#6b7a8d' }}
                    axisLine={false} tickLine={false} width={56}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={formatPrice}
                    tick={{ fontFamily: FONT, fontSize: 9, fill: '#4a5568' }}
                    axisLine={false} tickLine={false} width={52}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    yAxisId="right" type="monotone" dataKey="price"
                    stroke="rgba(200,230,227,0.2)" strokeWidth={1} dot={false} isAnimationActive={false}
                  />
                  <Area
                    yAxisId="left" type="monotone" dataKey="usdVanillaScaled"
                    stroke="rgba(74,85,104,0.6)" strokeWidth={1.5}
                    fill="url(#distVanillaGrad)" dot={false} isAnimationActive={false}
                  />
                  <Area
                    yAxisId="left" type="monotone" dataKey="usdSignalScaled"
                    stroke="#00d4c8" strokeWidth={2}
                    fill="url(#distSignalGrad)" dot={false} isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontFamily: FONT, fontSize: 9, letterSpacing: '0.08em', color: '#6b7a8d' }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-block', width: 16, height: 2, background: '#00d4c8' }} />
                    SIGNAL EXITS · {formatUsd(lastSig)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-block', width: 16, height: 1.5, background: 'rgba(74,85,104,0.6)' }} />
                    VANILLA EXITS · {formatUsd(lastVan)}
                  </span>
                </div>
                <span style={{ color: advPct >= 0 ? '#00d4c8' : '#d06050' }}>
                  {advPct >= 0 ? '+' : ''}{advPct.toFixed(1)}% MORE USD
                </span>
              </div>
            </>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5568', fontSize: 9, letterSpacing: '0.1em' }}>
              NO DATA FOR PERIOD
            </div>
          )}

          <p style={{ marginTop: 8, fontSize: 8, color: '#4a5568', letterSpacing: '0.08em' }}>
            SIGNAL exits MORE when composite is low (overvalued) · LESS when composite is high (accumulate zone) · NOT FINANCIAL ADVICE
          </p>
        </div>

        {/* VIP overlay on chart */}
        {!isVip && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,13,18,0.4)' }}>
            <UpgradePrompt requiredTier="vip" featureName="DCA Exit Strategy" variant="overlay" />
          </div>
        )}
      </div>
    </div>
  );
}
