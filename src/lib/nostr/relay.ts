/**
 * Nostr relay whitelist management.
 *
 * The private relay (nostream or strfry) exposes an admin HTTP API for managing
 * which npubs are allowed to publish events. This module wraps those calls and
 * keeps the `nostr_relay_whitelist` DB table in sync.
 *
 * Environment variables:
 *   NOSTR_RELAY_URL         — e.g. wss://relay.situationroom.space
 *   NOSTR_RELAY_ADMIN_URL   — e.g. http://localhost:8008 (internal admin API)
 *   NOSTR_RELAY_ADMIN_TOKEN — Bearer token for admin API
 *
 * Relay admin API (nostream-compatible):
 *   PUT  /api/user/[npub]   — allowlist npub
 *   DELETE /api/user/[npub] — remove npub
 *
 * If NOSTR_RELAY_ADMIN_URL is not set, whitelist changes are logged but not
 * sent to the relay (useful during development or before relay is provisioned).
 */

import { prisma } from '@/lib/db';

const RELAY_ADMIN_URL = process.env.NOSTR_RELAY_ADMIN_URL;
const RELAY_ADMIN_TOKEN = process.env.NOSTR_RELAY_ADMIN_TOKEN;

// ── HTTP helpers ───────────────────────────────────────────────────────────────

async function relayRequest(method: 'PUT' | 'DELETE', npub: string): Promise<boolean> {
  if (!RELAY_ADMIN_URL || !RELAY_ADMIN_TOKEN) {
    console.log(`[relay] ${method} ${npub} — skipped (NOSTR_RELAY_ADMIN_URL not configured)`);
    return true; // treat as success — relay not yet provisioned
  }

  try {
    const res = await fetch(`${RELAY_ADMIN_URL}/api/user/${npub}`, {
      method,
      headers: {
        Authorization: `Bearer ${RELAY_ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      console.error(`[relay] ${method} ${npub} failed: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[relay] ${method} ${npub} error:`, err);
    return false;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Add a user's npub to the relay whitelist.
 * Called on Members+ tier activation.
 */
export async function addToRelay(userId: string, npub: string): Promise<void> {
  await relayRequest('PUT', npub);

  // Upsert in DB
  await prisma.nostrRelayWhitelist.upsert({
    where: { npub },
    create: { npub, userId, active: true },
    update: { active: true, removedAt: null },
  });

  console.log(`[relay] Added ${npub} (user ${userId})`);
}

/**
 * Remove a user's npub from the relay whitelist.
 * Called on tier expiry, downgrade below Members, or npub upgrade.
 */
export async function removeFromRelay(userId: string, npub: string): Promise<void> {
  await relayRequest('DELETE', npub);

  try {
    await prisma.nostrRelayWhitelist.update({
      where: { npub },
      data: { active: false, removedAt: new Date() },
    });
  } catch {
    // Row may not exist if the user was never added
  }

  console.log(`[relay] Removed ${npub} (user ${userId})`);
}

/**
 * Get the active npub for a user — prefers native npub, falls back to assigned.
 */
export function getActiveNpub(user: {
  nostrNpub: string | null;
  assignedNpub: string | null;
}): string | null {
  return user.nostrNpub ?? user.assignedNpub ?? null;
}

/**
 * Sync relay whitelist for a user after tier change.
 * Adds if tier >= 'members', removes otherwise.
 */
export async function syncRelayForUser(
  userId: string,
  npub: string | null,
  newTier: string,
): Promise<void> {
  if (!npub) return;
  const needsAccess = ['members', 'vip'].includes(newTier);
  if (needsAccess) {
    await addToRelay(userId, npub);
  } else {
    await removeFromRelay(userId, npub);
  }
}
