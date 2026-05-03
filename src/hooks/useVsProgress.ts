'use client';

/**
 * useVsProgress — Vienna School curriculum progress tracker.
 *
 * Two-tier persistence:
 *
 *   - Authenticated user → server-backed via /api/vienna-school/progress.
 *     localStorage is used as a write-through cache so the UI stays
 *     instant; the server response is the source of truth and overwrites
 *     local state once it arrives.
 *
 *   - Anonymous visitor → localStorage only. Working tracker for the
 *     duration of the browser-data lifetime. The anon FieldTest gate
 *     prevents marking complete in this branch (sign-in required), but
 *     the index-page progress UI still reads from localStorage so it
 *     reflects whatever state the user has accumulated.
 *
 * On sign-in transition, an authed read of the server merges into the
 * local cache (whichever has more completed modules wins per-slug;
 * graduationDate prefers the earlier of the two if both are set).
 */

import { useCallback, useEffect, useState } from 'react';
import { TOTAL_MODULES } from '@/content/vienna-school';
import { useAuth } from '@/components/layout/AuthProvider';

const STORAGE_KEY = 'vs-progress-v1';

interface ProgressState {
  modulesCompleted: string[];
  booksRead:        string[];
  graduationDate:   string | null;
}

const EMPTY: ProgressState = { modulesCompleted: [], booksRead: [], graduationDate: null };

// ── localStorage helpers ────────────────────────────────────────────────────

function readStorage(): ProgressState {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      modulesCompleted: Array.isArray(parsed.modulesCompleted) ? parsed.modulesCompleted : [],
      booksRead:        Array.isArray(parsed.booksRead)        ? parsed.booksRead        : [],
      graduationDate:   parsed.graduationDate ?? null,
    };
  } catch {
    return EMPTY;
  }
}

function writeStorage(state: ProgressState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('vs-progress-changed'));
  } catch {
    // localStorage full / disabled — silently no-op.
  }
}

function clearStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('vs-progress-changed'));
  } catch {
    // ignore
  }
}

// ── Merge helper for the sign-in transition ────────────────────────────────

function merge(a: ProgressState, b: ProgressState): ProgressState {
  const slugs = new Set([...a.modulesCompleted, ...b.modulesCompleted]);
  const books = new Set([...a.booksRead,        ...b.booksRead]);
  let graduationDate: string | null = null;
  if (a.graduationDate && b.graduationDate) {
    graduationDate = a.graduationDate < b.graduationDate ? a.graduationDate : b.graduationDate;
  } else {
    graduationDate = a.graduationDate ?? b.graduationDate ?? null;
  }
  return {
    modulesCompleted: Array.from(slugs),
    booksRead:        Array.from(books),
    graduationDate,
  };
}

// ── Public hook ────────────────────────────────────────────────────────────

export interface UseVsProgress {
  modulesCompleted: Set<string>;
  booksRead:        Set<string>;
  graduationDate:   string | null;
  graduated:        boolean;
  completedCount:   number;
  booksReadCount:   number;
  /** True when the hook is still resolving its initial state (server fetch
   *  for authed users, localStorage hydration for anon). UIs can render
   *  optimistically without waiting on this — it's only useful for things
   *  like spinner suppression. */
  loading:          boolean;
  /** True if the current state is server-backed (i.e. the user is signed
   *  in and the server has responded). False for anon localStorage-only. */
  serverBacked:     boolean;
  isComplete:       (slug: string) => boolean;
  isBookRead:       (bookId: string) => boolean;
  markComplete:     (slug: string) => Promise<void>;
  toggleBook:       (bookId: string, read: boolean) => Promise<void>;
  reset:            () => Promise<void>;
}

export function useVsProgress(): UseVsProgress {
  const { user, loading: authLoading } = useAuth();
  const [state,        setState]        = useState<ProgressState>(EMPTY);
  const [loading,      setLoading]      = useState(true);
  const [serverBacked, setServerBacked] = useState(false);

  // Initial hydration: localStorage immediately, then server (if authed)
  // overwrites with merged state.
  useEffect(() => {
    setState(readStorage());
    if (authLoading) return;          // wait for auth to settle

    if (!user) {
      // Anon: local only.
      setLoading(false);
      setServerBacked(false);
      return;
    }

    // Authed: fetch server, merge with local (handles the new-device case
    // where localStorage is empty + the existing-anon-then-signs-in case
    // where local has data the server doesn't).
    let cancelled = false;
    fetch('/api/vienna-school/progress', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(async (json: { authed: boolean; progress: ProgressState; devMaster?: boolean }) => {
        if (cancelled) return;
        const local  = readStorage();
        const merged = merge(local, json.progress);

        // If local had slugs the server didn't, push them up so the
        // server catches up. Devmaster sessions skip this — they're
        // ephemeral by design.
        if (!json.devMaster && local.modulesCompleted.some((s) => !json.progress.modulesCompleted.includes(s))) {
          for (const slug of local.modulesCompleted) {
            if (json.progress.modulesCompleted.includes(slug)) continue;
            await fetch('/api/vienna-school/progress', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ moduleSlug: slug }),
            }).catch(() => {});
          }
        }

        setServerBacked(!json.devMaster);
        setState(merged);
        writeStorage(merged);
        setLoading(false);
      })
      .catch(() => {
        // Server unreachable — fall back to local.
        if (cancelled) return;
        setServerBacked(false);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user, authLoading]);

  // Cross-tab + cross-hook listener.
  useEffect(() => {
    const onChange = () => setState(readStorage());
    window.addEventListener('vs-progress-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('vs-progress-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const completed      = new Set(state.modulesCompleted);
  const booksReadSet   = new Set(state.booksRead);
  const completedCount = completed.size;
  const booksReadCount = booksReadSet.size;
  const graduated      = !!state.graduationDate;

  const isComplete = useCallback((slug: string)   => completed.has(slug),     [state.modulesCompleted]);    // eslint-disable-line react-hooks/exhaustive-deps
  const isBookRead = useCallback((bookId: string) => booksReadSet.has(bookId), [state.booksRead]);          // eslint-disable-line react-hooks/exhaustive-deps

  const markComplete = useCallback(async (slug: string) => {
    const curr = readStorage();
    if (curr.modulesCompleted.includes(slug)) return;
    // Optimistic local update first — UI stays snappy.
    const next: ProgressState = {
      modulesCompleted: [...curr.modulesCompleted, slug],
      booksRead:        curr.booksRead,
      graduationDate:   curr.graduationDate,
    };
    if (!next.graduationDate && next.modulesCompleted.length >= TOTAL_MODULES) {
      next.graduationDate = new Date().toISOString();
    }
    writeStorage(next);
    setState(next);

    // Server write (best effort). If we're not authed the API returns 401
    // and we keep the local-only state.
    if (user) {
      try {
        const r = await fetch('/api/vienna-school/progress', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'module', moduleSlug: slug }),
        });
        if (r.ok) {
          const json = await r.json() as { progress: ProgressState; devMaster?: boolean };
          if (!json.devMaster) {
            writeStorage(json.progress);
            setState(json.progress);
          }
        }
      } catch {
        // Network failure — keep optimistic local state.
      }
    }
  }, [user]);

  const toggleBook = useCallback(async (bookId: string, read: boolean) => {
    const curr     = readStorage();
    const has      = curr.booksRead.includes(bookId);
    if (read === has) return;          // no-op
    const nextBooks = read
      ? [...curr.booksRead, bookId]
      : curr.booksRead.filter((b) => b !== bookId);
    const next: ProgressState = { ...curr, booksRead: nextBooks };
    writeStorage(next);
    setState(next);

    if (user) {
      try {
        const r = await fetch('/api/vienna-school/progress', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'book', bookId, read }),
        });
        if (r.ok) {
          const json = await r.json() as { progress: ProgressState; devMaster?: boolean };
          if (!json.devMaster) {
            writeStorage(json.progress);
            setState(json.progress);
          }
        }
      } catch {
        // Local-only persistence on network failure.
      }
    }
  }, [user]);

  const reset = useCallback(async () => {
    clearStorage();
    setState(EMPTY);
    // Note: reset is local-only — we deliberately don't expose a server-side
    // wipe, since graduation history is something the user might want to
    // keep even if they re-take modules. If a server wipe becomes useful,
    // add a DELETE handler to the API and call it here when authed.
  }, []);

  return {
    modulesCompleted: completed,
    booksRead:        booksReadSet,
    graduationDate:   state.graduationDate,
    graduated,
    completedCount,
    booksReadCount,
    loading,
    serverBacked,
    isComplete,
    isBookRead,
    markComplete,
    toggleBook,
    reset,
  };
}
