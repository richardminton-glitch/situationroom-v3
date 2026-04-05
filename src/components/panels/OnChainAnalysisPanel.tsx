'use client';

/**
 * OnChainAnalysisPanel — VIP-only Grok-3 deep dive analysis
 *
 * Fetches AI-generated analysis of all on-chain indicators from the
 * on-chain dashboard. Cached for 6 hours — VIP users see a refresh
 * button but within the 6h window it serves cached data.
 */

import { useState } from 'react';
import { useTier } from '@/hooks/useTier';

interface AnalysisResponse {
  analysis: string;
  cachedAt: string;
  expiresAt: string;
  fromCache: boolean;
}

export function OnChainAnalysisPanel() {
  const { canAccess } = useTier();
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canAccess('vip')) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
        On-Chain Deep Analysis requires VIP access.
        <br /><a href="/account" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Upgrade &rarr;</a>
      </div>
    );
  }

  const fetchAnalysis = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = force
        ? '/api/ai/onchain-analysis?force=true'
        : '/api/ai/onchain-analysis';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setError(`Daily AI limit reached. Resets at ${new Date(body.resetAt).toLocaleTimeString()}`);
          return;
        }
        if (res.status === 403) {
          setError('VIP access required');
          return;
        }
        throw new Error('Request failed');
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError('Analysis unavailable — try again later');
    } finally {
      setLoading(false);
    }
  };

  const timeUntilRefresh = data?.expiresAt
    ? Math.max(0, new Date(data.expiresAt).getTime() - Date.now())
    : 0;
  const hoursLeft = Math.floor(timeUntilRefresh / (1000 * 60 * 60));
  const minsLeft = Math.floor((timeUntilRefresh % (1000 * 60 * 60)) / (1000 * 60));
  const canRefresh = !data || timeUntilRefresh <= 0;

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
          On-Chain Deep Analysis &middot; Grok-3
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: '#a855f7',
          border: '1px solid #a855f7',
          borderRadius: '3px',
          padding: '1px 5px',
          letterSpacing: '0.06em',
        }}>
          VIP
        </span>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
        <button
          onClick={() => fetchAnalysis(!canRefresh ? false : true)}
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
          {data ? (canRefresh ? 'REFRESH ANALYSIS' : 'VIEW ANALYSIS') : 'ANALYSE ON-CHAIN'}
        </button>
        {data && !canRefresh && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--text-muted)',
          }}>
            Next refresh in {hoursLeft}h {minsLeft}m
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          padding: '8px 0',
          flexShrink: 0,
        }}>
          Analysing on-chain indicators...
        </div>
      )}

      {/* Error */}
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
          {data.analysis}
        </div>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          lineHeight: 1.6,
          padding: '0 20px',
        }}>
          Grok-3 deep dive analysis of all on-chain indicators.<br />
          Press Analyse On-Chain to begin.
        </div>
      )}

      {/* Footer */}
      {data && !loading && (
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--text-muted)',
            }}>
              {data.fromCache ? 'Cached' : 'Generated'}: {new Date(data.cachedAt).toLocaleString()}
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
              GROK-3
            </span>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--text-muted)',
            marginTop: '3px',
          }}>
            6-hour analysis window &middot; {canRefresh ? 'Refresh available' : `Next refresh: ${hoursLeft}h ${minsLeft}m`}
          </div>
        </div>
      )}
    </div>
  );
}
