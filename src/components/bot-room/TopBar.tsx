'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { C, FONT } from './constants';

export function TopBar() {
  const { user, logout } = useAuth();
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const tick = () => setUtcTime(new Date().toISOString().slice(11, 19) + ' UTC');
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 12px', borderBottom: `1px solid ${C.border}`, fontFamily: FONT,
      backgroundColor: C.bgPrimary,
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', color: C.textPrimary }}>
          SITUATION ROOM
        </span>
        <span style={{
          fontSize: '8px', color: C.teal, padding: '1px 6px',
          border: '1px solid rgba(0,212,170,0.2)', background: C.bgOverlay,
          letterSpacing: '0.08em',
        }}>
          BOT ROOM
        </span>
        <span style={{ fontSize: '8px', letterSpacing: '0.1em', color: C.textDim }}>
          AUTONOMOUS TRADING — LIVE
        </span>
      </div>

      {/* Centre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span className="br-blink" style={{
          width: '4px', height: '4px', borderRadius: '50%', background: C.teal, display: 'inline-block',
        }} />
        <span style={{ fontSize: '9px', color: C.teal }}>Markets Open</span>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '10px', color: C.textDim, letterSpacing: '0.08em' }}>{utcTime}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="br-blink" style={{
            width: '4px', height: '4px', borderRadius: '50%', background: C.teal, display: 'inline-block',
          }} />
          <span style={{ fontSize: '10px', color: C.textPrimary }}>
            {user?.displayName || user?.email?.split('@')[0] || 'Anon'}
          </span>
        </div>
        <button
          onClick={logout}
          style={{
            fontFamily: FONT, fontSize: '8px', letterSpacing: '0.08em',
            color: C.textDim, background: 'none', cursor: 'pointer',
            border: `1px solid ${C.borderSoft}`, padding: '2px 8px',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = C.teal; e.currentTarget.style.borderColor = C.teal; }}
          onMouseLeave={e => { e.currentTarget.style.color = C.textDim; e.currentTarget.style.borderColor = C.borderSoft; }}
        >
          SIGN OUT
        </button>
      </div>
    </div>
  );
}
