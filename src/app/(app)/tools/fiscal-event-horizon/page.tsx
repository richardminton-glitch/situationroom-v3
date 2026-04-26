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
import { Module02 } from '@/components/feh/module02/Module02';
import { Module03 } from '@/components/feh/module03/Module03';
import { Module04 } from '@/components/feh/module04/Module04';
import { Module06 } from '@/components/feh/module06/Module06';

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
        <Module02 />
      </ModuleShell>

      <SectionDivider />

      {/* Section 03 + Section 06 — side-by-side row per spec */}
      <div className="mx-auto w-full max-w-[1320px] px-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ModuleShell
            compact
            index="03"
            title="CB DIVERGENCE MATRIX"
            subtitle="When the cluster breaks, capital moves. Watch the breaks before they happen."
            severity="SECRET"
            lastComputed="26APR26"
            nextRefresh="03MAY26"
          >
            <Module03 />
          </ModuleShell>

          <ModuleShell
            compact
            index="06"
            title="PETRO-DOLLAR EROSION"
            subtitle="The counter-narrative to 'the dollar is fine.'"
            severity="SECRET"
            lastComputed="26APR26"
            nextRefresh="03MAY26"
          >
            <Module06 />
          </ModuleShell>
        </div>
      </div>

      <SectionDivider />

      <ModuleShell
        index="04"
        title="MALINVESTMENT MAPPER"
        subtitle="A visual ledger of what cheap money built."
        severity="SECRET"
        lastComputed="26APR26"
        nextRefresh="26MAY26"
      >
        <Module04 />
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
