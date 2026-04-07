/**
 * Expiry warning email — sent ~3 days before a paid subscription lapses.
 *
 * Subject: Situation Room · {Tier} expires {date}
 */

import {
  Html, Head, Body, Container, Section,
  Text, Hr, Link,
} from '@react-email/components';

export interface ExpiryWarningEmailProps {
  tierLabel: string;          // e.g. "General"
  expiresLabel: string;       // e.g. "10 April 2026"
  daysRemaining: number;      // e.g. 3
  renewUrl: string;
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
  warn:      '#a8541d',
  dimBorder: '#d4c9b4',
};

const font = {
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono:  '"Courier New", Courier, monospace',
};

export function ExpiryWarningEmail({
  tierLabel,
  expiresLabel,
  daysRemaining,
  renewUrl,
  unsubscribeUrl,
  siteUrl,
}: ExpiryWarningEmailProps) {
  const dayWord = daysRemaining === 1 ? 'day' : 'days';

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
            <Text style={{ fontFamily: font.mono, fontSize: '10px', letterSpacing: '0.14em', color: C.warn, margin: '0 0 12px' }}>
              SUBSCRIPTION EXPIRING SOON
            </Text>
            <Text style={{ fontFamily: font.serif, fontSize: '20px', color: C.text, margin: '0', letterSpacing: '0.02em' }}>
              {daysRemaining} {dayWord} remaining on your {tierLabel} access.
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '12px 28px 4px' }}>
            <Hr style={{ borderColor: C.dimBorder, margin: '0 0 16px' }} />
            <Text style={{ fontFamily: font.serif, fontSize: '14px', color: C.text, lineHeight: '1.7', margin: '0 0 14px' }}>
              Your <strong>{tierLabel}</strong> subscription expires on
              {' '}<strong>{expiresLabel}</strong>. After that, your account will
              return to the free tier — you&apos;ll keep your weekly digest and
              dashboard access, but lose the daily briefings and tier-gated panels.
            </Text>
            <Text style={{ fontFamily: font.serif, fontSize: '14px', color: C.text, lineHeight: '1.7', margin: '0 0 14px' }}>
              To continue uninterrupted, renew below before {expiresLabel}.
            </Text>
          </Section>

          {/* Renew CTA */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '8px 28px 24px', textAlign: 'center' }}>
            <Link
              href={renewUrl}
              style={{
                display: 'inline-block', padding: '12px 32px',
                backgroundColor: C.accent, color: C.bg,
                fontFamily: font.mono, fontSize: '12px',
                letterSpacing: '0.14em', fontWeight: 'bold',
                textDecoration: 'none',
              }}
            >
              RENEW {tierLabel.toUpperCase()} ⚡
            </Link>
            <Text style={{ fontFamily: font.mono, fontSize: '10px', color: C.muted, margin: '12px 0 0', letterSpacing: '0.04em' }}>
              Pay over Lightning · Activates instantly
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

export function expiryWarningSubject(tierLabel: string, expiresLabel: string): string {
  return `Situation Room · ${tierLabel} expires ${expiresLabel}`;
}
