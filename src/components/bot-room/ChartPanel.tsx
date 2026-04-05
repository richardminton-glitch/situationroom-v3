'use client';

import { useState, useEffect, useCallback } from 'react';
import { C, FONT } from './constants';

export function ChartPanel() {
  const [position, setPosition] = useState<'LONG' | 'SHORT' | 'FLAT'>('FLAT');
  const [leverage, setLeverage] = useState(0);
  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  const [poolBalance, setPoolBalance] = useState(0);

  const fetchPool = useCallback(async () => {
    try {
      const res = await fetch('/api/pool/status');
      if (!res.ok) return;
      const data = await res.json();
      if (data.error) return;
      setPosition(data.position ?? 'FLAT');
      setLeverage(data.leverage ?? 0);
      setEntryPrice(data.entryPrice ?? null);
      setPoolBalance(data.poolBalanceBtc ?? 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchPool();
    const id = setInterval(fetchPool, 60_000);
    return () => clearInterval(id);
  }, [fetchPool]);

  const posLabel =
    position === 'FLAT'
      ? 'FLAT'
      : `NET ${position} ${(poolBalance * leverage * 100 / 100).toFixed(4)}%`;
  const posColor =
    position === 'LONG' ? C.teal : position === 'SHORT' ? C.coral : C.textDim;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: C.bgPrimary }}>
      {/* Header */}
      <div style={{
        height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 10px', borderBottom: `1px solid ${C.border}`, fontFamily: FONT,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '9px', color: posColor, padding: '1px 6px',
            background: `${posColor}11`, border: `1px solid ${posColor}33`,
            letterSpacing: '0.06em',
          }}>
            {'\u25CF'} {posLabel}
          </span>
          <span style={{ fontSize: '10px', color: C.textPrimary, letterSpacing: '0.04em' }}>
            BTCUSD {'\u00B7'} 5M
          </span>
        </div>
        {entryPrice && (
          <span style={{
            fontSize: '10px', color: C.textPrimary, padding: '2px 7px',
            background: C.bgElevated, border: `1px solid ${C.borderSoft}`,
          }}>
            Entry ${entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* TradingView Widget (free embed) */}
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          src="https://s.tradingview.com/widgetembed/?symbol=BITSTAMP:BTCUSD&interval=5&hideideas=1&hidenews=1&theme=dark&style=1&timezone=Etc%2FUTC&hide_side_toolbar=0&allow_symbol_change=0&save_image=0&details=0&calendar=0&hotlist=0&withdateranges=0"
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="BTCUSD Chart"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}
