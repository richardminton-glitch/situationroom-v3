/**
 * Per-user daily AI rate limiter.
 *
 * Uses the DataCache table (key: `ai-limit:{userId}:{YYYY-MM-DD}`)
 * to track daily call counts. No new schema migration needed.
 *
 * Tier limits:
 *   members  — 20 calls/day
 *   vip      — unlimited
 *   admin    — unlimited
 */

import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth/tier';
import type { Tier } from '@/types';

const DAILY_LIMITS: Partial<Record<Tier, number>> = {
  members: 20,
  // vip: unlimited (no entry = no cap)
};

function cacheKey(userId: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `ai-limit:${userId}:${today}`;
}

/**
 * Check whether the user has remaining AI calls today.
 * Returns { allowed: true, remaining } or { allowed: false, remaining: 0, resetAt }.
 */
export async function checkAiRateLimit(
  userId: string,
  userTier: Tier,
  userEmail?: string | null
): Promise<{ allowed: boolean; remaining: number; used: number; limit: number | null; resetAt?: string }> {
  // Admins and VIPs are unlimited
  if (userTier === 'vip' || (userEmail && isAdmin(userEmail))) {
    return { allowed: true, remaining: Infinity, used: 0, limit: null };
  }

  const limit = DAILY_LIMITS[userTier];
  if (limit == null) {
    // Tier has no defined limit (shouldn't happen for members, but safe fallback)
    return { allowed: true, remaining: Infinity, used: 0, limit: null };
  }

  const key = cacheKey(userId);

  try {
    const row = await prisma.dataCache.findUnique({ where: { key } });
    const used = row ? parseInt(row.data, 10) || 0 : 0;

    if (used >= limit) {
      // Calculate midnight UTC reset
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);

      return {
        allowed: false,
        remaining: 0,
        used,
        limit,
        resetAt: tomorrow.toISOString(),
      };
    }

    return { allowed: true, remaining: limit - used, used, limit };
  } catch (err) {
    console.error('[RateLimit] Check failed:', err);
    // On error, allow the call (fail open)
    return { allowed: true, remaining: limit, used: 0, limit };
  }
}

/**
 * Increment the user's daily AI usage counter.
 * Call this AFTER a successful AI generation (not on cache hits).
 */
export async function incrementAiUsage(userId: string): Promise<void> {
  const key = cacheKey(userId);
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 1);
  expiresAt.setUTCHours(6, 0, 0, 0); // Expire 6am UTC next day (cleanup buffer)

  try {
    const existing = await prisma.dataCache.findUnique({ where: { key } });
    const newCount = existing ? (parseInt(existing.data, 10) || 0) + 1 : 1;

    await prisma.dataCache.upsert({
      where: { key },
      create: { key, data: String(newCount), expiresAt, updatedAt: new Date() },
      update: { data: String(newCount), updatedAt: new Date() },
    });
  } catch (err) {
    console.error('[RateLimit] Increment failed:', err);
  }
}
