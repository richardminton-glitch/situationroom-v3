'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { UserProfile } from '@/types';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (partial: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
  updateUser: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const updateUser = useCallback((partial: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : null));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
