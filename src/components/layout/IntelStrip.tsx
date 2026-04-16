'use client';

/**
 * IntelStrip — universal at-a-glance status bar.
 *
 * Shown directly under the TopBar on every shelled page (workspace, tools,
 * rooms, briefings, support, account, admin). Carries: UTC clock, F&G,
 * threat posture, live viewer count, funding bar, last data refresh.
 *
 * Extracted from the monolithic DashboardHeader so the same content appears
 * everywhere instead of only on `/`. Polling intervals match the original.
 */

import { useEffect, useRef, useState } from 'react';
import { useData } from './DataProvider';
import { useTheme } from './ThemeProvider';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { ThreatState } from '@/lib/room/threatEngine';

// ── Tooltip system (lifted verbatim from DashboardHeader) ──
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

// ── F&G colour mapping ──
function fgColor(val: number): string {
  if (val <= 24) return '#8b2020';
  if (val <= 49) return '#b8860b';
  if (val <= 55) return '#666';
  if (val <= 74) return '#6b8e23';
  return '#2a6e2a';
}

// ── Threat colour palettes per theme ──
const THREAT_COLORS_PARCHMENT: Record<ThreatState, string> = {
  QUIET: '#2a6e2a', MONITORING: '#5a7e2a', ELEVATED: '#b8860b',
  ALERT: '#b85020', CRITICAL: '#5a0000',
};
const THREAT_COLORS_DARK: Record<ThreatState, string> = {
  QUIET: '#2dd4bf', MONITORING: '#0aa89e', ELEVATED: '#c4885a',
  ALERT: '#d06050', CRITICAL: '#ff4444',
};

export function IntelStrip() {
  const { data } = useData();
  const { theme } = useTheme();
  const isMobile = useIsMobile();

  const [utcTime, setUtcTime] = useState('--:--:-- UTC');
  const [lastRefresh, setLastRefresh] = useState('--');
  const [viewers, setViewers] = useState<number | null>(null);
  const [threat, setThreat] = useState<{ level: ThreatState; score: number }>({ level: 'QUIET', score: 0 });
  const [funding, setFunding] = useState<{ coveragePct: number; runwayEndDate: string; runwayMonths: number } | null>(null);

  // UTC clock
  useEffect(() => {
    function tick() {
      const now = new Date();
      const hh = String(now.getUTCHours()).padStart(2, '0');
      const mm = String(now.getUTCMinutes()).padStart(2, '0');
      const ss = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${hh}:${mm}:${ss} UTC`);
    }
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  // Last refresh
  useEffect(() => {
    if (data?.timestamp) {
      const d = new Date(data.timestamp);
      const hh = String(d.getUTCHours()).padStart(2, '0');
      const mm = String(d.getUTCMinutes()).padStart(2, '0');
      const ss = String(d.getUTCSeconds()).padStart(2, '0');
      setLastRefresh(`${hh}:${mm}:${ss}`);
    }
  }, [data?.timestamp]);

  // Threat
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/data/threat-score');
        if (res.ok) {
          const { score, state } = await res.json();
          setThreat({ level: state, score });
        }
      } catch { /* */ }
    }
    load();
    const i = setInterval(load, 60_000);
    return () => clearInterval(i);
  }, []);

  // Funding
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/funding/status');
        if (res.ok) {
          const d = await res.json();
          setFunding({ coveragePct: d.coveragePct, runwayEndDate: d.runwayEndDate, runwayMonths: d.runwayMonths });
        }
      } catch { /* */ }
    }
    load();
    const i = setInterval(load, 300_000);
    return () => clearInterval(i);
  }, []);

  // Viewers — heartbeat POST every 30s
  useEffect(() => {
    async function beat() {
      try {
        const res = await fetch('/api/viewers', { method: 'POST' });
        if (res.ok) {
          const { viewers: v } = await res.json();
          setViewers(v);
        }
      } catch { /* */ }
    }
    beat();
    const i = setInterval(beat, 30_000);
    return () => clearInterval(i);
  }, []);

  const fg = data?.fearGreed;
  const threatColors = theme === 'dark' ? THREAT_COLORS_DARK : THREAT_COLORS_PARCHMENT;
  const threatColor = threatColors[threat.level] || '#666';

  // ── MOBILE ──
  if (isMobile) {
    return (
      <div
        className="shrink-0 border-b"
        style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}
      >
        <div
          className="flex items-center gap-3 overflow-x-auto px-3 py-2"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', scrollbarWidth: 'none' }}
        >
          <span style={{ color: 'var(--text-secondary)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{utcTime}</span>

          <span className="inline-flex items-center gap-1.5 shrink-0" style={{ padding: '1px 7px', border: '1px solid var(--border-subtle)', borderRadius: '3px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>F&G</span>
            <span style={{ fontWeight: 700, color: fg ? fgColor(fg.value) : 'var(--text-muted)' }}>{fg?.value ?? '--'}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 shrink-0">
            <span className="relative" style={{ width: '48px', height: '5px', border: '1px solid var(--border-primary)', background: 'var(--bg-card)' }}>
              <span className="absolute inset-y-0 left-0" style={{ width: `${threat.score}%`, backgroundColor: threatColor, transition: 'width 0.8s ease' }} />
            </span>
            <span style={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: threatColor, fontSize: '10px' }}>
              {threat.level}
            </span>
          </span>

          <span className="inline-flex items-center gap-1 shrink-0" style={{ padding: '1px 7px', border: '1px solid var(--border-subtle)', borderRadius: '3px' }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2a6e2a', animation: 'viewer-pulse 2s ease-in-out infinite' }} />
            <span style={{ color: 'var(--text-secondary)' }}>{viewers ?? '-'}</span>
          </span>
        </div>
      </div>
    );
  }

  // ── DESKTOP ──
  return (
    <div
      className="shrink-0 border-b"
      style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}
    >
      <div
        className="flex items-center justify-between px-4"
        style={{ minHeight: '34px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
      >
        {/* Left cluster */}
        <div className="flex items-center gap-3">
          <span style={{ color: 'var(--text-secondary)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{utcTime}</span>

          <Tooltip text="Fear & Greed Index||0–24: Extreme Fear · 25–49: Fear · 50: Neutral · 51–74: Greed · 75–100: Extreme Greed||Contrarian indicator — extreme fear often signals buying opportunities.">
            <span className="inline-flex items-center gap-1.5" style={{ padding: '1px 7px', border: '1px solid var(--border-subtle)', borderRadius: '3px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>F&G</span>
              <span style={{ fontWeight: 700, color: fg ? fgColor(fg.value) : 'var(--text-muted)' }}>{fg?.value ?? '--'}</span>
            </span>
          </Tooltip>

          <Tooltip text="Live viewers currently on the Situation Room">
            <span className="inline-flex items-center gap-1.5" style={{ padding: '1px 7px', border: '1px solid var(--border-subtle)', borderRadius: '3px' }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2a6e2a', animation: 'viewer-pulse 2s ease-in-out infinite' }} />
              <span style={{ color: 'var(--text-secondary)' }}>{viewers ?? '-'}</span>
            </span>
          </Tooltip>

          {funding && (
            <Tooltip text={`${funding.coveragePct}% of this month's running costs covered||Funded to ${new Date(funding.runwayEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}${funding.runwayMonths > 0 ? ` (${funding.runwayMonths} months runway)` : ''}||Funded by sats — subscriptions & donations`}>
              <a
                href="/support"
                className="inline-flex items-center gap-1.5"
                style={{ padding: '1px 7px', border: '1px solid var(--border-subtle)', borderRadius: '3px', textDecoration: 'none', cursor: 'pointer' }}
              >
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.06em' }}>FUNDED</span>
                <span className="relative" style={{ width: '40px', height: '4px', border: '1px solid var(--border-primary)', background: 'var(--bg-card)' }}>
                  <span
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: `${Math.min(100, funding.coveragePct)}%`,
                      backgroundColor: funding.coveragePct >= 100 ? '#2a6e2a' : funding.coveragePct >= 50 ? '#b8860b' : '#b85020',
                      transition: 'width 0.8s ease',
                    }}
                  />
                </span>
                <span style={{
                  fontWeight: 700,
                  color: funding.coveragePct >= 100 ? '#2a6e2a' : funding.coveragePct >= 50 ? '#b8860b' : '#b85020',
                  fontSize: '11px',
                }}>
                  {funding.coveragePct}%
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                  · to {new Date(funding.runwayEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </a>
            </Tooltip>
          )}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-3">
          <Tooltip text="Threat Posture Model — same algorithm as the Members Room.||Five domain agents (Geopolitical, Economic, Bitcoin, Disaster, Political) classify live news events by severity tier.||Each event decays exponentially with a 3-hour half-life. Score is the sum of all decayed impacts, capped at 100.||Scale: Quiet (0–15) · Monitoring (16–35) · Elevated (36–55) · Alert (56–75) · Critical (76–100)">
            <span className="inline-flex items-center gap-1.5">
              <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>THREAT</span>
              <span className="relative" style={{ width: '80px', height: '6px', border: '1px solid var(--border-primary)', background: 'var(--bg-card)' }}>
                <span
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${threat.score}%`, backgroundColor: threatColor,
                    transition: 'width 0.8s ease, background-color 0.8s ease',
                  }}
                />
              </span>
              <span style={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: threatColor, minWidth: '48px' }}>
                {threat.level}
              </span>
            </span>
          </Tooltip>

          <span style={{ color: 'var(--text-muted)', fontSize: '11px', whiteSpace: 'nowrap' }}>
            Last refresh: {lastRefresh}
          </span>
        </div>
      </div>
    </div>
  );
}
