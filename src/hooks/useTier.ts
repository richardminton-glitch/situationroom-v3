'use client';

import { useAuth } from '@/components/layout/AuthProvider';
import { hasAccess, isAdmin } from '@/lib/auth/tier';
import type { Tier } from '@/types';

export function useTier() {
  const { user, loading } = useAuth();

  const userTier: Tier = (user?.tier as Tier) ?? 'free';
  const isLoggedIn = user !== null;
  const admin = isAdmin(user?.email);

  return {
    userTier,
    isLoggedIn,
    loading,
    // Admin bypasses all tier gates — treated as VIP
    canAccess: (requiredTier: Tier) => admin || hasAccess(userTier, requiredTier),
  };
}
