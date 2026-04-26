'use client';

/**
 * FehDataProvider — single fetch + context for all FEH modules.
 *
 * Initial state = seed values. On mount, fetches /api/feh; if the response
 * carries DB-backed data (source === 'mixed' or 'db'), the context updates
 * and modules re-render. On fetch failure, seed remains — the page never
 * blanks.
 *
 * Each module reads via `useFehData()` and falls back implicitly to seed
 * via the initial state.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { SOVEREIGNS_SEED } from '@/lib/feh/sovereigns-seed';
import {
  RCDI_HISTORY, RCDI_COMPONENTS, RCDI_ANNOTATIONS,
  type RCDIPoint, type RCDIComponent, type RCDIAnnotation,
} from '@/lib/feh/rcdi-seed';
import { CB_RATES, type CBRate } from '@/lib/feh/cb-rates-seed';
import { MALINVESTMENT_SECTORS, type MalinvestmentSector } from '@/lib/feh/malinvestment-seed';
import { WARTIME_COUNTRIES, type WartimeCountry } from '@/lib/feh/wartime-seed';
import { PETRO_HISTORY, PETRO_ANNOTATIONS, type PetroPoint, type PetroAnnotation } from '@/lib/feh/petro-dollar-seed';
import type { Sovereign } from '@/lib/feh/types';

export interface FehData {
  source: 'seed' | 'db' | 'mixed';
  sovereigns: Sovereign[];
  rcdiHistory: RCDIPoint[];
  rcdiComponents: RCDIComponent[];
  rcdiAnnotations: RCDIAnnotation[];
  cbRates: CBRate[];
  malinvestmentSectors: MalinvestmentSector[];
  wartimeCountries: WartimeCountry[];
  petroHistory: PetroPoint[];
  petroAnnotations: PetroAnnotation[];
}

const SEED: FehData = {
  source: 'seed',
  sovereigns: SOVEREIGNS_SEED,
  rcdiHistory: RCDI_HISTORY,
  rcdiComponents: RCDI_COMPONENTS,
  rcdiAnnotations: RCDI_ANNOTATIONS,
  cbRates: CB_RATES,
  malinvestmentSectors: MALINVESTMENT_SECTORS,
  wartimeCountries: WARTIME_COUNTRIES,
  petroHistory: PETRO_HISTORY,
  petroAnnotations: PETRO_ANNOTATIONS,
};

const FehDataContext = createContext<FehData>(SEED);

export function useFehData(): FehData {
  return useContext(FehDataContext);
}

export function FehDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<FehData>(SEED);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/feh', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload: FehData | null) => {
        if (cancelled || !payload) return;
        // Trust the API to return seed-shape arrays. Only swap in fields that
        // came back populated — no partial corruption.
        setData((prev) => ({
          ...prev,
          source: payload.source ?? 'seed',
          sovereigns: payload.sovereigns?.length ? payload.sovereigns : prev.sovereigns,
          rcdiHistory: payload.rcdiHistory?.length ? payload.rcdiHistory : prev.rcdiHistory,
          rcdiComponents: payload.rcdiComponents?.length ? payload.rcdiComponents : prev.rcdiComponents,
          rcdiAnnotations: payload.rcdiAnnotations?.length ? payload.rcdiAnnotations : prev.rcdiAnnotations,
          cbRates: payload.cbRates?.length ? payload.cbRates : prev.cbRates,
          malinvestmentSectors: payload.malinvestmentSectors?.length ? payload.malinvestmentSectors : prev.malinvestmentSectors,
          wartimeCountries: payload.wartimeCountries?.length ? payload.wartimeCountries : prev.wartimeCountries,
          petroHistory: payload.petroHistory?.length ? payload.petroHistory : prev.petroHistory,
          petroAnnotations: payload.petroAnnotations?.length ? payload.petroAnnotations : prev.petroAnnotations,
        }));
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[FehDataProvider] /api/feh fetch failed — staying on seed:', err);
      });
    return () => { cancelled = true; };
  }, []);

  return <FehDataContext.Provider value={data}>{children}</FehDataContext.Provider>;
}
