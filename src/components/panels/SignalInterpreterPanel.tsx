'use client';

import { useState } from 'react';
import { useTier } from '@/hooks/useTier';

interface SignalInterpreterResponse {
  interpretation: string;
  cachedAt: string;
}

export function SignalInterpreterPanel() {
  const { canAccess } = useTier();
  const [data, setData] = useState<SignalInterpreterResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canAccess('members')) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
        Signal Synthesis requires Members access.
        <br /><a href="/account" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Upgrade &rarr;</a>
      </div>
    );
  }

  const fetchAnalysis = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = force
        ? '/api/ai/signal-interpreter?force=true'
        : '/api/ai/signal-interpreter';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoDetect: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setError(`Daily AI limit reached. Resets at ${new Date(body.resetAt).toLocaleTimeString()}`);
          return;
        }
        throw new Error('Request failed');
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError('Signal analysis unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          Signal Synthesis &middot; AI Interpreter
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--accent-primary)',
          border: '1px solid var(--accent-primary)',
          borderRadius: '3px',
          padding: '1px 5px',
          letterSpacing: '0.06em',
        }}>
          MEMBERS+
        </span>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <button
          onClick={() => fetchAnalysis(false)}
          disabled={loading}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            padding: '5px 12px',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            letterSpacing: '0.05em',
          }}
        >
          ANALYSE SIGNALS
        </button>
        {data && (
          <button
            onClick={() => fetchAnalysis(true)}
            disabled={loading}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              padding: '5px 10px',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            Refresh
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          padding: '8px 0',
          flexShrink: 0,
        }}>
          Consulting oracle...
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--accent-danger, #b84040)',
          padding: '8px 0',
          flexShrink: 0,
        }}>
          {error}
        </div>
      )}

      {/* Result */}
      {data && !loading && (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            lineHeight: 1.7,
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {data.interpretation}
        </div>
      )}

      {/* Empty prompt */}
      {!data && !loading && !error && (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-muted)',
        }}>
          Press Analyse Signals to begin.
        </div>
      )}

      {/* Footer */}
      {data && !loading && (
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--text-muted)',
            }}>
              Updated: {data.cachedAt}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '3px',
              padding: '1px 5px',
              letterSpacing: '0.06em',
            }}>
              GROK
            </span>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--text-muted)',
            marginTop: '3px',
          }}>
            Analysis refreshes every 12 hours
          </div>
        </div>
      )}
    </div>
  );
}
