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
import { LockedViewPrompt } from '@/components/auth/LockedViewPrompt';
import { SubscriptionModal } from '@/components/auth/SubscriptionModal';
import { OpsRoom } from '@/components/chat/OpsRoom';
import { useTier } from '@/hooks/useTier';
import { useSavedLayouts } from '@/hooks/useSavedLayouts';
import { hasAccess } from '@/lib/auth/tier';
import type { Theme, Tier } from '@/types';

// Tier requirements + locked view descriptions
const LOCKED_VIEWS: Record<string, { requiredTier: Exclude<Tier, 'free'>; name: string; description: string }> = {
  'full-data':        { requiredTier: 'general', name: 'Full Data',         description: 'Complete Bitcoin market data, network metrics, Lightning stats, mining economics, on-chain sentiment, and all charts in one view.' },
  'macro-focus':      { requiredTier: 'general', name: 'Macro Focus',       description: 'Central bank balance sheet composition, 10-year policy rate history, inflation monitor across G7 nations, and macro context behind every number.' },
  'onchain-deep-dive':{ requiredTier: 'members', name: 'On-Chain Deep Dive',description: 'UTXO age distribution, long-term vs short-term holder supply, value of coin days destroyed, and supply at cost basis — the complete holder behaviour picture.' },
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const { userTier, canAccess } = useTier();
  const { error: dataError } = useData();
  // theme is now correct on first render (ThemeProvider reads localStorage)
  const [layout, setLayout] = useState<LayoutPanelItem[]>(() => getDefaultForTheme(theme).panels);
  const [activePreset, setActivePreset] = useState('default');
  const [editMode, setEditMode] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalTier, setUpgradeModalTier] = useState<Exclude<Tier, 'free'>>('general');
  const [opsRoomOpen, setOpsRoomOpen] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [savedLayoutName, setSavedLayoutName] = useState('');
  const mainRef = useRef<HTMLElement>(null);

  const isVip = canAccess('vip');
  const { layouts: savedLayouts, saveLayout, deleteLayout } = useSavedLayouts(isVip);

  useEffect(() => {
    if (user?.themePref && user.themePref !== theme) {
      const t = user.themePref as Theme;
      setTheme(t);
      // Update layout in the same batch so no parchment flash occurs
      const preset = getPresetByIdForTheme(activePreset, t) ?? getDefaultForTheme(t);
      setLayout(preset.panels);
      setActivePreset(preset.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.themePref]);

  // When the user manually switches theme (sidebar toggle), load that theme's
  // matching preset. Skip on initial mount — layout is already correct because
  // ThemeProvider reads the stored theme from localStorage before first render.
  const hasMounted = useRef(false);
  useEffect(() => {
    if (!hasMounted.current) { hasMounted.current = true; return; }
    const matched = activePreset !== 'custom'
      ? getPresetByIdForTheme(activePreset, theme)
      : undefined;
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
    }
  }, [theme]);

  const handleLayoutChange = useCallback((newLayout: LayoutPanelItem[]) => {
    setLayout(newLayout);
    setActivePreset('custom');
  }, []);

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
    setLayout((prev) => [
      ...prev,
      {
        panelId: instanceId,
        x,
        y,
        w: entry.defaultW,
        h: entry.defaultH,
        collapsed: false,
        resizable: entry.resizable,
      },
    ]);
    setActivePreset('custom');
  }, [layout.length]);

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
    onSwitchPreset: switchPreset,
    editMode,
    onToggleEdit: () => setEditMode((prev) => !prev),
    savedLayouts: savedLayouts.map((l) => ({ id: l.id, name: l.name, panels: l.panels })),
    onLoadSavedLayout: (l: { id: string; name: string; panels: LayoutPanelItem[] }) => {
      setLayout(l.panels);
      setActivePreset('custom');
    },
    onDeleteSavedLayout: deleteLayout,
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Sidebar dashboardControls={dashboardControls} />

      <div className="flex-1 flex flex-col min-w-0" style={{ marginRight: opsRoomOpen ? '320px' : '0', transition: 'margin-right 0.2s ease' }}>
        <DashboardHeader
          opsRoomOpen={opsRoomOpen}
          onToggleOpsRoom={() => setOpsRoomOpen((o) => !o)}
        />

        {/* Edit mode toolbar — only shows Add Panel button when editing */}
        {editMode && (
          <div
            className="flex items-center justify-end px-4 py-1.5 border-b shrink-0"
            style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}
          >
            {dataError && (
              <span className="text-xs mr-auto" style={{ color: 'var(--accent-danger)' }}>Data: {dataError}</span>
            )}
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
              ⎘ Export Layout
            </button>

            {/* Save Layout button — VIP only */}
            {canAccess('vip') && (
              <>
                {showSavePrompt ? (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginRight: '8px' }}>
                    <input
                      value={savedLayoutName}
                      onChange={(e) => setSavedLayoutName(e.target.value)}
                      placeholder="Layout name..."
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        padding: '2px 6px',
                        border: '1px solid var(--border-primary)',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        width: '130px',
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && savedLayoutName.trim()) {
                          await saveLayout(savedLayoutName.trim(), layout, theme);
                          setSavedLayoutName('');
                          setShowSavePrompt(false);
                        }
                        if (e.key === 'Escape') setShowSavePrompt(false);
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => setShowSavePrompt(false)}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSavePrompt(true)}
                    className="px-3 py-1 rounded text-xs mr-2"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    ☁ Save Layout{savedLayouts.length > 0 ? ` (${savedLayouts.length}/5)` : ''}
                  </button>
                )}
              </>
            )}

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

        {/* Free-floating canvas — show LockedViewPrompt if preset is inaccessible */}
        <main ref={mainRef} className="flex-1 overflow-auto p-0">
          {(() => {
            const lockedView = LOCKED_VIEWS[activePreset];
            if (lockedView && !hasAccess(userTier, lockedView.requiredTier)) {
              return (
                <LockedViewPrompt
                  view={lockedView.name}
                  requiredTier={lockedView.requiredTier}
                  description={lockedView.description}
                  onUpgradeClick={() => {
                    setUpgradeModalTier(lockedView.requiredTier);
                    setShowUpgradeModal(true);
                  }}
                />
              );
            }
            return (
              <DashboardGrid
                layout={layout}
                onLayoutChange={handleLayoutChange}
                editable={editMode}
              />
            );
          })()}
        </main>
      </div>

      {showPicker && (
        <PanelPicker
          currentPanels={layout}
          onAdd={addPanel}
          onClose={() => setShowPicker(false)}
        />
      )}

      {showUpgradeModal && (
        <SubscriptionModal
          initialTier={upgradeModalTier}
          onClose={() => setShowUpgradeModal(false)}
          onSuccess={() => setShowUpgradeModal(false)}
        />
      )}

      <OpsRoom open={opsRoomOpen} onClose={() => setOpsRoomOpen(false)} />
    </div>
  );
}
