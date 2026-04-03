export type Theme = 'parchment' | 'dark';
export type Tier = 'free' | 'premium';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'sats';

export type PanelCategory = 'bitcoin' | 'macro' | 'geopolitical' | 'onchain' | 'ui';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  timezone: string;
  currencyPref: Currency;
  themePref: Theme;
  tier: Tier;
  isPublic: boolean;
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
