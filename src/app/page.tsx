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
import type { Theme } from '@/types';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const { error: dataError } = useData();
  // theme is now correct on first render (ThemeProvider reads localStorage)
  const [layout, setLayout] = useState<LayoutPanelItem[]>(() => getDefaultForTheme(theme).panels);
  const [activePreset, setActivePreset] = useState('default');
  const [editMode, setEditMode] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

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
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Sidebar dashboardControls={dashboardControls} />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />

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

        {/* Free-floating canvas */}
        <main ref={mainRef} className="flex-1 overflow-auto p-0">
          <DashboardGrid
            layout={layout}
            onLayoutChange={handleLayoutChange}
            editable={editMode}
          />
        </main>
      </div>

      {showPicker && (
        <PanelPicker
          currentPanels={layout}
          onAdd={addPanel}
          onClose={() => setShowPicker(false)}
        />
      )}

    </div>
  );
}
