'use client';

/**
 * /rooms/* layout — RoomsRail + PageHeader + main.
 *
 * Phase 2 forced dark mode for everything under /rooms; that's been removed
 * — the user's theme preference now applies in the rooms too. Members Room
 * and Trading Desk components were originally dark-only; they've been
 * refactored to use CSS variables so both parchment and dark themes render
 * correctly.
 *
 * If we ever need to re-introduce a per-section default (e.g. "rooms always
 * open in dark for new visitors"), prefer the CSS-scoped `data-section`
 * attribute approach over re-introducing the useEffect setTheme dance.
 */

import { RoomsRail } from '@/components/layout/RoomsRail';

export default function RoomsLayout({ children }: { children: React.ReactNode }) {
  // No PageHeader breadcrumb here — the room components own their full
  // visible area (members room and trading desk both render their own
  // status bars / headers internally). The TopBar already shows "Rooms"
  // as the active section; the second-level breadcrumb was redundant chrome.
  return (
    <>
      <RoomsRail />
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </>
  );
}
