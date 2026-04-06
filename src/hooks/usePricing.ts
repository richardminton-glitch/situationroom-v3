'use client';

import { useEffect, useState } from 'react';

export interface TierPricing {
  satsPerGbp: number;
  tierPricesGbp: { general: number; members: number; vip: number };
  tierPricesSats: { general: number; members: number; vip: number };
  tierBilling: { general: 'monthly' | 'lifetime'; members: 'monthly' | 'lifetime'; vip: 'monthly' | 'lifetime' };
  trialSats: number;
  trialDays: number;
}

const FALLBACK: TierPricing = {
  satsPerGbp: 1_900,
  tierPricesGbp: { general: 2.99, members: 6, vip: 50 },
  tierPricesSats: { general: 5_681, members: 11_400, vip: 95_000 },
  tierBilling: { general: 'monthly', members: 'monthly', vip: 'lifetime' },
  trialSats: 2_100,
  trialDays: 7,
};

/**
 * Fetches live tier pricing (GBP + sats) from /api/rates.
 * Falls back to reasonable estimates if the API is down.
 */
export function usePricing(): TierPricing | null {
  const [pricing, setPricing] = useState<TierPricing | null>(null);

  useEffect(() => {
    fetch('/api/rates')
      .then((r) => r.json())
      .then((data) => setPricing(data))
      .catch(() => setPricing(FALLBACK));
  }, []);

  return pricing;
}

/** Format sats with commas, e.g. 5,681 */
export function formatSats(sats: number): string {
  return Math.round(sats).toLocaleString();
}

/** Format a tier price label, e.g. "5,681 sats/mo" or "95,000 sats (lifetime)" */
export function formatTierPrice(
  tier: 'general' | 'members' | 'vip',
  pricing: TierPricing,
): string {
  const sats = pricing.tierPricesSats[tier];
  const billing = pricing.tierBilling[tier];
  if (billing === 'lifetime') return `${formatSats(sats)} sats (lifetime)`;
  return `${formatSats(sats)} sats/mo`;
}
