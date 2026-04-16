/**
 * (content) — wrapper for rail-less rectangular content pages.
 *
 * Inherits TopBar + IntelStrip + global slide-overs from (app)/layout.tsx.
 * Adds a single scrollable <main> so the page body can overflow vertically
 * without being clipped by the shell's flex row.
 *
 * Section layouts that include a left rail (workspace, tools, rooms)
 * provide their own scrollable content area; this layout exists only for
 * pages that render content edge-to-edge without a rail (briefings,
 * briefing/[date], support, account, admin).
 */

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
      {children}
    </main>
  );
}
