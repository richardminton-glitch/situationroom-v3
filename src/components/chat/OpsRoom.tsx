'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { useTier } from '@/hooks/useTier';

interface ChatMessage {
  id: string;
  authorNpub: string;
  authorDisplay: string;
  authorIcon: 'lightning' | 'email' | 'bot';
  content: string;
  isBot: boolean;
  eventType: string | null;
  createdAt: string;
}

const ICON: Record<string, string> = {
  lightning: '⚡',
  email:     '✉',
  bot:       '🤖',
};

function relativeTime(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

interface OpsRoomProps {
  open: boolean;
  onClose: () => void;
}

export function OpsRoom({ open, onClose }: OpsRoomProps) {
  const { user } = useAuth();
  const { canAccess } = useTier();
  const canPost = canAccess('members');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const [msgRes, viewerRes] = await Promise.all([
        fetch('/api/chat/messages?limit=50'),
        fetch('/api/viewers'),
      ]);
      if (msgRes.ok) setMessages(await msgRes.json());
      if (viewerRes.ok) {
        const { members } = await viewerRes.json();
        setOnlineCount(members ?? 0);
      }
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 5000); // poll every 5s
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [open, fetchMessages]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, data]);
        setInput('');
      } else {
        setError(data.error || 'Failed to send');
      }
    } catch {
      setError('Network error');
    }
    setSending(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const hasNativeNostr = !!user?.nostrNpub;
  const displayName = user?.chatDisplayName || 'anon';
  const icon = (user?.chatIcon as 'lightning' | 'email' | 'bot') || 'email';

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '320px', zIndex: 50,
        backgroundColor: 'var(--bg-primary)',
        borderLeft: '1px solid var(--border-primary)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <div>
          <span style={{ fontSize: '10px', letterSpacing: '0.18em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            OPS CHAT
          </span>
          <span style={{ fontSize: '9px', color: 'var(--accent-success)', marginLeft: '8px' }}>
            ● {onlineCount} online
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ fontSize: '16px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {messages.length === 0 && (
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
            No messages yet.
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              padding: '6px 14px',
              backgroundColor: msg.isBot ? 'var(--bg-secondary)' : 'transparent',
              borderLeft: msg.isBot ? '2px solid var(--accent-primary)' : '2px solid transparent',
              marginBottom: '2px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '2px' }}>
              <span style={{ fontSize: '10px', color: msg.isBot ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                {ICON[msg.authorIcon] ?? '?'} {msg.authorDisplay}
              </span>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                · {relativeTime(msg.createdAt)}
                {msg.isBot && msg.eventType && (
                  <span style={{ marginLeft: '4px', opacity: 0.6 }}>AUTO</span>
                )}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {msg.content}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        {canPost ? (
          <>
            {/* Posting as label */}
            <div style={{ padding: '6px 14px 0', fontSize: '9px', color: 'var(--text-muted)' }}>
              Posting as {ICON[icon]} {displayName}
            </div>

            {/* Input */}
            <div style={{ padding: '6px 14px 10px', display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Message…"
                maxLength={500}
                rows={2}
                disabled={sending}
                style={{
                  flex: 1, resize: 'none', padding: '6px 8px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: 1.4,
                  outline: 'none',
                }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                style={{
                  padding: '6px 10px', fontSize: '10px', letterSpacing: '0.08em',
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--bg-primary)',
                  border: 'none', cursor: 'pointer',
                  opacity: (!input.trim() || sending) ? 0.4 : 1,
                }}
              >
                SEND ↑
              </button>
            </div>

            {error && (
              <p style={{ padding: '0 14px 6px', fontSize: '9px', color: 'var(--accent-danger)' }}>{error}</p>
            )}

            {/* Nostr upgrade nudge for email/assigned users */}
            {!hasNativeNostr && (
              <div style={{ padding: '4px 14px 8px', fontSize: '9px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)' }}>
                <a href="/settings?tab=identity" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                  Link your Nostr key
                </a>{' '}→ get ⚡
              </div>
            )}
          </>
        ) : (
          /* Read-only prompt */
          <div style={{ padding: '12px 14px', textAlign: 'center' }}>
            <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.5 }}>
              {user ? 'Members can post in Ops Room.' : 'Sign in to see posting options.'}
            </p>
            <a
              href="/support"
              style={{
                display: 'inline-block', padding: '5px 14px', fontSize: '9px', letterSpacing: '0.1em',
                backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', textDecoration: 'none',
              }}
            >
              SUBSCRIBE ⚡ MEMBERS
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
