'use client';

/**
 * Nostr chat slot — wraps the existing OperatorChannel in the
 * members room v2 layout. This is a layout adapter, not a rewrite.
 * The chat component is treated as a black box.
 */

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import Link from 'next/link';
import type { ChatMessage } from '@/hooks/useOpsRoom';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

const ICON_MAP: Record<string, string> = {
  lightning: '\u26A1',
  email: '\u2709',
  bot: '\uD83E\uDD16',
};

interface NostrChatSlotProps {
  messages: ChatMessage[];
  operatorCount: number;
  onSend: (content: string) => Promise<boolean>;
  canPost: boolean;
  userDisplayName: string;
  userIcon: string;
}

export default function NostrChatSlot({
  messages,
  operatorCount,
  onSend,
  canPost,
  userDisplayName,
  userIcon,
}: NostrChatSlotProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const resolvedIcon = ICON_MAP[userIcon] || '\u26A1';

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSubmit = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      const ok = await onSend(draft.trim());
      if (ok) setDraft('');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(9, 13, 18, 0.75)',
        backdropFilter: 'blur(6px)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '6px 12px',
          fontSize: 9,
          fontFamily: FONT,
          letterSpacing: '0.14em',
          color: '#6b7a8d',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>OPERATOR CHANNEL</span>
        <span>{operatorCount} online</span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="chat-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 10px',
          fontFamily: FONT,
          fontSize: 11,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {messages.map((msg) => {
          const icon = ICON_MAP[msg.authorIcon] || '\u26A1';
          return (
            <div key={msg.id} style={{ lineHeight: '16px' }}>
              <span
                style={{
                  color: msg.isAdmin ? '#e03030' : msg.isBot ? '#5b9bd5' : '#00e5c8',
                  fontWeight: 600,
                  fontSize: 10,
                }}
              >
                {icon} {msg.authorDisplay}
              </span>
              <span style={{ color: '#3a4a5a', fontSize: 9, marginLeft: 6 }}>
                {new Date(msg.createdAt).toISOString().slice(11, 16)}
              </span>
              <div style={{ color: '#8a9aad', marginTop: 1 }}>
                {msg.content}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input area */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '6px 10px',
          flexShrink: 0,
        }}
      >
        {canPost ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`${resolvedIcon} ${userDisplayName}...`}
              rows={1}
              style={{
                flex: 1,
                minWidth: 0,
                resize: 'none',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 0,
                color: '#e8edf2',
                fontSize: 11,
                fontFamily: FONT,
                padding: '6px 8px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={sending || !draft.trim()}
              style={{
                background: sending || !draft.trim()
                  ? 'rgba(255,255,255,0.04)'
                  : '#00e5c8',
                color: sending || !draft.trim() ? '#4a5a6d' : '#090d12',
                border: 'none',
                borderRadius: 0,
                fontSize: 9,
                fontFamily: FONT,
                fontWeight: 600,
                letterSpacing: '0.08em',
                padding: '6px 12px',
                cursor: sending || !draft.trim() ? 'default' : 'pointer',
              }}
            >
              TRANSMIT
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 10, color: '#4a5a6d', fontFamily: FONT }}>
            Members upgrade required{' '}
            <Link
              href="/support"
              style={{
                color: '#00e5c8',
                fontSize: 10,
                fontFamily: FONT,
                textDecoration: 'none',
                border: '1px solid rgba(0,229,200,0.2)',
                padding: '2px 8px',
                letterSpacing: '0.08em',
              }}
            >
              UPGRADE
            </Link>
          </div>
        )}
      </div>

      {/* Scan line overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)',
          zIndex: 1,
        }}
      />

      <style>{`
        .chat-scroll::-webkit-scrollbar { width: 3px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}
