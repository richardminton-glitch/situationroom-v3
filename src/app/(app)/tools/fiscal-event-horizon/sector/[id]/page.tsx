/**
 * /tools/fiscal-event-horizon/sector/[id]
 *
 * Members-only sector drilldown — the lean variant per the locked tiered-
 * drilldown decision (sovereigns get the full dossier; sectors get one
 * screen).
 *
 *   ┌───────────────────────────────────────────────┐
 *   │ Sector header — name · stress · headline       │
 *   ├───────────────────────────────────────────────┤
 *   │ Stress time series (5y monthly history)        │
 *   ├───────────────────────────────────────────────┤
 *   │ Representative names list                       │
 *   ├───────────────────────────────────────────────┤
 *   │ Recent triggering events                        │
 *   └───────────────────────────────────────────────┘
 *
 * Non-members see the same shape with sensitive fields redacted; bottom
 * RedactionOverlay carries the AUTHENTICATE CTA.
 */

'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClassificationBar } from '@/components/feh/ClassificationBar';
import { DocumentMetadata } from '@/components/feh/DocumentMetadata';
import { Redacted } from '@/components/feh/Redacted';
import { RedactionOverlay } from '@/components/feh/RedactionOverlay';
import { MALINVESTMENT_SECTORS } from '@/lib/feh/malinvestment-seed';

/** Mock representative-names per sector — Phase 8c will swap for DB data. */
const REPRESENTATIVE_NAMES: Record<string, string[]> = {
  cre:           ['Brookfield Property Partners', 'Vornado Realty Trust', 'Boston Properties', 'SL Green Realty', 'Park Hotels & Resorts'],
  zombie:        ['AMC Networks', 'Spirit Airlines', 'iHeartMedia', 'Lumen Technologies', 'Gogo Inc.'],
  vc:            ['Sequoia Capital growth-stage book', 'a16z late-stage portfolio', 'Tiger Global cohort', 'SoftBank Vision Fund II', 'Insight Partners'],
  spac:          ['Lucid Motors', 'Wallbox NV', 'Lottery.com', 'Faraday Future', 'Polestar Automotive'],
  'private-credit': ['Ares Capital', 'Blackstone Private Credit', 'Owl Rock', 'Golub Capital', 'BDCs > $5B AUM'],
  crypto:        ['Coinglass perpetual book', 'Binance USDT-M perps', 'Bybit perps', 'OKX perps', 'Deribit options open interest'],
  auto:          ['Carvana', 'Credit Acceptance Corp', 'Santander Consumer USA', 'AmeriCredit', 'Westlake Financial'],
  student:       ['Federal Direct Loan portfolio (in repayment)', 'Sallie Mae', 'Navient', 'Nelnet portfolio', 'PSLF programme borrowers'],
  buyback:       ['Apple buyback authorisation', 'Berkshire Hathaway debt-funded buybacks', 'Meta repurchase programme', 'Alphabet repurchases', 'Microsoft programme'],
};

const RECENT_EVENTS: Record<string, Array<{ date: string; label: string }>> = {
  cre: [
    { date: '2026-04', label: 'Major NYC tower defaults on $475M CMBS' },
    { date: '2026-02', label: 'Office REIT cuts dividend after vacancy spike' },
    { date: '2026-01', label: 'Trepp delinquency rate hits post-GFC high' },
  ],
  zombie: [
    { date: '2026-04', label: 'Russell 3000 zombie share crosses 18%' },
    { date: '2026-03', label: 'Two major airlines refinance at 14%+' },
    { date: '2026-01', label: 'Telecom giant flagged for distressed exchange' },
  ],
  vc:     [{ date: '2026-04', label: 'Late-stage VC down-rounds at multi-year high' }, { date: '2026-02', label: 'Tiger Global writes down 23% of portfolio' }],
  spac:   [{ date: '2026-04', label: 'Average post-merger SPAC discount widens to 35%' }, { date: '2026-03', label: 'Two SPACs delist after warrant redemption' }],
  'private-credit': [{ date: '2026-04', label: 'Mark-to-model spread vs liquid HY hits 480bps' }, { date: '2026-02', label: 'Largest BDC reports 7% non-accruals' }],
  crypto: [{ date: '2026-04', label: 'Liquidation queue depth +28% MoM' }, { date: '2026-03', label: 'Perp funding flips negative across majors' }],
  auto:   [{ date: '2026-04', label: 'Subprime auto delinquency hits 8.5% — GFC peak' }, { date: '2026-02', label: 'Major auto-finance issuer downgraded' }],
  student:[{ date: '2026-04', label: 'Forbearance roll-off accelerates after policy expiry' }, { date: '2026-01', label: 'Default rate climbs to 4-year high' }],
  buyback:[{ date: '2026-04', label: '%-of-cap repurchased on credit at 12-year high' }, { date: '2026-03', label: 'Three megacap programmes scale back guidance' }],
};

export default function SectorDossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sector = MALINVESTMENT_SECTORS.find((s) => s.id === id);
  if (!sector) notFound();

  const stressColor =
    sector.stress >= 80 ? 'var(--feh-critical)' :
    sector.stress >= 60 ? 'var(--feh-warning)' :
    'var(--feh-stable)';

  // Mock 60-month history — start lower, climb to current stress
  const history = useMemo(() => {
    const out: { month: number; value: number }[] = [];
    const start = Math.max(20, sector.stress - 30);
    for (let m = 0; m < 60; m++) {
      const t = m / 59;
      const v = start + (sector.stress - start) * Math.pow(t, 1.4) + Math.sin(m * 0.4) * 2.5;
      out.push({ month: m, value: Math.round(v * 10) / 10 });
    }
    return out;
  }, [sector.stress]);

  const names = REPRESENTATIVE_NAMES[sector.id] ?? [];
  const events = RECENT_EVENTS[sector.id] ?? [];

  // Build sparkline path
  const W = 720, H = 140, padX = 16, padY = 12;
  const minV = Math.min(...history.map((h) => h.value));
  const maxV = Math.max(...history.map((h) => h.value));
  const range = Math.max(1, maxV - minV);
  const linePath = history
    .map((p, i) => {
      const x = padX + (i / (history.length - 1)) * (W - padX * 2);
      const y = padY + (1 - (p.value - minV) / range) * (H - padY * 2);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', paddingBottom: 96 }}
    >
      <ClassificationBar />
      <DocumentMetadata
        docRef={`FEH-SEC-${sector.id.toUpperCase()}-2026Q2`}
        compiled="1430Z 26APR26"
        nextReview="03MAY26"
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
        {' · SECTOR DOSSIER · '}
        <span style={{ color: 'var(--feh-critical)' }}>{sector.short}</span>
      </div>

      {/* Sector header */}
      <header className="mx-auto max-w-[1320px] px-4 py-8">
        <h1
          style={{
            fontFamily: 'var(--feh-font-display)',
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 600,
            letterSpacing: '0.12em',
            color: 'var(--feh-stencil-ink)',
            margin: 0,
            lineHeight: 1,
          }}
        >
          {sector.label}
        </h1>
        <div
          className="mt-4 inline-flex items-center gap-4 px-4 py-3 border"
          style={{ borderColor: stressColor, backgroundColor: 'var(--bg-card)' }}
        >
          <div>
            <div style={{ fontFamily: 'var(--feh-font-mono)', fontSize: 9, letterSpacing: '0.22em', color: 'var(--text-muted)' }}>
              STRESS SCORE
            </div>
            <div
              style={{
                fontFamily: 'var(--feh-font-mono)',
                fontSize: 28,
                fontWeight: 900,
                color: stressColor,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.1,
              }}
            >
              <Redacted width="3ch">{sector.stress}</Redacted>
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>/100</span>
            </div>
          </div>
          <div style={{ width: 1, height: 36, backgroundColor: 'var(--border-subtle)' }} />
          <div>
            <div style={{ fontFamily: 'var(--feh-font-mono)', fontSize: 9, letterSpacing: '0.22em', color: 'var(--text-muted)' }}>
              YoY DELTA
            </div>
            <div style={{ fontFamily: 'var(--feh-font-mono)', fontSize: 16, fontWeight: 700, color: stressColor, fontVariantNumeric: 'tabular-nums' }}>
              <Redacted width="6ch">{sector.yoyDelta >= 0 ? '+' : ''}{sector.yoyDelta.toFixed(1)} pp</Redacted>
            </div>
          </div>
          <div style={{ width: 1, height: 36, backgroundColor: 'var(--border-subtle)' }} />
          <div>
            <div style={{ fontFamily: 'var(--feh-font-mono)', fontSize: 9, letterSpacing: '0.22em', color: 'var(--text-muted)' }}>
              HALF-LIFE
            </div>
            <div style={{ fontFamily: 'var(--feh-font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              <Redacted width="5ch">~{sector.halfLifeMonths} MO</Redacted>
            </div>
          </div>
        </div>
        <p
          className="mt-4 max-w-3xl"
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 13,
            lineHeight: 1.7,
            color: 'var(--text-secondary)',
            letterSpacing: '0.04em',
          }}
        >
          <Redacted mode="block" height={42} width="100%">
            {sector.headline}
          </Redacted>
        </p>
      </header>

      {/* Stress time series */}
      <SectorSection title="STRESS · 5Y MONTHLY HISTORY" idx="01">
        <div className="border p-3" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-card)' }}>
          <Redacted mode="block" width="100%" height={H}>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
              <path d={linePath} fill="none" stroke={stressColor} strokeWidth={1.6} />
              {/* End-of-line dot */}
              {(() => {
                const last = history[history.length - 1];
                const x = padX + ((history.length - 1) / (history.length - 1)) * (W - padX * 2);
                const y = padY + (1 - (last.value - minV) / range) * (H - padY * 2);
                return <circle cx={x} cy={y} r={3} fill={stressColor} />;
              })()}
            </svg>
          </Redacted>
        </div>
      </SectorSection>

      {/* Representative names */}
      <SectorSection title="REPRESENTATIVE NAMES" idx="02">
        <div
          className="border divide-y"
          style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-card)' }}
        >
          {names.map((name, i) => (
            <div
              key={name}
              className="px-4 py-2 flex items-center gap-3"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <span
                style={{
                  fontFamily: 'var(--feh-font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  color: 'var(--text-muted)',
                  width: 24,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span
                style={{
                  fontFamily: 'var(--feh-font-mono)',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.04em',
                }}
              >
                <Redacted width={`${Math.max(8, name.length)}ch`}>{name}</Redacted>
              </span>
            </div>
          ))}
        </div>
      </SectorSection>

      {/* Recent events */}
      <SectorSection title="RECENT TRIGGERING EVENTS" idx="03">
        <div
          className="border"
          style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-card)' }}
        >
          {events.map((e, i) => (
            <div
              key={i}
              className="px-4 py-2.5 flex items-baseline gap-4"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)' }}
            >
              <span
                style={{
                  fontFamily: 'var(--feh-font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  color: 'var(--feh-critical)',
                  fontWeight: 700,
                  minWidth: 70,
                }}
              >
                {e.date}
              </span>
              <span
                style={{
                  fontFamily: 'var(--feh-font-mono)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.04em',
                  lineHeight: 1.5,
                }}
              >
                <Redacted width={`${Math.max(20, e.label.length)}ch`}>{e.label}</Redacted>
              </span>
            </div>
          ))}
        </div>
      </SectorSection>

      <RedactionOverlay origin={`sector-${sector.id}`} />
    </div>
  );
}

function SectorSection({ title, idx, children }: { title: string; idx: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-[1320px] px-4 py-6">
      <div className="flex items-baseline gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-primary)' }}>
        <span style={{ fontFamily: 'var(--feh-font-mono)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-muted)' }}>
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
