/**
 * DCA VIP Signal — weekly / monthly combined buy + exit signal email.
 *
 * Shows the current mode (accumulate / distribute), the composite signal,
 * recommended buy OR sell for the week, both underlying indicators,
 * and backtest returns vs vanilla.
 *
 * Parchment palette with amber VIP accent. Email-safe HTML.
 */

import {
  Html, Head, Body, Container, Section, Text, Hr, Link, Row, Column,
} from '@react-email/components';
import type { BacktestPeriod } from '@/lib/data/daily-snapshot';
import { DCA_CROSSOVER } from '@/lib/signals/dca-exit-utils';

export interface DcaVipEmailProps {
  email:             string;
  frequency:         string;   // 'weekly' | 'monthly'
  baseAmount:        number;
  // Signal core
  composite:         number;
  tier:              string;
  maRatio:           number;
  maMult:            number;
  puellValue:        number;
  puellMult:         number;
  btcPrice:          number;
  dateLabel:         string;   // e.g. "7 April 2026"
  // Exit
  inExitZone:        boolean;
  exitTierLabel:     string;   // e.g. "Light exits"
  recommendedBuy:    number;   // USD
  recommendedSell:   number;   // USD
  recommendedSellBtc: number;  // BTC
  excessBtcHeld:     number;   // BTC
  exitRatePct:       number;   // e.g. 4 for 4%
  // Returns
  backtestSummary:   BacktestPeriod[];
  // URLs
  siteUrl:           string;
  unsubUrl:          string;
}

const C = {
  bg:      '#f5f0e8',
  card:    '#ede8dc',
  border:  '#c8b89a',
  text:    '#2c2416',
  muted:   '#8b7355',
  accent:  '#8b6914',
  vip:     '#9b6800',
  vipBg:   '#fdf3e0',
  green:   '#1a6b5a',
  greenBg: '#e8f5f1',
  amber:   '#7a5a1a',
  amberBg: '#f9f0d8',
  red:     '#6b2020',
  redBg:   '#f5e8e8',
};

const mono  = '"Courier New", Courier, monospace';
const serif = 'Georgia, "Times New Roman", Times, serif';

function multLabel(mult: number): string {
  if (mult >= 2.0) return 'Strong buy';
  if (mult >= 1.4) return 'Buy';
  if (mult >= 0.85) return 'Neutral';
  if (mult >= 0.5) return 'Reduce';
  return 'Pause';
}

function fmtBtc(v: number): string {
  if (v >= 1)    return v.toFixed(4) + ' BTC';
  if (v >= 0.01) return v.toFixed(5) + ' BTC';
  return v.toFixed(6) + ' BTC';
}

export function DcaVipEmail({
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
  inExitZone,
  exitTierLabel,
  recommendedBuy,
  recommendedSell,
  recommendedSellBtc,
  excessBtcHeld,
  exitRatePct,
  backtestSummary,
  siteUrl,
  unsubUrl,
}: DcaVipEmailProps) {

  const period1yr = backtestSummary.find(p => p.label === '1 year');
  const period3yr = backtestSummary.find(p => p.label === '3 years');

  const priceFormatted = btcPrice.toLocaleString('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  });

  // Mode-derived colours
  const modeColour = inExitZone ? C.red   : composite >= 1.0 ? C.green : C.amber;
  const modeBg     = inExitZone ? C.redBg : composite >= 1.0 ? C.greenBg : C.amberBg;
  const modeLabel  = inExitZone ? exitTierLabel.toUpperCase() : tier.toUpperCase();

  return (
    <Html lang="en">
      <Head />
      <Body style={{ backgroundColor: C.bg, margin: '0', padding: '0', fontFamily: serif }}>
        <Container style={{ maxWidth: '520px', margin: '0 auto', padding: '32px 16px' }}>

          {/* Header */}
          <Section style={{ marginBottom: '20px' }}>
            <Row>
              <Column>
                <Text style={{ fontFamily: mono, fontSize: '8px', letterSpacing: '0.18em', color: C.vip, margin: '0 0 2px', fontWeight: 'bold' }}>
                  SITUATION ROOM · VIP
                </Text>
                <Text style={{ fontFamily: mono, fontSize: '12px', letterSpacing: '0.08em', color: C.text, margin: '0', fontWeight: 'bold' }}>
                  {frequency === 'weekly' ? 'WEEKLY' : 'MONTHLY'} DCA IN/OUT SIGNAL · {dateLabel.toUpperCase()}
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

          {/* Mode banner */}
          <Section style={{ backgroundColor: modeBg, border: `1px solid ${modeColour}`, borderLeft: `4px solid ${modeColour}`, padding: '14px 18px', marginBottom: '16px' }}>
            <Row>
              <Column>
                <Text style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.16em', color: C.muted, margin: '0 0 4px' }}>
                  CURRENT MODE
                </Text>
                <Text style={{ fontFamily: mono, fontSize: '20px', color: modeColour, margin: '0 0 2px', fontWeight: 'bold', letterSpacing: '0.04em' }}>
                  {modeLabel}
                </Text>
                <Text style={{ fontFamily: mono, fontSize: '9px', color: C.muted, margin: '0' }}>
                  Composite {composite.toFixed(3)}× · crossover at {DCA_CROSSOVER.toFixed(2)}×
                </Text>
              </Column>
              <Column style={{ textAlign: 'right' as const }}>
                <Text style={{ fontFamily: mono, fontSize: '36px', color: modeColour, margin: '0', fontWeight: 'bold', letterSpacing: '-0.02em', lineHeight: '1' }}>
                  {composite.toFixed(2)}×
                </Text>
              </Column>
            </Row>
          </Section>

          {/* THIS WEEK action card */}
          <Section style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, padding: '20px 24px', marginBottom: '16px', textAlign: 'center' as const }}>
            {inExitZone ? (
              <>
                <Text style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.16em', color: C.red, margin: '0 0 6px', fontWeight: 'bold' }}>
                  THIS {frequency === 'weekly' ? 'WEEK' : 'MONTH'} — SELL
                </Text>
                <Text style={{ fontFamily: mono, fontSize: '40px', color: C.red, margin: '0 0 4px', fontWeight: 'bold', lineHeight: '1' }}>
                  ${Math.round(recommendedSell).toLocaleString()}
                </Text>
                <Text style={{ fontFamily: mono, fontSize: '10px', color: C.muted, margin: '0 0 12px' }}>
                  ≈ {fmtBtc(recommendedSellBtc)} · {exitRatePct}% of excess · {fmtBtc(excessBtcHeld)} available
                </Text>
                <Text style={{ fontFamily: mono, fontSize: '9px', color: C.red, margin: '0', fontWeight: 'bold', letterSpacing: '0.1em' }}>
                  {exitTierLabel.toUpperCase()} — NO BUY THIS {frequency === 'weekly' ? 'WEEK' : 'MONTH'}
                </Text>
              </>
            ) : (
              <>
                <Text style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.16em', color: C.green, margin: '0 0 6px', fontWeight: 'bold' }}>
                  THIS {frequency === 'weekly' ? 'WEEK' : 'MONTH'} — BUY
                </Text>
                <Text style={{ fontFamily: mono, fontSize: '40px', color: C.text, margin: '0 0 4px', fontWeight: 'bold', lineHeight: '1' }}>
                  ${recommendedBuy.toLocaleString()}
                </Text>
                <Text style={{ fontFamily: mono, fontSize: '9px', color: C.muted, margin: '0 0 12px' }}>
                  {composite.toFixed(2)}× your ${baseAmount} base
                </Text>
                <Text style={{ fontFamily: mono, fontSize: '9px', color: C.green, margin: '0', fontWeight: 'bold', letterSpacing: '0.1em' }}>
                  ACCUMULATE ZONE · NO EXITS UNTIL COMPOSITE &lt; {DCA_CROSSOVER.toFixed(2)}×
                </Text>
              </>
            )}
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
                  </Section>
                ))}
              </Section>
            </Section>
          )}

          {/* CTA */}
          <Section style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
            <Link
              href={`${siteUrl}/tools/dca-signal`}
              style={{
                display:         'inline-block',
                backgroundColor: C.vip,
                color:           '#fff',
                fontFamily:      mono,
                fontSize:        '10px',
                letterSpacing:   '0.12em',
                padding:         '8px 28px',
                textDecoration:  'none',
                fontWeight:      'bold',
              }}
            >
              VIEW FULL SIGNAL + PORTFOLIO CHART →
            </Link>
          </Section>

          <Hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '0 0 14px' }} />

          {/* Footer */}
          <Text style={{ fontFamily: mono, fontSize: '8px', color: C.muted, margin: '0 0 4px', letterSpacing: '0.1em' }}>
            NOT FINANCIAL ADVICE · ENGINE V3 · 200W MA + PUELL MULTIPLE · VIP
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

export function dcaVipEmailSubject(composite: number, inExitZone: boolean, dateLabel: string): string {
  const action = inExitZone ? 'EXIT SIGNAL' : 'BUY SIGNAL';
  return `VIP DCA ${action} ${composite.toFixed(2)}× · ${dateLabel} — Situation Room`;
}
