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
import {
  sendUpgradeConfirmationEmail,
  sendExpiryWarningEmail,
  expiryWarningPlaintext,
} from '@/lib/newsletter/lifecycle';
import { sendNostrDm } from '@/lib/nostr/dm';
import { TIER_LABELS } from '@/lib/auth/tier';

const SUBSCRIPTION_TIERS = ['general', 'members', 'vip'] as const;
type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

const SUBSCRIPTION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;          // 7 days

// ── Memo builders ─────────────────────────────────────────────────────────────

export function buildSubscriptionMemo(tier: SubscriptionTier, userId: string): string {
  return `SITROOM-${tier.toUpperCase()}-${userId}-${Math.floor(Date.now() / 1000)}`;
}

export function buildTrialMemo(targetTier: SubscriptionTier, userId: string): string {
  return `SITROOM-TRIAL-${targetTier.toUpperCase()}-${userId}-${Math.floor(Date.now() / 1000)}`;
}

export function buildDonationMemo(): string {
  return `SITROOM-DONATE-${Math.floor(Date.now() / 1000)}`;
}

// ── Memo parser ───────────────────────────────────────────────────────────────

interface ParsedMemo {
  type: 'subscription' | 'trial' | 'donation' | 'pool';
  tier?: SubscriptionTier;
  userId?: string;
}

export function parseMemo(memo: string): ParsedMemo {
  if (!memo.startsWith('SITROOM-')) return { type: 'pool' };

  // Trial: SITROOM-TRIAL-TIER-USERID-TS
  if (memo.startsWith('SITROOM-TRIAL-')) {
    const parts = memo.split('-');
    const tierStr = parts[2]?.toLowerCase();
    const tier = SUBSCRIPTION_TIERS.find((t) => t === tierStr);
    const userId = parts[3];
    if (tier && userId) return { type: 'trial', tier, userId };
  }

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

interface ActivateOptions {
  /** Override duration. 'lifetime' sets expiresAt to null (VIP). */
  duration?: 'monthly' | 'trial' | 'lifetime';
}

export async function activateTier(
  userId: string,
  tier: Tier,
  paymentId: string,
  opts?: ActivateOptions,
): Promise<void> {
  const now = new Date();
  const duration = opts?.duration ?? 'monthly';

  const expiresAt = duration === 'lifetime'
    ? null
    : duration === 'trial'
      ? new Date(now.getTime() + TRIAL_DURATION_MS)
      : new Date(now.getTime() + SUBSCRIPTION_DURATION_MS);

  const { user: updatedUser, payment } = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: userId },
      data: {
        tier,
        subscriptionActivatedAt: now,
        subscriptionExpiresAt:   expiresAt,
        // Clear the warning flag so the next renewal cycle can warn again.
        expiryWarningSentAt:     null,
      },
    });
    const p = await tx.subscriptionPayment.update({
      where: { id: paymentId },
      data: { status: 'confirmed', activatedAt: now, expiresAt },
    });
    return { user: u, payment: p };
  });

  // Sync relay whitelist (Members+ get posting access)
  const npub = getActiveNpub(updatedUser);
  await syncRelayForUser(userId, npub, tier);

  // Send upgrade confirmation email — non-blocking, swallow errors
  await sendUpgradeConfirmationEmail(updatedUser.email, tier, {
    duration,
    expiresAt,
    amountSats: payment.amountSats,
  });

  const label = duration === 'lifetime' ? 'lifetime' : expiresAt!.toISOString();
  console.log(`[Payments] Activated ${tier} (${duration}) for user ${userId}, expires ${label}`);
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

  // Users whose subscription expires within 3 days *and* haven't already been
  // warned for this billing cycle. The flag is cleared inside activateTier on
  // every renewal so the next cycle starts fresh.
  const soonExpiring = await prisma.user.findMany({
    where: {
      tier:                  { not: 'free' },
      subscriptionExpiresAt: { lte: warningThreshold, gte: now },
      expiryWarningSentAt:   null,
    },
    select: {
      id:                    true,
      email:                 true,
      nostrNpub:             true,
      tier:                  true,
      subscriptionExpiresAt: true,
    },
  });

  for (const user of soonExpiring) {
    if (!user.subscriptionExpiresAt) continue;

    const tier = user.tier as Tier;
    const tierLabel = TIER_LABELS[tier] ?? tier;
    const daysRemaining = Math.max(
      1,
      Math.round((user.subscriptionExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    );

    // 1. Email — only fires if user has a real email (not the nostr: placeholder).
    const emailSent = await sendExpiryWarningEmail(user.email, tier, user.subscriptionExpiresAt);

    // 2. Nostr DM — only fires if user has a native npub *and* the bot relay is configured.
    let dmSent = false;
    if (user.nostrNpub) {
      dmSent = await sendNostrDm(
        user.nostrNpub,
        expiryWarningPlaintext(tierLabel, user.subscriptionExpiresAt, daysRemaining),
      );
    }

    // 3. Mark as warned so the next cron tick doesn't re-send.
    //    Set the flag even if both channels failed — otherwise we'd loop on
    //    persistent failures (e.g. invalid email). Logged for visibility.
    await prisma.user.update({
      where: { id: user.id },
      data:  { expiryWarningSentAt: now },
    });

    console.log(
      `[Renewal] Warned user ${user.id} (${tier}) — expires ${user.subscriptionExpiresAt.toISOString()}, ` +
      `email=${emailSent ? 'sent' : 'skipped'}, dm=${dmSent ? 'sent' : 'skipped'}`,
    );
  }

  // Users whose subscription has expired — downgrade to free
  // VIP lifetime (expiresAt = null) naturally excluded — Prisma { lt: now } skips nulls
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
