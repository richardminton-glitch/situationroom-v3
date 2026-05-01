'use client';

/**
 * PowerLawPanel — small dashboard widget showing the Bitcoin Power Law
 * channel position. Hero number is the channel % (0% support, 100%
 * resistance). Sparkline shows position over the trailing 12 months,
 * with cheap (<33%) and expensive (>66%) bands shaded.
 *
 * Reuses /api/data/power-law (24h cache). The deep-dive page consumes
 * the full payload; here we only need the model + last ~365 BTC days.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PanelLoading } from './shared';

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface BtcPoint { date: string; price: number }
interface Model {
  alpha:        number;
  beta:         number;
  cMin:         number;
  cMax:         number;
  genesisDate:  string;
}
interface Current {
  date:               string;
  price:              number;
  channelPosition:    number;
  median:             number;
  daysFromFairValue:  number;
}
interface ApiPayload {
  btc:     BtcPoint[];
  model:   Model;
  current: Current;
}

type Regime = 'CHEAP' | 'FAIR' | 'EXPENSIVE';

function regimeFor(pos: number): Regime {
  if (pos < 0.33) return 'CHEAP';
  if (pos < 0.66) return 'FAIR';
  return 'EXPENSIVE';
}

function regimeColour(r: Regime): string {
  switch (r) {
    case 'CHEAP':     return '#4aa57a';
    case 'FAIR':      return '#d68a3c';
    case 'EXPENSIVE': return '#c04848';
  }
}

const ONE_DAY_MS = 86_400_000;

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + 'T00:00:00Z').getTime();
  const b = new Date(toIso   + 'T00:00:00Z').getTime();
  return Math.round((b - a) / ONE_DAY_MS);
}

function buildSparkSeries(btc: BtcPoint[], model: Model): { date: string; pos: number }[] {
  const span = model.cMax - model.cMin;
  if (span === 0) return [];
  const cutoff = Date.now() - 365 * ONE_DAY_MS;
  return btc
    .filter((p) => new Date(p.date + 'T00:00:00Z').getTime() >= cutoff && p.price > 0)
    .map((p) => {
      const d = Math.max(1, daysBetween(model.genesisDate, p.date));
      const yPred = model.alpha + model.beta * Math.log10(d);
      const residual = Math.log10(p.price) - yPred;
      const pos = Math.max(0, Math.min(1, (residual - model.cMin) / span));
      return { date: p.date, pos };
    });
}

function formatPrice(p: number): string {
  if (p >= 1_000_000) return '$' + (p / 1_000_000).toFixed(2) + 'M';
  if (p >= 1_000)     return '$' + Math.round(p).toLocaleString();
  if (p >= 1)         return '$' + p.toFixed(2);
  return '$' + p.toFixed(4);
}

export function PowerLawPanel() {
  const [data, setData]       = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/data/power-law')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d: ApiPayload) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const sparkSeries = useMemo(
    () => data ? buildSparkSeries(data.btc, data.model) : [],
    [data]
  );

  if (loading) return <PanelLoading />;

  if (error || !data || !data.current || sparkSeries.length === 0) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: 11, padding: 12, textAlign: 'center',
      }}>
        {error ? `Power-law unavailable: ${error}` : 'No power-law data'}
      </div>
    );
  }

  const cur    = data.current;
  const regime = regimeFor(cur.channelPosition);
  const colour = regimeColour(regime);

  // Build sparkline geometry
  const W = 600, H = 56;
  const xFor = (i: number) => (i / (sparkSeries.length - 1 || 1)) * W;
  const yFor = (pos: number) => H - pos * H;
  const linePoints = sparkSeries.map((p, i) => ({ x: xFor(i), y: yFor(p.pos) }));
  const linePath   = linePoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const lastPoint  = linePoints[linePoints.length - 1];
  const yCheapTop  = yFor(0.33);
  const yExpTop    = yFor(1.0);
  const yExpBot    = yFor(0.66);

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
          {(cur.channelPosition * 100).toFixed(0)}
          <span style={{ fontSize: 14, marginLeft: 4, color: 'var(--text-muted)', fontWeight: 400 }}>
            %
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 110 }}>
          <div style={{
            fontSize: 10, letterSpacing: '0.18em', color: colour,
            fontWeight: 600, marginBottom: 2,
          }}>
            {regime}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Channel position
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
            Fair {formatPrice(cur.median)}
          </div>
        </div>
      </div>

      {/* Sparkline */}
      <div style={{ flex: 1, minHeight: 50, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          fontSize: 8, letterSpacing: '0.16em', color: 'var(--text-muted)',
          marginBottom: 4,
        }}>
          TRAILING 12 MONTHS
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ width: '100%', flex: 1, minHeight: 38, display: 'block' }}
          aria-label="Power-law channel position sparkline"
        >
          {/* Cheap band */}
          <rect x="0" y={yCheapTop} width={W} height={H - yCheapTop}
                fill="#4aa57a" fillOpacity={0.12} />
          {/* Expensive band */}
          <rect x="0" y={yExpTop} width={W} height={yExpBot - yExpTop}
                fill="#c04848" fillOpacity={0.12} />
          {/* Median (50%) line */}
          <line x1="0" y1={yFor(0.5)} x2={W} y2={yFor(0.5)}
                stroke="var(--text-muted)" strokeDasharray="2 4" strokeWidth="0.5" />
          <path d={linePath} fill="none" stroke={colour} strokeWidth="1.5" />
          {lastPoint && (
            <circle cx={lastPoint.x} cy={lastPoint.y} r="3" fill={colour} />
          )}
        </svg>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 8, color: 'var(--text-muted)', marginTop: 2,
        }}>
          <span>{sparkSeries[0].date}</span>
          <span>50% = fair value</span>
          <span>{cur.date}</span>
        </div>
      </div>

      {/* Footer link to deep-dive */}
      <Link
        href="/tools/power-law"
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
