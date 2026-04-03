'use client';

import { useState, useEffect, useCallback } from 'react';
import QRCode from 'react-qr-code';
import { TIER_LABELS, TIER_PRICES, TIER_ORDER } from '@/lib/auth/tier';
import { useAuth } from '@/components/layout/AuthProvider';
import type { Tier } from '@/types';

const COUNTDOWN_SECONDS = 30 * 60; // 30 min invoice expiry
const POLL_INTERVAL_MS  = 5_000;

type Step = 'select' | 'payment' | 'success';

interface SubscriptionModalProps {
  initialTier?: Exclude<Tier, 'free'>;
  onClose: () => void;
  onSuccess?: (tier: Tier) => void;
}

export function SubscriptionModal({ initialTier = 'general', onClose, onSuccess }: SubscriptionModalProps) {
  const { refresh } = useAuth();
  const [step, setStep] = useState<Step>('select');
  const [selectedTier, setSelectedTier] = useState<Exclude<Tier, 'free'>>(initialTier);
  const [paymentRequest, setPaymentRequest] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const paidTiers = TIER_ORDER.filter((t): t is Exclude<Tier, 'free'> => t !== 'free');

  // ── Generate invoice ───────────────────────────────────────────────────────
  const generateInvoice = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payments/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedTier }),
      });
      if (!res.ok) throw new Error('Failed to generate invoice');
      const data = await res.json();
      setPaymentRequest(data.paymentRequest);
      setPaymentId(data.paymentId);
      setCountdown(COUNTDOWN_SECONDS);
      setStep('payment');
    } catch {
      setError('Could not generate invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedTier]);

  // ── Countdown timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'payment') return;
    if (countdown <= 0) { setError('Invoice expired. Please start again.'); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown]);

  // ── Poll for payment confirmation ──────────────────────────────────────────
  useEffect(() => {
    if (step !== 'payment' || !paymentId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/payments/status/${paymentId}`);
        if (!res.ok) return;
        const { status } = await res.json();
        if (status === 'confirmed') {
          await refresh();
          setStep('success');
          onSuccess?.(selectedTier);
        }
      } catch { /* silently retry */ }
    };

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [step, paymentId, selectedTier, refresh, onSuccess]);

  const mins = Math.floor(countdown / 60).toString().padStart(2, '0');
  const secs = (countdown % 60).toString().padStart(2, '0');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
          width: '360px', maxWidth: '95vw', padding: '24px',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '12px', letterSpacing: '0.12em', color: 'var(--text-primary)' }}>
            SUBSCRIPTION
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
          >
            ×
          </button>
        </div>

        {/* ── Step 1: Tier selection ───────────────────────────────────────── */}
        {step === 'select' && (
          <>
            <div style={{ marginBottom: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>
              Choose your tier:
            </div>
            {paidTiers.map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', padding: '10px 12px', marginBottom: '6px',
                  background: selectedTier === tier ? 'var(--bg-primary)' : 'transparent',
                  border: `1px solid ${selectedTier === tier ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  color: selectedTier === tier ? 'var(--accent-primary)' : 'var(--text-primary)',
                  cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12px',
                  letterSpacing: '0.05em',
                }}
              >
                <span>{TIER_LABELS[tier].toUpperCase()}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                  {TIER_PRICES[tier].toLocaleString()} sats/mo
                </span>
              </button>
            ))}
            {error && (
              <div style={{ fontSize: '11px', color: 'var(--accent-danger)', marginTop: '8px' }}>{error}</div>
            )}
            <button
              onClick={generateInvoice}
              disabled={loading}
              style={{
                width: '100%', marginTop: '16px', padding: '10px',
                background: 'var(--accent-primary)', color: 'var(--bg-primary)',
                border: 'none', cursor: loading ? 'wait' : 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '12px',
                letterSpacing: '0.1em', fontWeight: 'bold', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'GENERATING...' : 'GENERATE INVOICE ⚡'}
            </button>
          </>
        )}

        {/* ── Step 2: Payment QR ───────────────────────────────────────────── */}
        {step === 'payment' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {TIER_LABELS[selectedTier].toUpperCase()} — {TIER_PRICES[selectedTier].toLocaleString()} sats
              </div>
              <div style={{ fontSize: '11px', color: countdown < 120 ? 'var(--accent-danger)' : 'var(--text-muted)' }}>
                Expires in {mins}:{secs}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px', background: '#fff', marginBottom: '12px' }}>
              <QRCode value={paymentRequest} size={200} />
            </div>
            <div
              onClick={() => navigator.clipboard.writeText(paymentRequest)}
              style={{
                fontSize: '9px', color: 'var(--text-muted)', wordBreak: 'break-all',
                cursor: 'pointer', padding: '8px', background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
              }}
              title="Click to copy"
            >
              {paymentRequest.slice(0, 60)}…
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px' }}>
              Waiting for payment…
            </div>
            {error && (
              <div style={{ fontSize: '11px', color: 'var(--accent-danger)', marginTop: '8px', textAlign: 'center' }}>{error}</div>
            )}
            <button
              onClick={() => { setStep('select'); setError(''); }}
              style={{
                width: '100%', marginTop: '12px', padding: '8px',
                background: 'transparent', border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '11px',
              }}
            >
              ← BACK
            </button>
          </>
        )}

        {/* ── Step 3: Success ──────────────────────────────────────────────── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
            <div style={{ fontSize: '13px', color: 'var(--accent-primary)', letterSpacing: '0.1em', marginBottom: '4px' }}>
              {TIER_LABELS[selectedTier].toUpperCase()} ACTIVATED
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Welcome to Situation Room
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '8px 24px', background: 'var(--accent-primary)',
                color: 'var(--bg-primary)', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.1em',
              }}
            >
              CONTINUE →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
