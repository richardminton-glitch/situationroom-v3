'use client';

/**
 * TopBar — global primary navigation. Replaces the per-route Sidebar.
 *
 * Layout:
 *   [logo] [Workspace · Briefings · Tools · Rooms · Support]   [Search] [OPS] [User]
 *
 * Clicking the logo returns to `/`. The active destination is derived from
 * the current pathname and highlighted. Search opens the ⌘K palette
 * (no-op until Phase 4). OPS opens the chat slide-over (state owned by the
 * (app) layout in Phase 2; Phase 3 lifts to context).
 *
 * Mobile (≤768px): collapses to [hamburger | logo | OPS | user]. Hamburger
 * opens a drawer with the 5 destinations stacked vertically.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Crosshair,
  Diamond,
  GraduationCap,
  Heart,
  List,
  MagnifyingGlass,
  Newspaper,
  SquaresFour,
  Wrench,
  X,
} from '@phosphor-icons/react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { UserMenu } from './UserMenu';
import { openSectionRail } from './sectionRailBus';

interface Destination {
  label:    string;
  href:     string;
  /** Pathname is "active" when it strictly equals href OR starts with one of these prefixes. */
  matches:  (path: string) => boolean;
  icon:     React.ReactNode;
  /** True when this destination owns a SectionRail — tapping while already
   *  on this section should open the rail drawer, not re-navigate. */
  hasRail?: boolean;
}

const DESTINATIONS: Destination[] = [
  {
    label:   'Workspace',
    href:    '/',
    matches: (p) => p === '/',
    icon:    <SquaresFour size={14} />,
    hasRail: true,
  },
  {
    label:   'Briefings',
    href:    '/briefings',
    matches: (p) => p === '/briefings' || p.startsWith('/briefing/'),
    icon:    <Newspaper size={14} />,
  },
  {
    label:   'Tools',
    href:    '/tools/dca-signal',
    matches: (p) => p.startsWith('/tools'),
    icon:    <Wrench size={14} />,
    hasRail: true,
  },
  {
    label:   'Rooms',
    href:    '/rooms/members',
    matches: (p) => p.startsWith('/rooms'),
    icon:    <Crosshair size={14} />,
    hasRail: true,
  },
  {
    label:   'Schoolroom',
    href:    '/vienna-school',
    matches: (p) => p.startsWith('/vienna-school'),
    icon:    <GraduationCap size={14} />,
  },
  {
    label:   'Support',
    href:    '/support',
    matches: (p) => p === '/support',
    icon:    <Heart size={14} />,
  },
];

interface TopBarProps {
  opsRoomOpen?: boolean;
  onToggleOpsRoom?: () => void;
  chatUnread?: number;
  onOpenSearch?: () => void;
}

export function TopBar({
  opsRoomOpen = false,
  onToggleOpsRoom,
  chatUnread = 0,
  onOpenSearch,
}: TopBarProps) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className="shrink-0 border-b relative z-30"
      style={{
        borderColor: 'var(--border-primary)',
        backgroundColor: 'var(--bg-secondary)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <div className="flex items-center justify-between px-3 md:px-4" style={{ minHeight: '48px' }}>
        {/* ── Left: hamburger (mobile) + logo ── */}
        <div className="flex items-center gap-2">
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="flex items-center justify-center rounded"
              style={{
                width: '32px',
                height: '32px',
                color: 'var(--text-primary)',
                backgroundColor: mobileMenuOpen ? 'var(--bg-card)' : 'transparent',
                border: '1px solid transparent',
              }}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X size={18} /> : <List size={18} weight="bold" />}
            </button>
          )}

          <Link
            href="/"
            className="flex items-center gap-2 px-1 transition-opacity hover:opacity-80"
            style={{ textDecoration: 'none' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-192.png"
              alt=""
              width={isMobile ? 22 : 26}
              height={isMobile ? 22 : 26}
              style={{ display: 'block', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}
            />
            <span
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: isMobile ? '13px' : '15px',
                fontWeight: 'normal',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
              }}
            >
              Situation Room
            </span>
          </Link>
        </div>

        {/* ── Center: primary destinations (desktop only) ── */}
        {!isMobile && (
          <nav className="flex items-center gap-1" aria-label="Primary">
            {DESTINATIONS.map((dest) => {
              const active = dest.matches(pathname);
              return (
                <Link
                  key={dest.href}
                  href={dest.href}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors"
                  style={{
                    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                    backgroundColor: active ? 'var(--bg-card)' : 'transparent',
                    border: `1px solid ${active ? 'var(--border-primary)' : 'transparent'}`,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <span style={{ opacity: active ? 1 : 0.7 }}>{dest.icon}</span>
                  <span>{dest.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* ── Right: search + ops + user ── */}
        <div className="flex items-center gap-1 md:gap-2 relative">
          {!isMobile && (
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-opacity hover:opacity-80"
              style={{
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                letterSpacing: '0.04em',
              }}
              title="Search (⌘K — coming soon)"
            >
              <MagnifyingGlass size={12} />
              <span className="hidden lg:inline">Search</span>
              <kbd
                className="hidden lg:inline-flex items-center justify-center text-[9px] px-1 rounded"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                ⌘K
              </kbd>
            </button>
          )}

          {onToggleOpsRoom && (
            <button
              onClick={onToggleOpsRoom}
              className="relative flex items-center gap-1 px-2.5 py-1 rounded transition-colors"
              style={{
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.1em',
                fontSize: '10px',
                backgroundColor: opsRoomOpen ? 'var(--accent-primary)' : 'var(--bg-card)',
                color: opsRoomOpen ? 'var(--bg-primary)' : 'var(--text-muted)',
                border: '1px solid var(--border-primary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                animation: chatUnread > 0 && !opsRoomOpen ? 'ops-pulse 2s ease-in-out infinite' : 'none',
              }}
              title="Ops Chat"
            >
              <span>OPS</span>
              <Diamond size={9} weight="regular" />
              {chatUnread > 0 && !opsRoomOpen && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    backgroundColor: '#b84040',
                    color: '#fff',
                    fontSize: '8px',
                    fontWeight: 700,
                    lineHeight: 1,
                    minWidth: '14px',
                    height: '14px',
                    borderRadius: '7px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                  }}
                >
                  {chatUnread > 9 ? '9+' : chatUnread}
                </span>
              )}
            </button>
          )}

          <UserMenu />
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      {isMobile && mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)', top: '48px' }}
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav
            className="absolute left-0 right-0 z-[100] border-b"
            style={{
              top: '48px',
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
            }}
            aria-label="Primary mobile"
          >
            {DESTINATIONS.map((dest) => {
              const active = dest.matches(pathname);
              const rowStyle = {
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                backgroundColor: active ? 'var(--bg-card)' : 'transparent',
                borderColor: 'var(--border-subtle)',
                fontSize: '13px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
                fontFamily: 'var(--font-mono)',
              };

              // On mobile, if the user is already on a section that owns a
              // rail, tapping that destination opens the rail drawer
              // (sub-nav) instead of being a no-op nav to the same URL.
              if (active && dest.hasRail) {
                return (
                  <button
                    key={dest.href}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openSectionRail();
                    }}
                    className="flex items-center gap-3 px-4 py-3 border-b transition-colors w-full text-left"
                    style={rowStyle}
                  >
                    <span>{dest.icon}</span>
                    <span>{dest.label}</span>
                    <span
                      className="ml-auto"
                      style={{ fontSize: '10px', opacity: 0.6 }}
                    >
                      Section menu →
                    </span>
                  </button>
                );
              }

              return (
                <Link
                  key={dest.href}
                  href={dest.href}
                  className="flex items-center gap-3 px-4 py-3 border-b transition-colors"
                  style={rowStyle}
                >
                  <span>{dest.icon}</span>
                  <span>{dest.label}</span>
                </Link>
              );
            })}
          </nav>
        </>
      )}
    </header>
  );
}
