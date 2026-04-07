/**
 * Welcome email — sent on a user's first successful PIN verification.
 *
 * Doubles as the newsletter double opt-in: includes a confirm link that
 * activates the weekly digest. Users start on `weekly` frequency by default;
 * the email explains they can upgrade to General+ for daily delivery.
 *
 * Subject: Welcome to Situation Room
 */

import {
  Html, Head, Body, Container, Section,
  Text, Hr, Link,
} from '@react-email/components';

export interface WelcomeEmailProps {
  confirmUrl: string;
  unsubscribeUrl: string;
  siteUrl: string;
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

export function WelcomeEmail({ confirmUrl, unsubscribeUrl, siteUrl }: WelcomeEmailProps) {
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
              Welcome aboard.
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '12px 28px 4px' }}>
            <Hr style={{ borderColor: C.dimBorder, margin: '0 0 16px' }} />
            <Text style={{ fontFamily: font.serif, fontSize: '14px', color: C.text, lineHeight: '1.7', margin: '0 0 14px' }}>
              You&apos;re now set up on Situation Room — a dashboard and briefing
              service tracking Bitcoin, global macro, and geopolitical signal in
              one place.
            </Text>
            <Text style={{ fontFamily: font.serif, fontSize: '14px', color: C.text, lineHeight: '1.7', margin: '0 0 14px' }}>
              By default, we&apos;ve enrolled you in the <strong>free weekly digest</strong>,
              delivered every Sunday at 18:00 UTC. To start receiving it, please
              confirm your subscription below.
            </Text>
          </Section>

          {/* Confirm CTA */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '8px 28px 24px', textAlign: 'center' }}>
            <Link
              href={confirmUrl}
              style={{
                display: 'inline-block', padding: '12px 32px',
                backgroundColor: C.accent, color: C.bg,
                fontFamily: font.mono, fontSize: '12px',
                letterSpacing: '0.14em', fontWeight: 'bold',
                textDecoration: 'none',
              }}
            >
              CONFIRM SUBSCRIPTION
            </Link>
            <Text style={{ fontFamily: font.mono, fontSize: '10px', color: C.muted, margin: '12px 0 0', letterSpacing: '0.04em' }}>
              Link expires in 24 hours
            </Text>
          </Section>

          {/* Daily upgrade note */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '0 28px 20px' }}>
            <Hr style={{ borderColor: C.dimBorder, margin: '0 0 16px' }} />
            <Text style={{ fontFamily: font.mono, fontSize: '9px', letterSpacing: '0.18em', color: C.muted, margin: '0 0 8px' }}>
              ── WANT DAILY BRIEFINGS? ───────────────
            </Text>
            <Text style={{ fontFamily: font.serif, fontSize: '13px', color: C.text, lineHeight: '1.7', margin: '0 0 10px' }}>
              The full 5-section daily briefing — market, network, geopolitical,
              macro, and outlook — is available from the <strong>General</strong> tier
              upwards.
            </Text>
            <Text style={{ fontFamily: font.serif, fontSize: '13px', color: C.text, lineHeight: '1.7', margin: '0 0 12px' }}>
              After upgrading, switch your delivery to daily from the
              <Link href={`${siteUrl}/account`} style={{ color: C.accent, textDecoration: 'none' }}> Account page</Link>
              {' '}— it stays on weekly until you flip it manually.
            </Text>
            <Link
              href={`${siteUrl}/support`}
              style={{
                display: 'inline-block', padding: '8px 20px',
                border: `1px solid ${C.accent}`, color: C.accent,
                fontFamily: font.mono, fontSize: '11px',
                letterSpacing: '0.12em', fontWeight: 'bold',
                textDecoration: 'none',
              }}
            >
              VIEW TIERS ⚡
            </Link>
          </Section>

          {/* Footer */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '0 28px 20px' }}>
            <Hr style={{ borderColor: C.dimBorder, margin: '0 0 12px' }} />
            <Text style={{ fontFamily: font.mono, fontSize: '10px', color: C.muted, margin: '0', lineHeight: '1.6' }}>
              If you didn&apos;t sign up for Situation Room, you can safely ignore
              this email — no further messages will be sent.
            </Text>
          </Section>

          {/* Outer footer */}
          <Section style={{ padding: '16px 28px', textAlign: 'center' }}>
            <Text style={{ fontFamily: font.mono, fontSize: '10px', color: C.muted, margin: '0' }}>
              Situation Room
              {'  ·  '}
              <Link href={siteUrl} style={{ color: C.muted, textDecoration: 'underline' }}>
                situationroom.space
              </Link>
              {'  ·  '}
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

export const welcomeEmailSubject = 'Welcome to Situation Room';
