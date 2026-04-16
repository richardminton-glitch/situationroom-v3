'use client';

/**
 * /(workspace) — wraps the dashboard canvas (page.tsx) with:
 *   - WorkspaceContextProvider: bridge so the rail can read controls the page owns
 *   - WorkspaceRail (left): preset switcher, custom dashboards, edit toggle
 *   - main: the canvas itself
 *
 * Inherits the global TopBar + IntelStrip from (app)/layout.tsx.
 */

import { WorkspaceContextProvider } from './WorkspaceContext';
import { WorkspaceRail } from '@/components/layout/WorkspaceRail';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceContextProvider>
      <WorkspaceRail />
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {children}
      </main>
    </WorkspaceContextProvider>
  );
}
