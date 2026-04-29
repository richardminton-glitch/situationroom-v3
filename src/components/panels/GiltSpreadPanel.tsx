'use client';

/**
 * GiltSpreadPanel — UK 10y gilt minus 3m sterling interbank rate.
 *
 * The UK analog of the NY Fed's T10Y3M recession-probability series.
 * Inverted (< 0) historically precedes UK recession by 6-18 months.
 *
 * Data: /api/data/gilt-spread (FRED, monthly, 24h cache).
 */

import { useEffect, useMemo, useState } from 'react';
import { PanelLoading } from './shared';

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface SpreadPoint { time: number; value: number; }
interface SpreadPayload { series: SpreadPoint[]; latest: SpreadPoint | null; }

type Regime = 'INVERTED' | 'FLAT' | 'NORMAL';

function regimeFor(value: number): Regime {
  if (value < 0)    return 'INVERTED';
  if (value < 0.25) return 'FLAT';
  return 'NORMAL';
}

function regimeColour(r: Regime): string {
  switch (r) {
    case 'INVERTED': return '#c04848';
    case 'FLAT':     return '#d68a3c';
    case 'NORMAL':   return '#4aa57a';
  }
}

function formatMonth(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function formatPp(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

interface SparkPath {
  line: string;
  zero: number;
  lastPoint: { x: number; y: number } | null;
  inversionAreas: string[];
}

function buildSparkline(series: SpreadPoint[]): SparkPath {
  if (series.length < 2) return { line: '', zero: 0, lastPoint: null, inversionAreas: [] };
  const W = 600, H = 60;
  const values = series.map((p) => p.value);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = (max - min) || 1;

  const xFor = (i: number) => (i / (series.length - 1)) * W;
  const yFor = (v: number) => H - ((v - min) / span) * H;

  const pts = series.map((p, i) => ({ x: xFor(i), y: yFor(p.value), v: p.value }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  const zero = yFor(0);
  const inversionAreas: string[] = [];
  let segStart: number | null = null;
  for (let i = 0; i < pts.length; i++) {
    const inverted = pts[i].v < 0;
    if (inverted && segStart === null) segStart = i;
    if ((!inverted || i === pts.length - 1) && segStart !== null) {
      const end = inverted ? i : i - 1;
      const xs = pts.slice(segStart, end + 1);
      const path = `M${xs[0].x.toFixed(1)} ${zero.toFixed(1)} ` +
        xs.map((p) => `L${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
        ` L${xs[xs.length - 1].x.toFixed(1)} ${zero.toFixed(1)} Z`;
      inversionAreas.push(path);
      segStart = null;
    }
  }

  return { line, zero, lastPoint: pts[pts.length - 1], inversionAreas };
}

export function GiltSpreadPanel() {
  const [data, setData]       = useState<SpreadPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/data/gilt-spread')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d: SpreadPayload) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Trim to trailing 24 months for a tidy 2-year window
  const series = useMemo(() => (data?.series ?? []).slice(-24), [data]);
  const sparkPath = useMemo(() => buildSparkline(series), [series]);

  if (loading) return <PanelLoading />;

  if (error || !data || !data.latest || series.length === 0) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: 11, padding: 12, textAlign: 'center',
      }}>
        {error ? `Gilt spread unavailable: ${error}` : 'No gilt-spread data'}
      </div>
    );
  }

  const latest = series[series.length - 1];
  const prior  = series.length > 1 ? series[series.length - 2] : null;
  const regime = regimeFor(latest.value);
  const colour = regimeColour(regime);
  const delta  = prior ? latest.value - prior.value : null;

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      padding: '14px 16px', fontFamily: FONT_MONO, gap: 12,
    }}>
      {/* Reading */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
        <div style={{
          fontSize: 38, fontWeight: 600, color: colour,
          lineHeight: 1, letterSpacing: '-0.02em',
        }}>
          {formatPp(latest.value)}
          <span style={{ fontSize: 14, marginLeft: 4, color: 'var(--text-muted)', fontWeight: 400 }}>
            pp
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{
            fontSize: 10, letterSpacing: '0.18em', color: colour,
            fontWeight: 600, marginBottom: 2,
          }}>
            {regime}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            10y gilt &minus; 3m GBP &middot; {formatMonth(latest.time)}
          </div>
          {delta !== null && (
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
              {delta >= 0 ? '+' : ''}{delta.toFixed(2)} vs prior month
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
            aria-label="UK 10y-3m gilt spread sparkline"
          >
            {sparkPath.inversionAreas.map((d, i) => (
              <path key={i} d={d} fill="#c04848" fillOpacity="0.18" />
            ))}
            <line
              x1="0" y1={sparkPath.zero} x2="600" y2={sparkPath.zero}
              stroke="var(--text-muted)" strokeDasharray="2 4" strokeWidth="0.5"
            />
            <path d={sparkPath.line} fill="none" stroke={colour} strokeWidth="1.5" />
            {sparkPath.lastPoint && (
              <circle cx={sparkPath.lastPoint.x} cy={sparkPath.lastPoint.y} r="3" fill={colour} />
            )}
          </svg>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 8, color: 'var(--text-muted)', marginTop: 2,
          }}>
            <span>{formatMonth(series[0].time)}</span>
            <span>0 = flat curve</span>
            <span>{formatMonth(latest.time)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
