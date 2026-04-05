'use client';

import { C, FONT, MOCK_BOT_STATE, type BotState } from './constants';

export function ChartPanel({ state = MOCK_BOT_STATE }: { state?: BotState }) {
  const posLabel =
    state.position === 'FLAT'
      ? 'FLAT'
      : `NET ${state.position} ${(state.poolBalance * state.leverage * 100 / 100).toFixed(4)}%`;
  const posColor =
    state.position === 'LONG' ? C.teal : state.position === 'SHORT' ? C.coral : C.textDim;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: C.bgPrimary }}>
      {/* Header */}
      <div style={{
        height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 10px', borderBottom: `1px solid ${C.border}`, fontFamily: FONT,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '8px', color: posColor, padding: '1px 6px',
            background: `${posColor}11`, border: `1px solid ${posColor}33`,
            letterSpacing: '0.06em',
          }}>
            ● {posLabel}
          </span>
          <span style={{ fontSize: '8px', color: C.textPrimary, letterSpacing: '0.04em' }}>
            BTCUSD · 5M
          </span>
        </div>
        {state.entryPrice && (
          <span style={{
            fontSize: '9px', color: C.textPrimary, padding: '2px 7px',
            background: C.bgElevated, border: `1px solid ${C.borderSoft}`,
          }}>
            Entry ${state.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* TradingView Widget */}
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          src="https://s.tradingview.com/widgetembed/?symbol=BITSTAMP:BTCUSD&interval=5&hideideas=1&hidenews=1&theme=dark&style=1&timezone=Etc%2FUTC&hide_side_toolbar=1&allow_symbol_change=0&save_image=0&details=0&calendar=0&hotlist=0"
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="BTCUSD Chart"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}
