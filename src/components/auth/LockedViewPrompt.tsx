'use client';

import { useRouter } from 'next/navigation';
import type { Tier } from '@/types';
import { TIER_LABELS, TIER_BILLING } from '@/lib/auth/tier';
import { usePricing, formatTierPrice } from '@/hooks/usePricing';

interface LockedViewPromptProps {
  view: string;
  requiredTier: Exclude<Tier, 'free'>;
  description: string;
  onUpgradeClick?: () => void;
}

/**
 * Full-area replacement shown when a free user navigates to a locked view.
 * The left data column remains visible alongside this — only the canvas is replaced.
 */
export function LockedViewPrompt({ view, requiredTier, description, onUpgradeClick }: LockedViewPromptProps) {
  const router = useRouter();
  const pricing = usePricing();
  const goToSupport = onUpgradeClick ?? (() => router.push('/support'));
  const tier = TIER_LABELS[requiredTier];
  const priceLabel = pricing ? formatTierPrice(requiredTier, pricing) : '...';

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', padding: '40px 24px', textAlign: 'center',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <div style={{ marginBottom: '8px', fontSize: '10px', letterSpacing: '0.18em', color: 'var(--text-muted)' }}>
        {view.toUpperCase()}
      </div>
      <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '12px', letterSpacing: '0.06em' }}>
        {tier} required
      </div>
      <div
        style={{
          maxWidth: '320px', fontSize: '12px', color: 'var(--text-secondary)',
          lineHeight: '1.7', marginBottom: '24px',
        }}
      >
        {description}
      </div>
      <button
        onClick={goToSupport}
        style={{
          padding: '10px 28px', background: 'var(--accent-primary)',
          color: 'var(--bg-primary)', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: '12px',
          letterSpacing: '0.12em', fontWeight: 'bold',
        }}
      >
        UNLOCK ⚡ — {priceLabel}
      </button>
      <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
        {TIER_BILLING[requiredTier] === 'lifetime' ? 'One-off payment · Lifetime access' : '30-day subscription · Cancel anytime'}
      </div>
    </div>
  );
}
