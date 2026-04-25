'use client';

/**
 * MacroCycleRoom — single-pane Members+ room for ISM PMI tracking.
 *
 * Shows: latest ISM print as a big number with regime label, MoM delta,
 * a 12-month sparkline, and a primer on the "dominoes" framework
 * (Financial Conditions → Liquidity → ISM → Risk Assets).
 *
 * Data lives in /data/ism-cycle.json on the server, populated by an admin
 * via POST /api/admin/update-ism. ISM publishes the headline number on
 * the first business day of each month. The S&P Global US Manufacturing
 * PMI is referenced as a sibling indicator with a clear caveat that it
 * is a separate survey.
 */

import { useEffect, useMemo, useState } from 'react';
import type { IsmCycleData, IsmReading } from '@/lib/macro-cycle/types';

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

type Regime = 'CONTRACTING' | 'NEUTRAL' | 'EXPANDING' | 'OVERHEATED';
type RangeKey = '12M' | '3Y' | '5Y' | 'ALL';

const RANGE_MONTHS: Record<RangeKey, number | null> = {
  '12M': 12,
  '3Y':  36,
  '5Y':  60,
  'ALL': null,
};

const RANGE_LABEL: Record<RangeKey, string> = {
  '12M': 'TRAILING 12 MONTHS',
  '3Y':  'TRAILING 3 YEARS',
  '5Y':  'TRAILING 5 YEARS',
  'ALL': 'FULL HISTORY',
};

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

export function MacroCycleRoom() {
  const [data, setData] = useState<IsmCycleData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/data/ism-cycle', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d: IsmCycleData) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(String(e)); });
    return () => { cancelled = true; };
  }, []);

  const [range, setRange] = useState<RangeKey>('12M');

  const latest: IsmReading | null = data?.readings.at(-1) ?? null;
  const prior:  IsmReading | null = data && data.readings.length > 1 ? data.readings.at(-2)! : null;
  const all = data?.readings ?? [];
  const sliceCount = RANGE_MONTHS[range];
  const series = sliceCount === null ? all : all.slice(-sliceCount);
  const regime = latest ? regimeFor(latest.value) : null;
  const delta  = latest && prior ? latest.value - prior.value : null;

  const sparkPath = useMemo(() => buildSparklinePath(series), [series]);

  return (
    <div style={{
      height: '100%', overflow: 'auto',
      backgroundColor: 'var(--bg-primary)',
      fontFamily: FONT_MONO,
      padding: '24px',
    }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {/* Header strip */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-muted)', marginBottom: 4 }}>
            SITUATION ROOM · MACRO CYCLE
          </p>
          <h1 style={{
            fontFamily: FONT_MONO, fontSize: 22, fontWeight: 600,
            color: 'var(--text-primary)', letterSpacing: '0.06em', margin: 0,
          }}>
            ISM MANUFACTURING PMI
          </h1>
          <p style={{
            fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 8, maxWidth: 620,
          }}>
            Coincident tell for cycle phase. Above 50 = US manufacturing
            expanding; below = contracting. Sits at the end of the
            &ldquo;dominoes&rdquo; chain that sets the tone for risk assets
            and crypto beta.
          </p>
        </div>

        {error && (
          <div style={{
            padding: 12, marginBottom: 16,
            border: '1px solid #c04848', background: 'rgba(192,72,72,0.08)',
            color: '#c04848', fontSize: 11,
          }}>
            Failed to load ISM data: {error}
          </div>
        )}

        {/* Reading tile */}
        {latest ? (
          <div style={{
            border: '1px solid var(--border-primary)',
            background: 'var(--bg-card)',
            padding: '24px 28px',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 64, fontWeight: 600,
                color: regime ? regimeColour(regime) : 'var(--text-primary)',
                lineHeight: 1, letterSpacing: '-0.02em',
              }}>
                {latest.value.toFixed(1)}
              </div>
              <div>
                <div style={{
                  fontSize: 11, letterSpacing: '0.18em',
                  color: regime ? regimeColour(regime) : 'var(--text-secondary)',
                  fontWeight: 600, marginBottom: 2,
                }}>
                  {regime}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {formatMonth(latest.month)}
                  {latest.note ? ` · ${latest.note}` : ''}
                </div>
                {delta !== null && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {delta >= 0 ? '+' : ''}{delta.toFixed(1)} vs prior month
                  </div>
                )}
              </div>
            </div>

            {/* Sparkline */}
            {series.length > 1 && (
              <div style={{ marginTop: 24 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 6,
                }}>
                  <div style={{
                    fontSize: 9, letterSpacing: '0.16em', color: 'var(--text-muted)',
                  }}>
                    {RANGE_LABEL[range]} · {series.length} {series.length === 1 ? 'reading' : 'readings'}
                  </div>
                  <RangeToggle value={range} onChange={setRange} available={all.length} />
                </div>
                <svg
                  viewBox="0 0 600 80"
                  preserveAspectRatio="none"
                  style={{ width: '100%', height: 80, display: 'block' }}
                  aria-label="ISM PMI sparkline"
                >
                  {/* 50 baseline */}
                  <line x1="0" y1="40" x2="600" y2="40" stroke="var(--border-subtle)" strokeDasharray="2 4" />
                  {/* Series path */}
                  <path d={sparkPath.line} fill="none" stroke={regime ? regimeColour(regime) : 'var(--accent-primary)'} strokeWidth="1.5" />
                  {/* Latest dot */}
                  {sparkPath.lastPoint && (
                    <circle cx={sparkPath.lastPoint.x} cy={sparkPath.lastPoint.y} r="3" fill={regime ? regimeColour(regime) : 'var(--accent-primary)'} />
                  )}
                </svg>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 9, color: 'var(--text-muted)', marginTop: 4,
                }}>
                  <span>{formatMonth(series[0].month)}</span>
                  <span style={{ color: 'var(--text-muted)' }}>50 = neutral</span>
                  <span>{formatMonth(latest.month)}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState seed={data?.seed ?? true} />
        )}

        {/* Framework primer */}
        <Section title="The dominoes">
          <p style={paraStyle}>
            The macro chain runs with built-in lag: <strong>Financial
            Conditions</strong> lead total liquidity by ~3 months; <strong>Liquidity</strong> leads
            ISM by ~6 months; <strong>ISM</strong> sets the tone for earnings, cyclicals,
            and crypto beta. ISM is therefore the coincident tell — by the
            time it turns, the leading edge has already moved.
          </p>
          <p style={paraStyle}>
            Hypothetical mapping to BTC: ISM into the <em>low-50s</em> is
            consistent with mid-$200K BTC; into the <em>low-60s</em> is
            materially higher. Tagged levels, not predictions.
          </p>
        </Section>

        <Section title="Counter-view">
          <p style={paraStyle}>
            Critics argue ISM is downstream of financial conditions and has
            lost predictive power: &ldquo;ISM is not the business cycle or
            the economy. It is a damn survey.&rdquo; Worth holding both
            views — ISM has missed turns before (notably 2022).
          </p>
        </Section>

        <Section title="Caveat — S&P Global US Manufacturing PMI">
          <p style={paraStyle}>
            ISM revoked FRED redistribution in 2016, so there is no free live
            feed. The <strong>S&amp;P Global US Manufacturing PMI</strong> is a
            separate monthly survey covering similar ground — historically
            ~95% correlated but <em>not</em> identical. Don&apos;t splice
            the two series; treat S&amp;P as a sibling reference only.
            ISM values shown above are entered manually on release day.
          </p>
        </Section>

        {data && (
          <div style={{
            fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.14em',
            marginTop: 24, paddingTop: 12, borderTop: '1px solid var(--border-subtle)',
          }}>
            {data.updatedAt
              ? `LAST UPDATED · ${new Date(data.updatedAt).toISOString().slice(0, 10)}`
              : 'AWAITING FIRST ADMIN ENTRY'}
          </div>
        )}
      </div>
    </div>
  );
}

const paraStyle: React.CSSProperties = {
  fontSize: 12, lineHeight: 1.7, color: 'var(--text-secondary)',
  margin: '0 0 10px',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      border: '1px solid var(--border-subtle)',
      background: 'var(--bg-card)',
      padding: '16px 20px',
      marginBottom: 14,
    }}>
      <div style={{
        fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-muted)',
        marginBottom: 8, textTransform: 'uppercase',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ seed }: { seed: boolean }) {
  return (
    <div style={{
      border: '1px dashed var(--border-subtle)',
      background: 'var(--bg-card)',
      padding: '28px 28px',
      marginBottom: 20,
    }}>
      <div style={{
        fontSize: 11, letterSpacing: '0.18em', color: 'var(--text-muted)', marginBottom: 8,
      }}>
        AWAITING FIRST READING
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 12px' }}>
        ISM Manufacturing PMI publishes on the first business day of each
        month. Once the first value is entered, it appears here.
      </p>
      {seed && (
        <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
          Admin: <code>POST /api/admin/update-ism</code> with{' '}
          <code>{`{ "month": "YYYY-MM", "value": 48.3 }`}</code>.
        </p>
      )}
    </div>
  );
}

function RangeToggle({
  value,
  onChange,
  available,
}: {
  value: RangeKey;
  onChange: (k: RangeKey) => void;
  available: number;
}) {
  // Only show ranges that have at least some data behind them.
  const visible: RangeKey[] = (['12M', '3Y', '5Y', 'ALL'] as RangeKey[]).filter((k) => {
    const n = RANGE_MONTHS[k];
    return n === null ? available > 12 : available >= 1;
  });

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {visible.map((k) => {
        const active = k === value;
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            style={{
              padding: '3px 8px',
              fontSize: 9,
              fontFamily: FONT_MONO,
              letterSpacing: '0.08em',
              background: active ? 'var(--accent-primary)' : 'transparent',
              color: active ? 'var(--bg-primary)' : 'var(--text-muted)',
              border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
            }}
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}

// ── Sparkline geometry ──────────────────────────────────────────────────────

interface SparkPath {
  line: string;
  lastPoint: { x: number; y: number } | null;
}

function buildSparklinePath(readings: IsmReading[]): SparkPath {
  if (readings.length < 2) return { line: '', lastPoint: null };

  const W = 600;
  const H = 80;
  // Fixed scale around 50 so the baseline sits visibly mid-chart.
  const min = Math.min(40, ...readings.map((r) => r.value));
  const max = Math.max(60, ...readings.map((r) => r.value));
  const span = max - min || 1;

  const pts = readings.map((r, i) => {
    const x = (i / (readings.length - 1)) * W;
    const y = H - ((r.value - min) / span) * H;
    return { x, y };
  });

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return { line, lastPoint: pts[pts.length - 1] };
}
