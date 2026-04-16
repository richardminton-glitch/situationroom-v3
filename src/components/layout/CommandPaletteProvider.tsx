'use client';

/**
 * CommandPaletteProvider — global open/close state for the ⌘K palette.
 *
 * The provider also installs the global keyboard shortcut listener once
 * (cmd+k on Mac, ctrl+k everywhere) so the palette can be opened from any
 * focus state without each consumer re-binding it.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface CommandPaletteCtxValue {
  open:    boolean;
  setOpen: (open: boolean) => void;
  toggle:  () => void;
}

const CommandPaletteCtx = createContext<CommandPaletteCtxValue>({
  open:    false,
  setOpen: () => {},
  toggle:  () => {},
});

export function useCommandPalette(): CommandPaletteCtxValue {
  return useContext(CommandPaletteCtx);
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isShortcut =
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === 'k' &&
        !e.shiftKey &&
        !e.altKey;
      if (isShortcut) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo<CommandPaletteCtxValue>(
    () => ({ open, setOpen, toggle }),
    [open, toggle]
  );

  return <CommandPaletteCtx.Provider value={value}>{children}</CommandPaletteCtx.Provider>;
}
