'use client';

import { useState, useEffect, useCallback } from 'react';
import QRCode from 'react-qr-code';
import { useAuth } from '@/components/layout/AuthProvider';

const PRESETS = [1_000, 5_000, 10_000, 21_000, 50_000, 100_000];
const COUNTDOWN_SECONDS = 30 * 60;
const POLL_INTERVAL_MS = 5_000;

type Step = 'amount' | 'payment' | 'success';

interface DonationModalProps {
  onClose: () => void;
}

function formatSats(n: number): string {
  return n.toLocaleString();
}

export function DonationModal({ onClose }: DonationModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState(10_000);
  const [customInput, setCustomInput] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const effectiveAmount = isCustom ? (parseInt(customInput, 10) || 0) : amount;

  const generateInvoice = useCallback(async () => {
    if (effectiveAmount < 100) {
      setError('Minimum donation is 100 sats');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payments/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'donation', amountSats: effectiveAmount }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate invoice');
      }
      const data = await res.json();
      setPaymentRequest(data.paymentRequest);
      setPaymentId(data.paymentId);
      setCountdown(COUNTDOWN_SECONDS);
      setStep('payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate invoice');
    } finally {
      setLoading(false);
    }
  }, [effectiveAmount]);

  // Countdown
  useEffect(() => {
    if (step !== 'payment') return;
    if (countdown <= 0) { setError('Invoice expired. Please start again.'); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown]);

  // Poll for confirmation
  useEffect(() => {
    if (step !== 'payment' || !paymentId) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/payments/status/${paymentId}`);
        if (!res.ok) return;
        const { status } = await res.json();
        if (status === 'confirmed') setStep('success');
      } catch { /* retry */ }
    };
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [step, paymentId]);

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
            DONATE SATS
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
          >
            ×
          </button>
        </div>

        {/* Step 1: Amount selection */}
        {step === 'amount' && (
          <>
            {!user && (
              <div style={{ fontSize: '11px', color: 'var(--accent-danger)', marginBottom: '12px', padding: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)' }}>
                You need to <a href="/login" style={{ color: 'var(--accent-primary)' }}>sign in</a> first to generate a Lightning invoice.
              </div>
            )}

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Choose an amount or enter your own:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '12px' }}>
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => { setAmount(preset); setIsCustom(false); }}
                  style={{
                    padding: '8px 4px',
                    background: !isCustom && amount === preset ? 'var(--bg-primary)' : 'transparent',
                    border: `1px solid ${!isCustom && amount === preset ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    color: !isCustom && amount === preset ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '11px',
                  }}
                >
                  {formatSats(preset)}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Custom amount"
                value={customInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setCustomInput(val);
                  setIsCustom(true);
                }}
                onFocus={() => setIsCustom(true)}
                style={{
                  flex: 1, padding: '8px 10px',
                  background: 'var(--bg-primary)',
                  border: `1px solid ${isCustom ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>sats</span>
            </div>

            {error && (
              <div style={{ fontSize: '11px', color: 'var(--accent-danger)', marginBottom: '8px' }}>{error}</div>
            )}

            <button
              onClick={generateInvoice}
              disabled={loading || !user || effectiveAmount < 100}
              style={{
                width: '100%', padding: '10px',
                background: 'var(--accent-primary)', color: 'var(--bg-primary)',
                border: 'none', cursor: loading || !user ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '12px',
                letterSpacing: '0.1em', fontWeight: 'bold',
                opacity: loading || !user || effectiveAmount < 100 ? 0.5 : 1,
              }}
            >
              {loading ? 'GENERATING...' : `DONATE ${formatSats(effectiveAmount)} SATS ⚡`}
            </button>
          </>
        )}

        {/* Step 2: Payment QR */}
        {step === 'payment' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {formatSats(effectiveAmount)} sats
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
              onClick={() => { setStep('amount'); setError(''); }}
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

        {/* Step 3: Success */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
            <div style={{ fontSize: '13px', color: 'var(--accent-primary)', letterSpacing: '0.1em', marginBottom: '4px' }}>
              THANK YOU
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              {formatSats(effectiveAmount)} sats received. You keep us independent.
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '8px 24px', background: 'var(--accent-primary)',
                color: 'var(--bg-primary)', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.1em',
              }}
            >
              CLOSE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
