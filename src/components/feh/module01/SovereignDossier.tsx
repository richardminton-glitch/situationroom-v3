'use client';

/**
 * SovereignDossier — right-panel dossier view for the selected sovereign.
 *
 * Hero: ticking countdown clock. Below: six readouts (debt/GDP, interest as %
 * revenue, primary balance, real growth, avg maturity, Sovereignty Score).
 * The "FULL DOSSIER" button routes to a members-only deep page; here it's a
 * lock indicator (Phase 9 wires the redaction-paywall flow).
 */

import Link from 'next/link';
import type { SovereignProjected } from '@/lib/feh/types';
import { failureModeLabel } from '@/lib/feh/runway';
import { CountdownClock } from './CountdownClock';
import { RunwayGauge } from './RunwayGauge';

interface SovereignDossierProps {
  sovereign: SovereignProjected;
  computedAt: number;
  stressed: boolean;
}

export function SovereignDossier({ sovereign: s, computedAt, stressed }: SovereignDossierProps) {
  return (
    <div className="flex flex-col gap-4">
      <CountdownClock
        runwayYears={s.runway.years}
        computedAt={computedAt}
        countryName={s.name}
        confidenceYears={s.runway.confidenceYears}
        failureMode={failureModeLabel(s.runway.failureMode)}
      />

      <div
        className="border p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        <RunwayGauge
          label="DEBT / GDP"
          value={s.debtGdp}
          display={`${s.debtGdp.toFixed(0)}%`}
          max={250}
          inverted
          warnAt={90}
          dangerAt={130}
        />
        <RunwayGauge
          label="INTEREST / REV"
          value={s.interestPctRevenue}
          display={`${s.interestPctRevenue.toFixed(0)}%`}
          max={50}
          inverted
          warnAt={15}
          dangerAt={25}
          caption={<>THE KILLER METRIC</>}
        />
        <RunwayGauge
          label="PRIMARY BAL"
          value={s.primaryBalance}
          display={`${s.primaryBalance >= 0 ? '+' : ''}${s.primaryBalance.toFixed(1)}%`}
          min={-10}
          max={10}
          warnAt={-2}
          dangerAt={-4}
        />
        <RunwayGauge
          label="REAL GROWTH"
          value={s.realGdpGrowth}
          display={`${s.realGdpGrowth >= 0 ? '+' : ''}${s.realGdpGrowth.toFixed(1)}%`}
          min={-5}
          max={8}
          warnAt={1}
          dangerAt={0}
        />
        <RunwayGauge
          label="AVG MATURITY"
          value={s.avgMaturity}
          display={`${s.avgMaturity.toFixed(1)} Y`}
          max={20}
          warnAt={5}
          dangerAt={3}
        />
        <RunwayGauge
          label="SOVEREIGNTY SCORE"
          value={s.sovereigntyScore}
          display={`${s.sovereigntyScore}/100`}
          max={100}
          warnAt={50}
          dangerAt={30}
          caption={<>WEIGHTED COMPOSITE · 0=WORST</>}
        />
      </div>

      <Link
        href={`/tools/fiscal-event-horizon/sovereign/${s.iso3.toLowerCase()}`}
        className="border-2 border-dashed py-2.5 px-3 flex items-center justify-between transition-colors group"
        style={{
          borderColor: 'var(--feh-critical)',
          color: 'var(--feh-critical)',
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 10,
          letterSpacing: '0.22em',
          fontWeight: 700,
        }}
      >
        <span>[ FULL DOSSIER · {s.iso3} ]</span>
        <span style={{ opacity: 0.7 }}>ACCESS RESTRICTED // MEMBERS ONLY ↗</span>
      </Link>

      <div
        style={{
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 9,
          letterSpacing: '0.16em',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}
      >
        MODE: {stressed ? <span style={{ color: 'var(--feh-warning)' }}>STRESSED (RATES +200BPS · GROWTH −100BPS)</span> : 'AT CURRENT RATES'}
      </div>
    </div>
  );
}
