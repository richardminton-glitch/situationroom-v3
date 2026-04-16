'use client';

/**
 * /tools/* layout — ToolsRail (left) + PageHeader breadcrumb + main.
 *
 * Inherits TopBar + IntelStrip from (app)/layout.tsx. Replaces the previous
 * AppShell wrapper, which mounted the monolithic Sidebar.
 */

import { usePathname } from 'next/navigation';
import { ToolsRail } from '@/components/layout/ToolsRail';
import { PageHeader } from '@/components/layout/PageHeader';

const TOOL_LABELS: Record<string, string> = {
  '/tools/dca-signal':  'DCA Signal',
  '/tools/cycle-gauge': 'Cycle Gauge',
  '/tools/mining':      'Mining Intel',
  '/tools/map':         'Situation Map',
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const toolLabel = TOOL_LABELS[pathname] ?? 'Tools';
  const breadcrumb = pathname === '/tools' ? ['Tools'] : ['Tools', toolLabel];

  return (
    <>
      <ToolsRail />
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <PageHeader breadcrumb={breadcrumb} />
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </>
  );
}
