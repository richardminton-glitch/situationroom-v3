'use client';

/**
 * OnChainAnalysisPanel — tiered Grok on-chain analysis
 *
 * Members and VIP both see an ANALYSE button.
 * Each tier gets different depth of analysis and cache window:
 *   Members: moderate depth, 12h refresh, grok-3
 *   VIP:     full deep-dive with historical cycle precedents, 6h refresh, grok-3
 */

import { useState, useEffect } from 'react';
import { useTier } from '@/hooks/useTier';

interface AnalysisResponse {
  analysis: string | null;
  tier: string;
  ttlHours: number;
  cachedAt?: string;
  expiresAt?: string;
  fromCache?: boolean;
  pending?: boolean;
}

const TIER_BADGE: Record<string, { label: string; color: string }> = {
  members: { label: 'MEMBERS', color: '#4a6fa5' },
  vip: { label: 'VIP', color: '#a855f7' },
};

const MODEL_LABEL: Record<string, string> = {
  members: 'GROK-3',
  vip: 'GROK-3',
};

export function OnChainAnalysisPanel() {
  const { canAccess, userTier } = useTier();
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Display tier matches actual subscription tier (admin bypass only prevents lockout)
  const displayTier = userTier === 'vip' ? 'vip' : 'members';

  // ── Auto-fetch cached analysis on mount (via GET) ──────────────────────
  useEffect(() => {
    if (!canAccess('members')) return;
    setLoading(true);
    fetch('/api/ai/onchain-analysis')
      .then((res) => {
        if (res.status === 403) { setError('Access restricted'); return null; }
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then((json: AnalysisResponse | null) => {
        if (!json) return;
        if (json.analysis) {
          setData(json);
        } else {
          // No cache yet — store tier/ttl info for display
          setData(json);
        }
      })
      .catch(() => setError('Analysis unavailable'))
      .finally(() => setLoading(false));
  }, [userTier]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Generate analysis (POST) ───────────────────────────────────────────
  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/onchain-analysis', {
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
          setError('Members access required');
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

  // ── Locked for free/general users ───────────────────────────────────────
  if (!canAccess('members')) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--text-muted)',
      }}>
        On-Chain Deep Analysis requires Members access.
        <br />
        <a href="/support" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
          Upgrade &rarr;
        </a>
      </div>
    );
  }

  // ── Derived state ───────────────────────────────────────────────────────
  const hasAnalysis = data?.analysis != null;
  const ttlHours = data?.ttlHours ?? (displayTier === 'vip' ? 6 : 12);
  const timeUntilRefresh = data?.expiresAt
    ? Math.max(0, new Date(data.expiresAt).getTime() - Date.now())
    : 0;
  const hoursLeft = Math.floor(timeUntilRefresh / (1000 * 60 * 60));
  const minsLeft = Math.floor((timeUntilRefresh % (1000 * 60 * 60)) / (1000 * 60));
  const canRefresh = !hasAnalysis || timeUntilRefresh <= 0;

  const badge = TIER_BADGE[displayTier] || TIER_BADGE.members;
  const modelLabel = MODEL_LABEL[displayTier] || 'GROK-3';

  // Upsell for members
  const upsell = displayTier === 'vip'
    ? null
    : { text: 'Unlock deep-dive with historical cycle precedents', tier: 'VIP', refresh: '6h' };

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
          On-Chain Deep Analysis &middot; {modelLabel}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: badge.color,
          border: `1px solid ${badge.color}`,
          borderRadius: '3px',
          padding: '1px 5px',
          letterSpacing: '0.06em',
        }}>
          {badge.label}
        </span>
      </div>

      {/* Action button — both tiers */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
        <button
          onClick={fetchAnalysis}
          disabled={loading || (!canRefresh && hasAnalysis)}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            padding: '5px 12px',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)',
            borderRadius: '4px',
            cursor: loading || (!canRefresh && hasAnalysis) ? 'not-allowed' : 'pointer',
            opacity: loading || (!canRefresh && hasAnalysis) ? 0.6 : 1,
            letterSpacing: '0.05em',
          }}
        >
          {loading
            ? 'ANALYSING...'
            : hasAnalysis
              ? canRefresh
                ? 'REFRESH ANALYSIS'
                : 'CACHED'
              : 'ANALYSE ON-CHAIN'}
        </button>
        {hasAnalysis && !canRefresh && (
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
      {loading && !hasAnalysis && (
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
      {hasAnalysis && !loading && (
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
          {data!.analysis}
        </div>
      )}

      {/* Empty state — haven't clicked analyse yet */}
      {!hasAnalysis && !loading && !error && (
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
          AI analysis of all on-chain indicators.<br />
          Press Analyse On-Chain to begin.
        </div>
      )}

      {/* Upsell */}
      {upsell && hasAnalysis && !loading && (
        <div style={{
          flexShrink: 0,
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--text-muted)',
          }}>
            {upsell.text} ({upsell.refresh} refresh).
          </span>
          <a
            href="/support"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--accent-primary)',
              textDecoration: 'none',
            }}
          >
            Upgrade to {upsell.tier} &rarr;
          </a>
        </div>
      )}

      {/* Footer */}
      {hasAnalysis && !loading && (
        <div style={{
          flexShrink: 0,
          borderTop: upsell ? 'none' : '1px solid var(--border-subtle)',
          paddingTop: upsell ? '0' : '6px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--text-muted)',
            }}>
              {data?.fromCache ? 'Cached' : 'Generated'}:{' '}
              {data?.cachedAt ? new Date(data.cachedAt).toLocaleString() : '—'}
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
              {modelLabel}
            </span>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--text-muted)',
            marginTop: '3px',
          }}>
            {ttlHours}h analysis window &middot;{' '}
            {canRefresh
              ? 'Refresh available'
              : `Next refresh: ${hoursLeft}h ${minsLeft}m`}
          </div>
        </div>
      )}
    </div>
  );
}
