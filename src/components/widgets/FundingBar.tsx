'use client';

import { useEffect, useState } from 'react';

interface FundingStatus {
  satsPerGbp: number;
  totalRevenueGBP: number;
  runningCostsGBP: number;
  coveragePct: number;
  subscriptionRevenueSats: number;
  donationRevenueSats: number;
  memberBreakdown: { general: number; members: number; vip: number };
  costsBreakdown: { apiNinjas: number; hosting: number; domains: number; ai: number; total: number };
}

function progressColor(pct: number): string {
  if (pct >= 100) return '#2dd4bf'; // teal — fully funded
  if (pct >= 70)  return '#f7931a'; // gold
  return '#c4885a';                  // amber
}

interface FundingBarProps {
  variant?: 'full' | 'compact';
  onSubscribeClick?: () => void;
  onDonateClick?: () => void;
}

export function FundingBar({ variant = 'compact', onSubscribeClick, onDonateClick }: FundingBarProps) {
  const [status, setStatus] = useState<FundingStatus | null>(null);

  useEffect(() => {
    fetch('/api/funding/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status) return null;

  const { coveragePct, totalRevenueGBP, runningCostsGBP, memberBreakdown, costsBreakdown } = status;
  const color = progressColor(coveragePct);
  const fillW = `${Math.min(100, coveragePct)}%`;

  if (variant === 'compact') {
    return (
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '8px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, height: '4px', background: 'var(--border-subtle)', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: fillW, background: color, transition: 'width 0.5s ease' }} />
          </div>
          <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{coveragePct}% funded</span>
          {onSubscribeClick && (
            <button
              onClick={onSubscribeClick}
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '11px', padding: 0 }}
            >
              Support →
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div style={{ fontFamily: 'var(--font-mono)', padding: '24px', maxWidth: '600px' }}>
      <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '16px' }}>
        OPERATIONAL STATUS
      </div>

      <div style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
        Monthly costs: £{runningCostsGBP}
      </div>

      {/* Progress bar */}
      <div style={{ height: '8px', background: 'var(--border-subtle)', marginBottom: '6px', position: 'relative' }}>
        <div
          style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: fillW, background: color, transition: 'width 0.5s ease' }}
        />
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '4px' }}>
        £{totalRevenueGBP.toFixed(0)} / £{runningCostsGBP} — {coveragePct}%
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Subscriptions: £{Math.round(status.subscriptionRevenueSats / status.satsPerGbp)}
        {' · '}
        Donations: £{Math.round(status.donationRevenueSats / status.satsPerGbp)}
      </div>

      {/* Member breakdown */}
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>
        {memberBreakdown.general > 0 && `${memberBreakdown.general} General`}
        {memberBreakdown.members > 0 && ` · ${memberBreakdown.members} Members`}
        {memberBreakdown.vip > 0 && ` · ${memberBreakdown.vip} VIP`}
        {(memberBreakdown.general + memberBreakdown.members + memberBreakdown.vip) === 0 && 'No paid members yet'}
      </div>

      {/* Running costs breakdown */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.08em' }}>
          RUNNING COSTS
        </div>
        {Object.entries({ 'xAI Grok': costsBreakdown.ai, 'API Ninjas': costsBreakdown.apiNinjas, 'Hosting': costsBreakdown.hosting, 'Domains': costsBreakdown.domains }).map(([name, cost]) => (
          <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
            <span style={{ color: 'var(--text-muted)' }}>£{cost}/mo</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {onSubscribeClick && (
          <button
            onClick={onDonateClick ?? onSubscribeClick}
            style={{
              padding: '10px 20px', background: 'var(--accent-primary)',
              color: 'var(--bg-primary)', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.1em',
            }}
          >
            SUPPORT WITH SATS ⚡
          </button>
        )}
      </div>
    </div>
  );
}
