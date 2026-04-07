'use client';

import type { CSSProperties, ReactNode } from 'react';

/** Format large numbers: 1234567 → "1.23M" */
export function formatLargeNumber(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(2);
}

/** Format price with commas */
export function formatPrice(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Format percentage with sign */
export function formatPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

/** Color for positive/negative values */
export function pctColor(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return 'var(--text-muted)';
  if (n > 0) return 'var(--accent-success)';
  if (n < 0) return 'var(--accent-danger)';
  return 'var(--text-muted)';
}

/** Time ago string */
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() / 1000) - timestamp);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** Data row — label + value pair used across all sidebar panels */
export function DataRow({
  label,
  value,
  color,
  suffix,
}: {
  label: string;
  value: string | ReactNode;
  color?: string;
  suffix?: string;
}) {
  return (
    <div
      className="flex items-center justify-between py-0.5"
    >
      <span className="uppercase" style={{ fontFamily: 'var(--font-data)', color: 'var(--text-secondary)', letterSpacing: '0.04em', fontSize: '11px' }}>
        {label}
      </span>
      <span
        className="text-right"
        style={{ fontFamily: 'var(--font-data)', color: color || 'var(--text-primary)', fontSize: '12px' }}
      >
        {value}
        {suffix && <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}> {suffix}</span>}
      </span>
    </div>
  );
}

// ── Market session scheduler ─────────────────────────────────────────────────
// Each exchange tag maps to a "schedule kind". The kind determines how we
// answer two questions for any given UTC time:
//   1. Is the market currently open?
//   2. When does the next state change happen? (used for the tooltip)
//
// Schedule kinds:
//   'cash'    — regular cash session, Mon-Fri, single open/close window in UTC
//   'futures' — CME Globex / ICE futures, Sun 23:00 UTC → Fri 22:00 UTC, with a
//               daily 60-min maintenance break at 22:00–23:00 UTC. Used for
//               commodities, US treasuries, DXY (anything where the displayed
//               price comes from a futures venue rather than cash).
//   'fx'      — true 24/5 forex, Sun 22:00 UTC → Fri 22:00 UTC, no daily break.

interface CashSchedule {
  kind: 'cash';
  name: string;
  /** Open hour in UTC, fractional (e.g. 14.5 = 14:30 UTC). */
  openHour: number;
  /** Close hour in UTC. Must be > openHour for cash. */
  closeHour: number;
}
interface FuturesSchedule { kind: 'futures'; name: string; }
interface FxSchedule       { kind: 'fx';      name: string; }

type Schedule = CashSchedule | FuturesSchedule | FxSchedule;

const SCHEDULES: Record<string, Schedule> = {
  // Cash equity sessions
  us: { kind: 'cash', name: 'US Markets (NYSE/NASDAQ)', openHour: 14.5, closeHour: 21 },
  uk: { kind: 'cash', name: 'London Stock Exchange',    openHour: 8,    closeHour: 16.5 },
  eu: { kind: 'cash', name: 'Xetra (Frankfurt)',        openHour: 7,    closeHour: 15.5 },
  jp: { kind: 'cash', name: 'Tokyo Stock Exchange',     openHour: 0,    closeHour: 6 },
  hk: { kind: 'cash', name: 'Hong Kong Stock Exchange', openHour: 1.5,  closeHour: 8 },

  // Near-24h futures venues. Used for commodities, treasuries, DXY.
  commodity: { kind: 'futures', name: 'CME Globex (commodities)' },
  futures:   { kind: 'futures', name: 'CBOT futures (US treasuries)' },

  // True 24/5 forex.
  fx: { kind: 'fx', name: 'Spot FX (interbank, 24/5)' },
};

interface MarketState {
  open: boolean;
  /** ms until the next open/close transition */
  msUntilChange: number;
  /** Date of the next transition */
  changeAt: Date;
}

function fmtHour(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Build a UTC Date for a specific weekday + hour starting from `from`. */
function nextUtc(from: Date, dayOfWeek: number, hour: number): Date {
  const d = new Date(from);
  d.setUTCHours(0, 0, 0, 0);
  const cur = d.getUTCDay();
  let diff = dayOfWeek - cur;
  if (diff < 0) diff += 7;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(Math.floor(hour), Math.round((hour - Math.floor(hour)) * 60), 0, 0);
  // If the result is in the past relative to `from`, advance one week
  if (d.getTime() <= from.getTime()) d.setUTCDate(d.getUTCDate() + 7);
  return d;
}

function getCashState(s: CashSchedule, now: Date): MarketState {
  const day = now.getUTCDay();
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const isWeekday = day >= 1 && day <= 5;

  if (isWeekday && hour >= s.openHour && hour < s.closeHour) {
    // OPEN — change at today's close
    const close = new Date(now);
    close.setUTCHours(Math.floor(s.closeHour), Math.round((s.closeHour - Math.floor(s.closeHour)) * 60), 0, 0);
    return { open: true, msUntilChange: close.getTime() - now.getTime(), changeAt: close };
  }

  // CLOSED — find next weekday open
  // If still earlier today and weekday, next open is today
  if (isWeekday && hour < s.openHour) {
    const open = new Date(now);
    open.setUTCHours(Math.floor(s.openHour), Math.round((s.openHour - Math.floor(s.openHour)) * 60), 0, 0);
    return { open: false, msUntilChange: open.getTime() - now.getTime(), changeAt: open };
  }
  // Otherwise next weekday open
  let nextDay = (day + 1) % 7;
  while (nextDay === 0 || nextDay === 6) nextDay = (nextDay + 1) % 7;
  const open = nextUtc(now, nextDay, s.openHour);
  return { open: false, msUntilChange: open.getTime() - now.getTime(), changeAt: open };
}

/** CME Globex futures: Sun 23:00 UTC → Fri 22:00 UTC, daily 22:00–23:00 break. */
function getFuturesState(now: Date): MarketState {
  const day = now.getUTCDay();
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;

  // Saturday (6): always closed. Reopens Sunday 23:00.
  if (day === 6) {
    const open = nextUtc(now, 0, 23);
    return { open: false, msUntilChange: open.getTime() - now.getTime(), changeAt: open };
  }
  // Sunday (0): closed until 23:00, then open until Mon 22:00
  if (day === 0) {
    if (hour < 23) {
      const open = new Date(now);
      open.setUTCHours(23, 0, 0, 0);
      return { open: false, msUntilChange: open.getTime() - now.getTime(), changeAt: open };
    }
    // Open — closes at 22:00 Monday
    const close = nextUtc(now, 1, 22);
    return { open: true, msUntilChange: close.getTime() - now.getTime(), changeAt: close };
  }
  // Friday (5): open until 22:00, then closed for the weekend
  if (day === 5) {
    if (hour < 22) {
      const close = new Date(now);
      close.setUTCHours(22, 0, 0, 0);
      return { open: true, msUntilChange: close.getTime() - now.getTime(), changeAt: close };
    }
    const open = nextUtc(now, 0, 23);
    return { open: false, msUntilChange: open.getTime() - now.getTime(), changeAt: open };
  }
  // Mon–Thu: open all day except 22:00–23:00 daily break
  if (hour >= 22 && hour < 23) {
    const open = new Date(now);
    open.setUTCHours(23, 0, 0, 0);
    return { open: false, msUntilChange: open.getTime() - now.getTime(), changeAt: open };
  }
  // Open — next event is today's 22:00 break
  const breakAt = new Date(now);
  if (hour >= 23) {
    // After today's break, next break is tomorrow 22:00
    breakAt.setUTCDate(breakAt.getUTCDate() + 1);
  }
  breakAt.setUTCHours(22, 0, 0, 0);
  return { open: true, msUntilChange: breakAt.getTime() - now.getTime(), changeAt: breakAt };
}

/** True 24/5 FX: Sun 22:00 UTC open → Fri 22:00 UTC close, no daily break. */
function getFxState(now: Date): MarketState {
  const day = now.getUTCDay();
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;

  // Saturday: closed until Sunday 22:00
  if (day === 6) {
    const open = nextUtc(now, 0, 22);
    return { open: false, msUntilChange: open.getTime() - now.getTime(), changeAt: open };
  }
  // Sunday: closed until 22:00
  if (day === 0) {
    if (hour < 22) {
      const open = new Date(now);
      open.setUTCHours(22, 0, 0, 0);
      return { open: false, msUntilChange: open.getTime() - now.getTime(), changeAt: open };
    }
    // Open — closes Friday 22:00 of this week (5 days away)
    const close = nextUtc(now, 5, 22);
    return { open: true, msUntilChange: close.getTime() - now.getTime(), changeAt: close };
  }
  // Friday: open until 22:00
  if (day === 5) {
    if (hour < 22) {
      const close = new Date(now);
      close.setUTCHours(22, 0, 0, 0);
      return { open: true, msUntilChange: close.getTime() - now.getTime(), changeAt: close };
    }
    const open = nextUtc(now, 0, 22);
    return { open: false, msUntilChange: open.getTime() - now.getTime(), changeAt: open };
  }
  // Mon–Thu: open all day, next event is Friday 22:00 close
  const close = nextUtc(now, 5, 22);
  return { open: true, msUntilChange: close.getTime() - now.getTime(), changeAt: close };
}

function getMarketState(exchange: string, now: Date = new Date()): MarketState | null {
  const s = SCHEDULES[exchange];
  if (!s) return null;
  if (s.kind === 'cash')    return getCashState(s, now);
  if (s.kind === 'futures') return getFuturesState(now);
  if (s.kind === 'fx')      return getFxState(now);
  return null;
}

export function isMarketOpen(exchange: string): boolean {
  return getMarketState(exchange)?.open ?? false;
}

function describeUntil(ms: number): string {
  const totalMins = Math.max(0, Math.round(ms / 60000));
  if (totalMins < 60) return `${totalMins}m`;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}

export function getMarketTooltip(exchange: string): string {
  const s = SCHEDULES[exchange];
  if (!s) return '';
  const state = getMarketState(exchange);
  if (!state) return s.name;

  const verb  = state.open ? 'closes in' : 'opens in';
  const until = describeUntil(state.msUntilChange);
  const at    = `${fmtHour(state.changeAt.getUTCHours() + state.changeAt.getUTCMinutes() / 60)} UTC`;

  // For cash, also show the regular session window so users understand the cadence
  if (s.kind === 'cash') {
    return `${s.name}\n${fmtHour(s.openHour)}–${fmtHour(s.closeHour)} UTC · Mon–Fri\n${state.open ? 'OPEN' : 'CLOSED'} · ${verb} ${until} (${at})`;
  }
  if (s.kind === 'futures') {
    return `${s.name}\n23h/day · Sun 23:00 → Fri 22:00 UTC\n${state.open ? 'OPEN' : 'CLOSED'} · ${verb} ${until} (${at})`;
  }
  return `${s.name}\nSun 22:00 → Fri 22:00 UTC\n${state.open ? 'OPEN' : 'CLOSED'} · ${verb} ${until} (${at})`;
}

/** Ticker row — for market indices, commodities, FX. The status dot is bright
 *  green with a soft pulse when the underlying market is actively trading, and
 *  hollow grey when it's closed (with the next-open countdown in the tooltip). */
export function TickerRow({
  name,
  price,
  changePct,
  exchange,
}: {
  name: string;
  price: number;
  changePct: number;
  exchange?: string;
}) {
  const open = exchange ? isMarketOpen(exchange) : undefined;
  const tooltip = exchange ? getMarketTooltip(exchange) : undefined;

  // Visual rules:
  //   open    → solid bright green, soft pulse animation
  //   closed  → hollow ring, muted parchment grey
  //   unknown → solid muted grey (no exchange tag)
  const dotStyle: CSSProperties = open === undefined
    ? { backgroundColor: 'var(--text-muted)', opacity: 0.5 }
    : open
      ? {
          backgroundColor: '#2a6e2a',
          boxShadow: '0 0 0 1px rgba(42,110,42,0.25)',
          animation: 'viewer-pulse 2.4s ease-in-out infinite',
        }
      : {
          backgroundColor: 'transparent',
          border: '1px solid var(--text-muted)',
          opacity: 0.6,
        };

  return (
    <div
      className="grid items-center py-0.5 gap-2"
      style={{
        gridTemplateColumns: '8px 1fr auto auto',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        title={tooltip}
        style={dotStyle}
      />
      <span className="uppercase tracking-wider" style={{ fontFamily: 'var(--font-data)', color: 'var(--text-secondary)', fontSize: '11px' }}>
        {name}
      </span>
      <span className="text-right" style={{ fontFamily: 'var(--font-data)', color: 'var(--text-primary)', fontSize: '12px' }}>
        {formatPrice(price)}
      </span>
      <span
        className="text-right min-w-[48px]"
        style={{ fontFamily: 'var(--font-data)', color: pctColor(changePct), fontSize: '11px' }}
      >
        {formatPct(changePct)}
      </span>
    </div>
  );
}

/**
 * Shared colour constants for D3 chart axes, grids and crosshairs.
 * Used by ParchmentChart, CentralBankRatesPanel, InflationChartPanel.
 * Reading these from one place means a single edit updates all three charts.
 */
export function chartColors(isDark: boolean) {
  return {
    axisTick:      isDark ? '#8aaba6'                : '#8b7355',
    gridLine:      isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    crosshair:     isDark ? 'rgba(0,212,200,0.3)'    : 'rgba(0,0,0,0.2)',
    tooltipBg:     isDark ? 'rgba(21,29,37,0.97)'    : 'rgba(248,241,227,0.97)',
    tooltipBorder: isDark ? '#1a3a3a'                : '#c4b08a',
    tooltipText:   isDark ? '#c8e6e3'                : '#3e2c1a',
    zeroLine:      isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
  };
}

/** Loading placeholder */
export function PanelLoading() {
  return (
    <div className="flex items-center justify-center py-8">
      <span className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>···</span>
    </div>
  );
}
