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

export async function sendWelcomeEmail(
  userId: string,
  email: string,
  pin: string,
): Promise<boolean> {
  if (!isRealEmail(email)) return false;
  void userId; // retained for API parity / future tracking

  try {
    const html = await render(
      WelcomeEmail({ pin, siteUrl: SITE_URL }),
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

interface TierCopy {
  headline: string;
  intro: string;
  unlockedHeader: string;
  nextStep: string;
  features: string[];
}

const TIER_COPY: Record<Tier, TierCopy> = {
  free: {
    headline: '',
    intro: '',
    unlockedHeader: '',
    nextStep: '',
    features: [],
  },
  general: {
    headline: 'Welcome to General.',
    intro: 'You\u2019re now on the full daily briefing. From tomorrow morning, the complete five-section intelligence digest \u2014 market, network, geopolitical, macro, and outlook \u2014 lands in your inbox before the open.',
    unlockedHeader: 'WHAT GENERAL UNLOCKS',
    nextStep: 'First thing: head to your account page and switch newsletter delivery from weekly to daily. Then explore the Macro Focus view \u2014 it\u2019s where the full conviction breakdown lives.',
    features: [
      'Daily 5-section briefings delivered by email at 06:15 UTC',
      'Dark mode theme + 30-day full briefing archive',
      'Macro Focus dashboard view with full conviction breakdown',
      'AI Intelligence panel \u2014 fresh on-chain interpretation every day',
    ],
  },
  members: {
    headline: 'Welcome to the inner circle.',
    intro: 'Members get the briefing with the operational layer attached. You can now post in the Ops Room, see live bot alerts, and dig into the on-chain detail that General users only see summarised.',
    unlockedHeader: 'WHAT MEMBERS UNLOCKS',
    nextStep: 'Drop into the Ops Room first \u2014 it\u2019s the live chat where alerts and trade signals fire in real time. Your daily briefing email also picks up the Pool Status block from tomorrow.',
    features: [
      'Everything in General \u2014 still included',
      'Ops Room chat \u2014 post messages, watch live bot alerts and trade signals',
      'On-chain Deep Dive view + Pool view + Miners Network section',
      'AI annotations on every metric panel \u2014 hover for AI commentary',
      'Daily briefing email now carries Pool Status + recent alerts',
    ],
  },
  vip: {
    headline: 'Welcome to VIP.',
    intro: 'VIP is the briefing rebuilt around you. From tomorrow, your daily email is AI-rewritten to weight your selected topics. Custom alerts and dashboard layouts are now yours to configure.',
    unlockedHeader: 'WHAT VIP UNLOCKS',
    nextStep: 'Head to your account page and pick up to 3 briefing topics \u2014 those topics reweight tomorrow\u2019s VIP briefing and every one after it.',
    features: [
      'Everything in Members \u2014 still included',
      'Personalised VIP briefing \u2014 each section AI-rewritten around your topics',
      'Custom alerts on conviction, LTH supply, hash ribbon, BTC price, fear/greed',
      'Layout editing \u2014 build your own dashboard from any panel',
      'Lifetime access \u2014 no renewals, ever',
    ],
  },
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
  const copy      = TIER_COPY[tier];
  const durationLabel =
    opts.duration === 'lifetime' ? 'Lifetime'
    : opts.duration === 'trial'  ? '7-day trial'
    : '30 days';
  const expiresLabel = opts.expiresAt ? formatLongDate(opts.expiresAt) : null;

  try {
    const html = await render(
      UpgradeConfirmationEmail({
        tierLabel,
        headline:         copy.headline,
        intro:            copy.intro,
        unlockedHeader:   copy.unlockedHeader,
        nextStep:         copy.nextStep,
        durationLabel,
        expiresLabel,
        amountSats:       opts.amountSats,
        unlockedFeatures: copy.features,
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
