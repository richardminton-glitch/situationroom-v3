'use client';

import { useState, useEffect } from 'react';

interface FeedbackModalProps {
  onClose: () => void;
}

const MAX_TOPIC_LEN = 120;
const MAX_ISSUE_LEN = 5000;

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const [topic,   setTopic]   = useState('');
  const [issue,   setIssue]   = useState('');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // ── Dismiss on Escape ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sending) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, sending]);

  // ── Auto-close after successful send ─────────────────────────────────────
  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(() => onClose(), 2000);
    return () => clearTimeout(t);
  }, [sent, onClose]);

  const canSubmit = topic.trim().length > 0 && issue.trim().length > 0 && !sending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setSending(true);
    try {
      const res = await fetch('/api/feedback', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ topic: topic.trim(), issue: issue.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? `Send failed (${res.status})`);
        setSending(false);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
      setSending(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !sending) onClose(); }}
    >
      <div
        style={{
          background:   'var(--bg-card)',
          border:       '1px solid var(--border-primary)',
          width:        '480px',
          maxWidth:     '95vw',
          maxHeight:    '90vh',
          overflowY:    'auto',
          fontFamily:   'var(--font-mono)',
        }}
      >
        {/* Header */}
        <div style={{
          borderBottom: '1px solid var(--border-primary)',
          padding:      '16px 20px',
          display:      'flex',
          justifyContent: 'space-between',
          alignItems:   'center',
        }}>
          <div>
            <div style={{
              fontSize: '13px', letterSpacing: '0.12em',
              color: 'var(--text-primary)', fontWeight: 'bold',
            }}>
              SEND FEEDBACK
            </div>
            <div style={{
              fontSize: '9px', color: 'var(--text-muted)',
              marginTop: '2px', letterSpacing: '0.08em',
            }}>
              Goes straight to Rich
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-muted)',
              cursor: sending ? 'not-allowed' : 'pointer',
              fontSize: '18px', lineHeight: 1, padding: '4px',
              opacity: sending ? 0.4 : 1,
            }}
            aria-label="Close"
          >
            x
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                fontSize: '14px', color: 'var(--accent-primary)',
                letterSpacing: '0.12em', marginBottom: '8px', fontWeight: 'bold',
              }}>
                FEEDBACK SENT
              </div>
              <div style={{
                fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6,
              }}>
                Thanks &mdash; Rich will read it.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Topic */}
              <label
                style={{
                  display: 'block',
                  fontSize: '9px', letterSpacing: '0.12em',
                  color: 'var(--text-muted)', marginBottom: '6px',
                }}
              >
                TOPIC
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={MAX_TOPIC_LEN}
                autoFocus
                disabled={sending}
                placeholder="e.g. Chart is broken, feature idea, typo…"
                className="w-full px-2 py-2 text-xs rounded"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  color:           'var(--text-primary)',
                  border:          '1px solid var(--border-subtle)',
                  outline:         'none',
                  fontFamily:      'inherit',
                  marginBottom:    '16px',
                }}
              />

              {/* Issue */}
              <label
                style={{
                  display: 'block',
                  fontSize: '9px', letterSpacing: '0.12em',
                  color: 'var(--text-muted)', marginBottom: '6px',
                }}
              >
                MESSAGE
              </label>
              <textarea
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                maxLength={MAX_ISSUE_LEN}
                rows={8}
                disabled={sending}
                placeholder="What happened? What did you expect? Any steps to reproduce?"
                className="w-full px-2 py-2 text-xs rounded"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  color:           'var(--text-primary)',
                  border:          '1px solid var(--border-subtle)',
                  outline:         'none',
                  fontFamily:      'inherit',
                  resize:          'vertical',
                  marginBottom:    '4px',
                }}
              />
              <div style={{
                fontSize: '9px', color: 'var(--text-muted)',
                textAlign: 'right', marginBottom: '16px',
              }}>
                {issue.length} / {MAX_ISSUE_LEN}
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  fontSize: '11px', color: '#c44',
                  marginBottom: '12px', padding: '8px 10px',
                  border: '1px solid rgba(204,68,68,0.3)',
                  background: 'rgba(204,68,68,0.06)',
                }}>
                  {error}
                </div>
              )}

              {/* Actions */}
              <div style={{
                display: 'flex', gap: '8px', justifyContent: 'flex-end',
                borderTop: '1px solid var(--border-subtle)', paddingTop: '16px',
              }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={sending}
                  style={{
                    padding: '8px 20px',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    cursor: sending ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: '11px',
                    letterSpacing: '0.1em', fontWeight: 'bold',
                    textTransform: 'uppercase',
                    opacity: sending ? 0.4 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  style={{
                    padding: '8px 20px',
                    background: canSubmit ? 'var(--accent-primary)' : 'var(--bg-card)',
                    color: canSubmit ? 'var(--bg-primary)' : 'var(--text-muted)',
                    border: '1px solid var(--accent-primary)',
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                    fontFamily: 'var(--font-mono)', fontSize: '11px',
                    letterSpacing: '0.1em', fontWeight: 'bold',
                    textTransform: 'uppercase',
                    opacity: canSubmit ? 1 : 0.6,
                  }}
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
