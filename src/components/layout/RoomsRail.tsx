'use client';

/**
 * RoomsRail — left rail shown for /rooms/* pages.
 *
 * Lists the live-operations rooms: Members Room (situation room with chat
 * + threat dashboard), Trading Desk (algo trading + signals). Both are
 * members tier and above.
 */

import { Crosshair, ChartLineUp, Waveform } from '@phosphor-icons/react';
import { SectionRailFrame } from './SectionRailFrame';
import { RailLink } from './RailLink';

const ICON_SIZE = 16;

export function RoomsRail() {
  return (
    <SectionRailFrame sectionKey="rooms" title="Rooms">
      <div className="space-y-0.5">
        <RailLink
          href="/rooms/members"
          label="Members Room"
          icon={<Crosshair size={ICON_SIZE} />}
          requiredTier="members"
        />
        <RailLink
          href="/rooms/trading-desk"
          label="Trading Desk"
          icon={<ChartLineUp size={ICON_SIZE} />}
          requiredTier="members"
        />
        <RailLink
          href="/rooms/macro-cycle"
          label="Macro Cycle"
          icon={<Waveform size={ICON_SIZE} />}
          requiredTier="members"
        />
      </div>
    </SectionRailFrame>
  );
}
