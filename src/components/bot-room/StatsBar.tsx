'use client';

import { C, FONT, type BotState, MOCK_BOT_STATE } from './constants';

function posColor(p: string): string {
  if (p === 'LONG') return C.teal;
  if (p === 'SHORT') return C.coral;
  return C.textDim;
}
function pnlColor(v: number): string { return v >= 0 ? C.teal : C.coral; }

export function StatsBar({ state = MOCK_BOT_STATE }: { state?: BotState }) {
  const stats = [
    { label: 'Pool Balance', value: `${state.poolBalance.toFixed(5)} BTC` },
    { label: 'Position', value: state.position === 'FLAT' ? 'FLAT' : `${state.position} ${state.leverage}×`, color: posColor(state.position) },
    { label: 'Entry Price', value: state.entryPrice ? `$${state.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—' },
    { label: 'Unrealised P&L', value: `${state.unrealisedPnl >= 0 ? '+' : ''}${state.unrealisedPnl} sats`, color: pnlColor(state.unrealisedPnl) },
    { label: 'Trades', value: String(state.tradeCount) },
    { label: 'Win Rate', value: `${(state.winRate * 100).toFixed(1)}%`, color: state.winRate > 0.5 ? C.teal : C.coral },
    { label: 'Streak', value: `${state.streak >= 0 ? '+' : ''}${Math.abs(state.streak)}${state.streak >= 0 ? 'W' : 'L'}`, color: state.streak >= 0 ? C.teal : C.coral },
    { label: 'Last Trade', value: `${state.lastTradePnl >= 0 ? '+' : ''}${state.lastTradePnl} sats`, color: pnlColor(state.lastTradePnl) },
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
    </div>
  );
}
