'use client';

import { useState } from 'react';
import Link from 'next/link';

interface BriefingMatch {
  date: string;
  headline: string;
  relevance: string;
  keyData: string;
}

interface SearchResult {
  matches: BriefingMatch[];
  synthesis: string;
  briefingsSearched: number;
}

export function BriefingSearch() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async () => {
    if (query.trim().length < 3) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/ai/briefing-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: '32px', padding: '20px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
        Search Intelligence
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="e.g. when was F&G last below 15"
          style={{
            flex: 1, padding: '8px 12px',
            fontFamily: 'var(--font-mono)', fontSize: '12px',
            backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)', outline: 'none',
          }}
        />
        <button
          onClick={search}
          disabled={loading || query.trim().length < 3}
          style={{
            padding: '8px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px',
            letterSpacing: '0.08em',
            backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)',
            border: 'none', cursor: loading ? 'wait' : 'pointer',
            opacity: loading || query.trim().length < 3 ? 0.5 : 1,
          }}
        >
          {loading ? '...' : 'SEARCH'}
        </button>
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px' }}>
        Natural language search across all stored briefings
      </div>

      {error && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-danger)', marginTop: '8px' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '16px' }}>
          {/* Synthesis */}
          <div style={{
            padding: '12px 16px', marginBottom: '12px',
            borderLeft: '2px solid var(--accent-primary)',
            backgroundColor: 'var(--bg-card)',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '6px' }}>
              SYNTHESIS — {result.briefingsSearched} briefings searched
            </div>
            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
              {result.synthesis}
            </p>
          </div>

          {/* Matches */}
          {result.matches.length > 0 ? (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                MATCHING BRIEFINGS ({result.matches.length})
              </div>
              {result.matches.map((m) => (
                <Link
                  key={m.date}
                  href={`/briefing/${m.date}`}
                  style={{ display: 'block', textDecoration: 'none', marginBottom: '6px' }}
                >
                  <div style={{
                    padding: '8px 12px', border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-card)',
                  }}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-primary)' }}>
                        {m.date}
                      </span>
                      {m.keyData && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>
                          {m.keyData}
                        </span>
                      )}
                    </div>
                    <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '12px', color: 'var(--text-primary)', margin: '0 0 2px 0' }}>
                      {m.headline}
                    </p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', margin: 0 }}>
                      {m.relevance}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
              No matching briefings found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
