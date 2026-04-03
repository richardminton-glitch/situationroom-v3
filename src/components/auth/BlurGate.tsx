'use client';

import type { ReactNode } from 'react';
import { useTier } from '@/hooks/useTier';
import { UpgradePrompt } from './UpgradePrompt';
import type { Tier } from '@/types';

interface BlurGateProps {
  requiredTier: Exclude<Tier, 'free'>;
  featureName?: string;
  children: ReactNode;
  onUpgradeClick?: () => void;
}

/**
 * Renders children blurred (6px) with an overlay UpgradePrompt if tier is insufficient.
 * Children are always rendered in the DOM — only visually obscured.
 */
export function BlurGate({
  requiredTier,
  featureName,
  children,
  onUpgradeClick,
}: BlurGateProps) {
  const { canAccess, loading } = useTier();

  if (loading) return null;
  if (canAccess(requiredTier)) return <>{children}</>;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>
      <UpgradePrompt
        requiredTier={requiredTier}
        featureName={featureName}
        variant="overlay"
        onUpgradeClick={onUpgradeClick}
      />
    </div>
  );
}
