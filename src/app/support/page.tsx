'use client';

import { useState } from 'react';
import { FundingBar } from '@/components/widgets/FundingBar';
import { SubscriptionModal } from '@/components/auth/SubscriptionModal';
import { DonationModal } from '@/components/auth/DonationModal';

export default function SupportPage() {
  const [showModal, setShowModal] = useState(false);
  const [showDonate, setShowDonate] = useState(false);

  return (
    <div style={{ fontFamily: 'var(--font-mono)', padding: '32px 24px', maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ marginBottom: '4px' }}>
        <span style={{ fontSize: '10px', letterSpacing: '0.16em', color: 'var(--text-muted)' }}>
          SITUATION ROOM
        </span>
      </div>
      <h1 style={{ fontSize: '18px', fontWeight: 'normal', color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '0.08em' }}>
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
          WHAT YOU GET
        </div>
        {[
          { tier: 'Free', price: 'Free', color: '#8b7355', features: [
            'Newsletter signup — daily or weekly',
            'Daily letter: outlook section only',
            'Weekly letter: outlook + price & metric summary',
            'Full Overview & Full Data dashboards',
            'Briefing outlook section (dashboard + archive)',
            '7-day briefing archive',
          ], cta: 'SIGN UP' },
          { tier: 'General', price: '10,000 sats/mo', color: '#8b6914', features: [
            'Everything in Free',
            'Full briefings — all 5 agent sections',
            'Macro Focus dashboard',
            'Conviction score breakdown',
            '30-day briefing archive',
            'Full daily newsletter',
            'Dark mode',
          ], cta: 'SUBSCRIBE' },
          { tier: 'Members', price: '25,000 sats/mo', color: '#4a6fa5', features: [
            'Everything in General',
            'Ops Room — member chat',
            'Trading pool view + bot signals',
            'On-Chain Deep Dive dashboard',
            'AI Analysis dashboard',
            'AI "Why Bitcoin" annotations',
          ], cta: 'SUBSCRIBE' },
          { tier: 'VIP', price: '50,000 sats/mo', color: '#7c5cbf', features: [
            'Everything in Members',
            'Custom dashboard layouts',
            'Personal conviction score',
            'Grok-3 on-chain deep analysis',
            'Personalised briefings by topic',
            'Threshold alerts via Nostr DM',
          ], cta: 'SUBSCRIBE' },
        ].map(({ tier, price, color, features, cta }) => (
          <div
            key={tier}
            style={{ marginBottom: '20px', padding: '16px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: color, letterSpacing: '0.08em', fontWeight: 'bold' }}>{tier.toUpperCase()}</span>
              <span style={{ fontSize: '11px', color: 'var(--accent-primary)' }}>{price}</span>
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 12px', listStyle: 'none' }}>
              {features.map((f) => (
                <li key={f} style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  ▸ {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => tier === 'Free' ? setShowModal(true) : setShowModal(true)}
              style={{
                marginTop: '12px', padding: '6px 16px',
                background: 'transparent', border: `1px solid ${color}`,
                color: color, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em',
              }}
            >
              {cta} ⚡
            </button>
          </div>
        ))}
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
