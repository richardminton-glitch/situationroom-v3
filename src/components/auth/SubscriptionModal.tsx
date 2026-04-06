'use client';

import { useState, useEffect, useCallback } from 'react';
import QRCode from 'react-qr-code';
import { TIER_LABELS, TIER_COLORS, TIER_ORDER, TIER_BILLING } from '@/lib/auth/tier';
import { useAuth } from '@/components/layout/AuthProvider';
import { usePricing, formatSats, formatTierPrice } from '@/hooks/usePricing';
import type { Tier } from '@/types';

const COUNTDOWN_SECONDS = 30 * 60;
const POLL_INTERVAL_MS  = 5_000;

const OPS_LN_ADDRESS = process.env.NEXT_PUBLIC_OPS_LN_ADDRESS || '';

type Step = 'select' | 'payment' | 'success';

interface SubscriptionModalProps {
  initialTier?: Exclude<Tier, 'free'>;
  onClose: () => void;
  onSuccess?: (tier: Tier) => void;
}

export function SubscriptionModal({ initialTier = 'general', onClose, onSuccess }: SubscriptionModalProps) {
  const { refresh } = useAuth();
  const pricing = usePricing();
  const [step, setStep] = useState<Step>('select');
  const [selectedTier, setSelectedTier] = useState<Exclude<Tier, 'free'>>(initialTier);
  const [isTrial, setIsTrial] = useState(false);
  const [usedTrials, setUsedTrials] = useState<string[]>([]);
  const [paymentRequest, setPaymentRequest] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'invoice' | 'ln' | null>(null);

  const paidTiers = TIER_ORDER.filter((t): t is Exclude<Tier, 'free'> => t !== 'free');
  const allTrialsUsed = usedTrials.length >= 3 || paidTiers.every((t) => usedTrials.includes(t));

  // ── Fetch trial eligibility ────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/payments/trial-status')
      .then((r) => r.json())
      .then((data) => { if (data.usedTiers) setUsedTrials(data.usedTiers); })
      .catch(() => {});
  }, []);

  // ── Generate invoice ───────────────────────────────────────────────────────
  const generateInvoice = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const body = isTrial
        ? { tier: 'trial', targetTier: selectedTier }
        : { tier: selectedTier };
      const res = await fetch('/api/payments/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to generate invoice');
      }
      const data = await res.json();
      setPaymentRequest(data.paymentRequest);
      setPaymentId(data.paymentId);
      setCountdown(COUNTDOWN_SECONDS);
      setStep('payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedTier, isTrial]);

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

  // ── Escape key ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const copyText = async (text: string, type: 'invoice' | 'ln') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const mins = Math.floor(countdown / 60).toString().padStart(2, '0');
  const secs = (countdown % 60).toString().padStart(2, '0');

  const tierColor = TIER_COLORS[selectedTier] || 'var(--accent-primary)';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          width: '420px', maxWidth: '95vw',
          maxHeight: '90vh', overflowY: 'auto',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {/* Header */}
        <div style={{
          borderBottom: '1px solid var(--border-primary)',
          padding: '16px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '13px', letterSpacing: '0.12em', color: 'var(--text-primary)', fontWeight: 'bold' }}>
              SUBSCRIPTION
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', letterSpacing: '0.08em' }}>
              Lightning payment via LNMarkets
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
              fontSize: '18px', lineHeight: 1, padding: '4px',
            }}
          >
            x
          </button>
        </div>

        <div style={{ padding: '20px' }}>

          {/* ── Step 1: Tier selection ───────────────────────────────────── */}
          {step === 'select' && (
            <>
              <div style={{
                fontSize: '9px', letterSpacing: '0.12em',
                color: 'var(--text-muted)', marginBottom: '12px',
                textAlign: 'center',
              }}>
                SELECT YOUR TIER
              </div>

              {paidTiers.map((tier) => {
                const isSelected = selectedTier === tier && !isTrial;
                const priceLabel = pricing
                  ? formatTierPrice(tier, pricing)
                  : '...';
                return (
                  <button
                    key={tier}
                    onClick={() => { setSelectedTier(tier); setIsTrial(false); }}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      width: '100%', padding: '12px 14px', marginBottom: '6px',
                      background: isSelected ? 'var(--bg-primary)' : 'transparent',
                      border: `1px solid ${isSelected ? TIER_COLORS[tier] : 'var(--border-subtle)'}`,
                      color: isSelected ? TIER_COLORS[tier] : 'var(--text-primary)',
                      cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12px',
                      letterSpacing: '0.05em',
                    }}
                  >
                    <span style={{ fontWeight: isSelected ? 'bold' : 'normal' }}>
                      {TIER_LABELS[tier].toUpperCase()}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                      {priceLabel}
                    </span>
                  </button>
                );
              })}

              {/* Trial option */}
              {pricing && !allTrialsUsed && (
                <button
                  onClick={() => {
                    setIsTrial(true);
                    // Auto-select first available trial tier
                    const available = paidTiers.find((t) => !usedTrials.includes(t));
                    if (available) setSelectedTier(available);
                  }}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    width: '100%', padding: '12px 14px', marginBottom: '6px',
                    background: isTrial ? 'var(--bg-primary)' : 'transparent',
                    border: `1px solid ${isTrial ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    color: isTrial ? 'var(--accent-primary)' : 'var(--text-primary)',
                    cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12px',
                    letterSpacing: '0.05em',
                  }}
                >
                  <span style={{ fontWeight: isTrial ? 'bold' : 'normal' }}>
                    TRIAL
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                    {formatSats(pricing.trialSats)} sats / {pricing.trialDays} days
                  </span>
                </button>
              )}

              {isTrial && (
                <div style={{ marginTop: '4px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '6px', lineHeight: 1.6 }}>
                    Select tier to trial ({pricing?.trialDays ?? 7} days, once per tier)
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {paidTiers.map((t) => {
                      const used = usedTrials.includes(t);
                      const active = selectedTier === t && !used;
                      return (
                        <button
                          key={t}
                          onClick={() => !used && setSelectedTier(t)}
                          disabled={used}
                          style={{
                            flex: 1, padding: '6px 4px',
                            fontSize: '10px', fontFamily: 'var(--font-mono)',
                            letterSpacing: '0.04em',
                            background: active ? 'var(--bg-primary)' : 'transparent',
                            border: `1px solid ${active ? TIER_COLORS[t] : used ? 'var(--border-subtle)' : 'var(--border-subtle)'}`,
                            color: used ? 'var(--text-muted)' : active ? TIER_COLORS[t] : 'var(--text-secondary)',
                            cursor: used ? 'not-allowed' : 'pointer',
                            opacity: used ? 0.5 : 1,
                            textDecoration: used ? 'line-through' : 'none',
                          }}
                        >
                          {TIER_LABELS[t].toUpperCase()}
                          {used && ' \u2713'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {error && (
                <div style={{ fontSize: '11px', color: 'var(--accent-danger, #b84040)', marginTop: '8px', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              <button
                onClick={generateInvoice}
                disabled={loading || !pricing}
                style={{
                  width: '100%', marginTop: '16px', padding: '12px',
                  background: 'var(--accent-primary)', color: 'var(--bg-primary)',
                  border: 'none', cursor: (loading || !pricing) ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: '12px',
                  letterSpacing: '0.1em', fontWeight: 'bold',
                  opacity: (loading || !pricing) ? 0.6 : 1,
                }}
              >
                {loading ? 'GENERATING...' : 'GENERATE INVOICE'}
              </button>
            </>
          )}

          {/* ── Step 2: Payment QR ───────────────────────────────────────── */}
          {step === 'payment' && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '12px',
              }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.12em', color: 'var(--text-muted)' }}>
                  SCAN TO PAY
                </div>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '9px',
                  color: tierColor,
                  border: `1px solid ${tierColor}`,
                  borderRadius: '3px', padding: '1px 5px',
                  letterSpacing: '0.06em',
                }}>
                  {TIER_LABELS[selectedTier].toUpperCase()}
                </span>
              </div>

              <div style={{
                textAlign: 'center', marginBottom: '10px',
                fontSize: '13px', color: 'var(--text-primary)', fontWeight: 'bold',
                letterSpacing: '0.05em',
              }}>
                {isTrial && pricing
                  ? `${formatSats(pricing.trialSats)} sats`
                  : pricing
                    ? `${formatSats(pricing.tierPricesSats[selectedTier])} sats`
                    : '...'}
              </div>

              <div style={{
                display: 'flex', justifyContent: 'center',
                padding: '16px', background: '#ffffff',
                marginBottom: '10px',
              }}>
                <QRCode value={paymentRequest} size={220} />
              </div>

              {/* Invoice string — click to copy */}
              <div
                onClick={() => copyText(paymentRequest, 'invoice')}
                style={{
                  fontSize: '9px', color: 'var(--text-muted)',
                  wordBreak: 'break-all', cursor: 'pointer',
                  padding: '8px', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  textAlign: 'center',
                }}
                title="Click to copy invoice"
              >
                {copied === 'invoice' ? (
                  <span style={{ color: 'var(--accent-primary)' }}>COPIED TO CLIPBOARD</span>
                ) : (
                  <>
                    <span>{paymentRequest.slice(0, 40)}...</span>
                    <span style={{ marginLeft: '6px', color: 'var(--accent-primary)' }}>COPY</span>
                  </>
                )}
              </div>

              {/* Lightning address */}
              {OPS_LN_ADDRESS && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    marginBottom: '12px',
                  }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                      LIGHTNING ADDRESS
                    </span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                  </div>

                  <div
                    onClick={() => copyText(OPS_LN_ADDRESS, 'ln')}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '8px', padding: '10px 12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                    title="Click to copy"
                  >
                    <span style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                      {OPS_LN_ADDRESS}
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                      {copied === 'ln' ? 'COPIED' : 'COPY'}
                    </span>
                  </div>
                </div>
              )}

              {/* Expiry + waiting */}
              <div style={{
                fontSize: '9px', color: 'var(--text-muted)',
                textAlign: 'center', marginTop: '12px', lineHeight: 1.5,
              }}>
                Waiting for payment&hellip;
              </div>
              <div style={{
                fontSize: '9px',
                color: countdown < 120 ? 'var(--accent-danger, #b84040)' : 'var(--text-muted)',
                textAlign: 'center', marginTop: '4px',
              }}>
                Invoice expires in {mins}:{secs}
              </div>

              {error && (
                <div style={{
                  fontSize: '11px', color: 'var(--accent-danger, #b84040)',
                  marginTop: '8px', textAlign: 'center',
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={() => { setStep('select'); setError(''); }}
                style={{
                  width: '100%', marginTop: '14px', padding: '8px',
                  background: 'transparent', border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                  letterSpacing: '0.05em',
                }}
              >
                BACK
              </button>
            </>
          )}

          {/* ── Step 3: Success ──────────────────────────────────────────── */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>&#9889;</div>
              <div style={{
                fontSize: '14px', color: tierColor,
                letterSpacing: '0.12em', marginBottom: '6px', fontWeight: 'bold',
              }}>
                {TIER_LABELS[selectedTier].toUpperCase()} {isTrial ? 'TRIAL' : ''} ACTIVATED
              </div>
              <div style={{
                fontSize: '11px', color: 'var(--text-muted)',
                marginBottom: '24px', lineHeight: 1.6,
              }}>
                Payment received.<br />
                {isTrial
                  ? `${pricing?.trialDays ?? 7}-day trial started.`
                  : TIER_BILLING[selectedTier] === 'lifetime'
                    ? 'Lifetime access unlocked.'
                    : '30-day subscription activated.'}
                <br />
                Welcome to Situation Room.
              </div>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 32px',
                  background: 'var(--accent-primary)', color: 'var(--bg-primary)',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: '12px',
                  letterSpacing: '0.1em', fontWeight: 'bold',
                }}
              >
                CONTINUE
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
