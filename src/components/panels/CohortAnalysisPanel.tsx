'use client';

import { useState, useEffect } from 'react';
import { PanelLoading } from './shared';
import { useTier } from '@/hooks/useTier';

type Implication = 'accumulation' | 'distribution' | 'hodling' | 'capitulation';
type Confidence = 'low' | 'medium' | 'high';

interface CohortAnalysisResponse {
  analysis: string;
  dominantCohort: string;
  implication: Implication;
  confidence: Confidence;
}

const IMPLICATION_COLORS: Record<Implication, string> = {
  accumulation: '#4caf50',
  distribution: '#e05252',
  hodling: '#d4a04a',
  capitulation: '#e05252',
};

const CONFIDENCE_COLORS: Record<Confidence, string> = {
  low: '#e05252',
  medium: '#d4a04a',
  high: '#4caf50',
};

export function CohortAnalysisPanel() {
  const { userTier } = useTier();
  const [data, setData] = useState<CohortAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userTier === 'free') {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch('/api/ai/cohort-analysis')
      .then((res) => {
        if (!res.ok) throw new Error('Request failed');
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Cohort analysis unavailable');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [userTier]);

  if (userTier === 'free') {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
        Cohort Analysis requires Members access.
        <br /><a href="/account" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Upgrade →</a>
      </div>
    );
  }

  if (loading) return <PanelLoading />;

  if (error || !data) {
    return (
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--accent-danger, #b84040)',
        padding: '8px 0',
      }}>
        {error ?? 'Cohort analysis unavailable'}
      </div>
    );
  }

  const implicationColor = IMPLICATION_COLORS[data.implication] ?? 'var(--text-muted)';
  const confidenceColor = CONFIDENCE_COLORS[data.confidence] ?? 'var(--text-muted)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
      {/* Header metrics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
        {/* Dominant cohort */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}>
            Dominant Cohort:
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--accent-primary)',
            fontWeight: 600,
          }}>
            {data.dominantCohort}
          </span>
        </div>

        {/* Implication + Confidence */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Implication:
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: '#fff',
              backgroundColor: implicationColor,
              borderRadius: '3px',
              padding: '1px 7px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              {data.implication}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Confidence:
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: confidenceColor,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}>
              {data.confidence}
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }} />

      {/* Analysis text */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        lineHeight: 1.7,
        color: 'var(--text-primary)',
      }}>
        {data.analysis}
      </div>

      {/* Footer */}
      <div style={{
        flexShrink: 0,
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'var(--text-muted)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: '6px',
      }}>
        Claude Haiku · 6hr Cache
      </div>
    </div>
  );
}
