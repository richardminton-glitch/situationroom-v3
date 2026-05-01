'use client';

/**
 * CommandPalette — ⌘K fuzzy-search nav + actions.
 *
 * Opens via:
 *   - The Search button in TopBar
 *   - cmd+k / ctrl+k from any focused element (handled in CommandPaletteProvider)
 *
 * Indexes:
 *   - All routes from src/lib/nav/routes.ts (filtered: admin-only routes
 *     hidden from non-admins; tier-locked routes shown but route to /support)
 *   - Quick actions: Toggle Ops Chat, Toggle theme (gated by general tier),
 *     Sign in / Log out
 *
 * Deferred to follow-up:
 *   - Dashboard preset switching (needs cross-route plumbing — current
 *     workspace-page-owned state can't be driven from outside the page)
 *   - Custom dashboard switching (same)
 *   - Recent briefings index
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  Atom,
  ChartLine,
  ChartLineUp,
  Crosshair,
  Diamond,
  Gauge,
  HardHat,
  Heart,
  MapTrifold,
  Moon,
  Newspaper,
  Percent,
  ShieldStar,
  SignIn,
  SignOut,
  SquaresFour,
  Sun,
  UserCircle,
} from '@phosphor-icons/react';

import { useCommandPalette } from './CommandPaletteProvider';
import { useOpsRoom } from './OpsRoomProvider';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';
import { useTier } from '@/hooks/useTier';
import { isAdmin as checkAdmin, TIER_LABELS } from '@/lib/auth/tier';
import { NAV_ROUTES, NAV_SECTION_ORDER, type NavRoute, type NavSection } from '@/lib/nav/routes';

// ── Icon mapping per route href — keeps the registry data-only ────────────
const ROUTE_ICONS: Record<string, React.ReactNode> = {
  '/':                  <SquaresFour size={14} />,
  '/briefings':         <Newspaper   size={14} />,
  '/tools/dca-signal':  <ChartLine   size={14} />,
  '/tools/cycle-gauge': <Gauge       size={14} />,
  '/tools/power-law':   <ChartLineUp size={14} />,
  '/tools/real-yields': <Percent     size={14} />,
  '/tools/mining':      <HardHat     size={14} />,
  '/tools/map':              <MapTrifold size={14} />,
  '/tools/utxo-cosmography': <Atom       size={14} />,
  '/rooms/members':     <Crosshair   size={14} />,
  '/rooms/trading-desk': <ChartLineUp size={14} />,
  '/support':           <Heart       size={14} />,
  '/account':           <UserCircle  size={14} />,
  '/admin':             <ShieldStar  size={14} />,
};

export function CommandPalette() {
  const router = useRouter();
  const { open, setOpen } = useCommandPalette();
  const { toggle: toggleOpsRoom } = useOpsRoom();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { canAccess } = useTier();

  const isAdminUser = user ? checkAdmin(user.email) : false;
  const canChat = canAccess('members');
  const canDarkMode = canAccess('general');

  // Reset query whenever the palette opens
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  // Group routes by section, filtering admin-only for non-admins
  const grouped = useMemo(() => {
    const visible = NAV_ROUTES.filter((r) => !r.adminOnly || isAdminUser);
    const map = new Map<NavSection, NavRoute[]>();
    for (const route of visible) {
      const list = map.get(route.section) ?? [];
      list.push(route);
      map.set(route.section, list);
    }
    return NAV_SECTION_ORDER
      .map((section) => ({ section, routes: map.get(section) ?? [] }))
      .filter((g) => g.routes.length > 0);
  }, [isAdminUser]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function runAction(fn: () => void | Promise<void>) {
    setOpen(false);
    void fn();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center pt-[10vh] px-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-md shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          fontFamily: 'var(--font-mono)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          label="Command palette"
          shouldFilter
          loop
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setOpen(false);
            }
          }}
        >
          <div
            className="flex items-center px-3 py-2.5 border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <span className="mr-2" style={{ color: 'var(--text-muted)', fontSize: 13 }}>⌘K</span>
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Jump to a section, tool, or action…"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.02em',
              }}
            />
            <button
              onClick={() => setOpen(false)}
              className="ml-2 px-1.5 py-0.5 text-xs rounded"
              style={{
                color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
              title="Close (Esc)"
            >
              esc
            </button>
          </div>

          <Command.List
            className="max-h-[60vh] overflow-y-auto py-1.5"
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            <Command.Empty
              className="px-4 py-6 text-xs text-center"
              style={{ color: 'var(--text-muted)' }}
            >
              No results.
            </Command.Empty>

            {/* ── Navigation groups ── */}
            {grouped.map((g) => (
              <Command.Group
                key={g.section}
                heading={
                  <span
                    style={{
                      fontSize: 9,
                      letterSpacing: '0.14em',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {g.section}
                  </span>
                }
              >
                {g.routes.map((route) => {
                  const locked = route.requiredTier ? !canAccess(route.requiredTier) : false;
                  const value = `${route.section} ${route.label} ${(route.keywords ?? []).join(' ')}`;
                  return (
                    <PaletteItem
                      key={route.href}
                      value={value}
                      icon={ROUTE_ICONS[route.href]}
                      label={route.label}
                      description={route.description}
                      badge={
                        locked && route.requiredTier
                          ? `${TIER_LABELS[route.requiredTier].toUpperCase()} ↑`
                          : undefined
                      }
                      onSelect={() => go(locked ? '/support' : route.href)}
                    />
                  );
                })}
              </Command.Group>
            ))}

            {/* ── Quick actions ── */}
            <Command.Group
              heading={
                <span
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.14em',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Actions
                </span>
              }
            >
              {user && (
                <PaletteItem
                  value="open ops chat slide-over messages members"
                  icon={<Diamond size={14} />}
                  label="Open Ops Chat"
                  description={canChat ? 'Toggle the chat slide-over' : 'Members tier required'}
                  badge={canChat ? undefined : `${TIER_LABELS.members.toUpperCase()} ↑`}
                  onSelect={() => runAction(canChat ? toggleOpsRoom : () => router.push('/support'))}
                />
              )}

              {user && (
                <PaletteItem
                  value={`toggle theme ${theme === 'dark' ? 'parchment light' : 'dark'} mode`}
                  icon={theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                  label={theme === 'dark' ? 'Switch to parchment mode' : 'Switch to dark mode'}
                  description={canDarkMode ? 'Toggle theme preference' : 'General tier required for dark mode'}
                  badge={canDarkMode ? undefined : `${TIER_LABELS.general.toUpperCase()} ↑`}
                  onSelect={() =>
                    runAction(() => {
                      if (!canDarkMode) {
                        router.push('/support');
                        return;
                      }
                      const next = theme === 'dark' ? 'parchment' : 'dark';
                      setTheme(next);
                      // Persist to server (non-blocking)
                      fetch('/api/user/preferences', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ themePref: next }),
                      }).catch(() => {});
                    })
                  }
                />
              )}

              {!user && (
                <PaletteItem
                  value="sign in login"
                  icon={<SignIn size={14} />}
                  label="Sign in"
                  onSelect={() => go('/login')}
                />
              )}

              {user && (
                <PaletteItem
                  value="log out sign out logout"
                  icon={<SignOut size={14} />}
                  label="Log out"
                  onSelect={() => runAction(() => logout())}
                />
              )}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

// ── A single result row ───────────────────────────────────────────────────
interface PaletteItemProps {
  /** cmdk searchable string — combine label + keywords + section. */
  value:        string;
  icon:         React.ReactNode;
  label:        string;
  description?: string;
  badge?:       string;
  onSelect:     () => void;
}

function PaletteItem({ value, icon, label, description, badge, onSelect }: PaletteItemProps) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2 mx-1 my-0.5 rounded cursor-pointer"
      style={{
        color: 'var(--text-secondary)',
        backgroundColor: 'transparent',
      }}
    >
      <span className="shrink-0" style={{ width: 16, color: 'var(--text-muted)' }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 12, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
          {label}
        </div>
        {description && (
          <div
            className="truncate"
            style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}
          >
            {description}
          </div>
        )}
      </div>
      {badge && (
        <span
          className="shrink-0"
          style={{ fontSize: 9, color: 'var(--accent-primary)', letterSpacing: '0.06em' }}
        >
          {badge}
        </span>
      )}
    </Command.Item>
  );
}
