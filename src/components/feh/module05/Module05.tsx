'use client';

/**
 * Module05 — Wartime Finance Monitor.
 *
 * Stack: 3-stat header → vertical 5-stage pipeline with country chips
 * → evidence drilldown panel. Click any country chip in the pipeline
 * → panel loads its evidence; click again or [ CLOSE ✕ ] to deselect.
 */

import { useState } from 'react';
import {
  WARTIME_COUNTRIES,
  countriesAtStage3Plus,
  medianG20Stage,
} from '@/lib/feh/wartime-seed';
import { WartimeStats } from './WartimeStats';
import { WartimePipeline } from './WartimePipeline';
import { EvidencePanel } from './EvidencePanel';

// Locked seed values — Phase 8 Grok extraction will refresh these.
const GLOBAL_DEFENCE_SPEND_USDT = 2.7;
const DEFENCE_SPEND_YOY_PCT = 9.4;
const COUNTRIES_AT_STAGE_3_PLUS_YOY_DELTA = 3;
const MEDIAN_STAGE_YOY_DELTA = 0.2;

export function Module05() {
  const [selectedIso3, setSelectedIso3] = useState<string | null>(null);

  const stage3Plus = countriesAtStage3Plus(WARTIME_COUNTRIES);
  const median = medianG20Stage(WARTIME_COUNTRIES);
  const selected = WARTIME_COUNTRIES.find((c) => c.iso3 === selectedIso3) ?? null;

  return (
    <div className="space-y-5">
      <WartimeStats
        globalDefenceSpendUsdT={GLOBAL_DEFENCE_SPEND_USDT}
        defenceSpendYoYPct={DEFENCE_SPEND_YOY_PCT}
        countriesAtStage3Plus={stage3Plus}
        countriesAtStage3PlusYoYDelta={COUNTRIES_AT_STAGE_3_PLUS_YOY_DELTA}
        medianG20Stage={median}
        medianG20StageYoYDelta={MEDIAN_STAGE_YOY_DELTA}
      />

      <div
        className="border p-5"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        <WartimePipeline
          countries={WARTIME_COUNTRIES}
          selectedIso3={selectedIso3}
          onSelectIso3={setSelectedIso3}
        />
      </div>

      <EvidencePanel country={selected} onClose={() => setSelectedIso3(null)} />
    </div>
  );
}
