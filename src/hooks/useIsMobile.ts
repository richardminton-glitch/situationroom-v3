import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT}px)`;

let mql: MediaQueryList | null = null;

function getMql(): MediaQueryList | null {
  if (typeof window === 'undefined') return null;
  if (!mql) mql = window.matchMedia(QUERY);
  return mql;
}

function subscribe(cb: () => void): () => void {
  const m = getMql();
  if (!m) return () => {};
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
}

function getSnapshot(): boolean {
  const m = getMql();
  return m ? m.matches : false;
}

function getServerSnapshot(): boolean {
  return false; // SSR assumes desktop — avoids hydration mismatch
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
