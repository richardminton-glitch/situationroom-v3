'use client';

/**
 * (app) — global shell layout for every authenticated/shelled route.
 *
 * Owns:
 *   - TopBar (primary nav)
 *   - IntelStrip (universal status bar)
 *   - OpsRoomProvider + OpsRoom slide-over (chat reachable from any page)
 *   - CommandPaletteProvider + CommandPalette (⌘K fuzzy search + nav)
 *
 * Section layouts compose into the children slot as a horizontal flex row
 * containing rail + main column. When OpsRoom is open, the section row gets
 * a marginRight to make room for the 320px slide-over.
 */

import { TopBar } from '@/components/layout/TopBar';
import { IntelStrip } from '@/components/layout/IntelStrip';
import { OpsRoom } from '@/components/chat/OpsRoom';
import { OpsRoomProvider, useOpsRoom } from '@/components/layout/OpsRoomProvider';
import { CommandPaletteProvider, useCommandPalette } from '@/components/layout/CommandPaletteProvider';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { useIsMobile } from '@/hooks/useIsMobile';

const OPS_SLIDEOVER_WIDTH = 320;

function ShellChrome({ children }: { children: React.ReactNode }) {
  const { open: opsOpen, setOpen: setOpsOpen, toggle: toggleOps, unreadCount } = useOpsRoom();
  const { setOpen: setPaletteOpen } = useCommandPalette();
  const isMobile = useIsMobile();

  // Shift section content to make room for the slide-over (desktop only —
  // mobile OpsRoom is full-width and overlays).
  const contentMarginRight = !isMobile && opsOpen ? OPS_SLIDEOVER_WIDTH : 0;

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <TopBar
        opsRoomOpen={opsOpen}
        onToggleOpsRoom={toggleOps}
        chatUnread={unreadCount}
        onOpenSearch={() => setPaletteOpen(true)}
      />
      <IntelStrip />

      <div
        className="flex flex-1 min-h-0 overflow-hidden"
        style={{
          marginRight: `${contentMarginRight}px`,
          transition: 'margin-right 0.2s ease',
        }}
      >
        {children}
      </div>

      <OpsRoom open={opsOpen} onClose={() => setOpsOpen(false)} />
      <CommandPalette />
    </div>
  );
}

export default function AppShellGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <OpsRoomProvider>
      <CommandPaletteProvider>
        <ShellChrome>{children}</ShellChrome>
      </CommandPaletteProvider>
    </OpsRoomProvider>
  );
}
