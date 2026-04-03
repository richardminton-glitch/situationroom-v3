'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTheme } from '@/components/layout/ThemeProvider';
import { useIntelFilter } from '@/components/layout/IntelFilterProvider';
import { ParchmentGlobe, type MapEvent } from './globes/ParchmentGlobe';
import { DarkGlobe } from './globes/DarkGlobe';
import { ParchmentChart } from './charts/ParchmentChart';

interface ChartPoint {
  time: number;
  value: number;
}

export function GlobePanel() {
  const { theme } = useTheme();
  const { activeCategory } = useIntelFilter();
  const [allEvents, setAllEvents] = useState<MapEvent[]>([]);
  const [view, setView] = useState<'globe' | 'chart'>('globe');
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch('/api/data/rss');
        if (res.ok) {
          const data = await res.json();
          setAllEvents(data.events || []);
        }
      } catch { /* non-critical */ }
    }
    loadEvents();
    const interval = setInterval(loadEvents, 300_000);
    return () => clearInterval(interval);
  }, []);

  // Load chart data when switching to chart view
  useEffect(() => {
    if (view !== 'chart' || chartData.length > 0) return;
    async function loadChart() {
      try {
        const res = await fetch('/api/data/charts');
        if (res.ok) {
          const data = await res.json();
          setChartData(data.btcPrice || []);
        }
      } catch { /* */ }
    }
    loadChart();
  }, [view, chartData.length]);

  const filteredEvents = useMemo(() => {
    if (activeCategory === 'all') return allEvents;
    return allEvents.filter((e) => e.category === activeCategory);
  }, [allEvents, activeCategory]);

  const containerRef = useRef<HTMLDivElement>(null);

  const toggleView = useCallback(() => {
    setView((v) => (v === 'globe' ? 'chart' : 'globe'));
  }, []);

  // Listen for custom event from DOM-injected chart toggle button inside globe
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = () => toggleView();
    el.addEventListener('globe-toggle-chart', handler);
    return () => el.removeEventListener('globe-toggle-chart', handler);
  }, [toggleView]);

  const legend = view === 'globe' && theme === 'parchment' ? (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '14px',
        padding: '2px 0 4px',
        fontSize: '9px',
        fontFamily: "Georgia, 'Times New Roman', serif",
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      {[
        { label: 'Bitcoin', color: '#f7931a' },
        { label: 'Conflict', color: '#8b2020' },
        { label: 'Disaster', color: '#b8860b' },
        { label: 'Economy', color: '#2a2a2a' },
        { label: 'Political', color: '#555' },
      ].map((cat) => (
        <span key={cat.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cat.color, display: 'inline-block' }} />
          {cat.label}
        </span>
      ))}
    </div>
  ) : null;

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '200px', position: 'relative' }}>
      {legend}
      {view === 'globe' ? (
        theme === 'parchment' ? (
          <ParchmentGlobe events={filteredEvents} />
        ) : (
          <DarkGlobe />
        )
      ) : (
        <div style={{ width: '100%', height: '100%', padding: '8px' }}>
          <ParchmentChart
            data={chartData}
            title="BTC / USD — 30 Day"
            color={theme === 'parchment' ? '#3e2c1a' : '#00d4c8'}
            yFormat={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(0)}`}
          />
        </div>
      )}

      {/* Chart view: show globe toggle button */}
      {view === 'chart' && (
        <button
          onClick={toggleView}
          title="Switch to globe"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 50,
            width: '28px',
            height: '28px',
            borderRadius: '4px',
            border: `1px solid ${theme === 'parchment' ? '#d4c9b8' : 'rgba(45,54,64,0.8)'}`,
            backgroundColor: theme === 'parchment' ? 'rgba(245,240,232,0.85)' : 'rgba(10,15,20,0.85)',
            color: theme === 'parchment' ? '#5a4e3c' : '#00d4c8',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          🌍
        </button>
      )}
    </div>
  );
}
