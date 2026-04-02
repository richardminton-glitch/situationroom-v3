'use client';

import { useState, useEffect, useRef } from 'react';

interface Headline {
  title: string;
  category: string;
  source: string;
  link: string;
}

const CAT_ICONS: Record<string, string> = {
  bitcoin: '₿',
  conflict: '☠',
  disaster: '⚠',
  economy: '◈',
  political: '🗳',
};

export function WirePanel() {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/data/rss');
        if (res.ok) {
          const data = await res.json();
          setHeadlines((data.headlines || []).slice(0, 25));
        }
      } catch { /* */ }
    }
    load();
    const interval = setInterval(load, 300_000);
    return () => clearInterval(interval);
  }, []);

  if (headlines.length === 0) {
    return (
      <div className="flex items-center h-full" style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '10px' }}>
        Loading headlines…
      </div>
    );
  }

  // Build items twice for seamless loop
  const items = [...headlines, ...headlines];

  return (
    <div className="flex items-center gap-0 h-full">
      <div
        className="shrink-0 px-3 text-xs uppercase tracking-wider font-medium"
        style={{
          color: 'var(--border-primary)',
          fontFamily: 'var(--font-heading)',
          letterSpacing: '0.08em',
          fontSize: '10px',
          minWidth: '48px',
        }}
      >
        Wire
      </div>
      <div className="ticker-track">
        <div className="ticker-content" ref={contentRef} style={{ animationDuration: '240s' }}>
          {items.map((h, i) => (
            <span key={i} className="inline-flex items-center gap-1.5" style={{ fontSize: '11px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                {CAT_ICONS[h.category] || '◇'}
              </span>
              <a
                href={h.link}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
              >
                {h.title}
              </a>
              <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                [{h.source}]
              </span>
              <span style={{ color: 'var(--border-primary)', margin: '0 8px' }}>◆</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
