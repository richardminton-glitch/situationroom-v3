/**
 * /tools/fiscal-event-horizon/sovereign/[iso3]
 *
 * Members-only sovereign drilldown — the "FULL DOSSIER" route from the globe
 * dossier panel. Shape per locked decision (tiered drilldown depth):
 *
 *   ┌───────────────────────────────────────────────┐
 *   │ Country header — flag · name · runway clock   │
 *   ├───────────────────────────────────────────────┤
 *   │ Six metric gauges with 5y mini-sparklines      │
 *   ├───────────────────────────────────────────────┤
 *   │ Maturity wall — next 10y debt rolloff         │
 *   ├───────────────────────────────────────────────┤
 *   │ Foreign holders breakdown                      │
 *   ├───────────────────────────────────────────────┤
 *   │ STATE OF X SOVEREIGN — Grok-templated commentary│
 *   │   3 sections × 60-100 words, each anchored to │
 *   │   an on-page metric                           │
 *   └───────────────────────────────────────────────┘
 *
 * Non-members see the same shape with all sensitive values redacted via the
 * <Redacted> wrapper and a fixed-bottom <RedactionOverlay> CTA. The page
 * itself is publicly routable; redaction is the paywall.
 */

'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClassificationBar } from '@/components/feh/ClassificationBar';
import { DocumentMetadata } from '@/components/feh/DocumentMetadata';
import { Redacted } from '@/components/feh/Redacted';
import { RedactionOverlay } from '@/components/feh/RedactionOverlay';
import { SOVEREIGNS_BY_ISO3 } from '@/lib/feh/sovereigns-seed';
import { computeRunway, failureModeLabel } from '@/lib/feh/runway';
import { sovereigntyScore } from '@/lib/feh/sovereigntyScore';
import { colorForRunway } from '@/lib/feh/colors';

export default function SovereignDossierPage({ params }: { params: Promise<{ iso3: string }> }) {
  const { iso3: rawIso3 } = use(params);
  const iso3 = rawIso3.toUpperCase();
  const sovereign = SOVEREIGNS_BY_ISO3[iso3];

  if (!sovereign) notFound();

  const runway = computeRunway(sovereign);
  const score = sovereigntyScore(sovereign);
  const runwayColor = colorForRunway(runway.years);
  const runwayLabel = runway.years === 0 ? 'NOW' : runway.years >= 100 ? '100Y+' : `${runway.years}Y`;

  // Mock maturity wall (10y rolloff) — Phase 8c will swap this for DB data.
  const maturityWall = useMemo(() => {
    const total = sovereign.debtGdp;
    const buckets: { year: number; pct: number }[] = [];
    let remaining = 100;
    for (let i = 1; i <= 10; i++) {
      // Frontload — exponential decay
      const share = i <= 4 ? 16 - i * 1.5 : Math.max(2, remaining / 10);
      buckets.push({ year: 2026 + i, pct: Math.min(remaining, share) });
      remaining -= share;
    }
    return { total, buckets };
  }, [sovereign.debtGdp]);

  // Mock foreign holders — top 5
  const foreignHolders = useMemo(() => {
    const fxShare = sovereign.fxDebtShare;
    return [
      { name: 'Federal Reserve System',  pct: fxShare * 0.05 },
      { name: 'Foreign official sector', pct: sovereign.externalDebtShare * 0.32 },
      { name: 'Foreign private sector',  pct: sovereign.externalDebtShare * 0.28 },
      { name: 'Domestic banks',          pct: (100 - sovereign.externalDebtShare) * 0.45 },
      { name: 'Domestic households / pension', pct: (100 - sovereign.externalDebtShare) * 0.30 },
    ].filter((h) => h.pct > 0).map((h) => ({ ...h, pct: Math.round(h.pct * 10) / 10 }));
  }, [sovereign.fxDebtShare, sovereign.externalDebtShare]);

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', paddingBottom: 96 }}
    >
      <ClassificationBar />
      <DocumentMetadata
        docRef={`FEH-SOV-${iso3}-2026Q2`}
        compiled="1430Z 26APR26"
        nextReview="26JUL26"
      />

      {/* Breadcrumb */}
      <div
        className="mx-auto max-w-[1320px] px-4 pt-4"
        style={{
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 10,
          letterSpacing: '0.18em',
          color: 'var(--text-muted)',
        }}
      >
        <Link href="/tools/fiscal-event-horizon" style={{ color: 'inherit', textDecoration: 'none' }}>
          ← FISCAL EVENT HORIZON
        </Link>
        {' · SOVEREIGN DOSSIER · '}
        <span style={{ color: 'var(--feh-critical)' }}>{iso3}</span>
      </div>

      {/* Country header */}
      <header className="mx-auto max-w-[1320px] px-4 py-8">
        <div className="flex items-baseline gap-4 flex-wrap">
          <h1
            style={{
              fontFamily: 'var(--feh-font-display)',
              fontSize: 'clamp(36px, 5vw, 64px)',
              fontWeight: 600,
              letterSpacing: '0.12em',
              color: 'var(--feh-stencil-ink)',
              margin: 0,
              lineHeight: 1,
            }}
          >
            {sovereign.name.toUpperCase()}
          </h1>
          <span
            style={{
              fontFamily: 'var(--feh-font-mono)',
              fontSize: 14,
              letterSpacing: '0.22em',
              color: 'var(--text-muted)',
            }}
          >
            {iso3}
          </span>
        </div>
        <div
          className="mt-4 inline-flex items-center gap-4 px-4 py-3 border"
          style={{ borderColor: runwayColor, backgroundColor: 'var(--bg-card)' }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--feh-font-mono)',
                fontSize: 9,
                letterSpacing: '0.22em',
                color: 'var(--text-muted)',
              }}
            >
              RUNWAY · CURRENT RATES
            </div>
            <div
              style={{
                fontFamily: 'var(--feh-font-mono)',
                fontSize: 28,
                fontWeight: 900,
                color: runwayColor,
                lineHeight: 1.1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <Redacted width="4ch">{runwayLabel}</Redacted>
            </div>
          </div>
          <div style={{ width: 1, height: 36, backgroundColor: 'var(--border-subtle)' }} />
          <div>
            <div
              style={{
                fontFamily: 'var(--feh-font-mono)',
                fontSize: 9,
                letterSpacing: '0.22em',
                color: 'var(--text-muted)',
              }}
            >
              FAILURE MODE
            </div>
            <div
              style={{
                fontFamily: 'var(--feh-font-mono)',
                fontSize: 14,
                fontWeight: 700,
                color: runwayColor,
                letterSpacing: '0.12em',
              }}
            >
              <Redacted width="14ch">{failureModeLabel(runway.failureMode)}</Redacted>
            </div>
          </div>
          <div style={{ width: 1, height: 36, backgroundColor: 'var(--border-subtle)' }} />
          <div>
            <div
              style={{
                fontFamily: 'var(--feh-font-mono)',
                fontSize: 9,
                letterSpacing: '0.22em',
                color: 'var(--text-muted)',
              }}
            >
              SOVEREIGNTY SCORE
            </div>
            <div
              style={{
                fontFamily: 'var(--feh-font-mono)',
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <Redacted width="3ch">{score}</Redacted>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>/100</span>
            </div>
          </div>
        </div>
      </header>

      {/* Section: Headline metrics with sparklines */}
      <DossierSection title="HEADLINE METRICS · 5Y CONTEXT" idx="01">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard label="DEBT / GDP"          value={`${sovereign.debtGdp.toFixed(0)}%`}              redactWidth="5ch" />
          <MetricCard label="INTEREST / REVENUE"  value={`${sovereign.interestPctRevenue.toFixed(0)}%`}   redactWidth="4ch" caption="THE KILLER METRIC" />
          <MetricCard label="PRIMARY BALANCE"     value={`${sovereign.primaryBalance >= 0 ? '+' : ''}${sovereign.primaryBalance.toFixed(1)}%`} redactWidth="5ch" />
          <MetricCard label="REAL GDP GROWTH"     value={`${sovereign.realGdpGrowth >= 0 ? '+' : ''}${sovereign.realGdpGrowth.toFixed(1)}%`}   redactWidth="5ch" />
          <MetricCard label="EFFECTIVE RATE"      value={`${sovereign.effectiveRate.toFixed(1)}%`}        redactWidth="4ch" />
          <MetricCard label="AVG MATURITY"        value={`${sovereign.avgMaturity.toFixed(1)} Y`}         redactWidth="4ch" />
        </div>
      </DossierSection>

      {/* Section: Maturity wall */}
      <DossierSection title="MATURITY WALL · NEXT 10 YEARS" idx="02">
        <div
          className="border p-4"
          style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-card)' }}
        >
          <div className="grid grid-cols-10 gap-1 items-end" style={{ height: 180 }}>
            {maturityWall.buckets.map((b) => (
              <div key={b.year} className="flex flex-col items-center gap-1 h-full justify-end">
                <Redacted width="100%" height={`${Math.max(6, (b.pct / 18) * 160)}px`}>
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max(6, (b.pct / 18) * 160)}px`,
                      backgroundColor: runwayColor,
                      opacity: 0.85,
                    }}
                  />
                </Redacted>
                <span
                  style={{
                    fontFamily: 'var(--feh-font-mono)',
                    fontSize: 9,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {String(b.year).slice(2)}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--feh-font-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Redacted width="3ch">{b.pct.toFixed(0)}%</Redacted>
                </span>
              </div>
            ))}
          </div>
          <div
            className="mt-3"
            style={{
              fontFamily: 'var(--feh-font-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              fontStyle: 'italic',
            }}
          >
            % of stock rolling off in each year. The 2-4 year window is where refi-rate exposure compounds.
          </div>
        </div>
      </DossierSection>

      {/* Section: Foreign holders */}
      <DossierSection title="DEBT HOLDERS · COMPOSITION" idx="03">
        <div
          className="border"
          style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-card)' }}
        >
          {foreignHolders.map((h, i) => (
            <div
              key={h.name}
              className="px-4 py-2.5 flex items-center justify-between gap-4"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)' }}
            >
              <span
                style={{
                  fontFamily: 'var(--feh-font-mono)',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.06em',
                }}
              >
                <Redacted width="22ch">{h.name}</Redacted>
              </span>
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <div
                  className="relative flex-1"
                  style={{ height: 5, backgroundColor: 'var(--border-subtle)' }}
                >
                  <Redacted width={`${h.pct}%`} height={5}>
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: `${h.pct}%`,
                        backgroundColor: 'var(--feh-warning)',
                        opacity: 0.85,
                      }}
                    />
                  </Redacted>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--feh-font-mono)',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: 50,
                    textAlign: 'right',
                  }}
                >
                  <Redacted width="4ch">{h.pct.toFixed(1)}%</Redacted>
                </span>
              </div>
            </div>
          ))}
        </div>
      </DossierSection>

      {/* Section: Editorial commentary — Grok-templated 3 sections */}
      <DossierSection title={`STATE OF ${sovereign.name.toUpperCase()} · Q2 2026`} idx="04">
        <div className="space-y-4">
          <CommentaryBlock
            heading="FISCAL TRAJECTORY"
            bodyAnchor={`Debt/GDP at ${sovereign.debtGdp.toFixed(0)}%, primary balance at ${sovereign.primaryBalance.toFixed(1)}%.`}
          />
          <CommentaryBlock
            heading="KEY RISKS"
            bodyAnchor={`Interest at ${sovereign.interestPctRevenue.toFixed(0)}% of revenue means ${sovereign.interestPctRevenue >= 25 ? 'crowding-out is already live' : 'debt service has runway before discretionary spending compresses'}.`}
          />
          <CommentaryBlock
            heading="COMPARABLE PEERS"
            bodyAnchor={`At an effective rate of ${sovereign.effectiveRate.toFixed(1)}% and average maturity ${sovereign.avgMaturity.toFixed(1)}y, the most-comparable trajectories are documented in peer overlays.`}
          />
        </div>
      </DossierSection>

      <RedactionOverlay origin={`sovereign-${iso3.toLowerCase()}`} />
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function DossierSection({ title, idx, children }: { title: string; idx: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-[1320px] px-4 py-6">
      <div className="flex items-baseline gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-primary)' }}>
        <span
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 10,
            letterSpacing: '0.2em',
            color: 'var(--text-muted)',
          }}
        >
          ITEM {idx}
        </span>
        <h2
          style={{
            fontFamily: 'var(--feh-font-display)',
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: '0.14em',
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}

function MetricCard({ label, value, redactWidth, caption }: { label: string; value: string; redactWidth: string; caption?: string }) {
  return (
    <div
      className="border p-3"
      style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-card)' }}
    >
      <div
        style={{
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 9,
          letterSpacing: '0.22em',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontVariantNumeric: 'tabular-nums',
          marginTop: 4,
          letterSpacing: '0.02em',
        }}
      >
        <Redacted width={redactWidth}>{value}</Redacted>
      </div>
      {caption && (
        <div
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 9,
            letterSpacing: '0.16em',
            color: 'var(--feh-warning)',
            marginTop: 6,
            fontWeight: 700,
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}

function CommentaryBlock({ heading, bodyAnchor }: { heading: string; bodyAnchor: string }) {
  return (
    <div
      className="border-l-2 pl-4 py-2"
      style={{ borderColor: 'var(--feh-warning)' }}
    >
      <div
        style={{
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 10,
          letterSpacing: '0.22em',
          color: 'var(--feh-warning)',
          fontWeight: 700,
        }}
      >
        {heading}
      </div>
      <div
        className="mt-1.5"
        style={{
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 11.5,
          lineHeight: 1.7,
          letterSpacing: '0.02em',
          color: 'var(--text-secondary)',
        }}
      >
        <Redacted mode="block" height={62} width="100%">
          <p style={{ margin: 0 }}>{bodyAnchor} Quarterly Grok-templated analysis follows the locked editorial schema (3 sections × 60-100 words, each anchored to an on-page metric).</p>
        </Redacted>
      </div>
    </div>
  );
}
