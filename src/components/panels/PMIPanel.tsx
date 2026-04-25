'use client';

/**
 * PMIPanel — compact dashboard panel for ISM Manufacturing PMI.
 *
 * Shows latest reading as a big regime-coloured number, MoM delta,
 * regime label, and a 12-month sparkline. Mirrors the hero tile from
 * /tools/macro-cycle but trimmed to fit panel chrome.
 *
 * Data: /api/data/ism-cycle (admin-curated, no upstream API since ISM
 * revoked FRED redistribution in 2016).
 */

import { useEffect, useMemo, useState } from 'react';
import type { IsmCycleData, IsmReading } from '@/lib/macro-cycle/types';
import { PanelLoading } from './shared';

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

type Regime = 'CONTRACTING' | 'NEUTRAL' | 'EXPANDING' | 'OVERHEATED';

function regimeFor(value: number): Regime {
  if (value < 48) return 'CONTRACTING';
  if (value < 50) return 'NEUTRAL';
  if (value < 60) return 'EXPANDING';
  return 'OVERHEATED';
}

function regimeColour(r: Regime): string {
  switch (r) {
    case 'CONTRACTING': return '#c04848';
    case 'NEUTRAL':     return '#8b7355';
    case 'EXPANDING':   return '#4aa57a';
    case 'OVERHEATED':  return '#d68a3c';
  }
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

interface SparkPath {
  line: string;
  lastPoint: { x: number; y: number } | null;
}

function buildSparkline(readings: IsmReading[]): SparkPath {
  if (readings.length < 2) return { line: '', lastPoint: null };
  const W = 600, H = 60;
  const min = Math.min(40, ...readings.map((r) => r.value));
  const max = Math.max(60, ...readings.map((r) => r.value));
  const span = max - min || 1;
  const pts = readings.map((r, i) => ({
    x: (i / (readings.length - 1)) * W,
    y: H - ((r.value - min) / span) * H,
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return { line, lastPoint: pts[pts.length - 1] };
}

export function PMIPanel() {
  const [data, setData]       = useState<IsmCycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/data/ism-cycle')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d: IsmCycleData) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const series = useMemo(() => (data?.readings ?? []).slice(-12), [data]);
  const sparkPath = useMemo(() => buildSparkline(series), [series]);

  if (loading) return <PanelLoading />;

  if (error || !data) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: 11, padding: 12, textAlign: 'center',
      }}>
        {error ? `PMI data unavailable: ${error}` : 'No PMI data'}
      </div>
    );
  }

  const latest = data.readings.at(-1) ?? null;
  const prior  = data.readings.length > 1 ? data.readings.at(-2)! : null;

  if (!latest) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: 11, padding: 12, textAlign: 'center',
        fontFamily: FONT_MONO, letterSpacing: '0.18em',
      }}>
        AWAITING FIRST READING
      </div>
    );
  }

  const regime = regimeFor(latest.value);
  const colour = regimeColour(regime);
  const delta  = prior ? latest.value - prior.value : null;

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      padding: '14px 16px', fontFamily: FONT_MONO,
      gap: 12,
    }}>
      {/* Reading */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
        <div style={{
          fontSize: 44, fontWeight: 600, color: colour,
          lineHeight: 1, letterSpacing: '-0.02em',
        }}>
          {latest.value.toFixed(1)}
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{
            fontSize: 10, letterSpacing: '0.18em', color: colour,
            fontWeight: 600, marginBottom: 2,
          }}>
            {regime}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {formatMonth(latest.month)}
            {latest.note ? ` · ${latest.note}` : ''}
          </div>
          {delta !== null && (
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
              {delta >= 0 ? '+' : ''}{delta.toFixed(1)} vs prior
            </div>
          )}
        </div>
      </div>

      {/* Sparkline */}
      {series.length > 1 && (
        <div style={{ flex: 1, minHeight: 50, display: 'flex', flexDirection: 'column' }}>
          <div style={{
            fontSize: 8, letterSpacing: '0.16em', color: 'var(--text-muted)',
            marginBottom: 4,
          }}>
            TRAILING {series.length} MONTHS
          </div>
          <svg
            viewBox="0 0 600 60"
            preserveAspectRatio="none"
            style={{ width: '100%', flex: 1, minHeight: 40, display: 'block' }}
            aria-label="PMI sparkline"
          >
            <line x1="0" y1="30" x2="600" y2="30" stroke="var(--border-subtle)" strokeDasharray="2 4" />
            <path d={sparkPath.line} fill="none" stroke={colour} strokeWidth="1.5" />
            {sparkPath.lastPoint && (
              <circle cx={sparkPath.lastPoint.x} cy={sparkPath.lastPoint.y} r="3" fill={colour} />
            )}
          </svg>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 8, color: 'var(--text-muted)', marginTop: 2,
          }}>
            <span>{formatMonth(series[0].month)}</span>
            <span>50 = neutral</span>
            <span>{formatMonth(latest.month)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
