/**
 * Free Weekly Digest email template.
 * Renders in React Email (email-safe HTML — tables only, no flex/grid, no web fonts).
 *
 * Subject: Situation Room · [THREAT LEVEL] · Week of [DATE]
 */

import {
  Html, Head, Body, Container, Section,
  Text, Hr, Link, Row, Column,
} from '@react-email/components';

export interface FreeDigestEmailProps {
  weekOf: string;           // e.g. "3 April 2026"
  threatLevel: string;      // e.g. "ELEVATED"
  outlook: string;          // full outlook section text
  unsubscribeUrl: string;
  viewInBrowserUrl: string;
  // Data snapshot values
  btcPrice: string;
  btcChange24h: string;
  fearGreed: string;
  hashrate: string;
  mvrv: string;
  blockHeight: string;
  sp500: string;
  vix: string;
  gold: string;
  dxy: string;
  us10y: string;
  oil: string;
  convictionScore: number;
  convictionLabel: string;
  /** Live sats price for General tier, e.g. "5,681" */
  generalSatsPrice?: string;
}

// Parchment palette — must use inline hex, no CSS variables in emails
const C = {
  bg:       '#f5f0e8',
  card:     '#ede8dc',
  border:   '#c8b89a',
  text:     '#2c2416',
  muted:    '#8b7355',
  accent:   '#8b6914',
  dimBorder:'#d4c9b4',
};

const font = {
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono:  '"Courier New", Courier, monospace',
};

export function FreeDigestEmail({
  weekOf,
  threatLevel,
  outlook,
  unsubscribeUrl,
  viewInBrowserUrl,
  btcPrice,
  btcChange24h,
  fearGreed,
  hashrate,
  mvrv,
  blockHeight,
  sp500,
  vix,
  gold,
  dxy,
  us10y,
  oil,
  convictionScore,
  convictionLabel,
  generalSatsPrice,
}: FreeDigestEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={{ backgroundColor: C.bg, margin: '0', padding: '0', fontFamily: font.serif }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 0' }}>

          {/* View in browser */}
          <Section style={{ textAlign: 'center', marginBottom: '8px' }}>
            <Link href={viewInBrowserUrl} style={{ fontFamily: font.mono, fontSize: '10px', color: C.muted, textDecoration: 'none' }}>
              View in browser
            </Link>
          </Section>

          {/* Header */}
          <Section style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, padding: '24px 28px 16px' }}>
            <Text style={{ fontFamily: font.mono, fontSize: '10px', letterSpacing: '0.18em', color: C.muted, margin: '0 0 6px' }}>
              SITUATION ROOM
            </Text>
            <Text style={{ fontFamily: font.mono, fontSize: '10px', letterSpacing: '0.14em', color: C.muted, margin: '0 0 12px' }}>
              BITCOIN &amp; GLOBAL MACRO INTELLIGENCE
            </Text>
            <Text style={{ fontFamily: font.mono, fontSize: '11px', color: C.muted, margin: '0', letterSpacing: '0.06em' }}>
              Week of {weekOf}{'  ·  '}
              <span style={{ color: C.accent }}>{threatLevel}</span>
            </Text>
          </Section>

          {/* Data snapshot */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '0 28px 0' }}>
            <Hr style={{ borderColor: C.dimBorder, margin: '0 0 12px' }} />
            <Text style={{ fontFamily: font.mono, fontSize: '9px', letterSpacing: '0.18em', color: C.muted, margin: '0 0 8px' }}>
              DATA SNAPSHOT
            </Text>

            {/* Row 1: BTC PRICE | 24H CHANGE | FEAR & GREED */}
            <Row style={{ marginBottom: '6px' }}>
              <Column style={{ width: '33%', paddingRight: '8px' }}>
                <Text style={labelStyle}>BTC PRICE</Text>
                <Text style={valueStyle}>{btcPrice}</Text>
              </Column>
              <Column style={{ width: '33%', paddingRight: '8px' }}>
                <Text style={labelStyle}>24H CHANGE</Text>
                <Text style={valueStyle}>{btcChange24h}</Text>
              </Column>
              <Column style={{ width: '33%' }}>
                <Text style={labelStyle}>FEAR &amp; GREED</Text>
                <Text style={valueStyle}>{fearGreed}</Text>
              </Column>
            </Row>

            {/* Row 2: HASHRATE | MVRV | BLOCK HEIGHT */}
            <Row style={{ marginBottom: '6px' }}>
              <Column style={{ width: '33%', paddingRight: '8px' }}>
                <Text style={labelStyle}>HASHRATE</Text>
                <Text style={valueStyle}>{hashrate}</Text>
              </Column>
              <Column style={{ width: '33%', paddingRight: '8px' }}>
                <Text style={labelStyle}>MVRV</Text>
                <Text style={valueStyle}>{mvrv}</Text>
              </Column>
              <Column style={{ width: '33%' }}>
                <Text style={labelStyle}>BLOCK HEIGHT</Text>
                <Text style={valueStyle}>{blockHeight}</Text>
              </Column>
            </Row>

            {/* Row 3: S&P 500 | VIX | GOLD */}
            <Row style={{ marginBottom: '6px' }}>
              <Column style={{ width: '33%', paddingRight: '8px' }}>
                <Text style={labelStyle}>S&amp;P 500</Text>
                <Text style={valueStyle}>{sp500}</Text>
              </Column>
              <Column style={{ width: '33%', paddingRight: '8px' }}>
                <Text style={labelStyle}>VIX</Text>
                <Text style={valueStyle}>{vix}</Text>
              </Column>
              <Column style={{ width: '33%' }}>
                <Text style={labelStyle}>GOLD</Text>
                <Text style={valueStyle}>{gold}</Text>
              </Column>
            </Row>

            {/* Row 4: DXY | US 10Y | OIL */}
            <Row style={{ marginBottom: '12px' }}>
              <Column style={{ width: '33%', paddingRight: '8px' }}>
                <Text style={labelStyle}>DXY</Text>
                <Text style={valueStyle}>{dxy}</Text>
              </Column>
              <Column style={{ width: '33%', paddingRight: '8px' }}>
                <Text style={labelStyle}>US 10Y</Text>
                <Text style={valueStyle}>{us10y}</Text>
              </Column>
              <Column style={{ width: '33%' }}>
                <Text style={labelStyle}>OIL</Text>
                <Text style={valueStyle}>{oil}</Text>
              </Column>
            </Row>
            <Hr style={{ borderColor: C.dimBorder, margin: '0 0 12px' }} />
          </Section>

          {/* Conviction score */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '0 28px 16px' }}>
            <Text style={{ fontFamily: font.mono, fontSize: '9px', letterSpacing: '0.18em', color: C.muted, margin: '0 0 4px' }}>
              CONVICTION SCORE
            </Text>
            <Text style={{ fontFamily: font.mono, fontSize: '28px', fontWeight: 'bold', color: C.accent, margin: '0 0 2px' }}>
              {convictionScore}
            </Text>
            <Text style={{ fontFamily: font.mono, fontSize: '11px', color: C.muted, margin: '0 0 12px', letterSpacing: '0.08em' }}>
              {convictionLabel}
            </Text>
            <Hr style={{ borderColor: C.dimBorder, margin: '0 0 12px' }} />
          </Section>

          {/* Weekly Outlook */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '0 28px 20px' }}>
            <Text style={{ fontFamily: font.mono, fontSize: '9px', letterSpacing: '0.18em', color: C.muted, margin: '0 0 8px' }}>
              WEEKLY OUTLOOK
            </Text>
            <Text style={{ fontFamily: font.serif, fontSize: '13px', color: C.text, lineHeight: '1.7', margin: '0' }}>
              {outlook}
            </Text>
          </Section>

          {/* Upgrade CTA */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '20px 28px 24px' }}>
            <Hr style={{ borderColor: C.dimBorder, margin: '0 0 16px' }} />
            <Text style={{ fontFamily: font.mono, fontSize: '9px', letterSpacing: '0.18em', color: C.muted, margin: '0 0 6px' }}>
              ── FULL DAILY BRIEFING ─────────────────
            </Text>
            <Text style={{ fontFamily: font.serif, fontSize: '12px', color: C.muted, lineHeight: '1.6', margin: '0 0 12px' }}>
              5-agent analysis · All data · Daily delivery
              <br />
              Available from General — {generalSatsPrice || '~5,700'} sats/mo
            </Text>
            <Link
              href="https://situationroom.space/support"
              style={{
                display: 'inline-block', padding: '10px 24px',
                backgroundColor: C.accent, color: C.bg,
                fontFamily: font.mono, fontSize: '12px',
                letterSpacing: '0.12em', fontWeight: 'bold',
                textDecoration: 'none',
              }}
            >
              UPGRADE ⚡
            </Link>
          </Section>

          {/* Footer */}
          <Section style={{ padding: '16px 28px', textAlign: 'center' }}>
            <Text style={{ fontFamily: font.mono, fontSize: '10px', color: C.muted, margin: '0' }}>
              Situation Room
              {'  ·  '}
              <Link href={unsubscribeUrl} style={{ color: C.muted, textDecoration: 'underline' }}>
                Unsubscribe
              </Link>
              {'  ·  '}
              <Link href={viewInBrowserUrl} style={{ color: C.muted, textDecoration: 'underline' }}>
                View in browser
              </Link>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

const labelStyle = {
  fontFamily: '"Courier New", Courier, monospace',
  fontSize: '8px',
  letterSpacing: '0.12em',
  color: '#8b7355',
  margin: '0 0 2px',
  textTransform: 'uppercase' as const,
};

const valueStyle = {
  fontFamily: '"Courier New", Courier, monospace',
  fontSize: '12px',
  color: '#2c2416',
  margin: '0',
  fontWeight: 'bold' as const,
};

export function freeDigestSubject(weekOf: string, threatLevel: string): string {
  return `Situation Room · ${threatLevel} · Week of ${weekOf}`;
}
