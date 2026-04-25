'use client';

/**
 * GlobalLiquidityRoom — Members+ tool tracking global M2 liquidity
 * shifted forward 84 days as a leading indicator for BTC.
 *
 * Composite is built server-side from FRED (US M2 absolute, EU/UK/JP M3
 * MoM growth compounded), equal-weighted and indexed to 100 at the
 * window start. China is omitted — no free-tier source for absolute or
 * growth-rate M2 data we can rely on. The 21-country FinFluential Pine
 * indicator is the visual reference; this is the major-four version.
 *
 * BTC daily series joins from our local CSV+DB history. Chart shifts
 * the liquidity composite forward by 84 days so its turning points
 * align with where BTC is supposed to follow.
 */

import { useEffect, useState } from 'react';
import { LiquidityChart } from './LiquidityChart';

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface BtcPoint { date: string; price: number }
interface IdxPoint { date: string; value: number }

interface ApiPayload {
  btc:        BtcPoint[];
  composite:  IdxPoint[];
  regions:    Record<string, IdxPoint[]>;
  leadDays:   number;
  updatedAt:  string;
  windowFrom: string;
}

interface RegionGroup { region: string; members: string[] }

const REGION_GROUPS: RegionGroup[] = [
  { region: 'United States', members: ['US M2 (FRED · M2SL · USD billions, monthly SA)'] },
  { region: 'Eurozone',      members: ['EU M3 (FRED · MABMM301EZM657S · MoM growth %)'] },
  { region: 'United Kingdom',members: ['UK M3 (FRED · MABMM301GBM657S · MoM growth %)'] },
  { region: 'Japan',         members: ['JP M3 (FRED · MABMM301JPM657S · MoM growth %)'] },
];

export function GlobalLiquidityRoom() {
  const [data, setData]   = useState<ApiPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/data/global-liquidity', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d: ApiPayload) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(String(e)); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{
      height: '100%', overflow: 'auto',
      backgroundColor: 'var(--bg-primary)',
      fontFamily: FONT_MONO,
      padding: '24px',
    }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        {/* Header strip */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-muted)', marginBottom: 4 }}>
            SITUATION ROOM · MACRO LIQUIDITY
          </p>
          <h1 style={{
            fontFamily: FONT_MONO, fontSize: 22, fontWeight: 600,
            color: 'var(--text-primary)', letterSpacing: '0.06em', margin: 0,
          }}>
            GLOBAL LIQUIDITY · 84-DAY LEAD
          </h1>
          <p style={{
            fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 8, maxWidth: 660,
          }}>
            Equal-weighted M2 composite across the four major reserve
            currencies — US, Eurozone, UK, Japan — indexed to 100 at the
            window start and plotted shifted forward 12 weeks. BTC tends
            to follow the curve with a lag: liquidity moves first, risk
            assets after.
          </p>
        </div>

        {/* Chart tile */}
        <div style={{
          border: '1px solid var(--border-primary)',
          background: 'var(--bg-card)',
          padding: '16px 20px',
          marginBottom: 20,
        }}>
          {error && (
            <div style={{
              padding: 12, marginBottom: 12,
              border: '1px solid #c04848', background: 'rgba(192,72,72,0.08)',
              color: '#c04848', fontSize: 11,
            }}>
              Failed to load liquidity data: {error}
            </div>
          )}
          {!data && !error && (
            <div style={{
              padding: '60px 0', textAlign: 'center',
              fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.14em',
            }}>
              LOADING LIQUIDITY DATA...
            </div>
          )}
          {data && (
            <LiquidityChart
              btc={data.btc}
              composite={data.composite}
              leadDays={data.leadDays}
            />
          )}
        </div>

        <Section title="Why 84 days?">
          <p style={paraStyle}>
            Liquidity doesn&apos;t hit BTC the day a central bank prints.
            It flows through bank reserves, into duration, into equities,
            and only then spills into the risk-on tail where Bitcoin
            lives. That transmission lag has historically averaged around
            twelve weeks on this composite — long enough to be useful,
            short enough to still rhyme with the next move.
          </p>
          <p style={paraStyle}>
            The 84-day offset is a fitted convenience, not a law. It has
            been shorter (2020, when policy was crude and direct) and
            longer (2022, when QT crushed the relationship outright).
            Treat it as a working hypothesis: <em>if</em> the lag holds,
            the curve shows where BTC is roughly headed; when BTC diverges
            persistently, the lag is what&apos;s breaking.
          </p>
        </Section>

        <Section title="What goes into the composite">
          <p style={paraStyle}>
            Four monetary aggregates, all sourced from FRED — free, no
            paid feed, refreshes daily. US M2 is taken absolute; the
            other three use FRED&apos;s month-on-month broad-money growth
            rates compounded from a base of 100. All four are indexed
            and equal-weighted, so the composite measures relative
            change, not absolute USD trillions.
          </p>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 12, marginTop: 8,
          }}>
            {REGION_GROUPS.map((g) => (
              <div key={g.region} style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-primary)',
                padding: '8px 12px',
              }}>
                <div style={{
                  fontSize: 9, letterSpacing: '0.16em', color: 'var(--text-muted)',
                  marginBottom: 4, textTransform: 'uppercase',
                }}>
                  {g.region}
                </div>
                <div style={{
                  fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.5,
                }}>
                  {g.members.join(' · ')}
                </div>
              </div>
            ))}
          </div>
          <p style={{ ...paraStyle, fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
            Excluded: China, India, the smaller Asian and EM economies in
            the FinFluential 21-country indicator. Free-tier APIs do not
            cover them with data we&apos;d trust enough to ship. The
            major four still capture the bulk of dollar-equivalent global
            broad money and most of the policy-cycle signal.
          </p>
        </Section>

        <Section title="Counter-view">
          <p style={paraStyle}>
            Critics will point out three things. First: any composite
            that omits China loses a chunk of the FinFluential
            indicator&apos;s shape — China&apos;s M2 is enormous and
            cycles on its own credit policy. Second: the 84-day lead is
            curve-fitted; a different historical window picks a different
            optimum. Third: when policy regimes shift hard (QT, war,
            capital controls), the lag stretches or breaks until the new
            normal beds in.
          </p>
          <p style={paraStyle}>
            None of which makes the chart useless — it just means use it
            as one tell among several, not a price oracle.
          </p>
        </Section>

        <Section title="How this pairs with the dominoes">
          <p style={paraStyle}>
            Macro Cycle (ISM PMI) is the <em>coincident</em> tell — by
            the time it turns, the leading edge has already moved. Global
            Liquidity is the leading edge. Read them in that order:
            liquidity flips first → financial conditions ease → ISM
            follows → cyclicals and BTC ride the same wave with
            progressively more lag and more amplitude.
          </p>
        </Section>

        {data && (
          <div style={{
            fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.14em',
            marginTop: 24, paddingTop: 12, borderTop: '1px solid var(--border-subtle)',
            lineHeight: 1.7,
          }}>
            DATA · FRED (US M2 + EU/UK/JP M3 GROWTH) &nbsp;·&nbsp; BTC · LOCAL DAILY HISTORY
            <br />
            UPDATED · {new Date(data.updatedAt).toISOString().slice(0, 16).replace('T', ' ')} UTC
            &nbsp;·&nbsp; WINDOW FROM {data.windowFrom}
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
