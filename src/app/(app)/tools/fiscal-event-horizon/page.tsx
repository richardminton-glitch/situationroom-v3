/**
 * /tools/fiscal-event-horizon — Fiscal Event Horizon
 *
 * Six-module intelligence dossier on sovereign fiscal collapse risk. The page
 * is publicly visible (no auth gate); members-only drilldowns live at
 * /tools/fiscal-event-horizon/sovereign/[iso3] and /sector/[id].
 *
 * Phase 1 ships the chrome and stubbed module shells. Each subsequent phase
 * replaces one stub with the real module.
 */

import type { Metadata } from 'next';
import { ClassificationBar } from '@/components/feh/ClassificationBar';
import { DocumentMetadata } from '@/components/feh/DocumentMetadata';
import { PageTitle } from '@/components/feh/PageTitle';
import { SectionDivider } from '@/components/feh/SectionDivider';
import { ModuleShell } from '@/components/feh/ModuleShell';
import { StubModule } from '@/components/feh/StubModule';
import { Module01 } from '@/components/feh/module01/Module01';

export const metadata: Metadata = {
  title: 'Fiscal Event Horizon — The Situation Room',
  description:
    'Six-module intelligence dossier tracking the slow-motion solvency crisis of the fiat sovereign system. Sovereign countdowns, reserve currency decay, central bank divergence, malinvestment overhangs, wartime finance escalation, petro-dollar erosion.',
};

const ABSTRACT =
  'The Austrian-flavoured Article IV. Six modules tracking the slow-motion solvency crisis of the fiat sovereign system, displayed as a single-page intelligence product. None of these are predictions. All of them are kindling.';

export default function FiscalEventHorizonPage() {
  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      <ClassificationBar />
      <DocumentMetadata
        docRef="FEH-2026-Q2"
        compiled="1430Z 26APR26"
        nextReview="03MAY26"
      />

      <PageTitle title="FISCAL EVENT HORIZON" abstract={ABSTRACT} />

      <ModuleShell
        index="01"
        title="SOVEREIGN COUNTDOWN GLOBE"
        subtitle="Every fiat sovereign is on a runway. Length is the only variable."
        severity="TOP SECRET"
        lastComputed="26APR26"
        nextRefresh="26JUL26"
      >
        <Module01 />
      </ModuleShell>

      <SectionDivider />

      <ModuleShell
        index="02"
        title="RESERVE CURRENCY DECAY INDEX"
        subtitle="One number. One trendline. One uncomfortable story."
        severity="SECRET"
        lastComputed="26APR26"
        nextRefresh="26JUL26"
      >
        <StubModule
          description="// MODULE 02 — UNDER CONSTRUCTION //  Composite RCDI number (oversized monospace), 5-year sparkline with single annotated inflection, four component gauges: CB GOLD vs USD ALLOC SHIFT, CIPS / SWIFT VOL RATIO, YUAN OIL SETTLEMENT %, BRICS BILATERAL SWAPS."
          height={280}
        />
      </ModuleShell>

      <SectionDivider />

      <ModuleShell
        index="03"
        title="CENTRAL BANK DIVERGENCE MATRIX"
        subtitle="When the cluster breaks, capital moves. Watch the breaks before they happen."
        severity="SECRET"
        lastComputed="26APR26"
        nextRefresh="03MAY26"
      >
        <StubModule
          description="// MODULE 03 — UNDER CONSTRUCTION //  G20 + ECB + SNB grid (~24 cells). Each cell = stance arrow, current rate, last move, market-implied 12mo path, divergence vs G20 mean. Big stat above grid: DIVERGENCE INDEX."
          height={400}
        />
      </ModuleShell>

      <SectionDivider />

      <ModuleShell
        index="04"
        title="MALINVESTMENT MAPPER"
        subtitle="A visual ledger of what cheap money built."
        severity="SECRET"
        lastComputed="26APR26"
        nextRefresh="26MAY26"
      >
        <StubModule
          description="// MODULE 04 — UNDER CONSTRUCTION //  9-axis radar of sector stress (CRE, zombie corporates, VC, SPACs, private credit, crypto leverage, subprime auto, student debt, buyback-funded equity) + sector dossier cards. Composite BUST PROBABILITY gauge: this measures kindling, not timing."
          height={460}
        />
      </ModuleShell>

      <SectionDivider />

      <ModuleShell
        index="05"
        title="WARTIME FINANCE MONITOR"
        subtitle="The fiscal-to-financial-repression pipeline, in real time."
        severity="TOP SECRET"
        lastComputed="26APR26"
        nextRefresh="26MAY26"
      >
        <StubModule
          description="// MODULE 05 — UNDER CONSTRUCTION //  Vertical 5-stage escalation pipeline (Defence Spend ↑ → War Bonds → Capital Controls → Price Decrees → Monetary Debasement) with countries placed at current stage. Three header stats. Click country → evidence drilldown."
          height={520}
        />
      </ModuleShell>

      <SectionDivider />

      <ModuleShell
        index="06"
        title="PETRO-DOLLAR EROSION TRACKER"
        subtitle="The counter-narrative to 'the dollar is fine.'"
        severity="SECRET"
        lastComputed="26APR26"
        nextRefresh="03MAY26"
      >
        <StubModule
          description="// MODULE 06 — UNDER CONSTRUCTION //  Layered area chart, 10y. DXY base, then yuan oil settlement %, gold repatriation index, BRICS bilateral swap volume painted over. Annotated with key inflection events. DXY-alone vs full-stack toggle."
          height={420}
        />
      </ModuleShell>

      <SectionDivider label="END OF DOCUMENT — TOP SECRET // FISCAL // NOFORN" />

      <footer
        className="py-12 px-4 text-center"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: 'var(--text-muted)',
          letterSpacing: '0.16em',
          lineHeight: 2,
        }}
      >
        METHODOLOGY · SOURCES · LAST COMPUTED 1430Z 26APR26
        <br />
        <span style={{ opacity: 0.6 }}>
          COMPILED FROM PUBLIC DATA AND EDITORIAL JUDGEMENT — SITUATION ROOM INTELLIGENCE
        </span>
      </footer>

      <ClassificationBar />
    </div>
  );
}
