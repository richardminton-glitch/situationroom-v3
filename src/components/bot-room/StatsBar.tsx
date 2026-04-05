'use client';

import { useState, useEffect, useCallback } from 'react';
import { C, FONT, type BotState } from './constants';

const POLL_INTERVAL = 60_000; // 60s — matches pool/status cache TTL

const OFFLINE_STATE: BotState = {
  poolBalance: 0,
  position: 'FLAT',
  leverage: 0,
  entryPrice: null,
  unrealisedPnl: 0,
  tradeCount: 0,
  winRate: 0,
  totalPnl: 0,
  lastTradePnl: 0,
};

function posColor(p: string): string {
  if (p === 'LONG') return C.teal;
  if (p === 'SHORT') return C.coral;
  return C.textDim;
}
function pnlColor(v: number): string { return v >= 0 ? C.teal : C.coral; }

export function StatsBar() {
  const [state, setState] = useState<BotState>(OFFLINE_STATE);
  const [online, setOnline] = useState(false);

  const fetchPool = useCallback(async () => {
    try {
      const res = await fetch('/api/pool/status');
      if (!res.ok) { setOnline(false); return; }
      const data = await res.json();
      if (data.error) { setOnline(false); return; }

      setState({
        poolBalance:   data.poolBalanceBtc ?? 0,
        position:      data.position ?? 'FLAT',
        leverage:      data.leverage ?? 0,
        entryPrice:    data.entryPrice ?? null,
        unrealisedPnl: data.unrealisedPlSats ?? 0,
        tradeCount:    data.tradeCount ?? 0,
        winRate:       data.winRate ?? 0,
        totalPnl:      data.totalPlSats ?? 0,
        lastTradePnl:  data.lastTradePlSats ?? 0,
      });
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    fetchPool();
    const id = setInterval(fetchPool, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchPool]);

  const stats = [
    { label: 'Pool Balance', value: online ? `${Math.round(state.poolBalance * 1e8).toLocaleString()} sats` : '\u2014' },
    { label: 'Position', value: state.position === 'FLAT' ? 'FLAT' : `${state.position} ${state.leverage}\u00d7`, color: posColor(state.position) },
    { label: 'Entry Price', value: state.entryPrice ? `$${state.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '\u2014' },
    { label: 'Unrealised P&L', value: online ? `${state.unrealisedPnl >= 0 ? '+' : ''}${state.unrealisedPnl} sats` : '\u2014', color: online ? pnlColor(state.unrealisedPnl) : undefined },
    { label: 'Trades', value: online ? String(state.tradeCount) : '\u2014' },
    { label: 'Win Rate', value: online ? `${(state.winRate * 100).toFixed(1)}%` : '\u2014', color: online && state.tradeCount > 0 ? (state.winRate > 0.5 ? C.teal : C.coral) : undefined },
    { label: 'Total P&L', value: online ? `${state.totalPnl >= 0 ? '+' : ''}${state.totalPnl.toLocaleString()} sats` : '\u2014', color: online ? pnlColor(state.totalPnl) : undefined },
    { label: 'Last Trade', value: online && state.tradeCount > 0 ? `${state.lastTradePnl >= 0 ? '+' : ''}${state.lastTradePnl} sats` : '\u2014', color: online && state.tradeCount > 0 ? pnlColor(state.lastTradePnl) : undefined },
  ];

  return (
    <div style={{
      height: '38px', display: 'flex', borderBottom: `1px solid ${C.border}`,
      fontFamily: FONT, backgroundColor: C.bgPrimary,
    }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '0 10px',
          borderRight: i < stats.length - 1 ? `1px solid ${C.border}` : 'none',
        }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.12em', color: C.textDim, textTransform: 'uppercase', marginBottom: '2px' }}>
            {s.label}
          </div>
          <div style={{ fontSize: '11px', letterSpacing: '0.04em', color: s.color || C.textPrimary }}>
            {s.value}
          </div>
        </div>
      ))}
      {/* Online indicator */}
      <div style={{
        width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderLeft: `1px solid ${C.border}`,
      }}>
        <span
          className="br-blink"
          title={online ? 'Pool connected' : 'Pool offline'}
          style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: online ? C.teal : C.coral,
            display: 'inline-block',
          }}
        />
      </div>
    </div>
  );
}
