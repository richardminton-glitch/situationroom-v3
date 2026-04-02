'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  requiresAuth?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: '◉' },
  { label: 'Briefings', href: '/briefings', icon: '◈' },
  { label: 'Members Room', href: '/room', icon: '◊', requiresAuth: true },
];

const SYSTEM_ITEMS: NavItem[] = [
  { label: 'Settings', href: '/settings', icon: '⚙', requiresAuth: true },
];

export interface DashboardControls {
  presets: { id: string; name: string; description: string }[];
  activePreset: string;
  onSwitchPreset: (id: string) => void;
  editMode: boolean;
  onToggleEdit: () => void;
}

interface SidebarProps {
  dashboardControls?: DashboardControls;
}

const FONT_MIN = 11;
const FONT_MAX = 20;
const FONT_DEFAULT = 14;

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
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    localStorage.setItem('sr-font-size', String(fontSize));
  }, [fontSize]);
  const pathname = usePathname();

  return (
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
          {collapsed ? '▸' : '◂'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        <div className="space-y-1">
          {NAV_ITEMS.filter((item) => !item.requiresAuth || user).map((item) => {
            const active = pathname === item.href;
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

                {/* Dashboard sub-items: presets + edit toggle */}
                {item.href === '/' && active && !collapsed && dashboardControls && (
                  <div className="ml-7 mt-1 mb-2 space-y-1">
                    {/* Layout presets */}
                    {dashboardControls.presets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => dashboardControls.onSwitchPreset(preset.id)}
                        className="block w-full text-left px-2 py-1 rounded text-xs transition-colors"
                        style={{
                          backgroundColor: dashboardControls.activePreset === preset.id ? 'var(--bg-card)' : 'transparent',
                          color: dashboardControls.activePreset === preset.id ? 'var(--text-primary)' : 'var(--text-muted)',
                          border: dashboardControls.activePreset === preset.id ? '1px solid var(--border-subtle)' : '1px solid transparent',
                        }}
                        title={preset.description}
                      >
                        {preset.name}
                      </button>
                    ))}
                    {dashboardControls.activePreset === 'custom' && (
                      <span className="block px-2 py-1 text-xs" style={{ color: 'var(--accent-primary)' }}>
                        Custom
                      </span>
                    )}
                    {/* Edit toggle */}
                    <button
                      onClick={dashboardControls.onToggleEdit}
                      className="block w-full text-left px-2 py-1 rounded text-xs transition-colors mt-1"
                      style={{
                        backgroundColor: dashboardControls.editMode ? 'var(--accent-primary)' : 'transparent',
                        color: dashboardControls.editMode ? 'var(--bg-primary)' : 'var(--text-muted)',
                        border: dashboardControls.editMode ? 'none' : '1px solid var(--border-subtle)',
                      }}
                    >
                      {dashboardControls.editMode ? '✓ Done Editing' : 'Edit Layout'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* System section */}
        {user && (
          <>
            <div
              className="mt-6 mb-2 px-3"
              style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}
            >
              {!collapsed && (
                <span
                  className="text-xs uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
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
          </>
        )}
      </nav>

      {/* Bottom section — theme toggle + user */}
      <div
        className="px-3 py-3 border-t space-y-2"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {/* Settings / font size button */}
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
            <span className="text-base shrink-0">⚙</span>
            {!collapsed && <span>Settings</span>}
          </button>

          {/* Font size controls — shown when menu open */}
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
                  title="Decrease font size"
                >
                  −
                </button>
                {!collapsed && (
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-primary)', minWidth: '32px', textAlign: 'center' }}>
                    {fontSize}px
                  </span>
                )}
                <button
                  onClick={() => setFontSize(f => Math.min(FONT_MAX, f + 1))}
                  className="w-6 h-6 flex items-center justify-center rounded text-sm font-bold transition-opacity hover:opacity-70"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                  title="Increase font size"
                >
                  +
                </button>
              </div>
              {!collapsed && fontSize !== FONT_DEFAULT && (
                <button
                  onClick={() => setFontSize(FONT_DEFAULT)}
                  className="block w-full text-center text-xs mt-1 hover:underline"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setTheme(theme === 'parchment' ? 'dark' : 'parchment')}
          className="flex items-center gap-3 w-full px-3 py-2 rounded text-sm transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          title={collapsed ? (theme === 'parchment' ? 'Dark mode' : 'Parchment') : undefined}
        >
          <span className="text-base shrink-0">{theme === 'parchment' ? '☽' : '☀'}</span>
          {!collapsed && <span>{theme === 'parchment' ? 'Dark mode' : 'Parchment'}</span>}
        </button>

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
                <button onClick={logout} className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>
                  Log out
                </button>
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
            <span className="text-base shrink-0">→</span>
            {!collapsed && <span>Sign in</span>}
          </Link>
        )}
      </div>
    </aside>
  );
}
