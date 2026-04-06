'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';

const POLL_INTERVAL_MS = 10_000;

const OPS_LNURL = process.env.NEXT_PUBLIC_OPS_LNURL || '';
const OPS_LN_ADDRESS = process.env.NEXT_PUBLIC_OPS_LN_ADDRESS || '';

interface DonationModalProps {
  onClose: () => void;
}

function fmtSats(n: number): string {
  return n.toLocaleString();
}

export function DonationModal({ onClose }: DonationModalProps) {
  const [received, setReceived] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [copied, setCopied] = useState<'lnurl' | 'ln' | null>(null);
  const openedAt = useRef(new Date().toISOString());

  // Poll for new deposits on ops account (detects LNURL payments)
  useEffect(() => {
    if (received) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/payments/deposit-check?since=${encodeURIComponent(openedAt.current)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.found) {
          setReceivedAmount(data.amount ?? 0);
          setReceived(true);
        }
      } catch { /* retry */ }
    };

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [received]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const copyText = async (text: string, type: 'lnurl' | 'ln') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

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
              DONATE SATS
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', letterSpacing: '0.08em' }}>
              Support Situation Room independence
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

          {/* ── Deposit received ── */}
          {received ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>&#9889;</div>
              <div style={{
                fontSize: '14px', color: 'var(--accent-primary)',
                letterSpacing: '0.12em', marginBottom: '6px', fontWeight: 'bold',
              }}>
                DONATION RECEIVED
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
                {receivedAmount > 0 ? (
                  <>{fmtSats(receivedAmount)} sats received.<br /></>
                ) : (
                  <>Sats received.<br /></>
                )}
                You keep us independent. Thank you.
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
          ) : (
            <>
              {/* LNURL QR code */}
              {OPS_LNURL && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    fontSize: '9px', letterSpacing: '0.12em',
                    color: 'var(--text-muted)', marginBottom: '10px',
                    textAlign: 'center',
                  }}>
                    SCAN TO DONATE
                  </div>

                  <div style={{
                    display: 'flex', justifyContent: 'center',
                    padding: '16px', background: '#ffffff',
                    marginBottom: '10px',
                  }}>
                    <QRCode value={OPS_LNURL.toUpperCase()} size={220} />
                  </div>

                  <div
                    onClick={() => copyText(OPS_LNURL, 'lnurl')}
                    style={{
                      fontSize: '9px', color: 'var(--text-muted)',
                      wordBreak: 'break-all', cursor: 'pointer',
                      padding: '8px', background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      textAlign: 'center',
                    }}
                    title="Click to copy LNURL"
                  >
                    {copied === 'lnurl' ? (
                      <span style={{ color: 'var(--accent-primary)' }}>COPIED TO CLIPBOARD</span>
                    ) : (
                      <>
                        <span>{OPS_LNURL.slice(0, 40)}...</span>
                        <span style={{ marginLeft: '6px', color: 'var(--accent-primary)' }}>COPY</span>
                      </>
                    )}
                  </div>

                  <div style={{
                    fontSize: '9px', color: 'var(--text-muted)',
                    textAlign: 'center', marginTop: '8px', lineHeight: 1.5,
                  }}>
                    Scan with any Lightning wallet &mdash; choose your amount in-app
                  </div>
                </div>
              )}

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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
