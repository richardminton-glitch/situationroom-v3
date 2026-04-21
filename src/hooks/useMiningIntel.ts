'use client';

/**
 * useMiningIntel — shared client hook for the /api/mining-intel payload.
 *
 * Module-scoped cache: the first panel/page to mount fetches once; subsequent
 * mounts reuse the cached result. We do NOT poll on an interval — the server
 * cache is refreshed once per 24h by the refresh-miner-treasuries cron, so
 * client-side revalidation would only burn bandwidth.
 *
 * Subscribers are notified when the fetch completes so multiple panels render
 * in lock-step instead of staggering loading states.
 */

import { useEffect, useState } from 'react';
import type { MiningIntelResponse } from '@/app/api/mining-intel/route';

type State = {
  data:    MiningIntelResponse | null;
  loading: boolean;
  error:   string | null;
};

let cache:   MiningIntelResponse | null = null;
let inflight: Promise<MiningIntelResponse> | null = null;
const subscribers = new Set<(s: State) => void>();

function notify(s: State) {
  subscribers.forEach((fn) => fn(s));
}

function load(): Promise<MiningIntelResponse> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetch('/api/mining-intel')
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<MiningIntelResponse>;
    })
    .then((data) => {
      cache = data;
      inflight = null;
      notify({ data, loading: false, error: null });
      return data;
    })
    .catch((e) => {
      inflight = null;
      notify({ data: null, loading: false, error: String(e) });
      throw e;
    });
  return inflight;
}

export function useMiningIntel(): State {
  const [state, setState] = useState<State>(() =>
    cache
      ? { data: cache, loading: false, error: null }
      : { data: null, loading: true, error: null },
  );

  useEffect(() => {
    if (cache) {
      setState({ data: cache, loading: false, error: null });
      return;
    }
    subscribers.add(setState);
    load().catch(() => { /* error already broadcast */ });
    return () => { subscribers.delete(setState); };
  }, []);

  return state;
}
