'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FundingBar } from '@/components/widgets/FundingBar';
import { SubscriptionModal } from '@/components/auth/SubscriptionModal';
import { DonationModal } from '@/components/auth/DonationModal';
import { usePricing, formatSats } from '@/hooks/usePricing';

export default function SupportPage() {
  const [showModal, setShowModal] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
  const router = useRouter();
  const pricing = usePricing();

  return (
    <div style={{ fontFamily: 'var(--font-mono)', padding: '32px 24px', maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ marginBottom: '4px' }}>
        <span style={{ fontSize: '10px', letterSpacing: '0.16em', color: 'var(--text-muted)' }}>
          SITUATION ROOM
        </span>
      </div>
      <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '22px', fontWeight: 'normal', color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '0.08em' }}>
        SUPPORT THE PROJECT
      </h1>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '32px', maxWidth: '480px' }}>
        Situation Room runs on sats. No ads, no data sales, no VC money.
        The costs below are the real costs. Your subscription or donation
        keeps this independent.
      </p>

      <FundingBar
        variant="full"
        onSubscribeClick={() => setShowModal(true)}
        onDonateClick={() => setShowDonate(true)}
      />

      <div style={{ marginTop: '40px', borderTop: '1px solid var(--border-subtle)', paddingTop: '24px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '16px' }}>
          SUBSCRIPTION TIERS
        </div>
        {[
          { tier: 'Free', price: 'Free', color: '#8b7355', subtitle: '', features: [
            'Full Overview & Full Data dashboards',
            'Situation Map — global intelligence view',
            'Briefing outlook section + 7-day archive',
            'Weekly newsletter digest (Sundays)',
            'Live BTC price, conviction score & threat level',
            'Fear & Greed, hash rate, MVRV & macro data',
          ], cta: 'SIGN UP' },
          { tier: 'General', price: pricing ? `${formatSats(pricing.tierPricesSats.general)} sats/mo` : '...', color: '#8b6914', subtitle: 'Price of a coffee', features: [
            'Everything in Free',
            'Full 5-agent briefings — Market, Network, Geopolitical, Macro, Outlook',
            '30-day briefing archive',
            'Macro Focus dashboard',
            'Conviction score breakdown — all 5 signals',
            'AI macro analysis (Grok-powered)',
            'Full daily newsletter delivery',
            'Dark mode',
            'DCA Signal — weekly composite score, recommended buy & 12-month chart',
            'BTC stacking comparison — signal vs vanilla DCA',
            'Signal email — weekly DCA-in signal delivered to your inbox',
          ], cta: 'SUBSCRIBE' },
          { tier: 'Members', price: pricing ? `${formatSats(pricing.tierPricesSats.members)} sats/mo` : '...', color: '#4a6fa5', subtitle: 'Price of a beer', features: [
            'Everything in General',
            'Trading Desk — autonomous trading terminal',
            'Ops Room — live member chat via Nostr',
            'Trading pool view + capital flow topology',
            'On-Chain Deep Dive dashboard',
            'AI Analysis dashboard — 8 specialist agents',
            'On-chain AI analysis (Grok-powered)',
            'Macro Cycle room — ISM PMI tracker & macro dominoes framework',
          ], cta: 'SUBSCRIBE' },
          { tier: 'VIP', price: pricing ? `${formatSats(pricing.tierPricesSats.vip)} sats (lifetime)` : '...', color: '#7c5cbf', subtitle: 'One-off payment · Lifetime access', features: [
            'Everything in Members',
            'Custom dashboard layouts — save & switch',
            'On-demand Grok macro & on-chain deep analysis',
            'AI briefing search — query the full archive',
            'Personalised VIP briefings by topic',
            'Threshold alerts via Nostr DM',
            'VIP newsletter topics',
            'DCA Exit Strategy — signal-timed profit taking on excess BTC',
            'Combined portfolio chart — buy + exit simulation with convergence',
            'VIP signal email — combined DCA in/out weekly signal',
            'Lifetime access — pay once, never expires',
          ], cta: 'SUBSCRIBE' },
        ].map(({ tier, price, color, subtitle, features, cta }) => (
          <div
            key={tier}
            style={{ marginBottom: '20px', padding: '16px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: color, letterSpacing: '0.08em', fontWeight: 'bold' }}>{tier.toUpperCase()}</span>
              <span style={{ fontSize: '11px', color: 'var(--accent-primary)' }}>{price}</span>
            </div>
            {subtitle && (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '10px' }}>{subtitle}</div>
            )}
            {!subtitle && <div style={{ marginBottom: '6px' }} />}
            <ul style={{ margin: 0, padding: '0 0 0 12px', listStyle: 'none' }}>
              {features.map((f) => (
                <li key={f} style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  ▸ {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => tier === 'Free' ? router.push('/login') : setShowModal(true)}
              style={{
                marginTop: '12px', padding: '6px 16px',
                background: 'transparent', border: `1px solid ${color}`,
                color: color, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em',
              }}
            >
              {cta} {tier === 'Free' ? '→' : '⚡'}
            </button>
          </div>
        ))}

        {/* Trial option */}
        {pricing && (
          <div
            style={{ marginBottom: '20px', padding: '16px', border: '1px dashed var(--border-subtle)', background: 'var(--bg-card)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--accent-primary)', letterSpacing: '0.08em', fontWeight: 'bold' }}>TRIAL</span>
              <span style={{ fontSize: '11px', color: 'var(--accent-primary)' }}>{formatSats(pricing.trialSats)} sats / {pricing.trialDays} days</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '10px' }}>Try any paid tier for one week · Once per tier</div>
            <ul style={{ margin: 0, padding: '0 0 0 12px', listStyle: 'none' }}>
              <li style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                ▸ {pricing.trialDays}-day full access to chosen tier
              </li>
              <li style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                ▸ One trial available per tier, per account
              </li>
              <li style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                ▸ Upgrade to full subscription anytime
              </li>
            </ul>
            <button
              onClick={() => setShowModal(true)}
              style={{
                marginTop: '12px', padding: '6px 16px',
                background: 'transparent', border: '1px solid var(--accent-primary)',
                color: 'var(--accent-primary)', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em',
              }}
            >
              START TRIAL ⚡
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <SubscriptionModal
          onClose={() => setShowModal(false)}
          onSuccess={() => setShowModal(false)}
        />
      )}

      {showDonate && (
        <DonationModal onClose={() => setShowDonate(false)} />
      )}
    </div>
  );
}
