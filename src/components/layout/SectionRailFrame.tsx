'use client';

/**
 * SectionRailFrame — shared chrome for the contextual left rails (Workspace,
 * Tools, Rooms). Provides:
 *
 *  - Section title at the top
 *  - Collapse / expand toggle on desktop (persisted to sessionStorage per
 *    section so collapsing one rail doesn't collapse them all)
 *  - Mobile drawer behaviour (off-canvas, backdrop, hamburger trigger)
 *  - Consistent width, border, and background
 *
 * Children render inside the rail body and receive a `collapsed` prop via
 * context so individual nav rows can hide labels when narrow.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { CaretLeft, CaretRight, X } from '@phosphor-icons/react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { SECTION_RAIL_OPEN_EVENT } from './sectionRailBus';

// ── Collapsed context ─────────────────────────────────────────────────────
const RailCollapsedCtx = createContext<boolean>(false);

/** Read by individual rail items to know whether to hide labels. */
export function useRailCollapsed(): boolean {
  return useContext(RailCollapsedCtx);
}

interface SectionRailFrameProps {
  /** Stable identifier — also used for sessionStorage key. */
  sectionKey: 'workspace' | 'tools' | 'rooms';
  title: string;
  children: ReactNode;
}

const STORAGE_PREFIX = 'sr-rail-collapsed-';

export function SectionRailFrame({ sectionKey, title, children }: SectionRailFrameProps) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydrate collapsed state from sessionStorage
  useEffect(() => {
    setMounted(true);
    const stored = sessionStorage.getItem(`${STORAGE_PREFIX}${sectionKey}`);
    if (stored === '1') setCollapsed(true);
  }, [sectionKey]);

  // Persist on change
  useEffect(() => {
    if (!mounted) return;
    sessionStorage.setItem(`${STORAGE_PREFIX}${sectionKey}`, collapsed ? '1' : '0');
  }, [collapsed, sectionKey, mounted]);

  // Listen for TopBar's "open section rail" trigger (mobile only — replaces
  // the old floating hamburger so we don't have two burgers on screen).
  useEffect(() => {
    const handler = () => setDrawerOpen(true);
    window.addEventListener(SECTION_RAIL_OPEN_EVENT, handler);
    return () => window.removeEventListener(SECTION_RAIL_OPEN_EVENT, handler);
  }, []);

  // On mobile, force expanded inside the drawer; collapsed state is desktop-only
  const effectiveCollapsed = isMobile ? false : collapsed;

  return (
    <RailCollapsedCtx.Provider value={effectiveCollapsed}>
      {/* Mobile backdrop */}
      {isMobile && drawerOpen && (
        <div
          className="fixed inset-0 z-[99]"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside
        className="flex flex-col border-r shrink-0 transition-all duration-200"
        style={{
          width: isMobile ? '260px' : (collapsed ? '52px' : '200px'),
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-primary)',
          ...(isMobile
            ? {
                position: 'fixed' as const,
                top: 0,
                bottom: 0,
                left: drawerOpen ? '0' : '-260px',
                zIndex: 100,
                transition: 'left 0.25s ease',
              }
            : {}),
        }}
      >
        {/* Header — title + collapse/close */}
        <div
          className="flex items-center justify-between px-3 py-2.5 border-b shrink-0"
          style={{ borderColor: 'var(--border-subtle)', minHeight: '40px' }}
        >
          {!effectiveCollapsed && (
            <span
              className="text-xs uppercase truncate"
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                letterSpacing: '0.12em',
              }}
            >
              {title}
            </span>
          )}
          {isMobile ? (
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1 rounded hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
              aria-label={`Close ${title} menu`}
            >
              <X size={16} />
            </button>
          ) : (
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="p-1 rounded hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
              title={collapsed ? 'Expand' : 'Collapse'}
              aria-label={collapsed ? 'Expand rail' : 'Collapse rail'}
            >
              {collapsed ? <CaretRight size={14} /> : <CaretLeft size={14} />}
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-2 px-2">{children}</div>
      </aside>
    </RailCollapsedCtx.Provider>
  );
}
