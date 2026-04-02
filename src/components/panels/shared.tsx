'use client';

import type { ReactNode } from 'react';

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

/** Market hours — UTC open/close per exchange */
const MARKET_HOURS: Record<string, { name: string; open: number; close: number }> = {
  us: { name: 'US Markets (NYSE/NASDAQ)', open: 14.5, close: 21 },
  uk: { name: 'London Stock Exchange', open: 8, close: 16.5 },
  eu: { name: 'Xetra (Frankfurt)', open: 7, close: 15.5 },
  jp: { name: 'Tokyo Stock Exchange', open: 0, close: 6 },
  hk: { name: 'Hong Kong Stock Exchange', open: 1.5, close: 8 },
  commodity: { name: 'Commodity Markets', open: 0, close: 23.5 }, // near 24h
  fx: { name: 'Forex Markets', open: 0, close: 23.5 }, // near 24h Sun-Fri
};

export function isMarketOpen(exchange: string): boolean {
  const hours = MARKET_HOURS[exchange];
  if (!hours) return false;
  const now = new Date();
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false; // weekends closed
  const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
  if (hours.open < hours.close) {
    return utcHour >= hours.open && utcHour < hours.close;
  }
  return utcHour >= hours.open || utcHour < hours.close;
}

export function getMarketTooltip(exchange: string): string {
  const hours = MARKET_HOURS[exchange];
  if (!hours) return '';
  const open = isMarketOpen(exchange);
  const fmtH = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'}`;
  return `${hours.name}\n${fmtH(hours.open)}–${fmtH(hours.close)} UTC\n${open ? 'OPEN' : 'CLOSED'}`;
}

/** Ticker row — for market indices, commodities, FX */
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
        style={{ backgroundColor: open === undefined ? 'var(--text-muted)' : open ? '#2a6e2a' : '#8b2020' }}
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
