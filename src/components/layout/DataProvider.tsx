'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useSnapshot, type SnapshotData } from '@/lib/data/useSnapshot';

interface DataContextValue {
  data: SnapshotData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextValue>({
  data: null,
  loading: true,
  error: null,
  refresh: async () => {},
});

export function useData() {
  return useContext(DataContext);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const snapshot = useSnapshot();
  return (
    <DataContext.Provider value={snapshot}>
      {children}
    </DataContext.Provider>
  );
}
