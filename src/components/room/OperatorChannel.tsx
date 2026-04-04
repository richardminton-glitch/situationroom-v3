'use client';

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import Link from 'next/link';
import type { ChatMessage } from '@/hooks/useOpsRoom';

// ── Types ────────────────────────────────────────────────────────────────────

interface OperatorChannelProps {
  messages: ChatMessage[];
  operatorCount: number;
  onSend: (content: string) => Promise<boolean>;
  canPost: boolean;
  userDisplayName: string;
  userIcon: string;
}

// ── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, string> = {
  lightning: '\u26A1',
  email: '\u2709',
  bot: '\uD83E\uDD16',
};

function getIcon(iconKey: string): string {
  return ICON_MAP[iconKey] || '\u26A1';
}

// ── Component ────────────────────────────────────────────────────────────────

export default function OperatorChannel({
  messages,
  operatorCount,
  onSend,
  canPost,
  userDisplayName,
  userIcon,
}: OperatorChannelProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest message
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    try {
      await onSend(text);
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

  const resolvedIcon = getIcon(userIcon);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0d1414',
        borderTop: '1px solid #1a2e2e',
        display: 'flex',
        flexDirection: 'row',
        fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
        overflow: 'hidden',
      }}
    >
      {/* ── Left: message area (80%) ── */}
      <div
        ref={scrollRef}
        style={{
          width: '80%',
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '4px 8px',
          boxSizing: 'border-box',
        }}
      >
        {messages.map((msg) => {
          const icon = getIcon(msg.authorIcon);
          const nameColor = msg.isBot
            ? '#00d4aa'
            : msg.isAdmin
              ? '#cc4444'
              : '#4a6060';

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                height: 16,
                minHeight: 16,
                lineHeight: '16px',
                borderLeft: msg.isBot ? '2px solid #00d4aa' : '2px solid transparent',
                paddingLeft: 6,
              }}
            >
              {/* Icon + name (fixed width) */}
              <span
                style={{
                  fontSize: 10,
                  color: nameColor,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  width: 100,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {icon} {msg.authorDisplay}
              </span>

              {/* Content (fills remaining space) */}
              <span
                style={{
                  fontSize: 11,
                  color: '#e0f0f0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {msg.content}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Right: input area (20%) ── */}
      <div
        style={{
          width: '20%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '4px 6px',
          boxSizing: 'border-box',
          borderLeft: '1px solid #1a2e2e',
          gap: 3,
        }}
      >
        {canPost ? (
          <>
            {/* Input row — fills available height */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: 4, flex: 1, minHeight: 0 }}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message as ${resolvedIcon} ${userDisplayName}...`}
                rows={1}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: '100%',
                  resize: 'none',
                  background: '#111a1a',
                  border: '1px solid #1a2e2e',
                  borderRadius: 0,
                  color: '#e0f0f0',
                  fontSize: 10,
                  fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
                  padding: '4px 6px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={sending || !draft.trim()}
                style={{
                  background: sending || !draft.trim() ? '#1a2e2e' : '#00d4aa',
                  color: '#080d0d',
                  border: 'none',
                  borderRadius: 0,
                  fontSize: 9,
                  fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  padding: '4px 8px',
                  cursor: sending || !draft.trim() ? 'default' : 'pointer',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.5px',
                  height: '100%',
                  alignSelf: 'stretch',
                }}
              >
                TRANSMIT &uarr;
              </button>
            </div>

            {/* Operator count */}
            <div
              style={{
                fontSize: 8,
                color: '#4a6060',
                letterSpacing: '0.5px',
                flexShrink: 0,
              }}
            >
              {operatorCount} operators
            </div>
          </>
        ) : (
          /* Upgrade prompt */
          <div
            style={{
              fontSize: 10,
              color: '#4a6060',
              lineHeight: '14px',
              display: 'flex',
              alignItems: 'center',
              height: '100%',
            }}
          >
            Members upgrade required to transmit &#x26A1;{' '}
            <Link
              href="/support"
              style={{
                color: '#00d4aa',
                fontSize: 10,
                fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
                textDecoration: 'none',
                border: '1px solid #1a2e2e',
                padding: '2px 6px',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              UPGRADE
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
