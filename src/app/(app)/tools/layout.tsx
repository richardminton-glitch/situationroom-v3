'use client';

/**
 * /tools/* layout — ToolsRail (left) + main.
 *
 * No PageHeader breadcrumb here — the active tool is already obvious from
 * the highlighted ToolsRail entry, the global TopBar's "Tools" pill, and
 * the tool's own internal heading. The second-level breadcrumb was
 * redundant chrome (matches the same decision made for /rooms).
 */

import { ToolsRail } from '@/components/layout/ToolsRail';

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ToolsRail />
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </>
  );
}
