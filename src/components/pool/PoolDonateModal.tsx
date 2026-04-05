'use client';

import { useState, useEffect, useCallback } from 'react';
import QRCode from 'react-qr-code';

const PRESETS = [1_000, 5_000, 10_000, 21_000, 50_000, 100_000];
const COUNTDOWN_SECONDS = 30 * 60;
const POLL_INTERVAL_MS = 5_000;
const POOL_LN_ADDRESS = process.env.NEXT_PUBLIC_POOL_LN_ADDRESS || '';

type Step = 'choose' | 'invoice' | 'success';

interface Props {
  onClose: () => void;
}

function fmtSats(n: number): string {
  return n.toLocaleString();
}

export function PoolDonateModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>('choose');
  const [amount, setAmount] = useState(10_000);
  const [customInput, setCustomInput] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'ln' | 'invoice' | null>(null);

  const effectiveAmount = isCustom ? (parseInt(customInput, 10) || 0) : amount;

  const generateInvoice = useCallback(async () => {
    if (effectiveAmount < 100) { setError('Minimum 100 sats'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/pool/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountSats: effectiveAmount }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate invoice');
      }
      const data = await res.json();
      setPaymentRequest(data.paymentRequest);
      setPaymentId(data.paymentId);
      setCountdown(COUNTDOWN_SECONDS);
      setStep('invoice');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate invoice');
    } finally {
      setLoading(false);
    }
  }, [effectiveAmount]);

  // Countdown
  useEffect(() => {
    if (step !== 'invoice') return;
    if (countdown <= 0) { setError('Invoice expired. Go back and try again.'); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown]);

  // Poll for confirmation
  useEffect(() => {
    if (step !== 'invoice' || !paymentId) return;
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

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const copyText = async (text: string, type: 'ln' | 'invoice') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const mins = Math.floor(countdown / 60).toString().padStart(2, '0');
  const secs = (countdown % 60).toString().padStart(2, '0');

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
              FUND THE POOL
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', letterSpacing: '0.08em' }}>
              Donate sats to the AI trading pool
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
          {/* ── Step 1: Choose method ── */}
          {step === 'choose' && (
            <>
              {/* Lightning Address section */}
              {POOL_LN_ADDRESS && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    fontSize: '9px', letterSpacing: '0.12em',
                    color: 'var(--text-muted)', marginBottom: '10px',
                  }}>
                    LIGHTNING ADDRESS
                  </div>

                  <div style={{
                    display: 'flex', justifyContent: 'center',
                    padding: '16px', background: '#ffffff',
                    marginBottom: '10px',
                  }}>
                    <QRCode value={`lightning:${POOL_LN_ADDRESS}`} size={180} />
                  </div>

                  <div
                    onClick={() => copyText(POOL_LN_ADDRESS, 'ln')}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '8px', padding: '8px 12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                    title="Click to copy"
                  >
                    <span style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                      {POOL_LN_ADDRESS}
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                      {copied === 'ln' ? 'COPIED' : 'COPY'}
                    </span>
                  </div>

                  <div style={{
                    fontSize: '9px', color: 'var(--text-muted)',
                    textAlign: 'center', marginTop: '8px', lineHeight: 1.5,
                  }}>
                    Send any amount directly to this address from any Lightning wallet
                  </div>
                </div>
              )}

              {/* Divider */}
              {POOL_LN_ADDRESS && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  margin: '20px 0',
                }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                    OR GENERATE AN INVOICE
                  </span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                </div>
              )}

              {/* Amount selection */}
              <div style={{
                fontSize: '9px', letterSpacing: '0.12em',
                color: 'var(--text-muted)', marginBottom: '10px',
              }}>
                {POOL_LN_ADDRESS ? 'SPECIFIC AMOUNT' : 'CHOOSE AMOUNT'}
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                gap: '6px', marginBottom: '12px',
              }}>
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
                    {fmtSats(preset)}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Custom amount"
                  value={customInput}
                  onChange={(e) => {
                    setCustomInput(e.target.value.replace(/\D/g, ''));
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
                disabled={loading || effectiveAmount < 100}
                style={{
                  width: '100%', padding: '10px',
                  background: 'var(--accent-primary)', color: 'var(--bg-primary)',
                  border: 'none',
                  cursor: loading || effectiveAmount < 100 ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: '12px',
                  letterSpacing: '0.1em', fontWeight: 'bold',
                  opacity: loading || effectiveAmount < 100 ? 0.5 : 1,
                }}
              >
                {loading ? 'GENERATING...' : `GENERATE INVOICE — ${fmtSats(effectiveAmount)} SATS`}
              </button>
            </>
          )}

          {/* ── Step 2: Invoice QR ── */}
          {step === 'invoice' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 'bold', marginBottom: '4px' }}>
                  {fmtSats(effectiveAmount)} sats
                </div>
                <div style={{ fontSize: '11px', color: countdown < 120 ? 'var(--accent-danger)' : 'var(--text-muted)' }}>
                  Expires in {mins}:{secs}
                </div>
              </div>

              <div style={{
                display: 'flex', justifyContent: 'center',
                padding: '16px', background: '#ffffff',
                marginBottom: '12px',
              }}>
                <QRCode value={paymentRequest} size={220} />
              </div>

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
                  paymentRequest.slice(0, 60) + '...'
                )}
              </div>

              <div style={{
                fontSize: '11px', color: 'var(--text-muted)',
                textAlign: 'center', marginTop: '12px',
              }}>
                Waiting for payment...
              </div>

              {error && (
                <div style={{ fontSize: '11px', color: 'var(--accent-danger)', marginTop: '8px', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              <button
                onClick={() => { setStep('choose'); setError(''); }}
                style={{
                  width: '100%', marginTop: '12px', padding: '8px',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                }}
              >
                BACK
              </button>
            </>
          )}

          {/* ── Step 3: Success ── */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>&#9889;</div>
              <div style={{
                fontSize: '14px', color: 'var(--accent-primary)',
                letterSpacing: '0.12em', marginBottom: '6px', fontWeight: 'bold',
              }}>
                POOL FUNDED
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
                {fmtSats(effectiveAmount)} sats added to the trading pool.<br />
                Your contribution fuels the AI engine.
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
                CLOSE
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
