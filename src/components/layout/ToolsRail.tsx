'use client';

/**
 * ToolsRail — left rail shown for /tools/* pages.
 *
 * Lists the analytical tools: DCA Signal, Cycle Gauge, Mining Intel,
 * Situation Map. Tier-locked items render as faded rows with an upsell
 * badge (free users see them but can't navigate).
 */

import { ChartLine, Gauge, HardHat, MapTrifold } from '@phosphor-icons/react';
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
      </div>
    </SectionRailFrame>
  );
}
