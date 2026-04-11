'use client';

import { useState, useEffect, useMemo } from 'react';
import { PanelLoading, timeAgo } from './shared';
import { useIntelFilter } from '@/components/layout/IntelFilterProvider';
import { useIsMobile } from '@/hooks/useIsMobile';

const MOBILE_INITIAL_LIMIT = 8;

interface Headline {
  title: string;
  category: string;
  source: string;
  link: string;
  time: number;
}

const CATEGORIES = [
  { key: 'all',       label: 'All' },
  { key: 'bitcoin',   label: 'Bitcoin',   color: '#f7931a' },
  { key: 'conflict',  label: 'Conflict',  color: '#8b2020' },
  { key: 'disaster',  label: 'Disaster',  color: '#b8860b' },
  { key: 'economy',   label: 'Economy',   color: '#2d6e5e' },
  { key: 'political', label: 'Political', color: '#5e3d75' },
];

export function IntelFeedPanel() {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const { activeCategory: activeFilter, setActiveCategory: setActiveFilter } = useIntelFilter();
  const isMobile = useIsMobile();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/data/rss');
        if (res.ok) {
          const data = await res.json();
          setHeadlines(data.headlines || []);
        }
      } catch { /* non-critical */ }
      finally { setLoading(false); }
    }
    load();
    const interval = setInterval(load, 300_000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return headlines;
    return headlines.filter((h) => h.category === activeFilter);
  }, [headlines, activeFilter]);

  if (loading) return <PanelLoading />;

  return (
    <div className="flex flex-col h-full">
      {/* Category filters */}
      <div className="flex gap-1 mb-2 flex-wrap shrink-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveFilter(cat.key)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
            style={{
              backgroundColor: activeFilter === cat.key ? 'var(--bg-secondary)' : 'transparent',
              color: activeFilter === cat.key ? 'var(--text-primary)' : 'var(--text-muted)',
              border: activeFilter === cat.key ? '1px solid var(--border-primary)' : '1px solid transparent',
            }}
          >
            {cat.color && (
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
            )}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Headlines */}
      <div className="flex-1 overflow-y-auto space-y-0.5">
        {filtered.length === 0 ? (
          <p className="text-xs py-4" style={{ color: 'var(--text-muted)' }}>No headlines in this category.</p>
        ) : (
          <>
            {(isMobile && !expanded ? filtered.slice(0, MOBILE_INITIAL_LIMIT) : filtered).map((h, i) => (
              <a
                key={`${h.link}-${i}`}
                href={h.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-2 px-1 hover:opacity-80 transition-opacity"
                style={{ borderBottom: '1px dotted var(--border-subtle)' }}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{
                      backgroundColor:
                        CATEGORIES.find((c) => c.key === h.category)?.color || '#888',
                    }}
                  />
                  <div className="min-w-0">
                    <p
                      className="leading-snug"
                      style={{ color: 'var(--text-primary)', fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '12px' }}
                    >
                      {h.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {h.source} · {timeAgo(h.time)}
                    </p>
                  </div>
                </div>
              </a>
            ))}
            {isMobile && !expanded && filtered.length > MOBILE_INITIAL_LIMIT && (
              <button
                onClick={() => setExpanded(true)}
                className="w-full py-3 text-xs text-center"
                style={{
                  color: 'var(--accent-primary)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.08em',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                SHOW {filtered.length - MOBILE_INITIAL_LIMIT} MORE
              </button>
            )}
            {isMobile && expanded && filtered.length > MOBILE_INITIAL_LIMIT && (
              <button
                onClick={() => setExpanded(false)}
                className="w-full py-3 text-xs text-center"
                style={{
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.08em',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                SHOW LESS
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
