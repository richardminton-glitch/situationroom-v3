'use client';

import { useState, useEffect } from 'react';
import { useTier } from '@/hooks/useTier';
import { UpgradePrompt } from '@/components/auth/UpgradePrompt';
import Link from 'next/link';

interface PoolStatus {
  balanceSats: number;
  position: 'FLAT' | 'LONG' | 'SHORT';
  unrealisedPlSats: number;
  wins: number;
  losses: number;
  winRate: number;
  lastTradeDesc: string;
  openCount: number;
  recentTrades: {
    side: 'LONG' | 'SHORT';
    entryPrice: number;
    exitPrice: number;
    plSats: number;
    duration: string;
    closedAt: number;
    rationale: string;
  }[];
}

function positionColor(pos: string): string {
  if (pos === 'LONG') return 'var(--accent-success)';
  if (pos === 'SHORT') return 'var(--accent-danger)';
  return 'var(--text-muted)';
}

function fmtSats(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M sats`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k sats`;
  return `${n} sats`;
}

function SignalBar({ label, value, max = 10, bullets }: { label: string; value: number; max?: number; bullets: { text: string; signal: 'bullish' | 'bearish' | 'neutral' }[] }) {
  const filled = Math.round((value / max) * 8);
  const bar = '█'.repeat(filled) + '░'.repeat(8 - filled);
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{bar} {value}/{max}</span>
      </div>
      {bullets.map((b, i) => (
        <div key={i} style={{ display: 'flex', gap: '6px', paddingLeft: '8px', marginBottom: '2px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: b.signal === 'bullish' ? 'var(--accent-success)' : b.signal === 'bearish' ? 'var(--accent-danger)' : 'var(--text-muted)' }}>
            {b.signal === 'bullish' ? '✓' : b.signal === 'bearish' ? '✗' : '⚠'}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>{b.text}</span>
        </div>
      ))}
    </div>
  );
}

export default function PoolPage() {
  const { userTier, canAccess } = useTier();
  const [pool, setPool] = useState<PoolStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canAccess('members')) { setLoading(false); return; }
    fetch('/api/pool/status')
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setPool)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [canAccess]);

  if (!canAccess('members')) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '26px', color: 'var(--text-primary)', marginBottom: '12px', fontWeight: 'normal' }}>Trading Pool</h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
          The pool trades Bitcoin futures using a multi-factor AI signal engine.<br />
          Members see live positions, trade history, and signal breakdown.
        </p>
        <UpgradePrompt variant="inline" requiredTier="members" featureName="Pool View" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Masthead */}
      <header className="mb-8">
        <div style={{ borderTop: '3px double var(--border-primary)', paddingTop: '8px', marginBottom: '4px' }} />
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '26px', fontWeight: 'normal', color: 'var(--text-primary)', marginBottom: '2px' }}>Trading Pool</h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
          AI-managed BTC futures · LNMarkets · Members only
        </p>
        <div style={{ borderTop: '1px solid var(--border-primary)', marginTop: '10px' }} />
      </header>

      {loading && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>Loading pool data…</p>}
      {error && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-danger)' }}>Error: {error}</p>}

      {pool && (
        <div className="flex gap-6 flex-wrap">
          {/* Left: Status bar + trade log */}
          <div style={{ flex: '2', minWidth: '300px' }}>
            {/* Status bar */}
            <div style={{ border: '1px solid var(--border-primary)', padding: '14px 16px', marginBottom: '16px', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                {[
                  { label: 'BALANCE', value: fmtSats(pool.balanceSats) },
                  { label: 'POSITION', value: pool.position, color: positionColor(pool.position) },
                  { label: 'UNREALISED P&L', value: pool.unrealisedPlSats !== 0 ? fmtSats(pool.unrealisedPlSats) : '—', color: pool.unrealisedPlSats >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: color || 'var(--text-primary)', fontWeight: 'bold' }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'TRADES', value: `${pool.wins}W/${pool.losses}L` },
                  { label: 'WIN RATE', value: `${pool.winRate}%`, color: pool.winRate >= 55 ? 'var(--accent-success)' : 'var(--accent-danger)' },
                  { label: 'LAST TRADE', value: pool.lastTradeDesc },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: color || 'var(--text-secondary)' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trade log */}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '8px' }}>
              RECENT TRADES
            </div>
            {pool.recentTrades.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>No trades recorded yet.</p>
            ) : (
              <div style={{ border: '1px solid var(--border-subtle)' }}>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: '60px 90px 90px 70px 80px 1fr', gap: '8px', padding: '6px 10px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
                  {['SIDE', 'ENTRY', 'EXIT', 'DURATION', 'P&L', 'RATIONALE'].map((h) => (
                    <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>{h}</span>
                  ))}
                </div>
                {pool.recentTrades.map((t, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 90px 90px 70px 80px 1fr', gap: '8px', padding: '6px 10px', borderBottom: i < pool.recentTrades.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.side === 'LONG' ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{t.side}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)' }}>${t.entryPrice.toLocaleString()}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)' }}>${t.exitPrice.toLocaleString()}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{t.duration}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.plSats >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', fontWeight: 'bold' }}>
                      {t.plSats >= 0 ? '+' : ''}{fmtSats(t.plSats)}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.rationale || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Bot signals */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '12px' }}>
              BOT SIGNALS — CURRENT ASSESSMENT
            </div>
            <SignalBar
              label="MACRO LAYER"
              value={7}
              bullets={[
                { text: 'DXY trend', signal: 'bullish' },
                { text: 'VIX level', signal: 'neutral' },
                { text: 'Oil price', signal: 'neutral' },
              ]}
            />
            <SignalBar
              label="ON-CHAIN LAYER"
              value={8}
              bullets={[
                { text: 'MVRV ratio', signal: 'bullish' },
                { text: 'LTH supply %', signal: 'bullish' },
                { text: 'Exchange flows', signal: 'bullish' },
              ]}
            />
            <SignalBar
              label="SENTIMENT LAYER"
              value={4}
              bullets={[
                { text: 'Fear & Greed', signal: 'neutral' },
                { text: 'Social volume', signal: 'bullish' },
              ]}
            />
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '4px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '4px' }}>COMPOSITE SIGNAL</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                {'██████░░'} {pool.position === 'FLAT' ? 'HOLD' : pool.position}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
