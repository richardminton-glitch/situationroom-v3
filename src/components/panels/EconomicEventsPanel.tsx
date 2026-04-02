'use client';

import { useState, useEffect } from 'react';

interface EconomicEvent {
  date: string;
  time?: string;
  title: string;
  category: string;
  impact?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  fomc: '🏦', cpi: '📊', ppi: '📊', pce: '📊', jobs: '📊',
  retail: '🛒', pmi: '🏭', claims: '📊', gdp: '📊',
  ecb: '🏦', boj: '🏦', boe: '🏦', pboc: '🏦',
  btc_options: '₿', btc_difficulty: '⛏', btc_halving: '₿',
  treasury: '💵', conference: '🎙', political: '🗳', other: '◇',
};

// Hardcoded upcoming events — in production these would come from an API
// This gives the panel something to show immediately
function getUpcomingEvents(): EconomicEvent[] {
  const now = new Date();
  const events: EconomicEvent[] = [];

  // Generate placeholder recurring events based on current month
  const year = now.getFullYear();
  const month = now.getMonth();

  const templates = [
    { dayOffset: 2, title: 'US Initial Jobless Claims', category: 'claims', time: '13:30 UTC' },
    { dayOffset: 5, title: 'US Non-Farm Payrolls', category: 'jobs', time: '13:30 UTC', impact: 'high' },
    { dayOffset: 8, title: 'US CPI Release', category: 'cpi', time: '13:30 UTC', impact: 'high' },
    { dayOffset: 12, title: 'FOMC Rate Decision', category: 'fomc', time: '19:00 UTC', impact: 'high' },
    { dayOffset: 14, title: 'ECB Rate Decision', category: 'ecb', time: '13:15 UTC', impact: 'high' },
    { dayOffset: 16, title: 'BOJ Rate Decision', category: 'boj', time: '03:00 UTC' },
    { dayOffset: 18, title: 'US Retail Sales', category: 'retail', time: '13:30 UTC' },
    { dayOffset: 20, title: 'BTC Options Expiry', category: 'btc_options', time: '08:00 UTC' },
    { dayOffset: 22, title: 'US GDP (Q1 Advance)', category: 'gdp', time: '13:30 UTC', impact: 'high' },
    { dayOffset: 25, title: 'US PCE Price Index', category: 'pce', time: '13:30 UTC', impact: 'high' },
    { dayOffset: 28, title: 'BTC Difficulty Adjustment', category: 'btc_difficulty' },
  ];

  for (const t of templates) {
    const d = new Date(year, month, now.getDate() + t.dayOffset);
    events.push({
      date: d.toISOString().split('T')[0],
      time: t.time,
      title: t.title,
      category: t.category,
      impact: t.impact,
    });
  }

  return events.filter((e) => new Date(e.date) >= now).slice(0, 15);
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function EconomicEventsPanel() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);

  useEffect(() => {
    setEvents(getUpcomingEvents());
    // In production: fetch from /api/events/upcoming
    const interval = setInterval(() => setEvents(getUpcomingEvents()), 3600_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-0 h-full">
      <div
        className="shrink-0 px-3 text-xs uppercase tracking-wider font-medium"
        style={{
          color: 'var(--border-primary)',
          fontFamily: 'var(--font-heading)',
          letterSpacing: '0.08em',
          fontSize: '10px',
          minWidth: '72px',
        }}
      >
        Upcoming
      </div>
      <div className="flex items-center gap-2 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
        {events.map((ev, i) => (
          <div
            key={i}
            className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded"
            style={{
              border: `1px solid ${ev.impact === 'high' ? '#b85020' : 'var(--border-subtle)'}`,
              backgroundColor: 'var(--bg-secondary)',
              fontSize: '10px',
            }}
            title={`${ev.title}${ev.time ? ` — ${ev.time}` : ''}`}
          >
            <span>{CATEGORY_ICONS[ev.category] || '◇'}</span>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>
              {formatEventDate(ev.date)}
            </span>
            <span style={{ color: 'var(--text-primary)' }}>{ev.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
