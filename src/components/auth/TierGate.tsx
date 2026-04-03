'use client';

import type { ReactNode } from 'react';
import { useTier } from '@/hooks/useTier';
import { UpgradePrompt } from './UpgradePrompt';
import type { Tier } from '@/types';

interface TierGateProps {
  requiredTier: Tier;
  featureName?: string;
  promptVariant?: 'inline' | 'overlay' | 'banner' | 'sidebar';
  children: ReactNode;
  onUpgradeClick?: () => void;
}

/**
 * Shows children when the user meets the required tier.
 * Otherwise shows an UpgradePrompt. Never uses display:none.
 */
export function TierGate({
  requiredTier,
  featureName,
  promptVariant = 'overlay',
  children,
  onUpgradeClick,
}: TierGateProps) {
  const { canAccess, loading } = useTier();

  // During load, render nothing to avoid FOUC
  if (loading) return null;

  if (!canAccess(requiredTier)) {
    if (requiredTier === 'free') return <>{children}</>;
    return (
      <UpgradePrompt
        requiredTier={requiredTier as Exclude<Tier, 'free'>}
        featureName={featureName}
        variant={promptVariant}
        onUpgradeClick={onUpgradeClick}
      />
    );
  }

  return <>{children}</>;
}
