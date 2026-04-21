'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Theme } from '@/types';

export interface ShareSlot {
  id: string;
  token: string;
  label: string;
  inviteEmail: string | null;
  theme: Theme;
  createdAt: string;
  lastViewedAt: string | null;
  boundUserId: string | null;
}

interface SharesPayload {
  max: number;
  shares: ShareSlot[];
}

interface CreateSuccess { ok: true; slot: ShareSlot }
interface CreateConflict { ok: false; conflict: true; conflictLayoutId?: string; error: string }
interface CreateFailure { ok: false; conflict: false; error: string }
type CreateResult = CreateSuccess | CreateConflict | CreateFailure;

/**
 * Manages share-slot state for a single UserLayout from the VIP owner's side.
 * Returns the active slots (max 5), plus create/revoke helpers.
 */
export function useSharedDashboard(layoutId: string | null) {
  const [max, setMax] = useState(5);
  const [slots, setSlots] = useState<ShareSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!layoutId) {
      setSlots([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/layouts/${layoutId}/share`);
      if (res.ok) {
        const data = (await res.json()) as SharesPayload;
        setMax(data.max);
        setSlots(data.shares);
      }
    } catch {
      // ignore network errors
    }
    setLoading(false);
  }, [layoutId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (label: string, theme: Theme, inviteEmail?: string): Promise<CreateResult> => {
      if (!layoutId) return { ok: false, conflict: false, error: 'No layout' };
      const res = await fetch(`/api/layouts/${layoutId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, theme, inviteEmail: inviteEmail || undefined }),
      });
      if (res.ok) {
        const slot = (await res.json()) as ShareSlot;
        setSlots((prev) => [...prev, slot]);
        return { ok: true, slot };
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string; conflictLayoutId?: string };
      if (res.status === 409) {
        return {
          ok: false,
          conflict: true,
          conflictLayoutId: data.conflictLayoutId,
          error: data.error ?? 'Conflict',
        };
      }
      return { ok: false, conflict: false, error: data.error ?? `Failed (${res.status})` };
    },
    [layoutId]
  );

  const revoke = useCallback(
    async (shareId: string) => {
      await fetch(`/api/shares/${shareId}`, { method: 'DELETE' });
      setSlots((prev) => prev.filter((s) => s.id !== shareId));
    },
    []
  );

  return {
    max,
    slots,
    loading,
    canCreate: slots.length < max,
    create,
    revoke,
    refresh,
  };
}

export function shareUrl(token: string): string {
  if (typeof window === 'undefined') return `/shared/${token}`;
  return `${window.location.origin}/shared/${token}`;
}
