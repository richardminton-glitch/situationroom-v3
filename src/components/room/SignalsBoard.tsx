'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { SignalArticle } from '@/hooks/useOpsRoom';

interface SignalsBoardProps {
  articles: SignalArticle[];
  flashArticleId?: string | null;
}

type FilterKey = 'ALL' | 'bitcoin' | 'conflict' | 'economy' | 'political' | 'disaster';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'ALL' },
  { key: 'bitcoin', label: '\u20bf' },
  { key: 'conflict', label: '\u2620' },
  { key: 'economy', label: '\u25c8' },
  { key: 'political', label: '\ud83d\uddf3' },
  { key: 'disaster', label: '\u26a0' },
];

const CATEGORY_ICONS: Record<string, string> = {
  bitcoin: '\u20bf',
  conflict: '\u2620',
  economy: '\u25c8',
  political: '\ud83d\uddf3',
  disaster: '\u26a0',
};

const DIRECTION_MAP: Record<string, string> = {
  bitcoin: 'direct market',
  conflict: 'risk-off',
  economy: 'macro',
  political: 'regulatory',
  disaster: 'risk-off',
};

function formatTimeUTC(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m} UTC`;
}

function generateAISignal(article: SignalArticle): string {
  const direction = DIRECTION_MAP[article.primaryCategory] || 'indirect';
  return `${article.primaryCategory} signal \u2014 potential ${direction} pressure on Bitcoin.`;
}

export default function SignalsBoard({ articles, flashArticleId }: SignalsBoardProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [newCount, setNewCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // Track new articles
  useEffect(() => {
    if (isInitialMount.current) {
      // On first mount, mark all current articles as seen
      setSeenIds(new Set(articles.map((a) => a.id)));
      isInitialMount.current = false;
      return;
    }

    const currentIds = new Set(articles.map((a) => a.id));
    let unseenCount = 0;
    currentIds.forEach((id) => {
      if (!seenIds.has(id)) unseenCount++;
    });

    if (unseenCount > 0) {
      setNewCount(unseenCount);
    }
  }, [articles, seenIds]);

  const handleScrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setSeenIds(new Set(articles.map((a) => a.id)));
    setNewCount(0);
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const filtered =
      activeFilter === 'ALL'
        ? articles
        : articles.filter((a) => a.primaryCategory === activeFilter);

    // Pin flashed article to top
    if (!flashArticleId) return filtered;
    const flashIdx = filtered.findIndex((a) => a.id === flashArticleId);
    if (flashIdx <= 0) return filtered;
    const copy = [...filtered];
    const [flashed] = copy.splice(flashIdx, 1);
    copy.unshift(flashed);
    return copy;
  }, [articles, activeFilter, flashArticleId]);

  const font = "'IBM Plex Mono', 'SF Mono', monospace";

  return (
    <>
      <style>{`
        @keyframes signals-flash-border {
          0%, 100% { border-color: #cc4444; box-shadow: 0 0 6px #cc444466; }
          50% { border-color: #cc444488; box-shadow: 0 0 2px #cc444433; }
        }
        .signals-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .signals-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .signals-scrollbar::-webkit-scrollbar-thumb {
          background: #1a2e2e;
        }
      `}</style>

      <aside
        style={{
          width: 320,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#0d1414',
          borderLeft: '1px solid #1a2e2e',
          fontFamily: font,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '10px 12px 8px',
            borderBottom: '1px solid #1a2e2e',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: '#4a6060',
              marginBottom: 8,
            }}
          >
            SIGNALS BOARD
          </div>

          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {FILTERS.map((f) => {
              const isActive = activeFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  style={{
                    padding: '2px 6px',
                    fontSize: 9,
                    fontFamily: font,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    border: isActive ? '1px solid #00d4aa' : '1px solid #1a2e2e',
                    background: isActive ? '#00d4aa' : 'transparent',
                    color: isActive ? '#080d0d' : '#4a6060',
                    borderRadius: 0,
                    lineHeight: '16px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* New signals banner */}
        {newCount > 0 && (
          <button
            onClick={handleScrollToTop}
            style={{
              width: '100%',
              padding: '6px 12px',
              fontSize: 10,
              fontFamily: font,
              fontWeight: 600,
              color: '#00d4aa',
              background: '#00d4aa10',
              border: 'none',
              borderBottom: '1px solid #1a2e2e',
              cursor: 'pointer',
              textAlign: 'center',
              letterSpacing: '0.04em',
            }}
          >
            &uarr; {newCount} new signal{newCount !== 1 ? 's' : ''} &mdash; click to view
          </button>
        )}

        {/* Article list */}
        <div
          ref={scrollRef}
          className="signals-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '6px 6px',
          }}
        >
          {filteredArticles.length === 0 && (
            <div
              style={{
                padding: '24px 12px',
                textAlign: 'center',
                fontSize: 10,
                color: '#4a6060',
              }}
            >
              No signals matching filter.
            </div>
          )}

          {filteredArticles.map((article) => {
            const isFlashing = flashArticleId === article.id;
            const scoreColor = article.relevanceToBitcoin >= 7 ? '#00d4aa' : '#4a6060';
            const catIcon =
              CATEGORY_ICONS[article.primaryCategory] || article.categoryIcon || '\u25c8';
            const showAILine = article.relevanceToBitcoin >= 7;

            return (
              <div
                key={article.id}
                style={{
                  marginBottom: 6,
                  padding: '10px 12px',
                  background: '#0d1414',
                  border: isFlashing ? '1px solid #cc4444' : '1px solid #1a2e2e',
                  animation: isFlashing
                    ? 'signals-flash-border 1.5s ease-in-out infinite'
                    : 'none',
                  borderRadius: 0,
                }}
              >
                {/* Card header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: article.categoryDot || '#4a6060',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {catIcon} {article.primaryCategory} SIGNAL
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 9, color: '#4a6060' }}>
                      {formatTimeUTC(article.time)}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        color: scoreColor,
                      }}
                    >
                      &#9733;{article.relevanceToBitcoin}
                    </span>
                  </span>
                </div>

                {/* Separator */}
                <div
                  style={{
                    height: 1,
                    background: '#1a2e2e',
                    marginBottom: 6,
                  }}
                />

                {/* Headline */}
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#e0f0f0',
                    textTransform: 'uppercase',
                    lineHeight: '1.3',
                    maxHeight: '2.6em',
                    overflow: 'hidden',
                    marginBottom: 3,
                  }}
                >
                  {article.title}
                </div>

                {/* Description */}
                <div
                  style={{
                    fontSize: 10,
                    color: '#4a6060',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginBottom: 3,
                  }}
                >
                  {article.description}
                </div>

                {/* Source */}
                <div
                  style={{
                    fontSize: 9,
                    color: '#4a6060',
                    marginBottom: 8,
                  }}
                >
                  {article.source}
                </div>

                {/* Separator */}
                <div
                  style={{
                    height: 1,
                    background: '#1a2e2e',
                    marginBottom: 6,
                  }}
                />

                {/* Relevance bar */}
                <div style={{ marginBottom: showAILine ? 6 : 0 }}>
                  <div
                    style={{
                      fontSize: 9,
                      color: '#4a6060',
                      letterSpacing: '0.06em',
                      marginBottom: 3,
                    }}
                  >
                    RELEVANCE
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: 4,
                      background: '#1a2e2e',
                      borderRadius: 0,
                    }}
                  >
                    <div
                      style={{
                        width: `${(article.relevanceToBitcoin / 10) * 100}%`,
                        height: '100%',
                        background: '#00d4aa',
                        borderRadius: 0,
                      }}
                    />
                  </div>
                </div>

                {/* AI signal line */}
                {showAILine && (
                  <div
                    style={{
                      fontSize: 10,
                      fontStyle: 'italic',
                      color: '#4a6060',
                      lineHeight: '1.4',
                      marginTop: 2,
                    }}
                  >
                    &ldquo;{generateAISignal(article)}&rdquo;
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
