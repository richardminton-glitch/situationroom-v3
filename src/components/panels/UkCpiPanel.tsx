'use client';

/**
 * UkCpiPanel — UK CPI year-over-year, monthly, with the BOE 2% target as
 * the regime anchor. Hot above target, cool below. The UK analog of the
 * ISM PMI hero panel on the US Focus dashboard.
 *
 * Data: /api/data/inflation (API-Ninjas /v1/inflationhistorical for GB),
 * which already feeds the multi-country Inflation Monitor and is fresher
 * than FRED's OECD-curated UK series. We just take the UK slice and
 * trim to the trailing 12 months.
 */

import { useEffect, useMemo, useState } from 'react';
import { PanelLoading } from './shared';

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface CpiPoint { time: number; value: number; }
interface InflationPayload { UK?: CpiPoint[]; }

type Regime = 'BELOW TARGET' | 'ON TARGET' | 'ELEVATED' | 'RUNAWAY';

function regimeFor(value: number): Regime {
  if (value < 1.5) return 'BELOW TARGET';
  if (value < 2.5) return 'ON TARGET';
  if (value < 5)   return 'ELEVATED';
  return 'RUNAWAY';
}

function regimeColour(r: Regime): string {
  switch (r) {
    case 'BELOW TARGET': return '#5b8fb9';
    case 'ON TARGET':    return '#4aa57a';
    case 'ELEVATED':     return '#d68a3c';
    case 'RUNAWAY':      return '#c04848';
  }
}

function formatMonth(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

interface SparkPath {
  line: string;
  target: number;
  lastPoint: { x: number; y: number } | null;
}

function buildSparkline(series: CpiPoint[]): SparkPath {
  if (series.length < 2) return { line: '', target: 0, lastPoint: null };
  const W = 600, H = 60;
  const values = series.map((p) => p.value);
  const min = Math.min(0, 2, ...values);
  const max = Math.max(2, ...values);
  const span = (max - min) || 1;

  const xFor = (i: number) => (i / (series.length - 1)) * W;
  const yFor = (v: number) => H - ((v - min) / span) * H;

  const pts = series.map((p, i) => ({ x: xFor(i), y: yFor(p.value) }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return { line, target: yFor(2), lastPoint: pts[pts.length - 1] };
}

export function UkCpiPanel() {
  const [data, setData]       = useState<InflationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/data/inflation')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d: InflationPayload) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const series    = useMemo(
    () => (data?.UK ?? []).filter((p) => p.value != null).slice(-12),
    [data],
  );
  const sparkPath = useMemo(() => buildSparkline(series), [series]);

  if (loading) return <PanelLoading />;

  if (error || series.length === 0) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: 11, padding: 12, textAlign: 'center',
      }}>
        {error ? `UK CPI unavailable: ${error}` : 'No UK CPI data'}
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
        <div style={{
          fontSize: 38, fontWeight: 600, color: colour,
          lineHeight: 1, letterSpacing: '-0.02em',
        }}>
          {latest.value.toFixed(1)}
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
            UK CPI YoY &middot; {formatMonth(latest.time)}
          </div>
          {delta !== null && (
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
              {delta >= 0 ? '+' : ''}{delta.toFixed(1)} vs prior
            </div>
          )}
        </div>
      </div>

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
            aria-label="UK CPI YoY sparkline"
          >
            {/* BOE 2% target reference line */}
            <line
              x1="0" y1={sparkPath.target} x2="600" y2={sparkPath.target}
              stroke="#4aa57a" strokeDasharray="2 4" strokeWidth="0.6" opacity="0.7"
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
            <span>2% = BOE target</span>
            <span>{formatMonth(latest.time)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
