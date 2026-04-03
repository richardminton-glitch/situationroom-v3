/**
 * Payment routing and subscription activation.
 *
 * Memo format:
 *   Subscription:  SITROOM-[TIER]-[USERID]-[UNIX_TS]
 *   Donation:      SITROOM-DONATE-[UNIX_TS]
 *   Pool (bot):    (any other format — routed to pool credit logic)
 *
 * Routing on confirmed deposit:
 *   SITROOM-GENERAL-*  → activateTier(userId, 'general', 30 days)
 *   SITROOM-MEMBERS-*  → activateTier(userId, 'members', 30 days)
 *   SITROOM-VIP-*      → activateTier(userId, 'vip', 30 days)
 *   SITROOM-DONATE-*   → recordDonation(amount)
 */

import { prisma } from '@/lib/db';
import type { Tier } from '@/types';
import { syncRelayForUser, getActiveNpub } from '@/lib/nostr/relay';

const SUBSCRIPTION_TIERS = ['general', 'members', 'vip'] as const;
type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

const SUBSCRIPTION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ── Memo builders ─────────────────────────────────────────────────────────────

export function buildSubscriptionMemo(tier: SubscriptionTier, userId: string): string {
  return `SITROOM-${tier.toUpperCase()}-${userId}-${Math.floor(Date.now() / 1000)}`;
}

export function buildDonationMemo(): string {
  return `SITROOM-DONATE-${Math.floor(Date.now() / 1000)}`;
}

// ── Memo parser ───────────────────────────────────────────────────────────────

interface ParsedMemo {
  type: 'subscription' | 'donation' | 'pool';
  tier?: SubscriptionTier;
  userId?: string;
}

export function parseMemo(memo: string): ParsedMemo {
  if (!memo.startsWith('SITROOM-')) return { type: 'pool' };

  for (const tier of SUBSCRIPTION_TIERS) {
    if (memo.startsWith(`SITROOM-${tier.toUpperCase()}-`)) {
      const parts = memo.split('-');
      // Format: SITROOM-TIER-USERID-TS (userId is parts[2])
      const userId = parts[2];
      return { type: 'subscription', tier, userId };
    }
  }

  if (memo.startsWith('SITROOM-DONATE-')) {
    return { type: 'donation' };
  }

  return { type: 'pool' };
}

// ── Tier activation ───────────────────────────────────────────────────────────

export async function activateTier(
  userId: string,
  tier: Tier,
  paymentId: string,
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SUBSCRIPTION_DURATION_MS);

  const updatedUser = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: userId },
      data: { tier, subscriptionActivatedAt: now, subscriptionExpiresAt: expiresAt },
    });
    await tx.subscriptionPayment.update({
      where: { id: paymentId },
      data: { status: 'confirmed', activatedAt: now, expiresAt },
    });
    return u;
  });

  // Sync relay whitelist (Members+ get posting access)
  const npub = getActiveNpub(updatedUser);
  await syncRelayForUser(userId, npub, tier);

  console.log(`[Payments] Activated ${tier} for user ${userId}, expires ${expiresAt.toISOString()}`);
}

export async function recordDonation(amountSats: number, paymentId: string): Promise<void> {
  await prisma.subscriptionPayment.update({
    where: { id: paymentId },
    data: { status: 'confirmed', activatedAt: new Date() },
  });
  console.log(`[Payments] Donation recorded: ${amountSats} sats`);
}

// ── Renewal check (run daily) ─────────────────────────────────────────────────

export async function processExpiredSubscriptions(): Promise<void> {
  const now = new Date();
  const warningThreshold = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days

  // Users whose subscription expires within 3 days — send warning
  const soonExpiring = await prisma.user.findMany({
    where: {
      tier:                    { not: 'free' },
      subscriptionExpiresAt:   { lte: warningThreshold, gte: now },
    },
    select: { id: true, email: true, nostrNpub: true, tier: true, subscriptionExpiresAt: true },
  });

  for (const user of soonExpiring) {
    // TODO Phase 5.1: send Nostr DM warning if user.nostrNpub is set
    console.log(`[Renewal] Warning: user ${user.id} (${user.tier}) expires ${user.subscriptionExpiresAt?.toISOString()}`);
  }

  // Users whose subscription has expired — downgrade to free
  const expired = await prisma.user.findMany({
    where: {
      tier:                  { not: 'free' },
      subscriptionExpiresAt: { lt: now },
    },
    select: { id: true, tier: true },
  });

  if (expired.length > 0) {
    // Fetch user npubs before downgrading (for relay removal)
    const expiredUsers = await prisma.user.findMany({
      where: { id: { in: expired.map((u) => u.id) } },
      select: { id: true, nostrNpub: true, assignedNpub: true },
    });

    await prisma.user.updateMany({
      where: { id: { in: expired.map((u) => u.id) } },
      data:  { tier: 'free', subscriptionExpiresAt: null },
    });

    // Remove expired users from relay whitelist
    for (const u of expiredUsers) {
      const npub = getActiveNpub(u);
      if (npub) await syncRelayForUser(u.id, npub, 'free');
    }

    console.log(`[Renewal] Downgraded ${expired.length} expired subscriptions to free`);
  }
}
