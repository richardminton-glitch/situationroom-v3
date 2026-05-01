'use client';

/**
 * ToolsRail — left rail shown for /tools/* pages.
 *
 * Lists the analytical tools: DCA Signal, Cycle Gauge, Mining Intel,
 * Situation Map. Tier-locked items render as faded rows with an upsell
 * badge (free users see them but can't navigate).
 */

import { Atom, ChartLine, Drop, Gauge, HardHat, MapTrifold, Stack, TreeStructure, Waveform, Eye, Percent } from '@phosphor-icons/react';
import { SectionRailFrame, useRailCollapsed } from './SectionRailFrame';
import { RailLink } from './RailLink';

const ICON_SIZE = 16;

function RailGroupLabel({ label }: { label: string }) {
  const collapsed = useRailCollapsed();
  if (collapsed) {
    return <div className="my-2 mx-2 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />;
  }
  return (
    <div
      className="px-2.5 pt-3 pb-1"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        letterSpacing: '0.18em',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        opacity: 0.7,
      }}
    >
      {label}
    </div>
  );
}

export function ToolsRail() {
  return (
    <SectionRailFrame sectionKey="tools" title="Tools">
      <div className="space-y-0.5">
        {/* ─── Macro ─── */}
        <RailGroupLabel label="Macro" />
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
        <RailLink
          href="/tools/real-yields"
          label="Real Yields"
          icon={<Percent size={ICON_SIZE} />}
          requiredTier="members"
        />
        <RailLink
          href="/tools/map"
          label="Situation Map"
          icon={<MapTrifold size={ICON_SIZE} />}
        />

        {/* ─── Bitcoin ─── */}
        <RailGroupLabel label="Bitcoin" />
        <RailLink
          href="/tools/cycle-gauge"
          label="Cycle Gauge"
          icon={<Gauge size={ICON_SIZE} />}
        />
        <RailLink
          href="/tools/dca-signal"
          label="DCA Signal"
          icon={<ChartLine size={ICON_SIZE} />}
          requiredTier="general"
        />
        <RailLink
          href="/tools/blockchain"
          label="Blockchain"
          icon={<Stack size={ICON_SIZE} />}
          requiredTier="general"
        />
        <RailLink
          href="/tools/mining"
          label="Mining Intel"
          icon={<HardHat size={ICON_SIZE} />}
          requiredTier="general"
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

        {/* ─── Intelligence ─── */}
        <RailGroupLabel label="Intelligence" />
        <RailLink
          href="/tools/fiscal-event-horizon"
          label="Fiscal Event Horizon"
          icon={<Eye size={ICON_SIZE} />}
        />
      </div>
    </SectionRailFrame>
  );
}
