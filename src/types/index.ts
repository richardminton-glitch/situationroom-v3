export type Theme = 'parchment' | 'dark';
export type Tier = 'free' | 'general' | 'members' | 'vip';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'sats';
export type NostrAuthType = 'email' | 'assigned' | 'native' | 'upgraded';
export type ChatIcon = 'lightning' | 'email' | 'bot';

export type PanelCategory = 'bitcoin' | 'macro' | 'geopolitical' | 'onchain' | 'ui' | 'ai';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  timezone: string;
  currencyPref: Currency;
  themePref: Theme;
  tier: Tier;
  isPublic: boolean;

  // Nostr identity
  nostrNpub: string | null;
  nostrAuthType: NostrAuthType;
  assignedNpub: string | null;
  chatDisplayName: string;
  chatIcon: ChatIcon;

  // Subscription
  subscriptionExpiresAt: string | null;  // ISO datetime
  subscriptionActivatedAt: string | null;

  // Newsletter
  newsletterEnabled: boolean;
  newsletterFrequency: 'daily' | 'weekly';
  newsletterDay: number;
  newsletterVipTopics: string[];
  newsletterLastSent: string | null;
  newsletterConfirmedAt: string | null;

  // Bot Room / TradingView
  tvChartState: Record<string, unknown> | null;
}

export interface ConvictionSignal {
  name: string;
  score: number;
  weight: number;
  direction: 'up' | 'down' | 'neutral';
  data: Record<string, unknown>;
}

export interface BriefingSummary {
  date: string;
  headline: string;
  threatLevel: string;
  convictionScore: number;
}
