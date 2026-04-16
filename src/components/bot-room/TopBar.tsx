'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { C, FONT } from './constants';

// ── Major market sessions (UTC hours) ─────────────────────────────────────────
interface MarketSession {
  label: string;
  openUTC: number;   // decimal hours, e.g. 14.5 = 14:30
  closeUTC: number;
  weekdays: boolean; // only Mon–Fri
}

const SESSIONS: MarketSession[] = [
  { label: 'NYSE',   openUTC: 14.5,  closeUTC: 21,    weekdays: true },
  { label: 'LSE',    openUTC: 8,     closeUTC: 16.5,  weekdays: true },
  { label: 'TSE',    openUTC: 0,     closeUTC: 6,     weekdays: true },  // Tokyo
  { label: 'XETRA',  openUTC: 8,     closeUTC: 16.5,  weekdays: true },  // Frankfurt
  { label: 'HKEX',   openUTC: 1.5,   closeUTC: 8,     weekdays: true },
];

function getMarketStatus(): { label: string; open: boolean } {
  const now = new Date();
  const day = now.getUTCDay();
  const utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
  const isWeekday = day >= 1 && day <= 5;

  // BTC trades 24/7
  const openMarkets: string[] = ['BTC'];

  if (isWeekday) {
    for (const s of SESSIONS) {
      if (!s.weekdays) continue;
      // Handle sessions that cross midnight (e.g. if closeUTC < openUTC)
      if (s.closeUTC > s.openUTC) {
        if (utcH >= s.openUTC && utcH < s.closeUTC) openMarkets.push(s.label);
      } else {
        if (utcH >= s.openUTC || utcH < s.closeUTC) openMarkets.push(s.label);
      }
    }
  }

  const tradFiOpen = openMarkets.length > 1; // more than just BTC
  if (tradFiOpen) {
    // Show 2 most relevant open markets
    const shown = openMarkets.filter(m => m !== 'BTC').slice(0, 2).join(' · ');
    return { label: `${shown} Open`, open: true };
  }
  return { label: 'TradFi Closed', open: false };
}

interface TopBarProps {
  onFundPool?: () => void;
  opsRoomOpen?: boolean;
  onToggleOpsRoom?: () => void;
  chatUnread?: number;
}

export function TopBar({ onFundPool, opsRoomOpen, onToggleOpsRoom, chatUnread = 0 }: TopBarProps) {
  const { user } = useAuth();
  const [utcTime, setUtcTime] = useState('');
  const [marketStatus, setMarketStatus] = useState(() => getMarketStatus());

  useEffect(() => {
    const tick = () => {
      setUtcTime(new Date().toISOString().slice(11, 19) + ' UTC');
      setMarketStatus(getMarketStatus());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const displayName = user?.chatDisplayName || `anon-${(user?.id || '0000').slice(0, 4)}`;

  return (
    <div style={{
      height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 12px', borderBottom: `1px solid ${C.border}`, fontFamily: FONT,
      backgroundColor: C.bgPrimary,
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          fontSize: '9px', color: C.teal, padding: '1px 6px',
          border: '1px solid color-mix(in srgb, var(--accent-primary) 25%, transparent)', background: C.bgOverlay,
          letterSpacing: '0.08em',
        }}>
          TRADING DESK
        </span>
        <span style={{ fontSize: '9px', letterSpacing: '0.1em', color: C.textDim }}>
          AUTONOMOUS TRADING — LIVE
        </span>
      </div>

      {/* Centre — market status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span
          className={marketStatus.open ? 'br-blink' : undefined}
          style={{
            width: '4px', height: '4px', borderRadius: '50%',
            background: marketStatus.open ? C.teal : C.textDim,
            display: 'inline-block',
          }}
        />
        <span style={{ fontSize: '10px', color: marketStatus.open ? C.teal : C.textDim }}>
          {marketStatus.label}
        </span>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {onFundPool && (
          <button
            onClick={onFundPool}
            style={{
              padding: '2px 10px', fontSize: 9, letterSpacing: '0.1em',
              fontFamily: FONT, fontWeight: 600,
              background: 'transparent', border: `1px solid ${C.teal}`,
              color: C.teal, cursor: 'pointer', lineHeight: '16px',
            }}
          >
            FUND THE POOL
          </button>
        )}
        {onToggleOpsRoom && (
          <button
            onClick={onToggleOpsRoom}
            style={{
              padding: '2px 10px', fontSize: 9, letterSpacing: '0.1em',
              fontFamily: FONT, fontWeight: 600,
              background: opsRoomOpen ? C.teal : 'transparent',
              border: `1px solid ${C.teal}`,
              color: opsRoomOpen ? C.bgPrimary : C.textDim,
              cursor: 'pointer', lineHeight: '16px',
              position: 'relative',
              animation: chatUnread > 0 && !opsRoomOpen ? 'br-blink-kf 2s ease-in-out infinite' : 'none',
            }}
          >
            OPS {opsRoomOpen ? '▸' : '◆'}
            {chatUnread > 0 && !opsRoomOpen && (
              <span style={{
                position: 'absolute', top: '-5px', right: '-5px',
                backgroundColor: '#b84040', color: '#fff',
                fontSize: '8px', fontWeight: 700, lineHeight: 1,
                minWidth: '14px', height: '14px', borderRadius: '7px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px',
              }}>
                {chatUnread > 9 ? '9+' : chatUnread}
              </span>
            )}
          </button>
        )}
        <span style={{ fontSize: '10px', color: C.textDim, letterSpacing: '0.08em' }}>{utcTime}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="br-blink" style={{
            width: '4px', height: '4px', borderRadius: '50%', background: C.teal, display: 'inline-block',
          }} />
          <span style={{ fontSize: '10px', color: C.textPrimary }}>
            {displayName}
          </span>
        </div>
      </div>
    </div>
  );
}
