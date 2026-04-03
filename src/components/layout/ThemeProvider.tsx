'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Theme } from '@/types';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'parchment',
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function readStoredTheme(fallback: Theme): Theme {
  if (typeof window === 'undefined') return fallback;
  const stored = localStorage.getItem('sr-theme') as Theme | null;
  return stored === 'dark' || stored === 'parchment' ? stored : fallback;
}

export function ThemeProvider({
  children,
  initialTheme = 'parchment',
}: {
  children: ReactNode;
  initialTheme?: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme(initialTheme));

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('sr-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
