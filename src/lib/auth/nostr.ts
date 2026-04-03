/**
 * Nostr authentication — NIP-07 challenge/verify flow.
 *
 * Flow:
 *   1. Client calls POST /api/auth/nostr/challenge → gets { challenge }
 *   2. Client builds a kind-1 event with content = challenge, calls window.nostr.signEvent()
 *   3. Client POSTs the signed event to POST /api/auth/nostr/verify
 *   4. Server verifies event id + Schnorr signature, looks up or creates user
 */

import { prisma } from '@/lib/db';
import crypto from 'crypto';
import { verifyEvent, type Event as NostrEvent } from 'nostr-tools';

const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const CHALLENGE_PREFIX = 'sitroom-auth:';

export async function createChallenge(): Promise<string> {
  const challenge = CHALLENGE_PREFIX + crypto.randomBytes(24).toString('hex');
  await prisma.nostrChallenge.create({
    data: {
      challenge,
      expiresAt: new Date(Date.now() + CHALLENGE_EXPIRY_MS),
    },
  });
  return challenge;
}

export async function consumeChallenge(challenge: string): Promise<boolean> {
  const row = await prisma.nostrChallenge.findUnique({ where: { challenge } });
  if (!row) return false;
  if (row.usedAt) return false;       // already used
  if (row.expiresAt < new Date()) {   // expired
    await prisma.nostrChallenge.delete({ where: { challenge } });
    return false;
  }
  await prisma.nostrChallenge.update({
    where: { challenge },
    data: { usedAt: new Date() },
  });
  return true;
}

/**
 * Verify a NIP-07 signed event.
 * Returns the hex pubkey if valid, null otherwise.
 */
export function verifyNostrEvent(event: NostrEvent): string | null {
  try {
    const valid = verifyEvent(event);
    return valid ? event.pubkey : null;
  } catch {
    return null;
  }
}

/** Display name for a native Nostr user: anon-[first 8 hex chars of pubkey] */
export function nativeDisplayName(pubkeyHex: string): string {
  return `anon-${pubkeyHex.slice(0, 8)}`;
}

/** Clean up expired challenges (call from daily cron). */
export async function cleanupExpiredChallenges(): Promise<void> {
  const { count } = await prisma.nostrChallenge.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  if (count > 0) console.log(`[NostrAuth] Pruned ${count} expired challenges`);
}
