'use client';

/**
 * CashIsaRoom — UK Cash ISA real-returns deep-dive.
 *
 * Shows a saver who maxes out their Cash ISA every year since 1999/00 and
 * how their pot has fared against four reference benchmarks: CPI, RPI, M4
 * broad money, and the S&P 500 (GBP-converted total return).
 *
 * The headline reading is the *real* loss: the gap between the Cash ISA pot
 * and what you'd need to merely hold purchasing power, even with every
 * penny of interest tax-free.
 */

import { useEffect, useState } from 'react';
import { CashIsaChart } from './CashIsaChart';
import type { CashIsaPayload } from '@/lib/data/uk-cash-isa';

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

function fmtCurrency(n: number): string {
  const sign = n < 0 ? '−' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}£${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${sign}£${Math.round(abs).toLocaleString()}`;
  return `${sign}£${abs.toFixed(0)}`;
}

function fmtPct(n: number): string {
  const sign = n < 0 ? '−' : '+';
  return `${sign}${(Math.abs(n) * 100).toFixed(1)}%`;
}

export function CashIsaRoom() {
  const [data,  setData]  = useState<CashIsaPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/data/cash-isa', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d: CashIsaPayload) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(String(e)); });
    return () => { cancelled = true; };
  }, []);

  const sum = data?.summary ?? null;

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
            SITUATION ROOM &middot; UK PERSONAL FINANCE
          </p>
          <h1 style={{
            fontFamily: FONT_MONO, fontSize: 22, fontWeight: 600,
            color: 'var(--text-primary)', letterSpacing: '0.06em', margin: 0,
          }}>
            CASH ISA &mdash; REAL RETURNS SINCE 1999
          </h1>
          <p style={{
            fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 8, maxWidth: 720,
          }}>
            A saver who maxes out their Cash ISA every tax year since launch
            in April 1999. Their pot is plotted against the inflation
            benchmarks &mdash; CPI, RPI, BoE M4 broad money &mdash; and
            against an S&amp;P 500 total-return alternative in GBP. The
            tax-free wrapper protects you from HMRC. It does nothing about
            the central bank.
          </p>
        </div>

        {error && (
          <div style={{
            padding: 12, marginBottom: 16,
            border: '1px solid #c04848', background: 'rgba(192,72,72,0.08)',
            color: '#c04848', fontSize: 11,
          }}>
            Failed to load Cash ISA data: {error}
          </div>
        )}

        {/* Reading tile */}
        {sum && (
          <div style={{
            border: '1px solid var(--border-primary)',
            background: 'var(--bg-card)',
            padding: '24px 28px',
            marginBottom: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 56, fontWeight: 600,
                color: '#c04848', lineHeight: 1, letterSpacing: '-0.02em',
              }}>
                {fmtCurrency(sum.realLossVsCpi)}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{
                  fontSize: 11, letterSpacing: '0.18em', color: '#c04848',
                  fontWeight: 600, marginBottom: 2,
                }}>
                  REAL LOSS VS CPI &middot; {fmtPct(sum.realLossPctVsCpi)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {sum.firstYear} → {sum.lastYear} &middot; tax-free interest, still down in real terms
                </div>
              </div>
            </div>
            <p style={{
              fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
              marginTop: 14, marginBottom: 0, maxWidth: 720,
            }}>
              Across 27 tax years, maxed-out Cash ISA contributions have
              compounded into a pot worth materially less than what's
              needed to hold its 1999 purchasing power. The cash interest
              earned didn't keep pace with consumer prices &mdash; let
              alone the broader money supply, or productive assets.
            </p>
          </div>
        )}

        {/* Headline stat strip */}
        {sum && (
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
              label="Total Contributed"
              value={fmtCurrency(sum.totalContributed)}
              hint="27 tax years × max cash sub"
            />
            <Stat
              label="Cash ISA Pot Today"
              value={fmtCurrency(sum.finalIsaPot)}
              hint={`compounded at typical rate · ×${sum.isaMultiplier.toFixed(2)} on £1`}
              accent="#4aa57a"
            />
            <Stat
              label="vs CPI"
              value={fmtCurrency(sum.realLossVsCpi)}
              hint={`${fmtPct(sum.realLossPctVsCpi)} · CPI ×${sum.cpiMultiplier.toFixed(2)}`}
              accent={sum.realLossVsCpi < 0 ? '#c04848' : '#4aa57a'}
            />
            <Stat
              label="vs RPI"
              value={fmtCurrency(sum.realLossVsRpi)}
              hint={`${fmtPct(sum.realLossPctVsRpi)} · RPI ×${sum.rpiMultiplier.toFixed(2)}`}
              accent={sum.realLossVsRpi < 0 ? '#c04848' : '#4aa57a'}
            />
            <Stat
              label="vs M4 Broad Money"
              value={fmtCurrency(sum.realLossVsM4)}
              hint={`${fmtPct(sum.realLossPctVsM4)} · M4 ×${sum.m4Multiplier.toFixed(2)}`}
              accent={sum.realLossVsM4 < 0 ? '#c04848' : '#4aa57a'}
            />
            <Stat
              label="vs S&P 500 (GBP TR)"
              value={fmtCurrency(sum.oppCostVsSpx)}
              hint={`${fmtPct(sum.oppCostPctVsSpx)} · SPX ×${sum.spxMultiplier.toFixed(2)}`}
              accent={sum.oppCostVsSpx < 0 ? '#c04848' : '#4aa57a'}
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
              LOADING CASH ISA SERIES...
            </div>
          )}
          {data && <CashIsaChart series={data.series} />}
        </div>

        <Section title="Why a Cash ISA still loses you money">
          <p style={paraStyle}>
            The Cash ISA is sold as a tax shelter for savings, and that's
            exactly what it is &mdash; <em>only</em> a tax shelter. The
            interest you earn isn't taxed. Nothing about the wrapper does
            anything about the rate of interest itself, which for the
            entire period since 2009 has sat well below the rate at which
            consumer prices have risen. You compound at one number; prices
            compound at a bigger one. The pot grows nominally and shrinks
            in real terms simultaneously.
          </p>
          <p style={paraStyle}>
            CPI and RPI are conservative measures of inflation &mdash;
            they track a basket of consumer goods, with various
            methodological choices that tend to understate the lived
            experience of cost rises (housing, in particular, is treated
            very differently in CPI than RPI). The broader measure is
            <em> M4 broad money</em>: the total stock of pounds in the UK
            financial system. When the Bank of England creates new money,
            existing pounds are diluted &mdash; the same way new shares
            dilute existing shareholders. Over the 27 years above, M4 has
            roughly tripled. Your share of the money supply, sitting in
            cash, has shrunk accordingly.
          </p>
          <p style={paraStyle}>
            And then there's opportunity cost. The S&amp;P 500 line in
            the chart is what the same contributions would have become if
            invested in productive assets &mdash; companies that earn,
            grow, and pay dividends &mdash; rather than parked as
            depreciating IOUs from a commercial bank. The gap between
            those two lines is the price of choosing &ldquo;safe&rdquo;.
          </p>
          <p style={paraStyle}>
            None of this means cash is useless. It means cash is a
            <em> tool</em> for short-horizon liquidity, not a
            <em> strategy</em> for multi-decade saving. A Cash ISA earning
            tax-free interest below CPI is, structurally, a slower way to
            lose money than a regular savings account &mdash; not a way to
            keep it.
          </p>
        </Section>

        {data && (
          <div style={{
            fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.14em',
            marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border-subtle)',
            lineHeight: 1.7,
          }}>
            DATA &middot; HMRC ISA SCHEDULE &middot; ONS CPI (CDKO) &middot; ONS RPI (CHAW) &middot; BoE M4 (LPMAUYM) &middot; SHILLER SPX TR × GBP/USD
            <br />
            METHOD &middot; ANNUAL CONTRIBUTION + COMPOUND AT EACH YEAR&apos;S RATE &middot; ALL LINES ORIGIN AT 0
            <br />
            UPDATED &middot; {new Date(data.generatedAt).toISOString().slice(0, 10)}
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
