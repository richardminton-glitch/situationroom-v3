/**
 * Dev-only master auth — local testing without going through the email/PIN
 * or Nostr login flow.
 *
 * SAFETY (defence in depth — both must hold or the bypass is inert):
 *   1. process.env.NODE_ENV !== 'production'
 *   2. process.env.LOCAL_DEV_AUTH_ENABLED === '1'
 *
 * Both env vars are read at request time (not module init), so changing them
 * doesn't require a restart and a rogue build can't permanently capture the
 * "enabled" state. The cookie is plaintext on purpose — its only meaning is
 * "this dev session selected tier X"; without the env flags it has no effect.
 *
 * Usage:
 *   GET /api/auth/dev-login?tier=admin|free|general|members|vip
 *     Sets cookie, redirects to ?redirect=/ (default /).
 *   GET /api/auth/dev-logout
 *     Clears cookie, redirects to /.
 *
 * Effect:
 *   getCurrentUser() / getSession() return a synthetic Prisma User shape
 *   with the requested tier. DB-write actions (custom dashboards, payments,
 *   etc.) will still fail without a real DB, since the synthetic user has no
 *   row in postgres. Read-only browsing of tier-gated UI works.
 */

import type { User } from '@prisma/client';
import { ADMIN_EMAILS } from './tier';
import type { Tier } from '@/types';

export const DEV_MASTER_COOKIE = 'sr_dev_master';
export const DEV_MASTER_USER_ID_PREFIX = 'dev-master-';

export type DevMasterRole = 'admin' | Tier;

const VALID_ROLES: ReadonlySet<DevMasterRole> = new Set([
  'admin',
  'free',
  'general',
  'members',
  'vip',
]);

/**
 * True iff the dev-master bypass is allowed in this process.
 * Read at every call so env changes take effect without restart.
 */
export function isDevMasterEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.LOCAL_DEV_AUTH_ENABLED === '1'
  );
}

/** Parse a cookie value into a role, or null if invalid / unsupported. */
export function parseDevMasterCookie(value: string | undefined): DevMasterRole | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  return (VALID_ROLES as Set<string>).has(v) ? (v as DevMasterRole) : null;
}

/**
 * Build a synthetic Prisma User for the given role. The shape matches the
 * schema fields read by /api/auth/me; anything not used by the UI is safe at
 * its zero/default value.
 */
export function synthesizeDevMasterUser(role: DevMasterRole): User {
  const now = new Date();
  const isAdmin = role === 'admin';
  const tier: Tier = isAdmin ? 'vip' : (role as Tier);
  const email = isAdmin
    ? (ADMIN_EMAILS[0] ?? 'dev-admin@local.test')
    : `dev-${role}@local.test`;
  const displayName = isAdmin ? 'Dev Master (admin)' : `Dev (${role})`;

  return {
    id:                       `${DEV_MASTER_USER_ID_PREFIX}${role}`,
    email,
    displayName,
    timezone:                 'Europe/London',
    currencyPref:             'USD',
    themePref:                'parchment',
    pin:                      null,
    tier,
    isPublic:                 false,
    createdAt:                now,
    lastSeenAt:               now,

    nostrNpub:                null,
    nostrAuthType:            'email',
    assignedNpub:             null,
    assignedPrivkeyEnc:       null,
    chatDisplayName:          displayName,
    chatIcon:                 'email',

    subscriptionExpiresAt:    null,
    subscriptionActivatedAt:  null,

    newsletterEnabled:        false,
    newsletterFrequency:      'weekly',
    newsletterDay:            0,
    newsletterVipTopics:      [],
    newsletterLastSent:       null,
    newsletterConfirmedAt:    null,

    welcomeEmailSentAt:       null,
    expiryWarningSentAt:      null,

    source:                   'dev-master',
    migrationBroadcastSentAt: null,

    tvChartState:             null,
  } as User;
}

/** One-shot startup warning so an accidentally-enabled flag is loud. */
let warned = false;
export function warnIfDevMasterEnabled(): void {
  if (warned) return;
  if (isDevMasterEnabled()) {
    warned = true;
    // eslint-disable-next-line no-console
    console.warn(
      '\n⚠️  [dev-master] LOCAL_DEV_AUTH_ENABLED=1 — anyone with access to ' +
      '/api/auth/dev-login can impersonate any tier. This must NEVER be set ' +
      'in production.\n'
    );
  }
}
