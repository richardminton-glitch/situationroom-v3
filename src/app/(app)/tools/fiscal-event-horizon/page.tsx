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
import { Module05 } from '@/components/feh/module05/Module05';
import { Module06 } from '@/components/feh/module06/Module06';
import { MethodologyDrawer } from '@/components/feh/MethodologyDrawer';
import { FehDataProvider } from '@/components/feh/FehDataProvider';

export const metadata: Metadata = {
  title: 'Fiscal Event Horizon — The Situation Room',
  description:
    'Six-module intelligence dossier tracking the slow-motion solvency crisis of the fiat sovereign system. Sovereign countdowns, reserve currency decay, central bank divergence, malinvestment overhangs, wartime finance escalation, petro-dollar erosion.',
};

const ABSTRACT =
  'The Austrian-flavoured Article IV. Six modules tracking the slow-motion solvency crisis of the fiat sovereign system, displayed as a single-page intelligence product. None of these are predictions. All of them are kindling.';

export default function FiscalEventHorizonPage() {
  return (
    <FehDataProvider>
      <FiscalEventHorizonContent />
    </FehDataProvider>
  );
}

function FiscalEventHorizonContent() {
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
        methodologySlug="01"
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
        methodologySlug="02"
      >
        <Module02 />
      </ModuleShell>

      <SectionDivider />

      <ModuleShell
        index="03"
        title="CENTRAL BANK DIVERGENCE MATRIX"
        subtitle="When the cluster breaks, capital moves. Watch the breaks before they happen."
        severity="SECRET"
        lastComputed="26APR26"
        nextRefresh="03MAY26"
        methodologySlug="03"
      >
        <Module03 />
      </ModuleShell>

      <SectionDivider />

      <ModuleShell
        index="06"
        title="PETRO-DOLLAR EROSION TRACKER"
        subtitle="The counter-narrative to 'the dollar is fine.'"
        severity="SECRET"
        lastComputed="26APR26"
        nextRefresh="03MAY26"
        methodologySlug="06"
      >
        <Module06 />
      </ModuleShell>

      <SectionDivider />

      <ModuleShell
        index="04"
        title="MALINVESTMENT MAPPER"
        subtitle="A visual ledger of what cheap money built."
        severity="SECRET"
        lastComputed="26APR26"
        nextRefresh="26MAY26"
        methodologySlug="04"
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
        methodologySlug="05"
      >
        <Module05 />
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
        <a
          href="/tools/fiscal-event-horizon/methodology"
          style={{ color: 'var(--feh-critical)', textDecoration: 'none', fontWeight: 700 }}
        >
          [ FULL METHODOLOGY DOCUMENT ↗ ]
        </a>
        <br />
        SOURCES · LAST COMPUTED 1430Z 26APR26
        <br />
        <span style={{ opacity: 0.6 }}>
          COMPILED FROM PUBLIC DATA AND EDITORIAL JUDGEMENT — SITUATION ROOM INTELLIGENCE
        </span>
      </footer>

      <ClassificationBar />

      <MethodologyDrawer />
    </div>
  );
}
