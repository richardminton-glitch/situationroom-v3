/**
 * DCA VIP Signal — double opt-in confirmation email for the VIP in/out subscription.
 *
 * Parchment palette with amber accent (VIP tier). Email-safe HTML.
 * Includes unsubscribe links for BOTH the VIP subscription and the
 * standard DCA-in subscription (if the user has one).
 */

import {
  Html, Head, Body, Container, Section, Text, Hr, Link,
} from '@react-email/components';

export interface DcaVipConfirmEmailProps {
  email:          string;
  frequency:      string;   // 'weekly' | 'monthly'
  baseAmount:     number;
  confirmUrl:     string;
  vipUnsubUrl:    string;   // unsub token for the dca_in_out record
  dcaInUnsubUrl?: string;   // unsub token for existing dca_in record (optional)
  siteUrl:        string;
}

const C = {
  bg:     '#f5f0e8',
  card:   '#ede8dc',
  border: '#c8b89a',
  text:   '#2c2416',
  muted:  '#8b7355',
  accent: '#8b6914',   // amber / gold
  teal:   '#007a72',
  vip:    '#9b6800',   // deep amber for VIP
  vipBg:  '#fdf3e0',
};

const mono  = '"Courier New", Courier, monospace';
const serif = 'Georgia, "Times New Roman", Times, serif';

export function DcaVipConfirmEmail({
  email,
  frequency,
  baseAmount,
  confirmUrl,
  vipUnsubUrl,
  dcaInUnsubUrl,
  siteUrl,
}: DcaVipConfirmEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={{ backgroundColor: C.bg, margin: '0', padding: '0', fontFamily: serif }}>
        <Container style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 16px' }}>

          {/* Header */}
          <Section style={{ marginBottom: '24px' }}>
            <Text style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.18em', color: C.muted, margin: '0 0 4px' }}>
              SITUATION ROOM · VIP
            </Text>
            <Text style={{ fontFamily: mono, fontSize: '14px', letterSpacing: '0.08em', color: C.vip, margin: '0 0 2px', fontWeight: 'bold' }}>
              DCA IN/OUT SIGNAL
            </Text>
            <Text style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.14em', color: C.muted, margin: '0' }}>
              CONFIRM YOUR VIP SUBSCRIPTION
            </Text>
          </Section>

          <Hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '0 0 24px' }} />

          {/* Body */}
          <Section style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, padding: '24px', marginBottom: '24px' }}>
            <Text style={{ color: C.text, fontSize: '14px', lineHeight: '1.6', margin: '0 0 16px' }}>
              One click to confirm your <strong>{frequency}</strong> VIP DCA in/out signal subscription.
              You'll receive both buy <em>and</em> exit signals when the composite crosses the threshold.
            </Text>

            {/* Subscription summary */}
            <Section style={{ backgroundColor: C.vipBg, border: `1px solid ${C.accent}`, padding: '12px 16px', marginBottom: '20px' }}>
              <Text style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.14em', color: C.vip, margin: '0 0 8px' }}>YOUR VIP SETTINGS</Text>
              <Text style={{ fontFamily: mono, fontSize: '11px', color: C.text, margin: '0 0 4px' }}>
                Email: {email}
              </Text>
              <Text style={{ fontFamily: mono, fontSize: '11px', color: C.text, margin: '0 0 4px' }}>
                Frequency: {frequency.toUpperCase()}
              </Text>
              <Text style={{ fontFamily: mono, fontSize: '11px', color: C.text, margin: '0' }}>
                Base amount: ${baseAmount}/{frequency === 'weekly' ? 'week' : 'month'}
              </Text>
            </Section>

            {/* CTA */}
            <Section style={{ textAlign: 'center' as const, marginBottom: '16px' }}>
              <Link
                href={confirmUrl}
                style={{
                  display:         'inline-block',
                  backgroundColor: C.vip,
                  color:           '#ffffff',
                  fontFamily:      mono,
                  fontSize:        '11px',
                  letterSpacing:   '0.1em',
                  padding:         '10px 28px',
                  textDecoration:  'none',
                  fontWeight:      'bold',
                }}
              >
                CONFIRM VIP SUBSCRIPTION
              </Link>
            </Section>

            <Text style={{ color: C.muted, fontSize: '11px', lineHeight: '1.6', margin: '0', textAlign: 'center' as const }}>
              This link expires in 48 hours. If you did not subscribe, ignore this email.
            </Text>
          </Section>

          {/* What to expect */}
          <Section style={{ marginBottom: '24px' }}>
            <Text style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.14em', color: C.muted, margin: '0 0 12px' }}>WHAT YOU'LL RECEIVE</Text>
            <Text style={{ color: C.text, fontSize: '12px', lineHeight: '1.7', margin: '0 0 8px' }}>
              Each {frequency === 'weekly' ? 'week' : 'month'} you'll receive a combined buy + exit signal email with:
            </Text>
            <Text style={{ color: C.text, fontSize: '12px', lineHeight: '1.7', margin: '0 0 4px', paddingLeft: '12px' }}>
              · The composite signal and current mode (accumulate / distribute)
            </Text>
            <Text style={{ color: C.text, fontSize: '12px', lineHeight: '1.7', margin: '0 0 4px', paddingLeft: '12px' }}>
              · Your recommended buy amount (in accumulate zone)
            </Text>
            <Text style={{ color: C.text, fontSize: '12px', lineHeight: '1.7', margin: '0 0 4px', paddingLeft: '12px' }}>
              · Your recommended exit amount when composite crosses below 0.70×
            </Text>
            <Text style={{ color: C.text, fontSize: '12px', lineHeight: '1.7', margin: '0 0 4px', paddingLeft: '12px' }}>
              · Exit multiplier tier: Light exits → Heavy distribution
            </Text>
            <Text style={{ color: C.text, fontSize: '12px', lineHeight: '1.7', margin: '0', paddingLeft: '12px' }}>
              · Both underlying signals: 200-week MA ratio and Puell Multiple
            </Text>
          </Section>

          <Hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '0 0 16px' }} />

          {/* Footer */}
          <Text style={{ fontFamily: mono, fontSize: '9px', color: C.muted, letterSpacing: '0.08em', margin: '0 0 8px' }}>
            NOT FINANCIAL ADVICE · ENGINE V3 · BACKTESTED 2015–2026
          </Text>
          <Text style={{ fontFamily: mono, fontSize: '9px', color: C.muted, margin: '0' }}>
            <Link href={siteUrl} style={{ color: C.muted }}>situationroom.space</Link>
            {' · '}
            <Link href={vipUnsubUrl} style={{ color: C.muted }}>unsubscribe VIP signal</Link>
            {dcaInUnsubUrl && (
              <>
                {' · '}
                <Link href={dcaInUnsubUrl} style={{ color: C.muted }}>unsubscribe DCA-in signal</Link>
              </>
            )}
          </Text>

        </Container>
      </Body>
    </Html>
  );
}

export function dcaVipConfirmSubject(): string {
  return 'Confirm your VIP DCA In/Out Signal subscription — Situation Room';
}
