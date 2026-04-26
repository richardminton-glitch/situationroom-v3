'use client';

/**
 * Workspace page — the dashboard canvas.
 *
 * Phase 2 refactor: this page no longer renders the Sidebar, DashboardHeader
 * or OpsRoom. The shell ((app)/layout.tsx) provides TopBar + IntelStrip +
 * OpsRoom slide-over. The (workspace)/layout.tsx provides the WorkspaceRail.
 *
 * The page still owns dashboard state (presets, custom dashboards, edit
 * mode, layout) and pushes a controls bundle into WorkspaceContext so the
 * rail can drive it. Future refactor can lift state into the layout itself.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { useTheme } from '@/components/layout/ThemeProvider';
import { useData } from '@/components/layout/DataProvider';
import { DashboardGrid } from '@/components/layout/DashboardGrid';
import { MobileDashboardGrid } from '@/components/layout/MobileDashboardGrid';
import { PanelPicker } from '@/components/layout/PanelPicker';
import { ShareDashboardModal } from '@/components/vip/ShareDashboardModal';
import { getDefaultForTheme, getPresetsForTheme, getPresetByIdForTheme, type LayoutPanelItem } from '@/lib/panels/layouts';
import { getPanelById } from '@/lib/panels/registry';
import { useTier } from '@/hooks/useTier';
import { useSavedLayouts } from '@/hooks/useSavedLayouts';
import { hasAccess, TIER_LABELS, TIER_BILLING } from '@/lib/auth/tier';
import { usePricing, formatTierPrice } from '@/hooks/usePricing';
import { useIsMobile } from '@/hooks/useIsMobile';
import Link from 'next/link';
import { useWorkspaceControls } from './WorkspaceContext';
import type { SharedWithMe } from './WorkspaceContext';
import type { Theme, Tier } from '@/types';

// Tier requirements + locked view descriptions
const LOCKED_VIEWS: Record<string, { requiredTier: Exclude<Tier, 'free'>; name: string; description: string }> = {
  'macro-focus':      { requiredTier: 'general', name: 'Macro Focus',       description: 'Central bank balance sheet composition, 10-year policy rate history, inflation monitor across G7 nations, and macro context behind every number.' },
  'mining-focus':     { requiredTier: 'general', name: 'Mining Focus',      description: 'Public miner balance sheets, hash economics, capitulation pressure, and the security outlook behind Bitcoin\u2019s mining base.' },
  'onchain-deep-dive':{ requiredTier: 'members', name: 'On-Chain Deep Dive',description: 'UTXO age distribution, long-term vs short-term holder supply, value of coin days destroyed, and supply at cost basis — the complete holder behaviour picture.' },
  'ai':               { requiredTier: 'members', name: 'AI Analysis',       description: 'AI-powered signal synthesis, cohort analysis, and structured market argument — deep AI reasoning applied to on-chain and macro data.' },
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const { userTier, canAccess } = useTier();
  const { error: dataError } = useData();
  const pricing = usePricing();
  const isMobile = useIsMobile();
  const { setControls } = useWorkspaceControls();

  // Always start on Full Overview; restore saved preset only for logged-in users
  const [activePreset, setActivePreset] = useState<string>('default');
  const [activeCustomId, setActiveCustomId] = useState<string | null>(null);
  const [activeSharedId, setActiveSharedId] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutPanelItem[]>(() => {
    return getDefaultForTheme(theme).panels;
  });
  const [sharedWithMe, setSharedWithMe] = useState<SharedWithMe[]>([]);
  const [shareModalLayoutId, setShareModalLayoutId] = useState<string | null>(null);
  const restoredRef = useRef(false);

  // Once auth is resolved, restore the user's last preset from localStorage
  useEffect(() => {
    if (loading || restoredRef.current) return;
    restoredRef.current = true;
    if (!user) return;
    const saved = localStorage.getItem('sr-active-preset');
    const savedCustom = localStorage.getItem('sr-active-custom-id');
    if (savedCustom) {
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
  const mainRef = useRef<HTMLDivElement>(null);

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

  // When custom dashboards load, restore the active custom dashboard
  useEffect(() => {
    if (activeCustomId && customDashboards.length > 0) {
      const cd = customDashboards.find((d) => d.id === activeCustomId);
      if (cd) {
        setLayout(cd.panels);
      } else {
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

  // Theme switch: load matching preset for the new theme (skip on initial mount)
  const hasMounted = useRef(false);
  useEffect(() => {
    if (!hasMounted.current) { hasMounted.current = true; return; }
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
      setActiveSharedId(null);
      setEditMode(false);
    }
  }, [theme]);

  // Fetch dashboards shared WITH this user (from VIP friends/family). Live
  // filter: VIP-revoked or tier-lapsed shares disappear on refetch. Only
  // signed-in users trigger this.
  useEffect(() => {
    if (!user) {
      setSharedWithMe([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/shared/mine');
        if (res.ok && !cancelled) {
          setSharedWithMe(await res.json());
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // If the active shared dashboard disappears from the list (owner revoked
  // or lapsed), drop back to the default preset.
  useEffect(() => {
    if (activeSharedId && sharedWithMe.length > 0) {
      if (!sharedWithMe.some((s) => s.shareId === activeSharedId)) {
        setActiveSharedId(null);
        setActivePreset('default');
        setLayout(getDefaultForTheme(theme).panels);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedWithMe, activeSharedId]);

  const switchCustom = useCallback((dashboard: { id: string; name: string; panels: LayoutPanelItem[] }) => {
    setLayout(dashboard.panels);
    setActiveCustomId(dashboard.id);
    setActiveSharedId(null);
    setActivePreset('');
  }, []);

  const switchShared = useCallback((shared: SharedWithMe) => {
    setLayout(shared.panels);
    setActiveSharedId(shared.shareId);
    setActiveCustomId(null);
    setActivePreset('');
    setEditMode(false);
  }, []);

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
    const instanceId = entry.uiComponent ? `${panelId}-${Date.now()}` : panelId;
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

  const handleCreateDashboard = useCallback(async (name: string) => {
    const created = await createDashboard(name, theme);
    if (created) {
      setLayout(created.panels);
      setActiveCustomId(created.id);
      setActivePreset('');
      setEditMode(true);
    }
  }, [createDashboard, theme]);

  const handleDeleteDashboard = useCallback(async (id: string) => {
    await deleteDashboard(id);
    if (activeCustomId === id) {
      setActiveCustomId(null);
      setActivePreset('default');
      setLayout(getDefaultForTheme(theme).panels);
      setEditMode(false);
    }
  }, [deleteDashboard, activeCustomId, theme]);

  // Push the dashboardControls bundle into WorkspaceContext so the rail can read/drive it
  useEffect(() => {
    setControls({
      presets: getPresetsForTheme(theme).map((p) => ({ id: p.id, name: p.name, description: p.description })),
      activePreset,
      activeCustomId,
      activeSharedId,
      onSwitchPreset: switchPreset,
      onSwitchCustom: switchCustom,
      onSwitchShared: switchShared,
      editMode,
      onToggleEdit: () => setEditMode((prev) => !prev),
      customDashboards: customDashboards.map((l) => ({ id: l.id, name: l.name, panels: l.panels })),
      sharedWithMe,
      canCreateDashboard,
      maxDashboards,
      onCreateDashboard: handleCreateDashboard,
      onDeleteDashboard: handleDeleteDashboard,
      onRenameDashboard: renameDashboard,
      onShareDashboard: (id: string) => setShareModalLayoutId(id),
    });
    // Clear on unmount so navigating away from workspace returns the rail to its placeholder
    return () => setControls(null);
  }, [
    theme, activePreset, activeCustomId, activeSharedId,
    switchPreset, switchCustom, switchShared, editMode,
    customDashboards, sharedWithMe, canCreateDashboard, maxDashboards,
    handleCreateDashboard, handleDeleteDashboard, renameDashboard, setControls,
  ]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>Loading…</p>
      </div>
    );
  }

  const lockedView = activeCustomId ? null : LOCKED_VIEWS[activePreset];
  const isLocked = !user
    ? activePreset !== 'default' && !activeCustomId
    : !!lockedView && !hasAccess(userTier, lockedView.requiredTier);

  return (
    <>
      {/* Edit mode toolbar — only shows when editing a custom dashboard (desktop only) */}
      {!isMobile && editMode && activeCustomId && (
        <div
          className="flex items-center justify-end px-4 py-1.5 border-b shrink-0"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}
        >
          {dataError && (
            <span className="text-xs mr-auto" style={{ color: 'var(--accent-danger)' }}>Data: {dataError}</span>
          )}

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

      <div ref={mainRef} className="flex-1 overflow-auto p-0">
        <div style={{ position: 'relative', height: '100%' }}>
          <div style={{
            filter: isLocked ? 'blur(6px)' : undefined,
            pointerEvents: isLocked ? 'none' : undefined,
            height: '100%',
            transition: 'filter 0.3s ease',
          }}>
            {isMobile ? (
              <MobileDashboardGrid layout={layout} />
            ) : (
              <DashboardGrid
                layout={layout}
                onLayoutChange={handleLayoutChange}
                editable={editMode && activeCustomId !== null}
              />
            )}
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
      </div>

      {showPicker && (
        <PanelPicker
          currentPanels={layout}
          onAdd={addPanel}
          onClose={() => setShowPicker(false)}
          excludeAdmin
        />
      )}

      {shareModalLayoutId && (
        <ShareDashboardModal
          layoutId={shareModalLayoutId}
          dashboardName={
            customDashboards.find((d) => d.id === shareModalLayoutId)?.name ?? 'Dashboard'
          }
          onClose={() => setShareModalLayoutId(null)}
        />
      )}
    </>
  );
}
