'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TIER_LABELS } from '@/lib/auth/tier';
import { usePricing, formatTierPrice } from '@/hooks/usePricing';
import type { Tier } from '@/types';

interface UpgradePromptProps {
  requiredTier: Exclude<Tier, 'free'>;
  featureName?: string;
  variant: 'inline' | 'overlay' | 'banner' | 'sidebar';
  onUpgradeClick?: () => void;
}

export function UpgradePrompt({
  requiredTier,
  featureName,
  variant,
  onUpgradeClick,
}: UpgradePromptProps) {
  const [dismissed] = useState(false);
  const router = useRouter();
  const pricing = usePricing();
  const tierLabel = TIER_LABELS[requiredTier];
  const priceLabel = pricing ? formatTierPrice(requiredTier, pricing) : '...';
  const goToSupport = onUpgradeClick ?? (() => router.push('/support'));

  if (variant === 'inline') {
    return (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
        {featureName ? `${featureName} — ` : ''}
        <button
          onClick={goToSupport}
          style={{ color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0, letterSpacing: 'inherit' }}
        >
          [{tierLabel.toUpperCase()} ↑ UNLOCK →]
        </button>
      </span>
    );
  }

  if (variant === 'banner') {
    if (dismissed) return null;
    return (
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontFamily: 'var(--font-mono)', fontSize: '10px',
          color: 'var(--text-muted)', opacity: 0.7,
        }}
      >
        <button
          onClick={goToSupport}
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
            color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)',
            fontSize: '10px', padding: '2px 6px', cursor: 'pointer',
            letterSpacing: '0.05em',
          }}
        >
          {tierLabel.toUpperCase()} ↑
        </button>
      </span>
    );
  }

  if (variant === 'sidebar') {
    return (
      <button
        onClick={onUpgradeClick}
        style={{
          display: 'block', width: '100%', textAlign: 'left',
          fontFamily: 'var(--font-mono)', fontSize: '11px',
          color: 'var(--accent-primary)', background: 'none', border: 'none',
          cursor: 'pointer', padding: '4px 0', letterSpacing: '0.05em',
        }}
      >
        ⚡ Upgrade to {tierLabel} — {priceLabel} →
      </button>
    );
  }

  // overlay variant
  return (
    <div
      style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: 10, padding: '24px', textAlign: 'center',
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
          padding: '20px 24px', maxWidth: '280px',
        }}
      >
        {featureName && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.1em' }}>
            {featureName.toUpperCase()}
          </div>
        )}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
          {tierLabel} — {priceLabel}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {featureName ? `Unlock ${featureName}` : `Requires ${tierLabel} tier`}
        </div>
        <button
          onClick={goToSupport}
          style={{
            width: '100%', padding: '8px 16px',
            background: 'var(--accent-primary)', color: 'var(--bg-primary)',
            border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)',
            fontSize: '12px', letterSpacing: '0.1em', fontWeight: 'bold',
          }}
        >
          UNLOCK ⚡
        </button>
      </div>
    </div>
  );
}
