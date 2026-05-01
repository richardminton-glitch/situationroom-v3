'use client';

/**
 * RealYieldsPanel — small dashboard widget showing the latest 10y US TIPS
 * yield (FRED DFII10) with a 12-month sparkline. The negative-yield band
 * is shaded green — the regime in which BTC has historically earned its
 * return. Footer points to /tools/real-yields for the full deep-dive.
 *
 * Reuses /api/data/real-yields (24h cache) — the deep-dive page needs the
 * full BTC × yield join, but for the widget we just consume the yield
 * series and ignore the rest.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PanelLoading } from './shared';

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface YieldPoint { date: string; value: number }
interface ApiPayload {
  realYield: YieldPoint[];
  latest:    YieldPoint | null;
}

type Regime = 'NEGATIVE' | 'NEUTRAL' | 'RESTRICTIVE';

function regimeFor(v: number): Regime {
  if (v < 0)  return 'NEGATIVE';
  if (v < 1)  return 'NEUTRAL';
  return 'RESTRICTIVE';
}

function regimeColour(r: Regime): string {
  switch (r) {
    case 'NEGATIVE':    return '#4aa57a';
    case 'NEUTRAL':     return '#d68a3c';
    case 'RESTRICTIVE': return '#c04848';
  }
}

function formatDate(date: string): string {
  const d = new Date(date + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface SparkPath {
  line: string;
  zero: number;
  lastPoint: { x: number; y: number } | null;
  negativeAreas: string[];
}

function buildSparkline(series: YieldPoint[]): SparkPath {
  if (series.length < 2) return { line: '', zero: 0, lastPoint: null, negativeAreas: [] };
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
  const negativeAreas: string[] = [];
  let segStart: number | null = null;
  for (let i = 0; i < pts.length; i++) {
    const neg = pts[i].v < 0;
    if (neg && segStart === null) segStart = i;
    if ((!neg || i === pts.length - 1) && segStart !== null) {
      const end = neg ? i : i - 1;
      const xs = pts.slice(segStart, end + 1);
      const path = `M${xs[0].x.toFixed(1)} ${zero.toFixed(1)} ` +
        xs.map((p) => `L${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
        ` L${xs[xs.length - 1].x.toFixed(1)} ${zero.toFixed(1)} Z`;
      negativeAreas.push(path);
      segStart = null;
    }
  }

  return { line, zero, lastPoint: pts[pts.length - 1], negativeAreas };
}

export function RealYieldsPanel() {
  const [data, setData]       = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/data/real-yields')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d: ApiPayload) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Trailing 12 months for the sparkline
  const trailing = useMemo(() => {
    if (!data?.realYield) return [] as YieldPoint[];
    const cutoff = Date.now() - 365 * 86_400_000;
    return data.realYield.filter((p) => new Date(p.date + 'T00:00:00Z').getTime() >= cutoff);
  }, [data]);

  const sparkPath = useMemo(() => buildSparkline(trailing), [trailing]);

  if (loading) return <PanelLoading />;

  if (error || !data || !data.latest || trailing.length === 0) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: 11, padding: 12, textAlign: 'center',
      }}>
        {error ? `Real yields unavailable: ${error}` : 'No real-yield data'}
      </div>
    );
  }

  const latest = data.latest;
  const prior  = trailing.length > 1 ? trailing[trailing.length - 2] : null;
  const regime = regimeFor(latest.value);
  const colour = regimeColour(regime);
  const delta  = prior ? latest.value - prior.value : null;

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      padding: '14px 16px', fontFamily: FONT_MONO, gap: 10,
    }}>
      {/* Reading */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
        <div style={{
          fontSize: 38, fontWeight: 600, color: colour,
          lineHeight: 1, letterSpacing: '-0.02em',
        }}>
          {latest.value >= 0 ? '+' : ''}{latest.value.toFixed(2)}
          <span style={{ fontSize: 14, marginLeft: 4, color: 'var(--text-muted)', fontWeight: 400 }}>
            %
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
            10y TIPS &middot; {formatDate(latest.date)}
          </div>
          {delta !== null && (
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
              {delta >= 0 ? '+' : ''}{delta.toFixed(2)} vs prior day
            </div>
          )}
        </div>
      </div>

      {/* Sparkline */}
      {trailing.length > 1 && (
        <div style={{ flex: 1, minHeight: 50, display: 'flex', flexDirection: 'column' }}>
          <div style={{
            fontSize: 8, letterSpacing: '0.16em', color: 'var(--text-muted)',
            marginBottom: 4,
          }}>
            TRAILING 12 MONTHS
          </div>
          <svg
            viewBox="0 0 600 60"
            preserveAspectRatio="none"
            style={{ width: '100%', flex: 1, minHeight: 40, display: 'block' }}
            aria-label="10-year real yield sparkline"
          >
            {sparkPath.negativeAreas.map((d, i) => (
              <path key={i} d={d} fill="#4aa57a" fillOpacity={0.18} />
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
            <span>{formatDate(trailing[0].date)}</span>
            <span>0% = break-even</span>
            <span>{formatDate(latest.date)}</span>
          </div>
        </div>
      )}

      {/* Footer link to deep-dive */}
      <Link
        href="/tools/real-yields"
        style={{
          fontSize: 9, letterSpacing: '0.16em',
          color: 'var(--text-muted)', textDecoration: 'none',
          textTransform: 'uppercase', marginTop: 'auto',
        }}
      >
        Open deep-dive &rarr;
      </Link>
    </div>
  );
}
