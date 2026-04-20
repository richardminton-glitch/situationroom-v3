/**
 * Welcome email — sent on a user's first PIN request (i.e. signup).
 *
 * Delivers the sign-in PIN and explains the newsletter policy: registering
 * implicitly subscribes to the weekly digest (Sunday 06:15 UTC, every tier).
 * The daily briefing is an explicit opt-in from the Account page, and any
 * user can opt out of email entirely from the same page. No double opt-in.
 *
 * Subject: Welcome to Situation Room — Your Sign-In PIN
 */

import {
  Html, Head, Body, Container, Section,
  Text, Hr, Link,
} from '@react-email/components';
import { EmailHeader } from './shared/EmailHeader';

export interface WelcomeEmailProps {
  pin:     string;
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

export function WelcomeEmail({ pin, siteUrl }: WelcomeEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={{ backgroundColor: C.bg, margin: '0', padding: '0', fontFamily: font.serif }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 0' }}>

          {/* Header */}
          <EmailHeader siteUrl={siteUrl}>
            <Text style={{ fontFamily: font.serif, fontSize: '22px', color: C.text, margin: '0', letterSpacing: '0.02em' }}>
              Welcome aboard.
            </Text>
          </EmailHeader>

          {/* Intro + PIN */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '12px 28px 4px' }}>
            <Hr style={{ borderColor: C.dimBorder, margin: '0 0 16px' }} />
            <Text style={{ fontFamily: font.serif, fontSize: '14px', color: C.text, lineHeight: '1.7', margin: '0 0 18px' }}>
              You&rsquo;re now set up on Situation Room &mdash; a dashboard and briefing service
              tracking Bitcoin, global macro, and geopolitical signal in one place.
            </Text>

            <Text style={{ fontFamily: font.mono, fontSize: '10px', letterSpacing: '0.16em', color: C.muted, margin: '0 0 8px' }}>
              YOUR SIGN-IN PIN
            </Text>
            <div style={{
              fontFamily: font.mono, fontSize: '36px', letterSpacing: '0.5em',
              fontWeight: 'bold', textAlign: 'center', padding: '18px',
              backgroundColor: '#ffffff', border: `1px solid ${C.border}`,
              color: C.text, margin: '0 0 10px',
            }}>
              {pin}
            </div>
            <Text style={{ fontFamily: font.serif, fontSize: '13px', color: C.muted, lineHeight: '1.6', margin: '0 0 18px' }}>
              This PIN is permanent. It stays the same every time you sign in &mdash; keep it somewhere safe.
            </Text>
          </Section>

          {/* Newsletter policy */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '0 28px 20px' }}>
            <Hr style={{ borderColor: C.dimBorder, margin: '0 0 16px' }} />
            <Text style={{ fontFamily: font.mono, fontSize: '10px', letterSpacing: '0.18em', color: C.muted, margin: '0 0 10px' }}>
              YOUR NEWSLETTER SUBSCRIPTION
            </Text>
            <Text style={{ fontFamily: font.serif, fontSize: '14px', color: C.text, lineHeight: '1.7', margin: '0 0 12px' }}>
              By registering, you&rsquo;ve agreed to receive our <strong>weekly digest</strong>, delivered every
              Sunday at 06:15 UTC. It&rsquo;s a short summary of the week&rsquo;s briefings and the current state
              of the market &mdash; free for every tier.
            </Text>
            <Text style={{ fontFamily: font.serif, fontSize: '14px', color: C.text, lineHeight: '1.7', margin: '0 0 12px' }}>
              You can also opt into the <strong>daily briefing email</strong> &mdash; the full five-section analysis
              delivered at 06:15 UTC, Monday through Saturday &mdash; from your Account page. On Sundays, the
              weekly digest replaces the daily briefing so you only get one email that day.
            </Text>
            <Text style={{ fontFamily: font.serif, fontSize: '14px', color: C.text, lineHeight: '1.7', margin: '0 0 18px' }}>
              If you&rsquo;d rather not receive email at all, you can opt out from the same page. Your
              preferences take effect immediately &mdash; no confirmation click required.
            </Text>

            <Section style={{ textAlign: 'center', margin: '6px 0 4px' }}>
              <Link
                href={`${siteUrl}/account`}
                style={{
                  display: 'inline-block', padding: '12px 32px',
                  backgroundColor: C.accent, color: C.bg,
                  fontFamily: font.mono, fontSize: '12px',
                  letterSpacing: '0.14em', fontWeight: 'bold',
                  textDecoration: 'none',
                }}
              >
                MANAGE PREFERENCES
              </Link>
            </Section>
          </Section>

          {/* Bottom rule of card */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '0 28px 20px' }}>
            <Hr style={{ borderColor: C.dimBorder, margin: '0' }} />
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
              <Link href={`${siteUrl}/account`} style={{ color: C.muted, textDecoration: 'underline' }}>
                Opt out
              </Link>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

export const welcomeEmailSubject = 'Welcome to Situation Room — Your Sign-In PIN';
