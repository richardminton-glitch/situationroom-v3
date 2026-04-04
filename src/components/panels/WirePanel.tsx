'use client';

import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  CurrencyBtc,
  Skull,
  Warning,
  TrendUp,
  Scales,
  Diamond,
} from '@phosphor-icons/react';

interface Headline {
  title: string;
  category: string;
  source: string;
  link: string;
}

const WIRE_ICON_SIZE = 12;

const CAT_ICONS: Record<string, ReactNode> = {
  bitcoin: <CurrencyBtc size={WIRE_ICON_SIZE} weight="bold" />,
  conflict: <Skull size={WIRE_ICON_SIZE} weight="regular" />,
  disaster: <Warning size={WIRE_ICON_SIZE} weight="fill" />,
  economy: <TrendUp size={WIRE_ICON_SIZE} weight="regular" />,
  political: <Scales size={WIRE_ICON_SIZE} weight="regular" />,
};

const DEFAULT_CAT_ICON = <Diamond size={WIRE_ICON_SIZE} weight="regular" />;

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
          color: 'var(--text-panel-title)',
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
                {CAT_ICONS[h.category] || DEFAULT_CAT_ICON}
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
