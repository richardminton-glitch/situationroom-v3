'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';
import { useTier } from '@/hooks/useTier';
import { TIER_LABELS } from '@/lib/auth/tier';
import { SubscriptionModal } from '@/components/auth/SubscriptionModal';
import { FundingBar } from '@/components/widgets/FundingBar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Tier } from '@/types';
import type { LayoutPanelItem } from '@/lib/panels/layouts';
import type { ReactNode } from 'react';
import { isAdmin as checkAdmin } from '@/lib/auth/tier';
import {
  SquaresFour,
  Newspaper,
  Crosshair,
  ChartLineUp,
  UserCircle,
  Heart,
  GearSix,
  Moon,
  Sun,
  CaretRight,
  CaretLeft,
  SignIn,
  Lightning,
  ShieldStar,
} from '@phosphor-icons/react';

// Tier requirements for each preset
const PRESET_TIER: Record<string, Exclude<Tier, 'free'> | null> = {
  'default':          null,       // free
  'full-data':        null,       // free
  'macro-focus':      'general',
  'onchain-deep-dive':'members',
  'ai':               'members',
};

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  requiresAuth?: boolean;
  requiredTier?: Exclude<Tier, 'free'>;
}

const ICON_SIZE = 18;
const ICON_WEIGHT = 'regular' as const;

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <SquaresFour size={ICON_SIZE} weight={ICON_WEIGHT} /> },
  { label: 'Briefings', href: '/briefings', icon: <Newspaper size={ICON_SIZE} weight={ICON_WEIGHT} />, requiresAuth: true },
  { label: 'Members Room', href: '/room', icon: <Crosshair size={ICON_SIZE} weight={ICON_WEIGHT} />, requiresAuth: true, requiredTier: 'members' },
  { label: 'Trading Pool', href: '/pool', icon: <ChartLineUp size={ICON_SIZE} weight={ICON_WEIGHT} />, requiresAuth: true, requiredTier: 'members' },
];

const SYSTEM_ITEMS: NavItem[] = [
  { label: 'Account', href: '/account', icon: <UserCircle size={ICON_SIZE} weight={ICON_WEIGHT} />, requiresAuth: true },
];

export interface DashboardControls {
  presets: { id: string; name: string; description: string }[];
  activePreset: string;
  onSwitchPreset: (id: string) => void;
  editMode: boolean;
  onToggleEdit: () => void;
  savedLayouts?: { id: string; name: string; panels: LayoutPanelItem[] }[];
  onLoadSavedLayout?: (layout: { id: string; name: string; panels: LayoutPanelItem[] }) => void;
  onDeleteSavedLayout?: (id: string) => void;
}

interface SidebarProps {
  dashboardControls?: DashboardControls;
}

const FONT_MIN = 11;
const FONT_MAX = 20;
const FONT_DEFAULT = 14;

const TOOLTIP_DISMISS_MS = 4000;

export function Sidebar({ dashboardControls }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sr-font-size');
      return stored ? parseInt(stored, 10) : FONT_DEFAULT;
    }
    return FONT_DEFAULT;
  });
  const [tooltip, setTooltip] = useState<{ id: string; requiredTier: Exclude<Tier, 'free'> } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalTier, setModalTier] = useState<Exclude<Tier, 'free'>>('general');
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { canAccess, userTier } = useTier();
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    localStorage.setItem('sr-font-size', String(fontSize));
  }, [fontSize]);

  function showLockedTooltip(id: string, requiredTier: Exclude<Tier, 'free'>) {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltip({ id, requiredTier });
    tooltipTimer.current = setTimeout(() => setTooltip(null), TOOLTIP_DISMISS_MS);
  }

  function openModal(tier: Exclude<Tier, 'free'>) {
    setModalTier(tier);
    setShowModal(true);
    setTooltip(null);
  }

  return (
    <>
      <aside
        className="flex flex-col h-full border-r transition-all duration-300 shrink-0"
        style={{
          width: collapsed ? '60px' : '220px',
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-primary)',
        }}
      >
        {/* Logo / collapse toggle */}
        <div
          className="flex items-center justify-between px-4 py-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {!collapsed && (
            <span
              className="text-sm tracking-tight truncate uppercase"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: 'var(--text-primary)', letterSpacing: '0.12em', fontWeight: 'normal' }}
            >
              Situation Room
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <CaretRight size={16} /> : <CaretLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto">
          <div className="space-y-1">
            {NAV_ITEMS.filter((item) => !item.requiresAuth || user).map((item) => {
              const active = pathname === item.href;
              const navLocked = item.requiredTier ? !canAccess(item.requiredTier) : false;
              const navTooltipVisible = tooltip?.id === `__nav_${item.href}`;

              if (navLocked && item.requiredTier) {
                return (
                  <div key={item.href}>
                    <button
                      onClick={() => showLockedTooltip(`__nav_${item.href}`, item.requiredTier!)}
                      className="flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors w-full text-left"
                      style={{
                        backgroundColor: 'transparent',
                        color: 'var(--text-muted)',
                        border: '1px solid transparent',
                        opacity: 0.6,
                      }}
                      title={collapsed ? `${item.label} (${TIER_LABELS[item.requiredTier]} required)` : undefined}
                    >
                      <span className="text-base shrink-0">{item.icon}</span>
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          <span style={{ fontSize: '9px', color: 'var(--accent-primary)', letterSpacing: '0.06em' }}>
                            {TIER_LABELS[item.requiredTier].toUpperCase()} ↑
                          </span>
                        </>
                      )}
                    </button>
                    {navTooltipVisible && !collapsed && item.requiredTier && (
                      <div
                        style={{
                          background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                          padding: '8px 10px', margin: '2px 0 4px',
                          fontSize: '10px', color: 'var(--text-secondary)', lineHeight: '1.5',
                        }}
                      >
                        <div style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>
                          {TIER_LABELS[item.requiredTier]} required
                        </div>
                        <button
                          onClick={() => openModal(item.requiredTier!)}
                          style={{
                            background: 'none', border: 'none', padding: 0,
                            color: 'var(--accent-primary)', cursor: 'pointer',
                            fontFamily: 'var(--font-mono)', fontSize: '10px',
                            letterSpacing: '0.06em',
                          }}
                        >
                          SUBSCRIBE <Lightning size={12} weight="fill" style={{ display: 'inline', verticalAlign: 'middle' }} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors"
                    style={{
                      backgroundColor: active ? 'var(--bg-card)' : 'transparent',
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      border: active ? '1px solid var(--border-primary)' : '1px solid transparent',
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="text-base shrink-0">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </Link>

                  {/* Dashboard sub-items: presets + edit toggle (auth required) */}
                  {item.href === '/' && active && !collapsed && dashboardControls && user && (
                    <div className="ml-7 mt-1 mb-2 space-y-1">
                      {dashboardControls.presets.map((preset) => {
                        const lockedTier = PRESET_TIER[preset.id];
                        const isLocked = lockedTier !== null && lockedTier !== undefined && !canAccess(lockedTier);
                        const isActive = dashboardControls.activePreset === preset.id;
                        const isShowingTooltip = tooltip?.id === preset.id;

                        return (
                          <div key={preset.id}>
                            <button
                              onClick={() => {
                                if (isLocked && lockedTier) {
                                  showLockedTooltip(preset.id, lockedTier);
                                } else {
                                  dashboardControls.onSwitchPreset(preset.id);
                                }
                              }}
                              className="flex items-center justify-between w-full text-left px-2 py-1 rounded text-xs transition-colors"
                              style={{
                                backgroundColor: isActive && !isLocked ? 'var(--bg-card)' : 'transparent',
                                color: isLocked ? 'var(--text-muted)' : isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                                border: isActive && !isLocked ? '1px solid var(--border-subtle)' : '1px solid transparent',
                                opacity: isLocked ? 0.6 : 1,
                              }}
                              title={preset.description}
                            >
                              <span>{preset.name}</span>
                              {isLocked && lockedTier && (
                                <span style={{ fontSize: '9px', color: 'var(--accent-primary)', letterSpacing: '0.06em' }}>
                                  {TIER_LABELS[lockedTier].toUpperCase()} ↑
                                </span>
                              )}
                            </button>

                            {/* Locked tooltip */}
                            {isShowingTooltip && lockedTier && (
                              <div
                                style={{
                                  background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                                  padding: '8px 10px', margin: '2px 0 4px',
                                  fontSize: '10px', color: 'var(--text-secondary)', lineHeight: '1.5',
                                }}
                              >
                                <div style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>
                                  {TIER_LABELS[lockedTier]} required
                                </div>
                                <button
                                  onClick={() => openModal(lockedTier)}
                                  style={{
                                    background: 'none', border: 'none', padding: 0,
                                    color: 'var(--accent-primary)', cursor: 'pointer',
                                    fontFamily: 'var(--font-mono)', fontSize: '10px',
                                    letterSpacing: '0.06em',
                                  }}
                                >
                                  SUBSCRIBE <Lightning size={12} weight="fill" style={{ display: 'inline', verticalAlign: 'middle' }} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {dashboardControls.activePreset === 'custom' && (
                        <span className="block px-2 py-1 text-xs" style={{ color: 'var(--accent-primary)' }}>
                          Custom
                        </span>
                      )}

                      {/* Saved layouts — VIP only */}
                      {canAccess('vip') && dashboardControls.savedLayouts && dashboardControls.savedLayouts.length > 0 && (
                        <div className="mt-2 mb-1">
                          <span
                            className="block px-2 pb-1 text-xs uppercase tracking-wider"
                            style={{ color: 'var(--text-muted)', fontSize: '9px', letterSpacing: '0.08em' }}
                          >
                            Saved
                          </span>
                          {dashboardControls.savedLayouts.map((sl) => (
                            <div key={sl.id} className="flex items-center group">
                              <button
                                onClick={() => dashboardControls.onLoadSavedLayout?.(sl)}
                                className="flex-1 text-left px-2 py-1 rounded text-xs transition-colors"
                                style={{
                                  color: 'var(--text-secondary)',
                                  backgroundColor: 'transparent',
                                  border: '1px solid transparent',
                                }}
                                title={`Load "${sl.name}"`}
                              >
                                {sl.name}
                              </button>
                              <button
                                onClick={() => dashboardControls.onDeleteSavedLayout?.(sl.id)}
                                className="px-1 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                                title="Delete layout"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Edit Layout — VIP locked */}
                      {(() => {
                        const editLocked = !canAccess('vip');
                        const editTooltipVisible = tooltip?.id === '__edit';
                        return (
                          <div>
                            <button
                              onClick={() => {
                                if (editLocked) {
                                  showLockedTooltip('__edit', 'vip');
                                } else {
                                  dashboardControls.onToggleEdit();
                                }
                              }}
                              className="flex items-center justify-between w-full text-left px-2 py-1 rounded text-xs transition-colors mt-1"
                              style={{
                                backgroundColor: dashboardControls.editMode && !editLocked ? 'var(--accent-primary)' : 'transparent',
                                color: editLocked ? 'var(--text-muted)' : dashboardControls.editMode ? 'var(--bg-primary)' : 'var(--text-muted)',
                                border: dashboardControls.editMode && !editLocked ? 'none' : '1px solid var(--border-subtle)',
                                opacity: editLocked ? 0.6 : 1,
                              }}
                            >
                              <span>{dashboardControls.editMode ? '✓ Done Editing' : 'Edit Layout'}</span>
                              {editLocked && (
                                <span style={{ fontSize: '9px', color: 'var(--accent-primary)', letterSpacing: '0.06em' }}>
                                  VIP ↑
                                </span>
                              )}
                            </button>
                            {editTooltipVisible && (
                              <div
                                style={{
                                  background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                                  padding: '8px 10px', margin: '2px 0 4px',
                                  fontSize: '10px', color: 'var(--text-secondary)',
                                }}
                              >
                                <div style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>VIP required</div>
                                <button
                                  onClick={() => openModal('vip')}
                                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-primary)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '10px' }}
                                >
                                  SUBSCRIBE <Lightning size={12} weight="fill" style={{ display: 'inline', verticalAlign: 'middle' }} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Support link — always visible */}
          <Link
            href="/support"
            className="flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors mt-1"
            style={{
              color: pathname === '/support' ? 'var(--text-primary)' : 'var(--accent-primary)',
              backgroundColor: pathname === '/support' ? 'var(--bg-card)' : 'transparent',
              border: pathname === '/support' ? '1px solid var(--border-primary)' : '1px solid transparent',
            }}
            title={collapsed ? 'Support the project' : undefined}
          >
            <span className="text-base shrink-0"><Heart size={ICON_SIZE} weight={ICON_WEIGHT} /></span>
            {!collapsed && <span>Support →</span>}
          </Link>

          {/* System section */}
          {user && (
            <>
              <div
                className="mt-6 mb-2 px-3"
                style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}
              >
                {!collapsed && (
                  <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    System
                  </span>
                )}
              </div>
              {SYSTEM_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors"
                    style={{
                      backgroundColor: active ? 'var(--bg-card)' : 'transparent',
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      border: active ? '1px solid var(--border-primary)' : '1px solid transparent',
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="text-base shrink-0">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}

              {/* Admin — only visible to admin users */}
              {checkAdmin(user.email) && (
                <Link
                  href="/admin"
                  className="flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors"
                  style={{
                    backgroundColor: pathname === '/admin' ? 'var(--bg-card)' : 'transparent',
                    color: pathname === '/admin' ? '#7c5cbf' : '#7c5cbf',
                    border: pathname === '/admin' ? '1px solid var(--border-primary)' : '1px solid transparent',
                    opacity: pathname === '/admin' ? 1 : 0.8,
                  }}
                  title={collapsed ? 'Admin' : undefined}
                >
                  <span className="text-base shrink-0"><ShieldStar size={ICON_SIZE} weight={ICON_WEIGHT} /></span>
                  {!collapsed && <span>Admin</span>}
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Bottom section */}
        <div
          className="px-3 py-3 border-t space-y-2"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {/* Funding bar compact — only when expanded */}
          {!collapsed && (
            <FundingBar variant="compact" onSubscribeClick={() => openModal('general')} />
          )}

          {/* Font size */}
          <div>
            <button
              onClick={() => {
                if (collapsed) setCollapsed(false);
                setMenuOpen(!menuOpen);
              }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded text-sm transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              title={collapsed ? 'Settings' : undefined}
            >
              <span className="text-base shrink-0"><GearSix size={ICON_SIZE} weight={ICON_WEIGHT} /></span>
              {!collapsed && <span>Settings</span>}
            </button>

            {menuOpen && (
              <div
                className="mx-2 mb-1 px-2 py-2 rounded"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
              >
                {!collapsed && (
                  <p className="text-xs mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    Font Size
                  </p>
                )}
                <div className="flex items-center gap-2 justify-center">
                  <button
                    onClick={() => setFontSize(f => Math.max(FONT_MIN, f - 1))}
                    className="w-6 h-6 flex items-center justify-center rounded text-sm font-bold transition-opacity hover:opacity-70"
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                  >−</button>
                  {!collapsed && (
                    <span className="text-xs tabular-nums" style={{ color: 'var(--text-primary)', minWidth: '32px', textAlign: 'center' }}>
                      {fontSize}px
                    </span>
                  )}
                  <button
                    onClick={() => setFontSize(f => Math.min(FONT_MAX, f + 1))}
                    className="w-6 h-6 flex items-center justify-center rounded text-sm font-bold transition-opacity hover:opacity-70"
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                  >+</button>
                </div>
                {!collapsed && fontSize !== FONT_DEFAULT && (
                  <button
                    onClick={() => setFontSize(FONT_DEFAULT)}
                    className="block w-full text-center text-xs mt-1 hover:underline"
                    style={{ color: 'var(--text-muted)' }}
                  >Reset</button>
                )}
              </div>
            )}
          </div>

          {/* Dark mode — gated for free users */}
          {(() => {
            const darkLocked = !canAccess('general');
            const darkTooltipVisible = tooltip?.id === '__dark';
            return (
              <div>
                <button
                  onClick={() => {
                    if (darkLocked) {
                      showLockedTooltip('__dark', 'general');
                    } else {
                      setTheme(theme === 'parchment' ? 'dark' : 'parchment');
                    }
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)', opacity: darkLocked ? 0.7 : 1 }}
                  title={collapsed ? (theme === 'parchment' ? 'Dark mode' : 'Parchment') : undefined}
                >
                  <span className="text-base shrink-0">{theme === 'parchment' ? <Moon size={ICON_SIZE} weight={ICON_WEIGHT} /> : <Sun size={ICON_SIZE} weight={ICON_WEIGHT} />}</span>
                  {!collapsed && (
                    <span className="flex-1 text-left">{theme === 'parchment' ? 'Dark mode' : 'Parchment'}</span>
                  )}
                  {!collapsed && darkLocked && (
                    <span style={{ fontSize: '9px', color: 'var(--accent-primary)', letterSpacing: '0.06em' }}>
                      GENERAL ↑
                    </span>
                  )}
                </button>
                {darkTooltipVisible && !collapsed && (
                  <div
                    style={{
                      background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                      padding: '8px 10px', margin: '2px 0', fontSize: '10px',
                    }}
                  >
                    <div style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>General required</div>
                    <button
                      onClick={() => openModal('general')}
                      style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-primary)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '10px' }}
                    >
                      SUBSCRIBE <Lightning size={12} weight="fill" style={{ display: 'inline', verticalAlign: 'middle' }} />
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {user ? (
            <div className="flex items-center gap-3 px-3 py-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)' }}
              >
                {(user.displayName || user.email)[0].toUpperCase()}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {user.displayName || user.email.split('@')[0]}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={logout} className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>
                      Log out
                    </button>
                    {userTier !== 'free' && (
                      <span style={{ fontSize: '9px', color: 'var(--accent-primary)', letterSpacing: '0.06em' }}>
                        {userTier.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-3 px-3 py-2 rounded text-sm"
              style={{ color: 'var(--accent-primary)' }}
              title={collapsed ? 'Sign in' : undefined}
            >
              <span className="text-base shrink-0"><SignIn size={ICON_SIZE} weight={ICON_WEIGHT} /></span>
              {!collapsed && <span>Sign in</span>}
            </Link>
          )}
        </div>
      </aside>

      {showModal && (
        <SubscriptionModal
          initialTier={modalTier}
          onClose={() => setShowModal(false)}
          onSuccess={() => setShowModal(false)}
        />
      )}
    </>
  );
}
