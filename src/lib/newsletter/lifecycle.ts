/**
 * Lifecycle email senders — welcome, upgrade confirmation, expiry warning.
 *
 * These are kept separate from the briefing/digest crons because they fire
 * from request handlers and payment-confirmation paths. They share the same
 * Resend transport and parchment templates.
 *
 * All three helpers swallow errors and return a boolean — callers should
 * never let an email failure break a sign-in or payment flow.
 */

import { render } from '@react-email/components';
import { TIER_LABELS } from '@/lib/auth/tier';
import type { Tier } from '@/types';
import { createNewsletterToken } from '@/lib/newsletter/tokens';
import { FROM_ADDRESS, SITE_URL, getResend } from '@/lib/newsletter/resend';
import { WelcomeEmail, welcomeEmailSubject } from '@/emails/WelcomeEmail';
import {
  UpgradeConfirmationEmail,
  upgradeConfirmationSubject,
} from '@/emails/UpgradeConfirmationEmail';
import {
  ExpiryWarningEmail,
  expiryWarningSubject,
} from '@/emails/ExpiryWarningEmail';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Email is a real address (not the `nostr:{hex}` placeholder used by NIP-07 users). */
export function isRealEmail(email: string | null | undefined): email is string {
  return Boolean(email) && !email!.startsWith('nostr:') && email!.includes('@');
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

// ── Welcome ────────────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(userId: string, email: string): Promise<boolean> {
  if (!isRealEmail(email)) return false;

  const confirmToken = createNewsletterToken(userId, 'confirm', 86400); // 24h
  const unsubToken   = createNewsletterToken(userId, 'unsubscribe', 90 * 86400);

  try {
    const html = await render(
      WelcomeEmail({
        confirmUrl:     `${SITE_URL}/api/newsletter/confirm?token=${confirmToken}`,
        unsubscribeUrl: `${SITE_URL}/api/newsletter/unsubscribe?token=${unsubToken}`,
        siteUrl:        SITE_URL,
      }),
    );
    await getResend().emails.send({
      from:    FROM_ADDRESS,
      to:      email,
      subject: welcomeEmailSubject,
      html,
    });
    console.log(`[lifecycle] welcome email sent to ${email}`);
    return true;
  } catch (err) {
    console.error('[lifecycle] welcome email failed:', err);
    return false;
  }
}

// ── Upgrade confirmation ───────────────────────────────────────────────────────

const TIER_FEATURES: Record<Tier, string[]> = {
  free: [],
  general: [
    'Daily 5-section briefings (delivered by email or in-app)',
    'Dark mode theme + 30-day briefing archive',
    'Macro Focus view with full conviction breakdown',
    'AI Intelligence panel for daily on-chain interpretation',
  ],
  members: [
    'Everything in General',
    'Ops Room chat — post messages, see alerts in real time',
    'On-chain Deep Dive + Pool view + Miners Network section',
    'AI annotations on every metric panel',
  ],
  vip: [
    'Everything in Members',
    'Custom alerts on conviction, LTH supply, hash ribbon, prices',
    'Personalised VIP briefing — topic-weighted by your interests',
    'Layout editing, portfolio context, personal conviction',
  ],
};

interface UpgradeOpts {
  duration: 'monthly' | 'trial' | 'lifetime';
  expiresAt: Date | null;
  amountSats: number;
}

export async function sendUpgradeConfirmationEmail(
  email: string,
  tier: Tier,
  opts: UpgradeOpts,
): Promise<boolean> {
  if (!isRealEmail(email)) return false;
  if (tier === 'free') return false;

  const tierLabel = TIER_LABELS[tier];
  const durationLabel =
    opts.duration === 'lifetime' ? 'Lifetime'
    : opts.duration === 'trial'  ? '7-day trial'
    : '30 days';
  const expiresLabel = opts.expiresAt ? formatLongDate(opts.expiresAt) : null;

  try {
    const html = await render(
      UpgradeConfirmationEmail({
        tierLabel,
        durationLabel,
        expiresLabel,
        amountSats:       opts.amountSats,
        unlockedFeatures: TIER_FEATURES[tier],
        accountUrl:       `${SITE_URL}/account`,
        unsubscribeUrl:   `${SITE_URL}/account`, // lifecycle email — manage prefs in account
        siteUrl:          SITE_URL,
      }),
    );
    await getResend().emails.send({
      from:    FROM_ADDRESS,
      to:      email,
      subject: upgradeConfirmationSubject(tierLabel),
      html,
    });
    console.log(`[lifecycle] upgrade confirmation sent to ${email} (${tier}, ${opts.duration})`);
    return true;
  } catch (err) {
    console.error('[lifecycle] upgrade confirmation email failed:', err);
    return false;
  }
}

// ── Expiry warning ─────────────────────────────────────────────────────────────

export async function sendExpiryWarningEmail(
  email: string,
  tier: Tier,
  expiresAt: Date,
): Promise<boolean> {
  if (!isRealEmail(email)) return false;
  if (tier === 'free') return false;

  const tierLabel    = TIER_LABELS[tier];
  const expiresLabel = formatLongDate(expiresAt);
  const daysRemaining = Math.max(
    1,
    Math.round((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
  );

  try {
    const html = await render(
      ExpiryWarningEmail({
        tierLabel,
        expiresLabel,
        daysRemaining,
        renewUrl:       `${SITE_URL}/support`,
        unsubscribeUrl: `${SITE_URL}/account`,
        siteUrl:        SITE_URL,
      }),
    );
    await getResend().emails.send({
      from:    FROM_ADDRESS,
      to:      email,
      subject: expiryWarningSubject(tierLabel, expiresLabel),
      html,
    });
    console.log(`[lifecycle] expiry warning sent to ${email} (${tier}, ${daysRemaining}d)`);
    return true;
  } catch (err) {
    console.error('[lifecycle] expiry warning email failed:', err);
    return false;
  }
}

/** Plain-text version of the expiry warning, for Nostr DM delivery. */
export function expiryWarningPlaintext(tierLabel: string, expiresAt: Date, daysRemaining: number): string {
  const expiresLabel = formatLongDate(expiresAt);
  const dayWord = daysRemaining === 1 ? 'day' : 'days';
  return [
    `[Situation Room]`,
    ``,
    `Your ${tierLabel} subscription expires on ${expiresLabel} — ${daysRemaining} ${dayWord} remaining.`,
    ``,
    `Renew over Lightning to keep daily briefings and tier-gated features:`,
    `${SITE_URL}/support`,
  ].join('\n');
}
