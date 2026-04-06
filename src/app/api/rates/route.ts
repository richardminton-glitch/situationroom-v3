/**
 * GET /api/rates
 *
 * Returns live sats-per-GBP rate for client-side price display.
 * Uses the shared getLiveSatsPerGbp() which has 5-min server cache.
 */

import { NextResponse } from 'next/server';
import { getLiveSatsPerGbp } from '@/lib/lnm/rates';
import { TIER_PRICES_GBP, TIER_BILLING, TRIAL_SATS, TRIAL_DURATION_DAYS } from '@/lib/auth/tier';
import { gbpToSats } from '@/lib/lnm/rates';

export async function GET() {
  const satsPerGbp = await getLiveSatsPerGbp();

  // Pre-compute tier prices in sats for client convenience
  const tierPricesSats = {
    general: gbpToSats(TIER_PRICES_GBP.general, satsPerGbp),
    members: gbpToSats(TIER_PRICES_GBP.members, satsPerGbp),
    vip:     gbpToSats(TIER_PRICES_GBP.vip, satsPerGbp),
  };

  return NextResponse.json({
    satsPerGbp,
    tierPricesGbp: TIER_PRICES_GBP,
    tierPricesSats,
    tierBilling: TIER_BILLING,
    trialSats: TRIAL_SATS,
    trialDays: TRIAL_DURATION_DAYS,
  });
}
