'use client';

import { useState, useEffect } from 'react';
import { C, FONT, HM, HEATMAP_ROW1, HEATMAP_ROW2, type HeatmapTick } from './constants';

function cellColors(t: HeatmapTick): { bg: string; fg: string } {
  if (t.type === 'btc')  return { bg: HM.btc,  fg: C.btcOrange };
  if (t.type === 'gold') return { bg: HM.gold, fg: C.gold };
  if (t.change >  0.0015) return { bg: HM.posStrong, fg: C.teal };
  if (t.change >  0)      return { bg: HM.pos,       fg: C.teal };
  if (t.change === 0)     return { bg: HM.flat,      fg: C.textDim };
  if (t.change < -0.0015) return { bg: HM.negStrong, fg: C.coral };
  return                          { bg: HM.neg,       fg: C.coral };
}

function fmtPct(n: number): string {
  const s = (n * 100).toFixed(2);
  return n >= 0 ? `+${s}%` : `${s}%`;
}

function Cell({ tick }: { tick: HeatmapTick }) {
  const [hover, setHover] = useState(false);
  const { bg, fg } = cellColors(tick);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: 1, minWidth: 0, padding: '4px 2px', textAlign: 'center',
        background: bg,
        border: hover ? '1px solid rgba(0,212,170,0.2)' : '1px solid transparent',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ fontFamily: FONT, fontSize: '10px', fontWeight: 'bold', color: fg, lineHeight: 1 }}>
        {tick.ticker}
      </div>
      <div style={{ fontFamily: FONT, fontSize: '8px', color: fg, marginTop: '1px' }}>
        {fmtPct(tick.change)}
      </div>
    </div>
  );
}

export function MarketHeatmap() {
  const [ts, setTs] = useState('');

  useEffect(() => {
    const tick = () => setTs(new Date().toISOString().slice(11, 19));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

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
          <span className="br-blink" style={{ width: '4px', height: '4px', borderRadius: '50%', background: C.teal, display: 'inline-block' }} />
          <span style={{ fontSize: '7px', letterSpacing: '0.18em', color: C.textDim }}>MARKET HEATMAP</span>
        </div>
        <span style={{ fontSize: '7px', color: C.textDim }}>Updated {ts}</span>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', flex: 1 }}>
          {HEATMAP_ROW1.map(t => <Cell key={t.ticker} tick={t} />)}
        </div>
        <div style={{ display: 'flex', flex: 1 }}>
          {HEATMAP_ROW2.map(t => <Cell key={t.ticker} tick={t} />)}
        </div>
      </div>
    </div>
  );
}
