'use client';

/**
 * Market Heatmap — live ticker grid for the Bot Room.
 * Consumes the shared DataProvider snapshot (auto-refreshes every 60s).
 *
 * Row 1: BTC-correlated assets + major indices
 * Row 2: Global indices, FX, commodities, yields
 */

import { useState } from 'react';
import { useData } from '@/components/layout/DataProvider';
import { C, FONT, HM } from './constants';

// ── Ticker definitions with data source mappings ───────────────────────────────
interface HmTicker {
  label: string;
  type: 'btc' | 'gold' | 'standard';
  src: 'btcMarket' | 'indices' | 'commodities' | 'fx' | 'btcEquities';
  key: string; // key into the record, or '' for btcMarket
}

const ROW1: HmTicker[] = [
  { label: 'BTC',  type: 'btc',      src: 'btcMarket',    key: '' },
  { label: 'MSTR', type: 'btc',      src: 'btcEquities',  key: 'mstr' },
  { label: 'COIN', type: 'btc',      src: 'btcEquities',  key: 'coin' },
  { label: 'RIOT', type: 'btc',      src: 'btcEquities',  key: 'riot' },
  { label: 'MARA', type: 'btc',      src: 'btcEquities',  key: 'mara' },
  { label: 'CLSK', type: 'btc',      src: 'btcEquities',  key: 'clsk' },
  { label: 'HUT',  type: 'btc',      src: 'btcEquities',  key: 'hut' },
  { label: 'IBIT', type: 'btc',      src: 'btcEquities',  key: 'ibit' },
  { label: 'NDX',  type: 'standard', src: 'indices',      key: 'nasdaq' },
  { label: 'SPX',  type: 'standard', src: 'indices',      key: 'sp500' },
  { label: 'DJI',  type: 'standard', src: 'indices',      key: 'dji' },
  { label: 'FTSE', type: 'standard', src: 'indices',      key: 'ftse' },
  { label: 'DAX',  type: 'standard', src: 'indices',      key: 'dax' },
  { label: 'VIX',  type: 'standard', src: 'indices',      key: 'vix' },
];

const ROW2: HmTicker[] = [
  { label: 'N225', type: 'standard', src: 'indices',      key: 'nikkei' },
  { label: 'HSI',  type: 'standard', src: 'indices',      key: 'hsi' },
  { label: 'DXY',  type: 'standard', src: 'commodities',  key: 'dxy' },
  { label: 'EUR',  type: 'standard', src: 'fx',           key: 'eur' },
  { label: 'JPY',  type: 'standard', src: 'fx',           key: 'jpy' },
  { label: 'GBP',  type: 'standard', src: 'fx',           key: 'gbp' },
  { label: 'CNY',  type: 'standard', src: 'fx',           key: 'cny' },
  { label: 'GOLD', type: 'gold',     src: 'commodities',  key: 'gold' },
  { label: 'SLVR', type: 'gold',     src: 'commodities',  key: 'silver' },
  { label: 'OIL',  type: 'standard', src: 'commodities',  key: 'crude-oil' },
  { label: 'NGAS', type: 'standard', src: 'commodities',  key: 'natural-gas' },
  { label: 'CPPR', type: 'standard', src: 'commodities',  key: 'copper' },
  { label: '10Y',  type: 'standard', src: 'commodities',  key: 'us10y' },
  { label: '2Y',   type: 'standard', src: 'commodities',  key: 'us2y' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function cellColors(type: string, change: number): { bg: string; fg: string } {
  if (type === 'btc')  return { bg: HM.btc,  fg: C.btcOrange };
  if (type === 'gold') return { bg: HM.gold, fg: C.gold };
  if (change >  1.0)  return { bg: HM.posStrong, fg: C.teal };
  if (change >  0)    return { bg: HM.pos,       fg: C.teal };
  if (change === 0)   return { bg: HM.flat,      fg: C.textDim };
  if (change < -1.0)  return { bg: HM.negStrong, fg: C.coral };
  return                      { bg: HM.neg,       fg: C.coral };
}

function fmtPct(n: number | null): string {
  if (n == null) return '—';
  return n >= 0 ? `+${n.toFixed(2)}%` : `${n.toFixed(2)}%`;
}

// ── Cell component ─────────────────────────────────────────────────────────────
function Cell({ label, type, change }: { label: string; type: string; change: number | null }) {
  const [hover, setHover] = useState(false);
  const { bg, fg } = cellColors(type, change ?? 0);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: 1, minWidth: 0, padding: '4px 2px', textAlign: 'center',
        background: change != null ? bg : HM.flat,
        border: hover ? '1px solid rgba(0,212,170,0.2)' : '1px solid transparent',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ fontFamily: FONT, fontSize: '11px', fontWeight: 'bold', color: change != null ? fg : C.textDim, lineHeight: 1 }}>
        {label}
      </div>
      <div style={{ fontFamily: FONT, fontSize: '10px', color: change != null ? fg : C.textDim, marginTop: '1px' }}>
        {fmtPct(change)}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function MarketHeatmap() {
  const { data } = useData();

  /** Resolve a ticker's changePct from the snapshot data */
  function resolve(t: HmTicker): number | null {
    if (!data) return null;

    if (t.src === 'btcMarket') {
      // btcMarket.change24h is in percentage points (e.g. -2.5 = -2.5%)
      return data.btcMarket?.change24h ?? null;
    }

    const bucket = data[t.src];
    if (!bucket) return null;
    const entry = (bucket as Record<string, { changePct: number }>)[t.key];
    if (!entry) return null;
    // changePct is already in percentage points from trackChange / API Ninjas
    return entry.changePct;
  }

  const ts = data?.timestamp
    ? new Date(data.timestamp).toISOString().slice(11, 19)
    : '—';

  return (
    <div style={{
      height: '112px', display: 'flex', flexDirection: 'column',
      borderTop: `1px solid ${C.border}`, fontFamily: FONT, backgroundColor: C.bgPrimary,
    }}>
      {/* Header */}
      <div style={{
        height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            className="br-blink"
            style={{
              width: '4px', height: '4px', borderRadius: '50%',
              background: data ? C.teal : C.coral,
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: '9px', letterSpacing: '0.14em', color: C.textDim }}>MARKET HEATMAP</span>
        </div>
        <span style={{ fontSize: '9px', color: C.textDim }}>Updated {ts}</span>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', flex: 1 }}>
          {ROW1.map(t => <Cell key={t.label} label={t.label} type={t.type} change={resolve(t)} />)}
        </div>
        <div style={{ display: 'flex', flex: 1 }}>
          {ROW2.map(t => <Cell key={t.label} label={t.label} type={t.type} change={resolve(t)} />)}
        </div>
      </div>
    </div>
  );
}
