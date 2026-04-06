'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { LayoutPanelItem } from '@/lib/panels/layouts';

export interface SavedLayout {
  id: string;
  name: string;
  theme: string;
  isDefault: boolean;
  createdAt: string;
  panels: LayoutPanelItem[];
}

const MAX_CUSTOM_DASHBOARDS = 3;

export function useSavedLayouts(isVip: boolean) {
  const [layouts, setLayouts] = useState<SavedLayout[]>([]);
  const [loading, setLoading] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!isVip) return;
    setLoading(true);
    try {
      const res = await fetch('/api/layouts');
      if (res.ok) setLayouts(await res.json());
    } catch {
      // silently ignore network errors
    }
    setLoading(false);
  }, [isVip]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Create a new custom dashboard */
  const createDashboard = useCallback(
    async (name: string, theme: string, panels: LayoutPanelItem[] = []) => {
      const res = await fetch('/api/layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, panels, theme }),
      });
      if (res.ok) {
        const created = await res.json() as SavedLayout;
        await refresh();
        return created;
      }
      return null;
    },
    [refresh]
  );

  /** Delete a custom dashboard */
  const deleteDashboard = useCallback(
    async (id: string) => {
      await fetch(`/api/layouts/${id}`, { method: 'DELETE' });
      await refresh();
    },
    [refresh]
  );

  /** Rename a custom dashboard */
  const renameDashboard = useCallback(
    async (id: string, name: string) => {
      await fetch(`/api/layouts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      await refresh();
    },
    [refresh]
  );

  /** Save panels to a custom dashboard (debounced to avoid API hammering) */
  const savePanels = useCallback(
    (id: string, panels: LayoutPanelItem[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      // Optimistic: update local state immediately
      setLayouts((prev) =>
        prev.map((l) => (l.id === id ? { ...l, panels } : l))
      );
      // Debounced API save
      saveTimer.current = setTimeout(async () => {
        try {
          await fetch(`/api/layouts/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ panels }),
          });
        } catch {
          // silently fail — panels are in local state
        }
      }, 1500);
    },
    []
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return {
    layouts,
    loading,
    maxDashboards: MAX_CUSTOM_DASHBOARDS,
    canCreate: layouts.length < MAX_CUSTOM_DASHBOARDS,
    createDashboard,
    deleteDashboard,
    renameDashboard,
    savePanels,
    refresh,
  };
}
