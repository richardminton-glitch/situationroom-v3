'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { useTheme } from '@/components/layout/ThemeProvider';
import { useData } from '@/components/layout/DataProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardGrid } from '@/components/layout/DashboardGrid';
import { PanelPicker } from '@/components/layout/PanelPicker';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { getDefaultForTheme, getPresetsForTheme, getPresetByIdForTheme, type LayoutPanelItem } from '@/lib/panels/layouts';
import { getPanelById } from '@/lib/panels/registry';
import { OpsRoom } from '@/components/chat/OpsRoom';
import { useTier } from '@/hooks/useTier';
import { useSavedLayouts } from '@/hooks/useSavedLayouts';
import { hasAccess, TIER_LABELS, TIER_BILLING } from '@/lib/auth/tier';
import { usePricing, formatTierPrice } from '@/hooks/usePricing';
import Link from 'next/link';
import { useUnreadChat } from '@/hooks/useUnreadChat';
import type { Theme, Tier } from '@/types';

// Tier requirements + locked view descriptions
const LOCKED_VIEWS: Record<string, { requiredTier: Exclude<Tier, 'free'>; name: string; description: string }> = {
  'macro-focus':      { requiredTier: 'general', name: 'Macro Focus',       description: 'Central bank balance sheet composition, 10-year policy rate history, inflation monitor across G7 nations, and macro context behind every number.' },
  'onchain-deep-dive':{ requiredTier: 'members', name: 'On-Chain Deep Dive',description: 'UTXO age distribution, long-term vs short-term holder supply, value of coin days destroyed, and supply at cost basis — the complete holder behaviour picture.' },
  'ai':               { requiredTier: 'members', name: 'AI Analysis',       description: 'AI-powered signal synthesis, cohort analysis, and structured market argument — deep AI reasoning applied to on-chain and macro data.' },
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const { userTier, canAccess } = useTier();
  const { error: dataError } = useData();
  const pricing = usePricing();
  // Always start on Full Overview; restore saved preset only for logged-in users
  const [activePreset, setActivePreset] = useState<string>('default');
  const [activeCustomId, setActiveCustomId] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutPanelItem[]>(() => {
    return getDefaultForTheme(theme).panels;
  });
  const restoredRef = useRef(false);

  // Once auth is resolved, restore the user's last preset from localStorage
  useEffect(() => {
    if (loading || restoredRef.current) return;
    restoredRef.current = true;
    if (!user) return; // non-logged-in → stay on Full Overview
    const saved = localStorage.getItem('sr-active-preset');
    const savedCustom = localStorage.getItem('sr-active-custom-id');
    if (savedCustom) {
      // Will be loaded when customDashboards populate
      setActiveCustomId(savedCustom);
    } else if (saved && saved !== 'default') {
      const preset = getPresetByIdForTheme(saved, theme);
      if (preset) {
        setActivePreset(saved);
        setLayout(preset.panels);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);
  const [editMode, setEditMode] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [opsRoomOpen, setOpsRoomOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const isVip = canAccess('vip');
  const {
    layouts: customDashboards,
    canCreate: canCreateDashboard,
    maxDashboards,
    createDashboard,
    deleteDashboard,
    renameDashboard,
    savePanels,
  } = useSavedLayouts(isVip);
  const { unreadCount: chatUnread } = useUnreadChat(opsRoomOpen);

  // When custom dashboards load, restore the active custom dashboard
  useEffect(() => {
    if (activeCustomId && customDashboards.length > 0) {
      const cd = customDashboards.find((d) => d.id === activeCustomId);
      if (cd) {
        setLayout(cd.panels);
      } else {
        // Custom dashboard was deleted — fall back to default
        setActiveCustomId(null);
        setActivePreset('default');
        setLayout(getDefaultForTheme(theme).panels);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customDashboards]);

  // Persist active view to localStorage (only for logged-in users)
  useEffect(() => {
    if (user) {
      if (activeCustomId) {
        localStorage.setItem('sr-active-custom-id', activeCustomId);
        localStorage.removeItem('sr-active-preset');
      } else {
        localStorage.setItem('sr-active-preset', activePreset);
        localStorage.removeItem('sr-active-custom-id');
      }
    }
  }, [activePreset, activeCustomId, user]);

  useEffect(() => {
    if (user?.themePref && user.themePref !== theme) {
      const t = user.themePref as Theme;
      setTheme(t);
      // Only update layout if viewing a preset (custom dashboards are theme-independent)
      if (!activeCustomId) {
        const preset = getPresetByIdForTheme(activePreset, t) ?? getDefaultForTheme(t);
        setLayout(preset.panels);
        setActivePreset(preset.id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.themePref]);

  // When the user manually switches theme (sidebar toggle), load that theme's
  // matching preset. Skip on initial mount — layout is already correct because
  // ThemeProvider reads the stored theme from localStorage before first render.
  const hasMounted = useRef(false);
  useEffect(() => {
    if (!hasMounted.current) { hasMounted.current = true; return; }
    // Custom dashboards don't change on theme switch
    if (activeCustomId) return;
    const matched = getPresetByIdForTheme(activePreset, theme);
    const next = matched ?? getDefaultForTheme(theme);
    setLayout(next.panels);
    setActivePreset(next.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  const switchPreset = useCallback((presetId: string) => {
    const preset = getPresetByIdForTheme(presetId, theme);
    if (preset) {
      setLayout(preset.panels);
      setActivePreset(presetId);
      setActiveCustomId(null);
      setEditMode(false); // Exit edit mode when switching to a preset
    }
  }, [theme]);

  const switchCustom = useCallback((dashboard: { id: string; name: string; panels: LayoutPanelItem[] }) => {
    setLayout(dashboard.panels);
    setActiveCustomId(dashboard.id);
    setActivePreset('');
  }, []);

  // Layout changes — auto-save to custom dashboard if one is active
  const handleLayoutChange = useCallback((newLayout: LayoutPanelItem[]) => {
    setLayout(newLayout);
    if (activeCustomId) {
      savePanels(activeCustomId, newLayout);
    }
  }, [activeCustomId, savePanels]);

  const GRID_SNAP = 44;
  const addPanel = useCallback((panelId: string) => {
    const entry = getPanelById(panelId);
    if (!entry) return;
    // UI components (separators) get unique instance IDs so multiple can coexist
    const instanceId = entry.uiComponent ? `${panelId}-${Date.now()}` : panelId;
    // Spawn at current scroll position, snapped to grid, with a small stagger.
    // Separators use half-grid (22px) snap so they sit between panel edges.
    const snap = entry.uiComponent ? 22 : GRID_SNAP;
    const scrollX = mainRef.current?.scrollLeft ?? 0;
    const scrollY = mainRef.current?.scrollTop ?? 0;
    const stagger = (layout.length % 4) * snap;
    const x = Math.round((scrollX + stagger) / snap) * snap + (entry.uiComponent ? 22 : 0);
    const y = Math.round((scrollY + stagger) / snap) * snap + (entry.uiComponent ? 22 : 0);
    const newLayout = [
      ...layout,
      {
        panelId: instanceId,
        x,
        y,
        w: entry.defaultW,
        h: entry.defaultH,
        collapsed: false,
        resizable: entry.resizable,
      },
    ];
    setLayout(newLayout);
    if (activeCustomId) {
      savePanels(activeCustomId, newLayout);
    }
  }, [layout.length, layout, activeCustomId, savePanels]);

  // Create a new custom dashboard
  const handleCreateDashboard = useCallback(async (name: string) => {
    const created = await createDashboard(name, theme);
    if (created) {
      setLayout(created.panels);
      setActiveCustomId(created.id);
      setActivePreset('');
      setEditMode(true); // Auto-enter edit mode for new dashboards
    }
  }, [createDashboard, theme]);

  // Delete a custom dashboard
  const handleDeleteDashboard = useCallback(async (id: string) => {
    await deleteDashboard(id);
    if (activeCustomId === id) {
      // Fall back to default preset
      setActiveCustomId(null);
      setActivePreset('default');
      setLayout(getDefaultForTheme(theme).panels);
      setEditMode(false);
    }
  }, [deleteDashboard, activeCustomId, theme]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>Loading...</p>
      </div>
    );
  }

  const dashboardControls = {
    presets: getPresetsForTheme(theme).map((p) => ({ id: p.id, name: p.name, description: p.description })),
    activePreset,
    activeCustomId,
    onSwitchPreset: switchPreset,
    onSwitchCustom: switchCustom,
    editMode,
    onToggleEdit: () => setEditMode((prev) => !prev),
    customDashboards: customDashboards.map((l) => ({ id: l.id, name: l.name, panels: l.panels })),
    canCreateDashboard,
    maxDashboards,
    onCreateDashboard: handleCreateDashboard,
    onDeleteDashboard: handleDeleteDashboard,
    onRenameDashboard: renameDashboard,
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Sidebar dashboardControls={dashboardControls} />

      <div className="flex-1 flex flex-col min-w-0" style={{ marginRight: opsRoomOpen ? '320px' : '0', transition: 'margin-right 0.2s ease' }}>
        <DashboardHeader
          opsRoomOpen={opsRoomOpen}
          onToggleOpsRoom={() => setOpsRoomOpen((o) => !o)}
          chatUnread={chatUnread}
        />

        {/* Edit mode toolbar — only shows when editing a custom dashboard */}
        {editMode && activeCustomId && (
          <div
            className="flex items-center justify-end px-4 py-1.5 border-b shrink-0"
            style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}
          >
            {dataError && (
              <span className="text-xs mr-auto" style={{ color: 'var(--accent-danger)' }}>Data: {dataError}</span>
            )}

            {/* Dashboard name indicator */}
            <span
              className="text-xs mr-auto"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
            >
              Editing: {customDashboards.find((d) => d.id === activeCustomId)?.name ?? 'Custom'}
            </span>

            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(layout, null, 2));
              }}
              className="px-3 py-1 rounded text-xs mr-2"
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
              title="Copy current layout JSON to clipboard"
            >
              Export
            </button>

            <button
              onClick={() => setShowPicker(true)}
              className="px-3 py-1 rounded text-xs"
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-primary)',
              }}
            >
              + Add Panel
            </button>
          </div>
        )}

        {/* Free-floating canvas — frosted preview for locked views */}
        <main ref={mainRef} className="flex-1 overflow-auto p-0">
          {(() => {
            const lockedView = activeCustomId ? null : LOCKED_VIEWS[activePreset];
            const isLocked = !user
              ? activePreset !== 'default' && !activeCustomId
              : !!lockedView && !hasAccess(userTier, lockedView.requiredTier);

            return (
              <div style={{ position: 'relative', height: '100%' }}>
                <div style={{
                  filter: isLocked ? 'blur(6px)' : undefined,
                  pointerEvents: isLocked ? 'none' : undefined,
                  height: '100%',
                  transition: 'filter 0.3s ease',
                }}>
                  <DashboardGrid
                    layout={layout}
                    onLayoutChange={handleLayoutChange}
                    editable={editMode && activeCustomId !== null}
                  />
                </div>
                {isLocked && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 10,
                  }}>
                    <div style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-primary)',
                      padding: '32px 40px',
                      textAlign: 'center',
                      maxWidth: '360px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: '10px',
                        letterSpacing: '0.18em', color: 'var(--text-muted)',
                        marginBottom: '8px',
                      }}>
                        {lockedView ? lockedView.name.toUpperCase() : 'DASHBOARD'}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: '14px',
                        color: 'var(--text-primary)', marginBottom: '12px',
                        letterSpacing: '0.06em',
                      }}>
                        {!user
                          ? 'Sign in required'
                          : `${TIER_LABELS[lockedView!.requiredTier]} required`}
                      </div>
                      <div style={{
                        maxWidth: '280px', fontSize: '12px',
                        color: 'var(--text-secondary)', lineHeight: '1.7',
                        marginBottom: '24px', fontFamily: 'var(--font-mono)',
                      }}>
                        {!user
                          ? 'Sign in to access additional dashboard views and the full briefing archive.'
                          : lockedView!.description}
                      </div>
                      <Link
                        href={user ? '/support' : '/login'}
                        style={{
                          display: 'inline-block',
                          padding: '10px 28px',
                          background: 'var(--accent-primary)',
                          color: 'var(--bg-primary)',
                          textDecoration: 'none',
                          fontFamily: 'var(--font-mono)', fontSize: '12px',
                          letterSpacing: '0.12em', fontWeight: 'bold',
                        }}
                      >
                        {!user
                          ? 'SIGN IN →'
                          : `UNLOCK ⚡ — ${pricing ? formatTierPrice(lockedView!.requiredTier as 'general' | 'members' | 'vip', pricing) : '...'}`}
                      </Link>
                      {user && lockedView && (
                        <div style={{
                          marginTop: '12px', fontSize: '11px',
                          color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                        }}>
                          {TIER_BILLING[lockedView.requiredTier as keyof typeof TIER_BILLING] === 'lifetime'
                            ? 'One-off payment · Lifetime access'
                            : '30-day subscription · Cancel anytime'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </main>
      </div>

      {showPicker && (
        <PanelPicker
          currentPanels={layout}
          onAdd={addPanel}
          onClose={() => setShowPicker(false)}
          excludeAdmin
        />
      )}

      <OpsRoom open={opsRoomOpen} onClose={() => setOpsRoomOpen(false)} />
    </div>
  );
}
