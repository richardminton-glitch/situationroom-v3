'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface IntelFilterContextValue {
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
}

const IntelFilterContext = createContext<IntelFilterContextValue>({
  activeCategory: 'all',
  setActiveCategory: () => {},
});

export function useIntelFilter() {
  return useContext(IntelFilterContext);
}

export function IntelFilterProvider({ children }: { children: ReactNode }) {
  const [activeCategory, setActiveCategory] = useState('all');
  return (
    <IntelFilterContext.Provider value={{ activeCategory, setActiveCategory }}>
      {children}
    </IntelFilterContext.Provider>
  );
}
