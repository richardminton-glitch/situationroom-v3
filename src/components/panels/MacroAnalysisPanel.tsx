'use client';

/**
 * MacroAnalysisPanel — tiered Grok-3 macro analysis
 *
 * General:  auto-loads cron-generated basic analysis + upsell to Members
 * Members:  auto-loads cron-generated detailed analysis + upsell to VIP
 * VIP:      on-demand full analysis via ANALYSE button (unchanged)
 */

import { useState, useEffect } from 'react';
import { useTier } from '@/hooks/useTier';

interface AnalysisResponse {
  analysis: string;
  cachedAt: string;
  expiresAt: string;
  fromCache: boolean;
}

const TIER_BADGE: Record<string, { label: string; color: string }> = {
  general: { label: 'GENERAL', color: '#8b6914' },
  members: { label: 'MEMBERS', color: '#4a6fa5' },
  vip: { label: 'VIP', color: '#a855f7' },
};

export function MacroAnalysisPanel() {
  const { canAccess, userTier } = useTier();
  const isVip = canAccess('vip');
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // ── Auto-fetch for general/members (cron-generated, via GET) ────────────
  useEffect(() => {
    if (!canAccess('general') || isVip) return;
    setLoading(true);
    fetch('/api/ai/macro-analysis')
      .then((res) => {
        if (res.status === 403) {
          setError('Access restricted');
          return null;
        }
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then((json) => {
        if (!json) return;
        if (json.analysis) {
          setData(json);
          setPending(false);
        } else {
          setPending(true);
        }
      })
      .catch(() => setError('Analysis unavailable'))
      .finally(() => setLoading(false));
  }, [userTier]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Locked for free/non-logged-in users ─────────────────────────────────
  if (!canAccess('general')) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--text-muted)',
      }}>
        Macro Analysis requires General access.
        <br />
        <a href="/support" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
          Upgrade &rarr;
        </a>
      </div>
    );
  }

  // ── VIP: on-demand POST fetch ───────────────────────────────────────────
  const fetchAnalysis = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = force
        ? '/api/ai/macro-analysis?force=true'
        : '/api/ai/macro-analysis';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setError(
            `Daily AI limit reached. Resets at ${new Date(body.resetAt).toLocaleTimeString()}`,
          );
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

  // ── Derived state ───────────────────────────────────────────────────────
  const timeUntilRefresh = data?.expiresAt
    ? Math.max(0, new Date(data.expiresAt).getTime() - Date.now())
    : 0;
  const hoursLeft = Math.floor(timeUntilRefresh / (1000 * 60 * 60));
  const minsLeft = Math.floor(
    (timeUntilRefresh % (1000 * 60 * 60)) / (1000 * 60),
  );
  const canRefresh = !data || timeUntilRefresh <= 0;

  const badge = TIER_BADGE[userTier] || TIER_BADGE.general;

  // Upsell configuration
  const upsell = isVip
    ? null
    : canAccess('members')
      ? { text: 'Unlock on-demand AI analysis', tier: 'VIP' }
      : { text: 'Unlock deeper macro analysis', tier: 'Members' };

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
          Macro Deep Analysis &middot; Grok-3
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

      {/* VIP action buttons */}
      {isVip && (
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
            {data
              ? canRefresh
                ? 'REFRESH ANALYSIS'
                : 'VIEW ANALYSIS'
              : 'ANALYSE MACRO'}
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
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          padding: '8px 0',
          flexShrink: 0,
        }}>
          {isVip ? 'Analysing macro indicators...' : 'Loading analysis...'}
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

      {/* Pending — cron hasn't generated yet */}
      {pending && !loading && !data && (
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
          Analysis is generated every 6 hours.<br />
          Check back shortly.
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

      {/* Empty state — VIP only, haven't clicked analyse yet */}
      {isVip && !data && !loading && !error && (
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
          Grok-3 deep dive analysis of all macro indicators.<br />
          Press Analyse Macro to begin.
        </div>
      )}

      {/* Upsell — non-VIP tiers */}
      {upsell && data && !loading && (
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
            {upsell.text} with {upsell.tier} tier.
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
            Learn more &rarr;
          </a>
        </div>
      )}

      {/* Footer */}
      {data && !loading && (
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
              {data.fromCache ? 'Cached' : 'Generated'}:{' '}
              {new Date(data.cachedAt).toLocaleString()}
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
          {isVip && (
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--text-muted)',
              marginTop: '3px',
            }}>
              6-hour analysis window &middot;{' '}
              {canRefresh
                ? 'Refresh available'
                : `Next refresh: ${hoursLeft}h ${minsLeft}m`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
