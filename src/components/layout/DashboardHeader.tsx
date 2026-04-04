'use client';

import { useState, useEffect, useRef } from 'react';
import { useData } from './DataProvider';
import { useTheme } from './ThemeProvider';
import { computeThreatLevel } from '@/lib/grok/quality';
import { CaretRight, Diamond } from '@phosphor-icons/react';

// ── Tooltip system ──
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const ref = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const onEnter = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    let left = rect.left + rect.width / 2;
    let top = rect.bottom + 8;
    setPos({ left, top });
    setShow(true);

    // Adjust after render
    requestAnimationFrame(() => {
      if (!tipRef.current) return;
      const tipRect = tipRef.current.getBoundingClientRect();
      if (left + tipRect.width / 2 > window.innerWidth - 10) left = window.innerWidth - tipRect.width - 10;
      if (left - tipRect.width / 2 < 10) left = 10;
      else left -= tipRect.width / 2;
      if (top + tipRect.height > window.innerHeight - 10) top = rect.top - tipRect.height - 8;
      setPos({ left, top });
    });
  };

  const paragraphs = text.split('||');

  return (
    <>
      <span ref={ref} onMouseEnter={onEnter} onMouseLeave={() => setShow(false)} style={{ cursor: 'default' }}>
        {children}
      </span>
      {show && (
        <div
          ref={tipRef}
          className="fixed z-[20000] pointer-events-none"
          style={{
            left: pos.left, top: pos.top,
            background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
            padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px',
            lineHeight: '1.7', letterSpacing: '0.03em', color: 'var(--text-primary)',
            maxWidth: '320px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          {paragraphs.map((p, i) => <p key={i} style={{ margin: i < paragraphs.length - 1 ? '0 0 4px 0' : 0 }}>{p.trim()}</p>)}
        </div>
      )}
    </>
  );
}

// ── F&G color mapping ──
function fgColor(val: number): string {
  if (val <= 24) return '#8b2020';
  if (val <= 49) return '#b8860b';
  if (val <= 55) return '#666';
  if (val <= 74) return '#6b8e23';
  return '#2a6e2a';
}

// ── Threat level colors per theme ──
const THREAT_COLORS_PARCHMENT: Record<string, string> = {
  LOW: '#2a6e2a', GUARDED: '#5a7e2a', ELEVATED: '#b8860b',
  HIGH: '#b85020', SEVERE: '#8b2020', CRITICAL: '#5a0000',
};
const THREAT_COLORS_DARK: Record<string, string> = {
  LOW: '#2dd4bf', GUARDED: '#0aa89e', ELEVATED: '#c4885a',
  HIGH: '#d06050', SEVERE: '#c04040', CRITICAL: '#ff4444',
};

interface DashboardHeaderProps {
  opsRoomOpen?: boolean;
  onToggleOpsRoom?: () => void;
  chatUnread?: number;
}

export function DashboardHeader({ opsRoomOpen, onToggleOpsRoom, chatUnread = 0 }: DashboardHeaderProps) {
  const { data, loading } = useData();
  const { theme } = useTheme();
  const [utcTime, setUtcTime] = useState('--:--:-- UTC');
  const [lastRefresh, setLastRefresh] = useState('--');
  const [viewers, setViewers] = useState<number | null>(null);
  const [threat, setThreat] = useState<{ level: string; score: number }>({ level: 'LOW', score: 0 });

  // UTC clock — updates every second
  useEffect(() => {
    function tick() {
      const now = new Date();
      const hh = String(now.getUTCHours()).padStart(2, '0');
      const mm = String(now.getUTCMinutes()).padStart(2, '0');
      const ss = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${hh}:${mm}:${ss} UTC`);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update last refresh when data changes
  useEffect(() => {
    if (data?.timestamp) {
      const d = new Date(data.timestamp);
      const hh = String(d.getUTCHours()).padStart(2, '0');
      const mm = String(d.getUTCMinutes()).padStart(2, '0');
      const ss = String(d.getUTCSeconds()).padStart(2, '0');
      setLastRefresh(`${hh}:${mm}:${ss}`);
    }
  }, [data?.timestamp]);

  // Compute threat from RSS headlines
  useEffect(() => {
    async function loadThreat() {
      try {
        const res = await fetch('/api/data/rss');
        if (res.ok) {
          const { headlines } = await res.json();
          if (headlines?.length) {
            const result = computeThreatLevel(headlines.map((h: { title: string }) => h.title));
            setThreat(result);
          }
        }
      } catch { /* */ }
    }
    loadThreat();
    const interval = setInterval(loadThreat, 300_000);
    return () => clearInterval(interval);
  }, []);

  // Live viewer count — heartbeat POST every 30s, same mechanism as V2
  useEffect(() => {
    async function heartbeat() {
      try {
        const res = await fetch('/api/viewers', { method: 'POST' });
        if (res.ok) {
          const { viewers: v } = await res.json();
          setViewers(v);
        }
      } catch { /* keep last known count */ }
    }
    heartbeat();
    const interval = setInterval(heartbeat, 30_000);
    return () => clearInterval(interval);
  }, []);

  const fg = data?.fearGreed;
  const threatColors = theme === 'dark' ? THREAT_COLORS_DARK : THREAT_COLORS_PARCHMENT;
  const threatColor = threatColors[threat.level] || '#666';

  return (
    <header
      className="shrink-0 border-b"
      style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}
    >
      {/* Double rule top */}
      <div style={{ height: '2px', backgroundColor: 'var(--border-primary)' }} />
      <div style={{ height: '1px', backgroundColor: 'var(--bg-primary)' }} />
      <div style={{ height: '2px', backgroundColor: 'var(--border-primary)' }} />

      <div className="relative flex items-center justify-between px-4 py-2" style={{ minHeight: '48px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
        {/* Left wing */}
        <div className="flex items-center gap-3">
          <span style={{ color: 'var(--text-secondary)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            {utcTime}
          </span>

          {/* F&G badge */}
          <Tooltip text="Fear & Greed Index||0–24: Extreme Fear · 25–49: Fear · 50: Neutral · 51–74: Greed · 75–100: Extreme Greed||Contrarian indicator — extreme fear often signals buying opportunities.">
            <span
              className="inline-flex items-center gap-1.5"
              style={{ padding: '1px 7px', border: '1px solid var(--border-subtle)', borderRadius: '3px' }}
            >
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                F&G
              </span>
              <span style={{ fontWeight: 700, color: fg ? fgColor(fg.value) : 'var(--text-muted)' }}>
                {fg?.value ?? '--'}
              </span>
            </span>
          </Tooltip>

          {/* Viewers badge */}
          <Tooltip text="Live viewers currently on the Situation Room">
            <span
              className="inline-flex items-center gap-1.5"
              style={{ padding: '1px 7px', border: '1px solid var(--border-subtle)', borderRadius: '3px' }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2a6e2a', animation: 'viewer-pulse 2s ease-in-out infinite' }} />
              <span style={{ color: 'var(--text-secondary)' }}>
                {viewers ?? '-'}
              </span>
            </span>
          </Tooltip>
        </div>

        {/* Center title — absolutely centred, immune to wing widths */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '22px', fontWeight: 'normal',
              letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
            }}
          >
            Situation Room
          </div>
          <div
            style={{
              fontFamily: 'var(--font-heading)', fontSize: '11px', letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '-1px',
              whiteSpace: 'nowrap',
            }}
          >
            Bitcoin & Global Macro Intelligence
          </div>
        </div>

        {/* Right wing */}
        <div className="flex items-center gap-3">
          {/* Threat gauge */}
          <Tooltip text="Composite threat score calculated from live news headlines.||Weights conflict severity keywords (missile strikes, casualties, war escalation) with recency bias.||Updates every 5 minutes with the news feed.||Scale: Low · Guarded · Elevated · High · Severe · Critical">
            <span className="inline-flex items-center gap-1.5">
              <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                THREAT
              </span>
              <span
                className="relative"
                style={{ width: '80px', height: '6px', border: '1px solid var(--border-primary)', background: 'var(--bg-card)' }}
              >
                <span
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${threat.score}%`, backgroundColor: threatColor,
                    transition: 'width 0.8s ease, background-color 0.8s ease',
                  }}
                />
              </span>
              <span
                style={{
                  fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: threatColor, minWidth: '48px',
                }}
              >
                {threat.level}
              </span>
            </span>
          </Tooltip>

          {/* OPS ROOM toggle */}
          {onToggleOpsRoom && (
            <button
              onClick={onToggleOpsRoom}
              style={{
                fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', fontSize: '10px',
                backgroundColor: opsRoomOpen ? 'var(--accent-primary)' : 'var(--bg-card)',
                color: opsRoomOpen ? 'var(--bg-primary)' : 'var(--text-muted)',
                border: '1px solid var(--border-primary)',
                padding: '2px 10px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                position: 'relative',
                animation: chatUnread > 0 && !opsRoomOpen ? 'ops-pulse 2s ease-in-out infinite' : 'none',
              }}
            >
              OPS {opsRoomOpen ? <CaretRight size={10} weight="bold" style={{ display: 'inline', verticalAlign: 'middle' }} /> : <Diamond size={10} weight="regular" style={{ display: 'inline', verticalAlign: 'middle' }} />}
              {chatUnread > 0 && !opsRoomOpen && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  backgroundColor: '#b84040',
                  color: '#fff',
                  fontSize: '8px',
                  fontWeight: 700,
                  lineHeight: 1,
                  minWidth: '14px',
                  height: '14px',
                  borderRadius: '7px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                }}>
                  {chatUnread > 9 ? '9+' : chatUnread}
                </span>
              )}
            </button>
          )}

          {/* Last refresh */}
          <span
            style={{ color: 'var(--text-muted)', fontSize: '11px', whiteSpace: 'nowrap' }}
          >
            Last refresh: {lastRefresh}
          </span>
        </div>
      </div>

      {/* Single rule bottom */}
      <div style={{ height: '1px', backgroundColor: 'var(--border-primary)' }} />
    </header>
  );
}
