'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { useTheme } from '@/components/layout/ThemeProvider';
import { useData } from '@/components/layout/DataProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardGrid } from '@/components/layout/DashboardGrid';
import { PanelPicker } from '@/components/layout/PanelPicker';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { DEFAULT_LAYOUT, LAYOUT_PRESETS, type LayoutPanelItem } from '@/lib/panels/layouts';
import { getPanelById } from '@/lib/panels/registry';
import type { Theme } from '@/types';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { setTheme } = useTheme();
  const { error: dataError } = useData();
  const [layout, setLayout] = useState<LayoutPanelItem[]>(DEFAULT_LAYOUT.panels);
  const [activePreset, setActivePreset] = useState('default');
  const [editMode, setEditMode] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (user?.themePref) {
      setTheme(user.themePref as Theme);
    }
  }, [user?.themePref, setTheme]);

  const switchPreset = useCallback((presetId: string) => {
    const preset = LAYOUT_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setLayout(preset.panels);
      setActivePreset(presetId);
    }
  }, []);

  const handleLayoutChange = useCallback((newLayout: LayoutPanelItem[]) => {
    setLayout(newLayout);
    setActivePreset('custom');
  }, []);

  const GRID_SNAP = 44;
  const addPanel = useCallback((panelId: string) => {
    const entry = getPanelById(panelId);
    if (!entry) return;
    // Spawn at current scroll position, snapped to grid, with a small stagger
    const scrollX = mainRef.current?.scrollLeft ?? 0;
    const scrollY = mainRef.current?.scrollTop ?? 0;
    const stagger = (layout.length % 4) * GRID_SNAP;
    const x = Math.round((scrollX + stagger) / GRID_SNAP) * GRID_SNAP;
    const y = Math.round((scrollY + stagger) / GRID_SNAP) * GRID_SNAP;
    setLayout((prev) => [
      ...prev,
      {
        panelId,
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
    presets: LAYOUT_PRESETS.map((p) => ({ id: p.id, name: p.name, description: p.description })),
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
