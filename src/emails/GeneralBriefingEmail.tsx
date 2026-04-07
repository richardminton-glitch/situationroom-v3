/**
 * General (and Members) daily briefing email template.
 *
 * Subject: Situation Room · [LEVEL] · [DATE] · [BRIEFING HEADLINE]
 *
 * Members get the POOL STATUS block appended.
 * Email-safe: HTML tables, inline styles, no CSS grid/flex, no web fonts.
 */

import {
  Html, Head, Body, Container, Section,
  Text, Hr, Link, Row, Column,
} from '@react-email/components';

export interface GeneralBriefingEmailProps {
  // Briefing content
  date: string;            // e.g. "3 April 2026"
  headline: string;
  threatLevel: string;
  convictionScore: number;
  sourcesCount: number;
  sections: {
    market: string;
    network: string;
    geo: string;
    macro: string;
    outlook: string;
  };
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
  // Links
  briefingUrl: string;
  unsubscribeUrl: string;
  viewInBrowserUrl: string;
  // Optional pool status (Members only)
  poolStatus?: {
    balanceSats: number;
    position: string;      // 'FLAT' | 'LONG' | 'SHORT'
    lastTradeDesc: string;
    winRatePct: number;
  };
  // Optional bot alerts since last send (Members only)
  alerts?: string[];
}

// Parchment palette — inline hex only
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

const labelStyle = {
  fontFamily: '"Courier New", Courier, monospace',
  fontSize: '8px', letterSpacing: '0.12em',
  color: '#8b7355', margin: '0 0 2px',
  textTransform: 'uppercase' as const,
};

const valueStyle = {
  fontFamily: '"Courier New", Courier, monospace',
  fontSize: '12px', color: '#2c2416',
  margin: '0', fontWeight: 'bold' as const,
};

// Briefing-section markdown rendering moved to ./shared/briefingMarkdown.ts
// so GeneralBriefingEmail and VipBriefingEmail share the same parser. The
// shared helper handles bold, italic, [[N]](url) citations, [label](url)
// inline links, paragraph breaks, and HTML escaping.
import { renderBriefingHtml } from './shared/briefingMarkdown';

const SECTION_TITLES = [
  { key: 'market',  label: 'I. Market Conditions' },
  { key: 'network', label: 'II. Network Health' },
  { key: 'geo',     label: 'III. Geopolitical Watch' },
  { key: 'macro',   label: 'IV. Macro Pulse' },
  { key: 'outlook', label: 'V. Outlook' },
] as const;

export function GeneralBriefingEmail({
  date, headline, threatLevel, convictionScore, sourcesCount,
  sections, btcPrice, btcChange24h, fearGreed, hashrate, mvrv,
  blockHeight, sp500, vix, gold, dxy, us10y, oil,
  briefingUrl, unsubscribeUrl, viewInBrowserUrl, poolStatus, alerts,
}: GeneralBriefingEmailProps) {
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
            <Text style={{ fontFamily: font.mono, fontSize: '10px', letterSpacing: '0.18em', color: C.muted, margin: '0 0 4px' }}>
              SITUATION ROOM · DAILY BRIEFING
            </Text>
            <Text style={{ fontFamily: font.mono, fontSize: '10px', letterSpacing: '0.08em', color: C.muted, margin: '0 0 12px' }}>
              {date}{'  ·  '}CONVICTION {convictionScore}/100{'  ·  '}{sourcesCount} SOURCES
            </Text>
            <Text style={{ fontFamily: font.mono, fontSize: '10px', letterSpacing: '0.08em', color: C.accent, margin: '0 0 14px' }}>
              THREAT: {threatLevel}
            </Text>
            <Text style={{ fontFamily: font.serif, fontSize: '22px', fontWeight: 'normal', lineHeight: '1.35', color: C.text, margin: '0' }}>
              {headline}
            </Text>
          </Section>

          {/* Data snapshot */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '0 28px 0' }}>
            <Hr style={{ borderColor: C.dimBorder, margin: '0 0 12px' }} />
            <Text style={{ fontFamily: font.mono, fontSize: '9px', letterSpacing: '0.18em', color: C.muted, margin: '0 0 8px' }}>
              DATA SNAPSHOT
            </Text>
            {[
              [btcPrice, '24H CHANGE', btcChange24h, 'FEAR & GREED', fearGreed],
              [hashrate, 'MVRV', mvrv, 'BLOCK HEIGHT', blockHeight],
              [sp500,    'VIX', vix, 'GOLD', gold],
              [dxy,      'US 10Y', us10y, 'OIL', oil],
            ].map(([v1, , v2, , v3], ri) => {
              const labels = ri === 0
                ? ['BTC PRICE', '24H CHANGE', 'FEAR & GREED']
                : ri === 1
                ? ['HASHRATE', 'MVRV', 'BLOCK HEIGHT']
                : ri === 2
                ? ['S&P 500', 'VIX', 'GOLD']
                : ['DXY', 'US 10Y', 'OIL'];
              const vals = [v1, v2, v3];
              return (
                <Row key={ri} style={{ marginBottom: '6px' }}>
                  {labels.map((lbl, ci) => (
                    <Column key={ci} style={{ width: '33%', paddingRight: ci < 2 ? '8px' : '0' }}>
                      <Text style={labelStyle}>{lbl}</Text>
                      <Text style={valueStyle}>{vals[ci]}</Text>
                    </Column>
                  ))}
                </Row>
              );
            })}
            <Hr style={{ borderColor: C.dimBorder, margin: '12px 0 0' }} />
          </Section>

          {/* Briefing sections */}
          {SECTION_TITLES.map(({ key, label }) => (
            <Section
              key={key}
              style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '16px 28px 0' }}
            >
              <Text style={{ fontFamily: font.mono, fontSize: '9px', letterSpacing: '0.16em', color: C.muted, margin: '0 0 8px', textTransform: 'uppercase' }}>
                {label}
              </Text>
              <Text
                style={{ fontFamily: font.serif, fontSize: '13px', color: C.text, lineHeight: '1.7', margin: '0 0 16px' }}
                dangerouslySetInnerHTML={{ __html: renderBriefingHtml(sections[key as keyof typeof sections]) }}
              />
              <Hr style={{ borderColor: C.dimBorder, margin: '0' }} />
            </Section>
          ))}

          {/* View online CTA */}
          <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '20px 28px' }}>
            <Link
              href={briefingUrl}
              style={{ fontFamily: font.mono, fontSize: '11px', letterSpacing: '0.1em', color: C.accent, textDecoration: 'underline' }}
            >
              View full briefing online →
            </Link>
          </Section>

          {/* Pool status block — Members tier only */}
          {poolStatus && (
            <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '16px 28px' }}>
              <Hr style={{ borderColor: C.dimBorder, margin: '0 0 12px' }} />
              <Text style={{ fontFamily: font.mono, fontSize: '9px', letterSpacing: '0.18em', color: C.muted, margin: '0 0 8px' }}>
                POOL STATUS
              </Text>
              <Text style={{ fontFamily: font.mono, fontSize: '12px', color: C.text, lineHeight: '1.8', margin: '0' }}>
                Balance: {poolStatus.balanceSats.toLocaleString()} sats
                {'  ·  '}Position: <strong>{poolStatus.position}</strong>
                <br />
                Last trade: {poolStatus.lastTradeDesc}
                {'  ·  '}Win rate: {poolStatus.winRatePct}%
              </Text>
            </Section>
          )}

          {/* Alerts block — Members tier only, shown when there are recent bot alerts */}
          {alerts && alerts.length > 0 && (
            <Section style={{ backgroundColor: C.card, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, padding: '16px 28px' }}>
              <Hr style={{ borderColor: C.dimBorder, margin: '0 0 12px' }} />
              <Text style={{ fontFamily: font.mono, fontSize: '9px', letterSpacing: '0.18em', color: C.muted, margin: '0 0 10px' }}>
                ALERTS SINCE LAST BRIEFING
              </Text>
              {alerts.map((alert, i) => (
                <Text key={i} style={{ fontFamily: font.mono, fontSize: '11px', color: C.text, lineHeight: '1.6', margin: '0 0 6px', paddingLeft: '10px', borderLeft: `2px solid ${C.accent}` }}>
                  {alert}
                </Text>
              ))}
            </Section>
          )}

          {/* Footer */}
          <Section style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderTop: 'none', padding: '16px 28px', textAlign: 'center' }}>
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

export function generalBriefingSubject(date: string, threatLevel: string, headline: string): string {
  // Truncate headline to keep subject under ~90 chars
  const maxHeadline = 60;
  const h = headline.length > maxHeadline ? headline.slice(0, maxHeadline - 1) + '…' : headline;
  return `Situation Room · ${threatLevel} · ${date} · ${h}`;
}
