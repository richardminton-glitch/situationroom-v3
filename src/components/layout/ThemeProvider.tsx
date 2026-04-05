'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { hasAccess } from '@/lib/auth/tier';
import type { Theme } from '@/types';
import type { Tier } from '@/types';

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
  const { user, loading } = useAuth();
  const [theme, setThemeRaw] = useState<Theme>(() => readStoredTheme(initialTheme));

  // Wrap setTheme to enforce tier gate (except Members Room override)
  const setTheme = (next: Theme) => {
    if (next === 'dark' && !loading) {
      const inOpsRoom = sessionStorage.getItem('sr-ops-room-prev-theme') !== null;
      const userTier: Tier = (user?.tier as Tier) ?? 'free';
      // Allow dark mode in Members Room regardless of tier
      if (!inOpsRoom && !hasAccess(userTier, 'general')) {
        return; // Block — free users cannot enable dark mode
      }
    }
    setThemeRaw(next);
  };

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('sr-theme', theme);
  }, [theme]);

  // Enforce tier: revert free users from dark to parchment after auth loads
  useEffect(() => {
    if (loading) return;
    if (theme !== 'dark') return;
    const inOpsRoom = sessionStorage.getItem('sr-ops-room-prev-theme') !== null;
    if (inOpsRoom) return; // Members Room forces dark — leave it
    const userTier: Tier = (user?.tier as Tier) ?? 'free';
    if (!hasAccess(userTier, 'general')) {
      setThemeRaw('parchment');
    }
  }, [loading, user, theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
