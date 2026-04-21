'use client';

import { useState } from 'react';
import { X, Copy, Check } from '@phosphor-icons/react';
import { useSharedDashboard, shareUrl, type ShareSlot } from '@/hooks/useSharedDashboard';
import type { Theme } from '@/types';

interface Props {
  layoutId: string;
  dashboardName: string;
  onClose: () => void;
}

/**
 * ShareDashboardModal — VIP-facing share management for a single custom
 * dashboard. Up to 5 invitee slots, each with a label + optional email. Each
 * slot issues a unique tokenised /shared/<token> URL that the VIP copies and
 * distributes themselves.
 */
export function ShareDashboardModal({ layoutId, dashboardName, onClose }: Props) {
  const { max, slots, loading, canCreate, create, revoke } = useSharedDashboard(layoutId);
  const [label, setLabel] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [theme, setTheme] = useState<Theme>('parchment');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = label.trim();
    if (!trimmed) {
      setError('Label is required (e.g. "Mum", "Dad", "Alex")');
      return;
    }
    setCreating(true);
    const result = await create(trimmed, theme, inviteEmail.trim() || undefined);
    setCreating(false);
    if (result.ok) {
      setLabel('');
      setInviteEmail('');
    } else if (result.conflict) {
      setError(
        'You already have active shares on a different dashboard. Revoke those first before sharing this one.'
      );
    } else {
      setError(result.error);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflow: 'auto',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.16em',
                color: 'var(--text-muted)',
                marginBottom: 2,
              }}
            >
              SHARE DASHBOARD
            </div>
            <div
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 18,
                color: 'var(--text-primary)',
              }}
            >
              {dashboardName}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              fontFamily: 'var(--font-mono)',
            }}
          >
            Invite up to {max} friends or family. Each one gets a unique read-only
            link. If they sign up for a free account, they keep access as long as
            you remain on the VIP tier.
          </p>

          {/* Slot list */}
          <div className="space-y-2">
            {loading && slots.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Loading…
              </div>
            )}
            {slots.map((slot) => (
              <SlotRow key={slot.id} slot={slot} onRevoke={() => revoke(slot.id)} />
            ))}
            {!loading && slots.length === 0 && (
              <div
                style={{
                  padding: '12px 0',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'center',
                }}
              >
                No active invites yet.
              </div>
            )}
          </div>

          {/* Create form */}
          {canCreate ? (
            <form
              onSubmit={handleCreate}
              className="pt-4 border-t"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  color: 'var(--text-muted)',
                  marginBottom: 8,
                }}
              >
                NEW INVITE ({slots.length}/{max})
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Label (e.g. Mum)"
                  maxLength={60}
                  style={{
                    padding: '8px 10px',
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    outline: 'none',
                  }}
                  autoFocus
                />
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Email (optional, for your records)"
                  type="email"
                  style={{
                    padding: '8px 10px',
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    outline: 'none',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    color: 'var(--text-muted)',
                  }}
                >
                  THEME
                </span>
                <div
                  role="radiogroup"
                  aria-label="Share theme"
                  style={{
                    display: 'inline-flex',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {(['parchment', 'dark'] as const).map((t) => {
                    const active = theme === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setTheme(t)}
                        style={{
                          padding: '5px 12px',
                          fontSize: 10,
                          letterSpacing: '0.1em',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: active ? 700 : 400,
                          backgroundColor: active ? 'var(--accent-primary)' : 'transparent',
                          color: active ? 'var(--bg-primary)' : 'var(--text-secondary)',
                          border: 'none',
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
              {error && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--accent-danger)',
                    fontFamily: 'var(--font-mono)',
                    marginBottom: 8,
                  }}
                >
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={creating}
                style={{
                  padding: '8px 20px',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--bg-primary)',
                  border: 'none',
                  cursor: creating ? 'default' : 'pointer',
                  opacity: creating ? 0.6 : 1,
                }}
              >
                {creating ? 'CREATING…' : 'CREATE INVITE LINK'}
              </button>
            </form>
          ) : (
            <div
              className="pt-4 border-t"
              style={{
                borderColor: 'var(--border-subtle)',
                fontSize: 11,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                textAlign: 'center',
              }}
            >
              All {max} slots in use — revoke one to create a new invite.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SlotRow({ slot, onRevoke }: { slot: ShareSlot; onRevoke: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = shareUrl(slot.token);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // If clipboard API fails (older browsers, non-secure context) fall back
      // to a prompt so the VIP can still grab the link manually.
      window.prompt('Copy this link:', url);
    }
  }

  const bound = slot.boundUserId !== null;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2"
      style={{
        border: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      <div className="flex-1 min-w-0">
        <div
          className="flex items-baseline gap-2"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--text-primary)',
          }}
        >
          <span className="truncate">{slot.label || '(no label)'}</span>
          <span
            style={{
              fontSize: 9,
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              padding: '1px 6px',
              border: '1px solid var(--border-subtle)',
            }}
            title={`Viewer sees this dashboard in ${slot.theme} mode`}
          >
            {slot.theme}
          </span>
          {bound && (
            <span
              style={{
                fontSize: 9,
                letterSpacing: '0.08em',
                color: 'var(--accent-primary)',
                textTransform: 'uppercase',
              }}
              title="This invitee has signed up and claimed this slot"
            >
              · claimed
            </span>
          )}
        </div>
        {slot.inviteEmail && (
          <div
            className="truncate"
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              marginTop: 2,
            }}
          >
            {slot.inviteEmail}
          </div>
        )}
      </div>
      <button
        onClick={copyLink}
        title={copied ? 'Copied!' : 'Copy invite link'}
        style={{
          padding: '6px 10px',
          fontSize: 10,
          letterSpacing: '0.08em',
          fontFamily: 'var(--font-mono)',
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-subtle)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {copied ? <Check size={11} weight="bold" /> : <Copy size={11} />}
        {copied ? 'COPIED' : 'COPY'}
      </button>
      <button
        onClick={onRevoke}
        title="Revoke this invite"
        style={{
          padding: '6px 10px',
          fontSize: 10,
          letterSpacing: '0.08em',
          fontFamily: 'var(--font-mono)',
          backgroundColor: 'transparent',
          color: 'var(--text-muted)',
          border: '1px solid var(--border-subtle)',
          cursor: 'pointer',
        }}
      >
        REVOKE
      </button>
    </div>
  );
}
