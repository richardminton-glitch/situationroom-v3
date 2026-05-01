'use client';

/**
 * RealYieldsRoom — Members+ tool tracking the 10-year real yield (DFII10)
 * against BTC. The thesis: bull cycles cluster in the green band (real
 * yield < 0). The headline stat quantifies the claim — what share of
 * BTC's lifetime cumulative return has accrued during negative-yield days.
 *
 * Pairs with Macro Cycle (PMI) and Global Liquidity (M2 +84d) as the third
 * macro deep-dive in the dominoes framework.
 */

import { useEffect, useState } from 'react';
import { RealYieldsChart } from './RealYieldsChart';

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface BtcPoint   { date: string; price: number }
interface YieldPoint { date: string; value: number }

interface Stats {
  totalDays:                number;
  daysNegativeYield:        number;
  shareDaysNegative:        number;
  shareReturnNegative:      number;
  totalReturnPct:           number;
  returnDuringNegativePct:  number;
  windowFrom:               string;
  windowTo:                 string;
}

interface ApiPayload {
  realYield:  YieldPoint[];
  btc:        BtcPoint[];
  latest:     YieldPoint | null;
  stats:      Stats;
  updatedAt:  string;
  windowFrom: string;
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

function regimeBlurb(r: Regime): string {
  switch (r) {
    case 'NEGATIVE':
      return 'Cash and short-duration bonds lose to inflation. Capital is forced up the risk curve. Historically the regime in which BTC has earned the bulk of its return.';
    case 'NEUTRAL':
      return 'Real yield positive but modest. Dollar holders are roughly even with inflation. Risk assets neither pushed nor punished by the rate side.';
    case 'RESTRICTIVE':
      return 'Real yield meaningfully positive. Cash beats inflation comfortably; long-duration risk assets face a headwind from the discount-rate side.';
  }
}

function formatDate(date: string): string {
  const d = new Date(date + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function RealYieldsRoom() {
  const [data, setData]   = useState<ApiPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/data/real-yields', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d: ApiPayload) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(String(e)); });
    return () => { cancelled = true; };
  }, []);

  const latest = data?.latest ?? null;
  const regime = latest ? regimeFor(latest.value) : null;
  const colour = regime ? regimeColour(regime) : 'var(--text-primary)';

  return (
    <div style={{
      height: '100%', overflow: 'auto',
      backgroundColor: 'var(--bg-primary)',
      fontFamily: FONT_MONO,
      padding: '24px',
    }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-muted)', marginBottom: 4 }}>
            SITUATION ROOM &middot; MACRO REAL RATES
          </p>
          <h1 style={{
            fontFamily: FONT_MONO, fontSize: 22, fontWeight: 600,
            color: 'var(--text-primary)', letterSpacing: '0.06em', margin: 0,
          }}>
            REAL YIELDS &middot; BITCOIN RETURNS
          </h1>
          <p style={{
            fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 8, maxWidth: 660,
          }}>
            10-year US Treasury Inflation-Protected Securities yield (FRED
            DFII10) against BTC since 2010. Below the zero line, holding
            cash loses to inflation. The shaded band is where Bitcoin has
            historically earned its return.
          </p>
        </div>

        {error && (
          <div style={{
            padding: 12, marginBottom: 16,
            border: '1px solid #c04848', background: 'rgba(192,72,72,0.08)',
            color: '#c04848', fontSize: 11,
          }}>
            Failed to load real-yield data: {error}
          </div>
        )}

        {/* Reading tile */}
        {latest && (
          <div style={{
            border: '1px solid var(--border-primary)',
            background: 'var(--bg-card)',
            padding: '24px 28px',
            marginBottom: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 64, fontWeight: 600,
                color: colour, lineHeight: 1, letterSpacing: '-0.02em',
              }}>
                {latest.value >= 0 ? '+' : ''}{latest.value.toFixed(2)}
                <span style={{ fontSize: 22, marginLeft: 4, color: 'var(--text-muted)', fontWeight: 400 }}>
                  %
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{
                  fontSize: 11, letterSpacing: '0.18em', color: colour,
                  fontWeight: 600, marginBottom: 2,
                }}>
                  {regime}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {formatDate(latest.date)} &middot; FRED DFII10
                </div>
              </div>
            </div>
            {regime && (
              <p style={{
                fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
                marginTop: 14, marginBottom: 0, maxWidth: 720,
              }}>
                {regimeBlurb(regime)}
              </p>
            )}
          </div>
        )}

        {/* Headline stat strip */}
        {data && data.stats.totalDays > 0 && (
          <div style={{
            border: '1px solid var(--border-primary)',
            background: 'var(--bg-card)',
            padding: '20px 24px',
            marginBottom: 20,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 18,
          }}>
            <Stat
              label="BTC Return During Negative Real Yields"
              value={`${(data.stats.shareReturnNegative * 100).toFixed(1)}%`}
              hint="of cumulative log return, prior-day yield basis"
              accent="#4aa57a"
            />
            <Stat
              label="Days With Negative Real Yields"
              value={`${(data.stats.shareDaysNegative * 100).toFixed(1)}%`}
              hint={`${data.stats.daysNegativeYield.toLocaleString()} of ${data.stats.totalDays.toLocaleString()} BTC trading days`}
            />
            <Stat
              label="Total BTC Return"
              value={`${data.stats.totalReturnPct >= 0 ? '+' : ''}${data.stats.totalReturnPct >= 1000 ? Math.round(data.stats.totalReturnPct).toLocaleString() : data.stats.totalReturnPct.toFixed(0)}%`}
              hint={`${data.stats.windowFrom} → ${data.stats.windowTo}`}
            />
          </div>
        )}

        {/* Chart tile */}
        <div style={{
          border: '1px solid var(--border-primary)',
          background: 'var(--bg-card)',
          padding: '16px 20px',
          marginBottom: 20,
        }}>
          {!data && !error && (
            <div style={{
              padding: '60px 0', textAlign: 'center',
              fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.14em',
            }}>
              LOADING REAL-YIELD DATA...
            </div>
          )}
          {data && (
            <RealYieldsChart btc={data.btc} realYield={data.realYield} />
          )}
        </div>

        <Section title="Why this matters">
          <p style={paraStyle}>
            The real yield is what cash actually earns after inflation eats
            its lunch. When it&apos;s negative, the dollar in your account
            quietly loses purchasing power every day you hold it &mdash;
            and the entire risk curve gets a tailwind, because investors
            cannot afford to sit still. When it&apos;s positive, holding
            short-duration Treasuries is genuinely paying you to wait, and
            the long-duration risk-on tail where Bitcoin lives gets squeezed.
          </p>
          <p style={paraStyle}>
            The chart above shows the entire era of measurable BTC returns
            against the 10-year TIPS yield. The shaded green band marks
            where real yields are below zero. Visual inspection alone is
            instructive &mdash; the bull phases of every cycle largely
            overlap with the band.
          </p>
        </Section>

        <Section title="The headline stat, methodology">
          <p style={paraStyle}>
            We pair each day&apos;s BTC log-return with the <em>prior</em>
            day&apos;s real yield (no lookahead). Sum the daily log
            returns earned on days that followed a negative-yield reading;
            divide by the total. That&apos;s the share of BTC&apos;s
            lifetime cumulative return that has accrued during the
            negative-yield regime &mdash; reported above.
          </p>
          <p style={paraStyle}>
            The number isn&apos;t exactly &ldquo;100%&rdquo; in any
            mechanical sense, and shouldn&apos;t be: BTC has had positive
            days during positive-yield periods, and negative days during
            negative-yield periods. What the stat captures is the
            structural skew &mdash; the regime in which the cumulative
            return has compounded.
          </p>
        </Section>

        <Section title="What real yields are not">
          <p style={paraStyle}>
            Real yields are not the same as the policy rate, the nominal
            10-year, or the inflation print. They are the nominal yield on
            a TIPS bond, which is itself the residual after the market
            prices in expected inflation over the bond&apos;s life. Two
            things move them: nominal rate expectations (the Fed&apos;s
            path), and inflation expectations (breakevens). When the Fed
            hikes faster than inflation rises, real yields go up; when
            inflation rises faster than the Fed will hike, they fall.
          </p>
        </Section>

        <Section title="Counter-view">
          <p style={paraStyle}>
            Two reasonable objections. First: BTC&apos;s entire price
            history happens to coincide with one of the longest negative
            real-yield regimes in modern monetary history. Of course
            most of the return came during negative yields &mdash; that
            was most of the sample. The stat is descriptive, not
            predictive: it doesn&apos;t prove BTC <em>requires</em>
            negative yields, only that it has thrived in them.
          </p>
          <p style={paraStyle}>
            Second: real yields measure US Treasury holders&apos; problem,
            not the global one. A holder in sterling, yen, or any number of
            EM currencies faces a different real-rate environment. The 10y
            TIPS yield is a good <em>proxy</em> for the global cost of
            patience, but it isn&apos;t the only one.
          </p>
        </Section>

        <Section title="How this pairs with the dominoes">
          <p style={paraStyle}>
            Real yields sit one step downstream of policy. Read the chain:
            policy expectations &amp; inflation breakevens move first;
            real yields adjust; financial conditions follow; liquidity
            (Global Liquidity tool) leads; ISM (Macro Cycle tool) becomes
            coincident; risk assets ride the wave with progressively more
            lag and more amplitude. Real yields are the cleanest single
            number for &ldquo;what is the cost of patience right now,&rdquo;
            and Bitcoin is one of the most patience-sensitive assets in the
            book.
          </p>
        </Section>

        {data && (
          <div style={{
            fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.14em',
            marginTop: 24, paddingTop: 12, borderTop: '1px solid var(--border-subtle)',
            lineHeight: 1.7,
          }}>
            DATA &middot; FRED DFII10 (10Y TIPS YIELD) &nbsp;&middot;&nbsp; BTC &middot; LOCAL DAILY HISTORY
            <br />
            UPDATED &middot; {new Date(data.updatedAt).toISOString().slice(0, 16).replace('T', ' ')} UTC
            &nbsp;&middot;&nbsp; WINDOW FROM {data.windowFrom}
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

function Stat({
  label, value, hint, accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div>
      <div style={{
        fontSize: 9, letterSpacing: '0.16em', color: 'var(--text-muted)',
        marginBottom: 6, textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 26, fontWeight: 600, lineHeight: 1,
        color: accent ?? 'var(--text-primary)', letterSpacing: '-0.01em',
      }}>
        {value}
      </div>
      {hint && (
        <div style={{
          fontSize: 9, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5,
        }}>
          {hint}
        </div>
      )}
    </div>
  );
}
