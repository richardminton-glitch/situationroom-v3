'use client';

/**
 * ToolsRail — left rail shown for /tools/* pages.
 *
 * Lists the analytical tools: DCA Signal, Cycle Gauge, Mining Intel,
 * Situation Map. Tier-locked items render as faded rows with an upsell
 * badge (free users see them but can't navigate).
 */

import { Atom, ChartLine, Drop, Gauge, HardHat, MapTrifold, Stack, TreeStructure, Waveform } from '@phosphor-icons/react';
import { SectionRailFrame } from './SectionRailFrame';
import { RailLink } from './RailLink';

const ICON_SIZE = 16;

export function ToolsRail() {
  return (
    <SectionRailFrame sectionKey="tools" title="Tools">
      <div className="space-y-0.5">
        <RailLink
          href="/tools/dca-signal"
          label="DCA Signal"
          icon={<ChartLine size={ICON_SIZE} />}
          requiredTier="general"
        />
        <RailLink
          href="/tools/cycle-gauge"
          label="Cycle Gauge"
          icon={<Gauge size={ICON_SIZE} />}
        />
        <RailLink
          href="/tools/mining"
          label="Mining Intel"
          icon={<HardHat size={ICON_SIZE} />}
          requiredTier="general"
        />
        <RailLink
          href="/tools/map"
          label="Situation Map"
          icon={<MapTrifold size={ICON_SIZE} />}
        />
        <RailLink
          href="/tools/utxo-cosmography"
          label="UTXO Cosmography"
          icon={<Atom size={ICON_SIZE} />}
        />
        <RailLink
          href="/tools/txid-pathing"
          label="TXID Pathing"
          icon={<TreeStructure size={ICON_SIZE} />}
        />
        <RailLink
          href="/tools/blockchain"
          label="Blockchain"
          icon={<Stack size={ICON_SIZE} />}
          requiredTier="general"
        />
        <RailLink
          href="/tools/macro-cycle"
          label="Macro Cycle"
          icon={<Waveform size={ICON_SIZE} />}
          requiredTier="members"
        />
        <RailLink
          href="/tools/global-liquidity"
          label="Global Liquidity"
          icon={<Drop size={ICON_SIZE} />}
          requiredTier="members"
        />
      </div>
    </SectionRailFrame>
  );
}
