'use client';

/**
 * PowerLawRoom — Bitcoin Power Law deep-dive page.
 *
 * Hero: log-log chart of BTC price vs days-since-genesis with median /
 * support / resistance bands (the visual that defines the Santostasi
 * model). Companion: channel position (0-100%) over time, the
 * cycle-position projection. Headline stats quantify where we sit:
 * channel %, fair-value price today, BTC's days from fair value.
 */

import { useEffect, useState } from 'react';
import { PowerLawChart } from './PowerLawChart';
import { ChannelPositionChart } from './ChannelPositionChart';

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface BtcPoint { date: string; price: number }

interface Model {
  alpha:        number;
  beta:         number;
  cMin:         number;
  cMax:         number;
  genesisDate:  string;
  fitFromDate:  string;
  fitToDate:    string;
  fitNDays:     number;
  rSquared:     number;
}

interface Current {
  date:               string;
  price:              number;
  daysSinceGenesis:   number;
  median:             number;
  support:            number;
  resistance:         number;
  channelPosition:    number;
  daysFromFairValue:  number;
  fairValueDate:      string;
}

interface ApiPayload {
  btc:        BtcPoint[];
  model:      Model;
  current:    Current;
  updatedAt:  string;
}

type Regime = 'CHEAP' | 'FAIR' | 'EXPENSIVE';

function regimeFor(channelPos: number): Regime {
  if (channelPos < 0.33) return 'CHEAP';
  if (channelPos < 0.66) return 'FAIR';
  return 'EXPENSIVE';
}

function regimeColour(r: Regime): string {
  switch (r) {
    case 'CHEAP':     return '#4aa57a';
    case 'FAIR':      return '#d68a3c';
    case 'EXPENSIVE': return '#c04848';
  }
}

function regimeBlurb(r: Regime): string {
  switch (r) {
    case 'CHEAP':
      return 'Price sits in the lower third of the log-log channel — historically the regime in which patient accumulation has been most rewarded by the next cycle. Cycle bottoms cluster here.';
    case 'FAIR':
      return 'Price sits near the median trendline. Neither materially undervalued nor overvalued in power-law terms — the model neither beckons nor warns.';
    case 'EXPENSIVE':
      return 'Price sits in the upper third of the channel — historically the regime in which prior bull cycles have peaked and reversed. The model says: tread carefully.';
  }
}

function formatDate(date: string): string {
  const d = new Date(date + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPrice(p: number): string {
  if (p >= 1_000_000) return '$' + (p / 1_000_000).toFixed(2) + 'M';
  if (p >= 1_000)     return '$' + Math.round(p).toLocaleString();
  if (p >= 1)         return '$' + p.toFixed(2);
  return '$' + p.toFixed(4);
}

export function PowerLawRoom() {
  const [data, setData]   = useState<ApiPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/data/power-law', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d: ApiPayload) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(String(e)); });
    return () => { cancelled = true; };
  }, []);

  const cur    = data?.current ?? null;
  const regime = cur ? regimeFor(cur.channelPosition) : null;
  const colour = regime ? regimeColour(regime) : 'var(--text-primary)';

  return (
    <div style={{
      height: '100%', overflow: 'auto',
      backgroundColor: 'var(--bg-primary)',
      fontFamily: FONT_MONO,
      padding: '24px',
    }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-muted)', marginBottom: 4 }}>
            SITUATION ROOM &middot; BITCOIN MODELS
          </p>
          <h1 style={{
            fontFamily: FONT_MONO, fontSize: 22, fontWeight: 600,
            color: 'var(--text-primary)', letterSpacing: '0.06em', margin: 0,
          }}>
            BITCOIN POWER LAW
          </h1>
          <p style={{
            fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 8, maxWidth: 720,
          }}>
            BTC price plotted against days since the genesis block on log-log
            axes. The straight-line fit is the canonical Santostasi power
            law: <em>price</em> = A &middot; <em>days</em><sup>β</sup>. The
            channel envelopes the entire price history — every cycle bottom
            sits near the lower band, every cycle top near the upper.
          </p>
        </div>

        {error && (
          <div style={{
            padding: 12, marginBottom: 16,
            border: '1px solid #c04848', background: 'rgba(192,72,72,0.08)',
            color: '#c04848', fontSize: 11,
          }}>
            Failed to load power-law data: {error}
          </div>
        )}

        {/* Reading tile */}
        {cur && (
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
                {(cur.channelPosition * 100).toFixed(0)}
                <span style={{ fontSize: 22, marginLeft: 4, color: 'var(--text-muted)', fontWeight: 400 }}>
                  %
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{
                  fontSize: 11, letterSpacing: '0.18em', color: colour,
                  fontWeight: 600, marginBottom: 2,
                }}>
                  {regime} &middot; CHANNEL POSITION
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {formatDate(cur.date)} &middot; BTC {formatPrice(cur.price)}
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
        {data && cur && (
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
              label="Power-Law Fair Value"
              value={formatPrice(cur.median)}
              hint={`median fit on ${formatDate(cur.date)}`}
              accent="#d68a3c"
            />
            <Stat
              label="Support · Resistance"
              value={`${formatPrice(cur.support)} → ${formatPrice(cur.resistance)}`}
              hint="lower / upper channel today"
            />
            <Stat
              label="Days From Fair Value"
              value={
                cur.daysFromFairValue >= 0
                  ? `+${Math.round(cur.daysFromFairValue).toLocaleString()}d`
                  : `${Math.round(cur.daysFromFairValue).toLocaleString()}d`
              }
              hint={
                cur.daysFromFairValue >= 0
                  ? `model price level reached ${Math.round(cur.daysFromFairValue)}d ago`
                  : `model says we should be here in ${Math.abs(Math.round(cur.daysFromFairValue))}d`
              }
              accent={cur.daysFromFairValue >= 0 ? '#4aa57a' : '#c04848'}
            />
            <Stat
              label="Power Exponent · β"
              value={data.model.beta.toFixed(3)}
              hint={`R² = ${data.model.rSquared.toFixed(4)} · n = ${data.model.fitNDays.toLocaleString()}d`}
            />
          </div>
        )}

        {/* Log-log chart tile */}
        <div style={{
          border: '1px solid var(--border-primary)',
          background: 'var(--bg-card)',
          padding: '16px 20px',
          marginBottom: 14,
        }}>
          {!data && !error && (
            <div style={{
              padding: '60px 0', textAlign: 'center',
              fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.14em',
            }}>
              LOADING POWER-LAW MODEL...
            </div>
          )}
          {data && (
            <PowerLawChart btc={data.btc} model={data.model} />
          )}
        </div>

        {/* Channel position chart tile */}
        {data && (
          <div style={{
            border: '1px solid var(--border-primary)',
            background: 'var(--bg-card)',
            padding: '16px 20px',
            marginBottom: 20,
          }}>
            <ChannelPositionChart btc={data.btc} model={data.model} />
          </div>
        )}

        <Section title="What the model says">
          <p style={paraStyle}>
            Bitcoin&apos;s entire price history &mdash; nearly fifteen years
            of data spanning six orders of magnitude &mdash; is well-fit by
            a simple equation: price scales with time since genesis raised
            to a power of roughly 5.7. On log-log axes, that&apos;s a
            straight line. Every cycle, every drawdown, every parabolic
            blow-off sits inside a remarkably tight channel.
          </p>
          <p style={paraStyle}>
            The thesis is Giovanni Santostasi&apos;s, laid out in detail
            here &mdash; <a
              href="https://giovannisantostasi.medium.com/the-bitcoin-power-law-theory-962dfaf99ee9"
              target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
              The Bitcoin Power Law Theory
            </a>. He argues this isn&apos;t coincidence. Power laws emerge
            from network-effect dynamics &mdash; adoption begets security
            begets adoption &mdash; and the exponent is set by the
            structural feedback loops, not by any individual cycle.
          </p>
        </Section>

        <Section title="How to read the channel">
          <p style={paraStyle}>
            The green line is the regression fit &mdash; the median or
            &ldquo;fair value&rdquo; trajectory. The red and purple lines
            are parallel offsets in log space, anchored to the historical
            extremes of the residuals. They form a channel that contains
            every BTC daily close to date.
          </p>
          <p style={paraStyle}>
            Channel position &mdash; the headline percentage above &mdash;
            measures where today&apos;s log-price sits between the support
            and resistance lines. Sub-33% has historically marked
            generational accumulation zones; over 66% has historically
            marked late-cycle euphoria. The middle band is &ldquo;the
            model has nothing useful to tell you right now.&rdquo;
          </p>
        </Section>

        <Section title="Methodology">
          <p style={paraStyle}>
            We pull the full BTC daily history (CoinGecko + local CSV
            seed). For each day we compute days-since-genesis from
            2009-01-03. We then fit log<sub>10</sub>(price) = α + β
            &middot; log<sub>10</sub>(days) by ordinary least squares. The
            residuals &mdash; daily distance above or below the fit
            &mdash; have a maximum and a minimum: those become the
            resistance and support offsets, in log space.
          </p>
          <p style={paraStyle}>
            The model refits whenever the cache expires (24h). New
            all-time highs widen the resistance band; new lows widen
            support. The fit is therefore <em>descriptive</em> of the
            data we have, not a static line drawn in 2018.
          </p>
        </Section>

        <Section title="Counter-view">
          <p style={paraStyle}>
            Two reasonable objections. First &mdash; power-law fits are
            seductive on log-log axes. Almost any monotonically
            increasing time series can be made to look linear with
            enough zoom. The relevant test isn&apos;t whether the line
            fits, it&apos;s whether the residuals stay tight as the
            sample grows. Bitcoin&apos;s have, so far. Whether they
            continue to is the open question.
          </p>
          <p style={paraStyle}>
            Second &mdash; the model is silent on time. It tells you
            where price <em>has been</em> in channel terms, not when the
            next move happens. A reading of 25% can persist for a year
            or for a week; the model gives you no schedule. Pair it
            with cycle-timing tells (halving, liquidity, real yields)
            rather than treating it as a standalone trade trigger.
          </p>
        </Section>

        <Section title="How this pairs with the dominoes">
          <p style={paraStyle}>
            The Power Law is the most patient of all our tools &mdash;
            it speaks in years and orders of magnitude. The DCA Signal
            and the Cycle Gauge are the impatient ones, looking for
            mean-reversion entries. Real Yields and Global Liquidity
            are the macro context. Read the Power Law to know <em>where
            in the channel you are</em>; read the others to know
            <em> what to do about it now</em>.
          </p>
        </Section>

        {data && (
          <div style={{
            fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.14em',
            marginTop: 24, paddingTop: 12, borderTop: '1px solid var(--border-subtle)',
            lineHeight: 1.7,
          }}>
            DATA &middot; BTC DAILY HISTORY (LOCAL) &nbsp;&middot;&nbsp; MODEL &middot; OLS LOG-LOG FIT
            <br />
            UPDATED &middot; {new Date(data.updatedAt).toISOString().slice(0, 16).replace('T', ' ')} UTC
            &nbsp;&middot;&nbsp; FIT WINDOW {data.model.fitFromDate} → {data.model.fitToDate}
            <br />
            REFERENCE &middot;{' '}
            <a
              href="https://giovannisantostasi.medium.com/the-bitcoin-power-law-theory-962dfaf99ee9"
              target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>
              GIOVANNI SANTOSTASI &middot; THE BITCOIN POWER LAW THEORY
            </a>
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
        fontSize: 22, fontWeight: 600, lineHeight: 1.1,
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
