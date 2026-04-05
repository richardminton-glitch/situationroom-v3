import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import type { UserProfile } from '@/types';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    const profile: UserProfile = {
      id:          user.id,
      email:       user.email,
      displayName: user.displayName,
      timezone:    user.timezone,
      currencyPref: user.currencyPref as UserProfile['currencyPref'],
      themePref:   user.themePref as UserProfile['themePref'],
      tier:        user.tier as UserProfile['tier'],
      isPublic:    user.isPublic,

      nostrNpub:       user.nostrNpub,
      nostrAuthType:   user.nostrAuthType as UserProfile['nostrAuthType'],
      assignedNpub:    user.assignedNpub,
      chatDisplayName: user.chatDisplayName,
      chatIcon:        user.chatIcon as UserProfile['chatIcon'],

      subscriptionExpiresAt:   user.subscriptionExpiresAt?.toISOString() ?? null,
      subscriptionActivatedAt: user.subscriptionActivatedAt?.toISOString() ?? null,

      newsletterEnabled:    user.newsletterEnabled,
      newsletterFrequency:  user.newsletterFrequency as 'daily' | 'weekly',
      newsletterDay:        user.newsletterDay,
      newsletterVipTopics:  user.newsletterVipTopics,
      newsletterLastSent:   user.newsletterLastSent?.toISOString() ?? null,
      newsletterConfirmedAt: user.newsletterConfirmedAt?.toISOString() ?? null,

      portfolioCostBasis:   user.portfolioCostBasis,
      portfolioHoldingsBtc: user.portfolioHoldingsBtc,

      tvChartState: user.tvChartState as Record<string, unknown> | null,
    };

    return NextResponse.json({ user: profile });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
