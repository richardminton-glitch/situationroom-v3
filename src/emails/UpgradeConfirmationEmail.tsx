/**
 * Upgrade confirmation email — sent when a Lightning payment is confirmed
 * and a user's tier is activated (or trial / lifetime).
 *
 * Subject: Situation Room · {Tier} access activated
 */

import {
  Html, Head, Body, Container, Section,
  Text, Hr, Link,
} from '@react-email/components';

export interface UpgradeConfirmationEmailProps {
  tierLabel: string;          // e.g. "General", "Members", "VIP"
  durationLabel: string;      // e.g. "30 days", "7-day trial", "lifetime"
  expiresLabel: string | null; // e.g. "5 May 2026" — null for lifetime
  amountSats: number;
  unlockedFeatures: string[]; // bullet list of unlocked features
  accountUrl: string;
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

export function UpgradeConfirmationEmail({
  tierLabel,
  durationLabel,
  expiresLabel,
  amountSats,
  unlockedFeatures,
  accountUrl,
  unsubscribeUrl,
  siteUrl,
}: UpgradeConfirmationEmailProps) {
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
              PAYMENT CONFIRMED
            </Text>
            <Text style={{ fontFamily: font.serif, fontSize: '20px', color: C.text, margin: '0', letterSpacing: '0.02em' }}>
              {tierLabel} access activated.
            </Text>
          </Section>

          {/* Receipt */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '12px 28px 4px' }}>
            <Hr style={{ borderColor: C.dimBorder, margin: '0 0 12px' }} />
            <Text style={{ fontFamily: font.mono, fontSize: '9px', letterSpacing: '0.18em', color: C.muted, margin: '0 0 8px' }}>
              RECEIPT
            </Text>
            <Text style={{ fontFamily: font.mono, fontSize: '12px', color: C.text, margin: '0 0 4px', lineHeight: '1.6' }}>
              Tier:      <strong>{tierLabel}</strong>
            </Text>
            <Text style={{ fontFamily: font.mono, fontSize: '12px', color: C.text, margin: '0 0 4px', lineHeight: '1.6' }}>
              Duration:  <strong>{durationLabel}</strong>
            </Text>
            {expiresLabel && (
              <Text style={{ fontFamily: font.mono, fontSize: '12px', color: C.text, margin: '0 0 4px', lineHeight: '1.6' }}>
                Renews by: <strong>{expiresLabel}</strong>
              </Text>
            )}
            <Text style={{ fontFamily: font.mono, fontSize: '12px', color: C.text, margin: '0 0 12px', lineHeight: '1.6' }}>
              Paid:      <strong>{amountSats.toLocaleString()} sats</strong>
            </Text>
            <Hr style={{ borderColor: C.dimBorder, margin: '0 0 12px' }} />
          </Section>

          {/* Unlocked features */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '0 28px 4px' }}>
            <Text style={{ fontFamily: font.mono, fontSize: '9px', letterSpacing: '0.18em', color: C.muted, margin: '0 0 8px' }}>
              YOU&apos;VE UNLOCKED
            </Text>
            {unlockedFeatures.map((feat, i) => (
              <Text
                key={i}
                style={{
                  fontFamily: font.serif,
                  fontSize: '13px',
                  color: C.text,
                  margin: '0 0 6px',
                  lineHeight: '1.6',
                  paddingLeft: '12px',
                  borderLeft: `2px solid ${C.accent}`,
                }}
              >
                {feat}
              </Text>
            ))}
            <Hr style={{ borderColor: C.dimBorder, margin: '14px 0 12px' }} />
          </Section>

          {/* CTA */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '0 28px 24px', textAlign: 'center' }}>
            <Link
              href={accountUrl}
              style={{
                display: 'inline-block', padding: '12px 28px',
                backgroundColor: C.accent, color: C.bg,
                fontFamily: font.mono, fontSize: '12px',
                letterSpacing: '0.14em', fontWeight: 'bold',
                textDecoration: 'none',
              }}
            >
              OPEN ACCOUNT →
            </Link>
            <Text style={{ fontFamily: font.mono, fontSize: '10px', color: C.muted, margin: '12px 0 0', letterSpacing: '0.04em' }}>
              Manage delivery, alerts, and preferences
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

export function upgradeConfirmationSubject(tierLabel: string): string {
  return `Situation Room · ${tierLabel} access activated`;
}
