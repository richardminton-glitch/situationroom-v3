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

import { usePathname } from 'next/navigation';
import { RoomsRail } from '@/components/layout/RoomsRail';
import { PageHeader } from '@/components/layout/PageHeader';

const ROOM_LABELS: Record<string, string> = {
  '/rooms/members':       'Members Room',
  '/rooms/trading-desk':  'Trading Desk',
};

export default function RoomsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const roomLabel = ROOM_LABELS[pathname] ?? 'Rooms';
  const breadcrumb = pathname === '/rooms' ? ['Rooms'] : ['Rooms', roomLabel];

  return (
    <>
      <RoomsRail />
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <PageHeader breadcrumb={breadcrumb} />
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </>
  );
}
