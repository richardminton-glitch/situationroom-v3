import type { Tier } from '@/types';

type Feature =
  | 'custom_layouts'
  | 'briefing_archive_full'
  | 'unlimited_watchlists'
  | 'alerts'
  | 'daily_email_digest'
  | 'conviction_override';

const PREMIUM_FEATURES: Feature[] = [
  'custom_layouts',
  'briefing_archive_full',
  'unlimited_watchlists',
  'alerts',
  'daily_email_digest',
  'conviction_override',
];

const FREE_LIMITS = {
  savedLayouts: 1,
  briefingArchiveDays: 7,
  watchlists: 1,
  watchlistItems: 5,
} as const;

export function canAccess(tier: Tier, feature: Feature): boolean {
  if (tier === 'premium') return true;
  return !PREMIUM_FEATURES.includes(feature);
}

export function getLimit(tier: Tier, limit: keyof typeof FREE_LIMITS): number {
  if (tier === 'premium') return Infinity;
  return FREE_LIMITS[limit];
}
