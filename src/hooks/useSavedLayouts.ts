'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LayoutPanelItem } from '@/lib/panels/layouts';

export interface SavedLayout {
  id: string;
  name: string;
  theme: string;
  isDefault: boolean;
  createdAt: string;
  panels: LayoutPanelItem[];
}

export function useSavedLayouts(isVip: boolean) {
  const [layouts, setLayouts] = useState<SavedLayout[]>([]);
  const [loading, setLoading] = useState(false);

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

  const saveLayout = useCallback(
    async (name: string, panels: LayoutPanelItem[], theme: string) => {
      const res = await fetch('/api/layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, panels, theme }),
      });
      if (res.ok) await refresh();
      return res;
    },
    [refresh]
  );

  const deleteLayout = useCallback(
    async (id: string) => {
      await fetch(`/api/layouts/${id}`, { method: 'DELETE' });
      await refresh();
    },
    [refresh]
  );

  return { layouts, loading, saveLayout, deleteLayout, refresh };
}
