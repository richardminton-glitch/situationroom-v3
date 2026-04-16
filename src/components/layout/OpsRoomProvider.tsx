'use client';

/**
 * OpsRoomProvider — global open/close state + unread-count for the Ops Chat
 * slide-over.
 *
 * Mounted by (app)/layout.tsx so it wraps every shelled page. Any descendant
 * can `useOpsRoom()` to read or mutate the open state. This replaces the
 * per-page `useState` that previously lived in the workspace and bot-room
 * pages, and lets the bot-room's internal TopBar reuse the same source of
 * truth as the global TopBar OPS button.
 *
 * Why context (and not searchparams ?ops=1): each open/close would otherwise
 * trigger a full RSC payload re-fetch in Next 16, which defeats the
 * snappy slide-over UX and re-runs every server component on the page.
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useUnreadChat } from '@/hooks/useUnreadChat';
import { useTier } from '@/hooks/useTier';

interface OpsRoomCtxValue {
  open:        boolean;
  setOpen:     (open: boolean) => void;
  toggle:      () => void;
  unreadCount: number;
}

const OpsRoomCtx = createContext<OpsRoomCtxValue>({
  open:        false,
  setOpen:     () => {},
  toggle:      () => {},
  unreadCount: 0,
});

export function useOpsRoom(): OpsRoomCtxValue {
  return useContext(OpsRoomCtx);
}

export function OpsRoomProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { canAccess } = useTier();
  const canChat = canAccess('members');

  // Pause unread polling when chat is open OR the user can't see chat anyway —
  // gating both ways means free users never hit the chat API.
  const { unreadCount } = useUnreadChat(open || !canChat);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  const value = useMemo<OpsRoomCtxValue>(
    () => ({
      open,
      setOpen,
      toggle,
      unreadCount: canChat ? unreadCount : 0,
    }),
    [open, toggle, canChat, unreadCount]
  );

  return <OpsRoomCtx.Provider value={value}>{children}</OpsRoomCtx.Provider>;
}
