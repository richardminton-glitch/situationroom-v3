/**
 * Migration announcement email — one-off broadcast for the v2 → v3 cutover.
 *
 * Sent twice during the cutover window:
 *   T-5 (2026-04-10) → main announcement
 *   T-0 (2026-04-15) → reminder, on cutover day
 *
 * Recipients are users imported by /api/admin/import-v2 (i.e. their `source`
 * field starts with "v2-migration-"). They have been pre-grandfathered at
 * either General or Members tier; the body explains which, and how to claim
 * a fresh PIN on first visit.
 *
 * NOTE: copy here is a structural placeholder. Final wording will be refined
 * with the user closer to T-5 (likely via the tbw-voice skill).
 *
 * Subject: see migrationAnnouncementSubject below.
 */

import {
  Html, Head, Body, Container, Section,
  Text, Hr, Link,
} from '@react-email/components';

export interface MigrationAnnouncementEmailProps {
  email: string;
  tier: 'general' | 'members';
  expiresAt: Date;        // grandfather end date — formatted in body
  loginUrl: string;       // e.g. https://situationroom.space/login
  legacyUrl: string;      // e.g. https://legacy.situationroom.space
  unsubscribeUrl: string;
  siteUrl: string;
  /** Toggle copy variant. 'main' = T-5 announcement, 'reminder' = T-0 reminder. */
  variant?: 'main' | 'reminder';
}

const C = {
  bg:        '#f5f0e8',
  card:      '#ede8dc',
  border:    '#c8b89a',
  text:      '#2c2416',
  muted:     '#8b7355',
  accent:    '#8b6914',
  dimBorder: '#d4c9b4',
};

const font = {
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono:  '"Courier New", Courier, monospace',
};

const TIER_LABEL: Record<MigrationAnnouncementEmailProps['tier'], string> = {
  general: 'General',
  members: 'Members',
};

function formatExpiry(d: Date): string {
  // e.g. "14 July 2026" — written, not numeric, to avoid US/UK ambiguity.
  return d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function MigrationAnnouncementEmail({
  email,
  tier,
  expiresAt,
  loginUrl,
  legacyUrl,
  unsubscribeUrl,
  siteUrl,
  variant = 'main',
}: MigrationAnnouncementEmailProps) {
  const tierLabel = TIER_LABEL[tier];
  const expiryDate = formatExpiry(expiresAt);
  const isReminder = variant === 'reminder';

  return (
    <Html lang="en">
      <Head />
      <Body style={{ backgroundColor: C.bg, margin: '0', padding: '0', fontFamily: font.serif }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 0' }}>

          {/* Header */}
          <Section style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, padding: '24px 28px 16px' }}>
            <Text style={{ fontFamily: font.mono, fontSize: '10px', letterSpacing: '0.18em', color: C.muted, margin: '0 0 6px' }}>
              SITUATION ROOM
            </Text>
            <Text style={{ fontFamily: font.mono, fontSize: '10px', letterSpacing: '0.14em', color: C.muted, margin: '0 0 12px' }}>
              BITCOIN &amp; GLOBAL MACRO INTELLIGENCE
            </Text>
            <Text style={{ fontFamily: font.serif, fontSize: '20px', color: C.text, margin: '0', letterSpacing: '0.02em' }}>
              {isReminder ? 'Today\u2019s the day.' : 'The Situation Room is moving.'}
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '12px 28px 4px' }}>
            <Hr style={{ borderColor: C.dimBorder, margin: '0 0 16px' }} />

            <Text style={{ fontFamily: font.serif, fontSize: '14px', color: C.text, lineHeight: '1.7', margin: '0 0 14px' }}>
              {isReminder
                ? <><Link href={siteUrl} style={{ color: C.accent }}>situationroom.space</Link> is now the rebuilt dashboard. Your account, your tier, and a fresh sign-in are waiting.</>
                : <>On <strong>Wednesday 15 April 2026</strong>, situationroom.space switches over to a rebuilt dashboard — same intelligence, same data, now with personal accounts, custom layouts, and a redesigned daily briefing.</>
              }
            </Text>

            <Text style={{ fontFamily: font.serif, fontSize: '14px', color: C.text, lineHeight: '1.7', margin: '0 0 14px' }}>
              Your account at <strong>{email}</strong> has been carried across with{' '}
              <strong>{tierLabel}</strong> access until <strong>{expiryDate}</strong> —
              no payment, no setup. Three months on the house while you settle in.
            </Text>

            <Text style={{ fontFamily: font.mono, fontSize: '9px', letterSpacing: '0.18em', color: C.muted, margin: '12px 0 8px' }}>
              ── HOW TO CLAIM YOUR ACCOUNT ───────────
            </Text>

            <Text style={{ fontFamily: font.serif, fontSize: '14px', color: C.text, lineHeight: '1.7', margin: '0 0 14px' }}>
              The old sign-in doesn&apos;t move across — we never stored it in a
              form we could carry over. On first visit:
            </Text>

            <Text style={{ fontFamily: font.serif, fontSize: '14px', color: C.text, lineHeight: '1.7', margin: '0 0 6px' }}>
              <strong>1.</strong> Go to the login page and enter <strong>{email}</strong>.
            </Text>
            <Text style={{ fontFamily: font.serif, fontSize: '14px', color: C.text, lineHeight: '1.7', margin: '0 0 6px' }}>
              <strong>2.</strong> A fresh 4-digit PIN will be emailed to you.
            </Text>
            <Text style={{ fontFamily: font.serif, fontSize: '14px', color: C.text, lineHeight: '1.7', margin: '0 0 14px' }}>
              <strong>3.</strong> Sign in. That PIN is yours to keep until you reset it.
            </Text>
          </Section>

          {/* Claim CTA */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '8px 28px 24px', textAlign: 'center' }}>
            <Link
              href={loginUrl}
              style={{
                display: 'inline-block', padding: '12px 32px',
                backgroundColor: C.accent, color: C.bg,
                fontFamily: font.mono, fontSize: '12px',
                letterSpacing: '0.14em', fontWeight: 'bold',
                textDecoration: 'none',
              }}
            >
              CLAIM YOUR ACCOUNT
            </Link>
          </Section>

          {/* Legacy access note */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '0 28px 20px' }}>
            <Hr style={{ borderColor: C.dimBorder, margin: '0 0 16px' }} />
            <Text style={{ fontFamily: font.mono, fontSize: '9px', letterSpacing: '0.18em', color: C.muted, margin: '0 0 8px' }}>
              ── PREFER THE OLD DASHBOARD? ────────────
            </Text>
            <Text style={{ fontFamily: font.serif, fontSize: '13px', color: C.text, lineHeight: '1.7', margin: '0 0 10px' }}>
              The old Situation Room stays online at{' '}
              <Link href={legacyUrl} style={{ color: C.accent, textDecoration: 'none' }}>
                legacy.situationroom.space
              </Link>{' '}
              for as long as anyone&apos;s using it. Briefings on the old site keep
              generating; the daily emails from the old system have been
              switched off so you won&apos;t get duplicates with the new ones.
            </Text>
          </Section>

          {/* Outer footer */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '0 28px 20px' }}>
            <Hr style={{ borderColor: C.dimBorder, margin: '0 0 12px' }} />
            <Text style={{ fontFamily: font.mono, fontSize: '10px', color: C.muted, margin: '0', lineHeight: '1.6' }}>
              You&apos;re receiving this because you were on the Situation Room
              mailing list, or because you donated to the trading bot pool,
              before April 2026. If you&apos;d rather not claim your account,
              this email is the only one you&apos;ll get from the new site.
            </Text>
          </Section>

          <Section style={{ padding: '16px 28px', textAlign: 'center' }}>
            <Text style={{ fontFamily: font.mono, fontSize: '10px', color: C.muted, margin: '0' }}>
              Situation Room
              {'  \u00b7  '}
              <Link href={siteUrl} style={{ color: C.muted, textDecoration: 'underline' }}>
                situationroom.space
              </Link>
              {'  \u00b7  '}
              <Link href={unsubscribeUrl} style={{ color: C.muted, textDecoration: 'underline' }}>
                Unsubscribe
              </Link>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

// Subjects — kept short, no emoji. Final wording TBC closer to T-5.
export const migrationAnnouncementSubject = {
  main:     'The Situation Room is moving \u2014 claim your account',
  reminder: 'The new Situation Room is live \u2014 claim your account',
} as const;
