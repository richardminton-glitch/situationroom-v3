import type { Tier } from '@/types';

/** Primary admin email — full access regardless of tier. */
export const ADMIN_EMAILS: string[] = ['richardminton@gmail.com'];

export function isAdmin(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export const TIER_ORDER: Tier[] = ['free', 'general', 'members', 'vip'];

export const TIER_LABELS: Record<Tier, string> = {
  free:    'Free',
  general: 'General',
  members: 'Members',
  vip:     'VIP',
};

export const TIER_COLORS: Record<Tier, string> = {
  free:    '#8b7355',
  general: '#8b6914',
  members: '#4a6fa5',
  vip:     '#7c5cbf',
};

export const TIER_PRICES: Record<Exclude<Tier, 'free'>, number> = {
  general: 10_000,  // sats/mo
  members: 25_000,
  vip:     50_000,
};

/** Returns true if userTier meets or exceeds requiredTier. */
export function hasAccess(userTier: Tier, requiredTier: Tier): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(requiredTier);
}

type Feature =
  | 'dark_mode'
  | 'full_data_view'
  | 'macro_focus_view'
  | 'conviction_breakdown'
  | 'ai_intelligence_panel'
  | 'briefing_detail'
  | 'briefing_archive_30d'
  | 'onchain_deep_dive'
  | 'ops_room_chat_post'
  | 'pool_view'
  | 'miners_network_section'
  | 'edit_layout'
  | 'personal_conviction'
  | 'ai_annotations'
  | 'alerts'
  | 'vip_briefing'
  | 'newsletter_daily'
  | 'newsletter_vip_topics'
  | 'portfolio_context';

const FEATURE_REQUIREMENTS: Record<Feature, Tier> = {
  dark_mode:              'general',
  full_data_view:         'general',
  macro_focus_view:       'general',
  conviction_breakdown:   'general',
  ai_intelligence_panel:  'general',
  briefing_detail:        'general',
  briefing_archive_30d:   'general',
  onchain_deep_dive:      'members',
  ops_room_chat_post:     'members',
  pool_view:              'members',
  miners_network_section: 'members',
  edit_layout:            'vip',
  personal_conviction:    'vip',
  ai_annotations:         'members',
  alerts:                 'vip',
  vip_briefing:           'vip',
  newsletter_daily:       'general',
  newsletter_vip_topics:  'vip',
  portfolio_context:      'vip',
};

export function canAccess(userTier: Tier, feature: Feature): boolean {
  return hasAccess(userTier, FEATURE_REQUIREMENTS[feature]);
}

export function requiredTierFor(feature: Feature): Tier {
  return FEATURE_REQUIREMENTS[feature];
}
