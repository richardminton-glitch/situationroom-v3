/**
 * DCA Signal — weekly / monthly signal email.
 *
 * Shows the composite signal, both indicators, recommended buy,
 * and comparative returns vs vanilla DCA.
 *
 * Parchment palette, email-safe HTML (no flex/grid, no web fonts, inline only).
 */

import {
  Html, Head, Body, Container, Section, Text, Hr, Link, Row, Column,
} from '@react-email/components';
import type { BacktestPeriod } from '@/lib/data/daily-snapshot';

export interface DcaSignalEmailProps {
  email:           string;
  frequency:       string;   // 'weekly' | 'monthly'
  baseAmount:      number;
  // Signal data
  composite:       number;
  tier:            string;
  maRatio:         number;
  maMult:          number;
  puellValue:      number;
  puellMult:       number;
  btcPrice:        number;
  dateLabel:       string;   // e.g. "7 April 2026"
  // Backtest (1yr period)
  backtestSummary: BacktestPeriod[];
  // URLs
  siteUrl:         string;
  unsubUrl:        string;
}

const C = {
  bg:       '#f5f0e8',
  card:     '#ede8dc',
  border:   '#c8b89a',
  text:     '#2c2416',
  muted:    '#8b7355',
  accent:   '#8b6914',
  green:    '#1a6b5a',
  amber:    '#7a5a1a',
  red:      '#6b2020',
  greenBg:  '#e8f5f1',
  amberBg:  '#f5f0e0',
  redBg:    '#f5e8e8',
};

const mono  = '"Courier New", Courier, monospace';
const serif = 'Georgia, "Times New Roman", Times, serif';

function tierColour(tier: string): string {
  if (tier.includes('accumulate') || tier === 'Accumulate') return C.green;
  if (tier === 'DCA normally') return C.green;
  if (tier === 'Neutral') return C.amber;
  return C.red;
}

function multLabel(mult: number): string {
  if (mult >= 2.0) return 'Strong buy';
  if (mult >= 1.4) return 'Buy';
  if (mult >= 0.85) return 'Neutral';
  if (mult >= 0.5) return 'Reduce';
  return 'Pause';
}

export function DcaSignalEmail({
  email,
  frequency,
  baseAmount,
  composite,
  tier,
  maRatio,
  maMult,
  puellValue,
  puellMult,
  btcPrice,
  dateLabel,
  backtestSummary,
  siteUrl,
  unsubUrl,
}: DcaSignalEmailProps) {
  const recommendedBuy = Math.round(baseAmount * composite);
  const colour         = tierColour(tier);
  const period1yr      = backtestSummary.find(p => p.label === '1 year');
  const period3yr      = backtestSummary.find(p => p.label === '3 years');

  const priceFormatted = btcPrice.toLocaleString('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  });

  return (
    <Html lang="en">
      <Head />
      <Body style={{ backgroundColor: C.bg, margin: '0', padding: '0', fontFamily: serif }}>
        <Container style={{ maxWidth: '520px', margin: '0 auto', padding: '32px 16px' }}>

          {/* Header */}
          <Section style={{ marginBottom: '20px' }}>
            <Row>
              <Column>
                <Text style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.18em', color: C.muted, margin: '0 0 2px' }}>
                  SITUATION ROOM · DCA SIGNAL ENGINE
                </Text>
                <Text style={{ fontFamily: mono, fontSize: '12px', letterSpacing: '0.08em', color: C.text, margin: '0', fontWeight: 'bold' }}>
                  {frequency === 'weekly' ? 'WEEKLY' : 'MONTHLY'} SIGNAL · {dateLabel.toUpperCase()}
                </Text>
              </Column>
              <Column style={{ textAlign: 'right' as const }}>
                <Text style={{ fontFamily: mono, fontSize: '10px', color: C.muted, margin: '0 0 2px' }}>BTC/USD</Text>
                <Text style={{ fontFamily: mono, fontSize: '13px', color: C.text, margin: '0', fontWeight: 'bold' }}>
                  {priceFormatted}
                </Text>
              </Column>
            </Row>
          </Section>

          <Hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '0 0 20px' }} />

          {/* Hero signal */}
          <Section style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, padding: '20px 24px', marginBottom: '16px', textAlign: 'center' as const }}>
            <Text style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.18em', color: C.muted, margin: '0 0 8px' }}>
              COMPOSITE SIGNAL
            </Text>
            <Text style={{ fontFamily: mono, fontSize: '48px', letterSpacing: '-0.02em', color: colour, margin: '0 0 4px', fontWeight: 'bold', lineHeight: '1' }}>
              {composite.toFixed(2)}×
            </Text>
            <Text style={{ fontFamily: mono, fontSize: '12px', letterSpacing: '0.1em', color: colour, margin: '0 0 16px', fontWeight: 'bold' }}>
              {tier.toUpperCase()}
            </Text>
            <Hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '0 0 16px' }} />
            <Text style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.14em', color: C.muted, margin: '0 0 4px' }}>
              YOUR RECOMMENDED BUY THIS {frequency === 'weekly' ? 'WEEK' : 'MONTH'}
            </Text>
            <Text style={{ fontFamily: mono, fontSize: '28px', color: C.text, margin: '0', fontWeight: 'bold' }}>
              ${recommendedBuy.toLocaleString()}
            </Text>
            <Text style={{ fontFamily: mono, fontSize: '9px', color: C.muted, margin: '4px 0 0' }}>
              {composite.toFixed(2)}× your ${baseAmount} base
            </Text>
          </Section>

          {/* Individual signals */}
          <Section style={{ marginBottom: '16px' }}>
            <Row>
              <Column style={{ paddingRight: '6px' }}>
                <Section style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${maMult >= 1.4 ? C.green : maMult >= 0.85 ? C.amber : C.red}`, padding: '12px 14px' }}>
                  <Text style={{ fontFamily: mono, fontSize: '8px', letterSpacing: '0.14em', color: C.muted, margin: '0 0 4px' }}>200-WEEK MA</Text>
                  <Text style={{ fontFamily: mono, fontSize: '18px', color: C.text, margin: '0 0 2px', fontWeight: 'bold' }}>{maRatio.toFixed(3)}</Text>
                  <Text style={{ fontFamily: mono, fontSize: '9px', color: maMult >= 1.4 ? C.green : maMult >= 0.85 ? C.amber : C.red, margin: '0', fontWeight: 'bold' }}>
                    {multLabel(maMult).toUpperCase()} · {maMult.toFixed(1)}×
                  </Text>
                </Section>
              </Column>
              <Column style={{ paddingLeft: '6px' }}>
                <Section style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${puellMult >= 1.4 ? C.green : puellMult >= 0.85 ? C.amber : C.red}`, padding: '12px 14px' }}>
                  <Text style={{ fontFamily: mono, fontSize: '8px', letterSpacing: '0.14em', color: C.muted, margin: '0 0 4px' }}>PUELL MULTIPLE</Text>
                  <Text style={{ fontFamily: mono, fontSize: '18px', color: C.text, margin: '0 0 2px', fontWeight: 'bold' }}>{puellValue.toFixed(2)}</Text>
                  <Text style={{ fontFamily: mono, fontSize: '9px', color: puellMult >= 1.4 ? C.green : puellMult >= 0.85 ? C.amber : C.red, margin: '0', fontWeight: 'bold' }}>
                    {multLabel(puellMult).toUpperCase()} · {puellMult.toFixed(1)}×
                  </Text>
                </Section>
              </Column>
            </Row>
          </Section>

          {/* Returns comparison */}
          {(period1yr || period3yr) && (
            <Section style={{ marginBottom: '16px' }}>
              <Text style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.14em', color: C.muted, margin: '0 0 10px' }}>
                SIGNAL DCA vs VANILLA DCA (at ${baseAmount}/week)
              </Text>
              <Section style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, padding: '16px' }}>
                {[period1yr, period3yr].filter(Boolean).map(p => p && (
                  <Section key={p.label} style={{ marginBottom: '12px' }}>
                    <Row>
                      <Column>
                        <Text style={{ fontFamily: mono, fontSize: '9px', color: C.muted, margin: '0 0 4px', letterSpacing: '0.1em' }}>
                          {p.label.toUpperCase()} (since {p.startDate})
                        </Text>
                        <Row>
                          <Column style={{ paddingRight: '8px' }}>
                            <Text style={{ fontFamily: mono, fontSize: '10px', color: C.muted, margin: '0 0 2px' }}>Signal DCA</Text>
                            <Text style={{ fontFamily: mono, fontSize: '12px', color: C.text, margin: '0', fontWeight: 'bold' }}>
                              {p.btcAccumulated.toFixed(5)} BTC
                            </Text>
                            <Text style={{ fontFamily: mono, fontSize: '9px', color: C.muted, margin: '0' }}>
                              ≈ ${Math.round(p.portfolioValue).toLocaleString()}
                            </Text>
                          </Column>
                          <Column style={{ paddingRight: '8px' }}>
                            <Text style={{ fontFamily: mono, fontSize: '10px', color: C.muted, margin: '0 0 2px' }}>Vanilla DCA</Text>
                            <Text style={{ fontFamily: mono, fontSize: '12px', color: C.text, margin: '0', fontWeight: 'bold' }}>
                              {p.btcVanilla.toFixed(5)} BTC
                            </Text>
                            <Text style={{ fontFamily: mono, fontSize: '9px', color: C.muted, margin: '0' }}>
                              ≈ ${Math.round(p.vanillaValue).toLocaleString()}
                            </Text>
                          </Column>
                          <Column>
                            <Text style={{ fontFamily: mono, fontSize: '10px', color: C.muted, margin: '0 0 2px' }}>Advantage</Text>
                            <Text style={{ fontFamily: mono, fontSize: '14px', color: p.advantagePct > 0 ? C.green : C.red, margin: '0', fontWeight: 'bold' }}>
                              +{p.advantagePct.toFixed(1)}%
                            </Text>
                            <Text style={{ fontFamily: mono, fontSize: '9px', color: C.muted, margin: '0' }}>more BTC</Text>
                          </Column>
                        </Row>
                      </Column>
                    </Row>
                  </Section>
                ))}
              </Section>
            </Section>
          )}

          {/* CTA */}
          <Section style={{ textAlign: 'center' as const, marginBottom: '20px' }}>
            <Link
              href={`${siteUrl}/room/dca-signal`}
              style={{
                display: 'inline-block',
                backgroundColor: C.accent,
                color: '#fff',
                fontFamily: mono,
                fontSize: '10px',
                letterSpacing: '0.12em',
                padding: '8px 24px',
                textDecoration: 'none',
                fontWeight: 'bold',
              }}
            >
              VIEW FULL SIGNAL →
            </Link>
          </Section>

          <Hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '0 0 14px' }} />

          {/* Footer */}
          <Text style={{ fontFamily: mono, fontSize: '8px', color: C.muted, margin: '0 0 4px', letterSpacing: '0.1em' }}>
            NOT FINANCIAL ADVICE · ENGINE V3 · 200W MA + PUELL MULTIPLE
          </Text>
          <Text style={{ fontFamily: mono, fontSize: '8px', color: C.muted, margin: '0', letterSpacing: '0.08em' }}>
            Sent to {email} ·{' '}
            <Link href={unsubUrl} style={{ color: C.muted }}>unsubscribe</Link>
            {' · '}
            <Link href={siteUrl} style={{ color: C.muted }}>situationroom.space</Link>
          </Text>

        </Container>
      </Body>
    </Html>
  );
}

export function dcaSignalEmailSubject(composite: number, tier: string, dateLabel: string): string {
  return `DCA Signal ${composite.toFixed(2)}× · ${tier} · ${dateLabel} — Situation Room`;
}
