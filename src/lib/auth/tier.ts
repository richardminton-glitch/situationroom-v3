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
  // ── Free ──
  | 'newsletter_signup'        // daily/weekly newsletter
  | 'full_overview_view'       // Full Overview dashboard
  | 'full_data_view'           // Full Data dashboard
  | 'briefing_outlook'         // outlook section only of briefings
  | 'briefing_archive_7d'      // 7-day briefing archive (outlook only)
  // ── General ──
  | 'dark_mode'
  | 'macro_focus_view'
  | 'conviction_breakdown'
  | 'ai_intelligence_panel'    // full briefing (all 5 sections)
  | 'briefing_full'            // full briefing detail (all sections)
  | 'briefing_archive_30d'     // 30-day briefing archive (full)
  | 'newsletter_daily'         // full daily newsletter
  // ── Members ──
  | 'onchain_deep_dive'
  | 'ops_room_chat_post'
  | 'pool_view'
  | 'miners_network_section'
  | 'ai_annotations'
  | 'ai_analysis_view'         // AI Analysis layout preset
  // ── VIP ──
  | 'edit_layout'
  | 'personal_conviction'
  | 'alerts'
  | 'vip_briefing'
  | 'newsletter_vip_topics'
  | 'onchain_ai_analysis'      // Grok-3 on-chain deep analysis
  | 'portfolio_context';

const FEATURE_REQUIREMENTS: Record<Feature, Tier> = {
  // Free — available to everyone
  newsletter_signup:      'free',
  full_overview_view:     'free',
  full_data_view:         'free',
  briefing_outlook:       'free',
  briefing_archive_7d:    'free',
  // General
  dark_mode:              'general',
  macro_focus_view:       'general',
  conviction_breakdown:   'general',
  ai_intelligence_panel:  'general',
  briefing_full:          'general',
  briefing_archive_30d:   'general',
  newsletter_daily:       'general',
  // Members
  onchain_deep_dive:      'members',
  ops_room_chat_post:     'members',
  pool_view:              'members',
  miners_network_section: 'members',
  ai_annotations:         'members',
  ai_analysis_view:       'members',
  // VIP
  edit_layout:            'vip',
  personal_conviction:    'vip',
  alerts:                 'vip',
  vip_briefing:           'vip',
  newsletter_vip_topics:  'vip',
  onchain_ai_analysis:    'vip',
  portfolio_context:      'vip',
};

export function canAccess(userTier: Tier, feature: Feature): boolean {
  return hasAccess(userTier, FEATURE_REQUIREMENTS[feature]);
}

export function requiredTierFor(feature: Feature): Tier {
  return FEATURE_REQUIREMENTS[feature];
}
