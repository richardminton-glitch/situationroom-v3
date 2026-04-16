'use client';

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { C, FONT, type BotMessage } from './constants';

const POLL_INTERVAL = 30_000; // 30s — bot messages arrive every few hours, so this is fine

function fmtTime(ts: number): string {
  return new Date(ts).toISOString().slice(11, 16);
}

/** Simple coloriser — highlights key terms in bot messages */
function colorise(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  const patterns: { re: RegExp; color: string; bold?: boolean }[] = [
    { re: /\b(LONG|OPENED|HOLDING|SCANNING)\b/, color: C.teal, bold: true },
    { re: /\b(SHORT|CLOSED|BLOCKED|ALERT|LIQUIDATED)\b/, color: C.coral, bold: true },
    { re: /\b(FLAT)\b/, color: C.textDim, bold: true },
    { re: /P&L:\s*[\+\-]?\d[\d,]*\s*sats/, color: C.teal },
    { re: /Conv\.\s*\d+\/10/, color: C.textPrimary },
    { re: /TP:\s*\$[\d,\.]+/, color: C.teal },
    { re: /SL:\s*\$[\d,\.]+/, color: C.coral },
    { re: /Take-profit hit/, color: C.teal, bold: true },
    { re: /Stop-loss hit/, color: C.coral, bold: true },
  ];

  while (remaining.length > 0) {
    let earliest: { idx: number; len: number; color: string; bold?: boolean } | null = null;

    for (const p of patterns) {
      const m = remaining.match(p.re);
      if (m && m.index !== undefined) {
        if (!earliest || m.index < earliest.idx) {
          earliest = { idx: m.index, len: m[0].length, color: p.color, bold: p.bold };
        }
      }
    }

    if (!earliest) {
      parts.push(<span key={key++} style={{ color: C.textMuted }}>{remaining}</span>);
      break;
    }

    if (earliest.idx > 0) {
      parts.push(<span key={key++} style={{ color: C.textMuted }}>{remaining.slice(0, earliest.idx)}</span>);
    }
    parts.push(
      <span key={key++} style={{ color: earliest.color, fontWeight: earliest.bold ? 'bold' : undefined }}>
        {remaining.slice(earliest.idx, earliest.idx + earliest.len)}
      </span>,
    );
    remaining = remaining.slice(earliest.idx + earliest.len);
  }

  return <>{parts}</>;
}

export function OpsChat() {
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [loading, setLoading]   = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/bot/messages?limit=100');
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch {
      // silent — will retry on next poll
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchMessages();
    const id = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchMessages]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > prevCountRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0,
      borderTop: `1px solid ${C.border}`, fontFamily: FONT, backgroundColor: C.bgPrimary,
    }}>
      {/* Header */}
      <div style={{
        height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 10px', borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="br-blink" style={{ width: '4px', height: '4px', borderRadius: '50%', background: C.teal, display: 'inline-block' }} />
          <span style={{ fontSize: '9px', letterSpacing: '0.14em', color: C.textDim }}>SITROOM AI</span>
        </div>
        <span style={{ fontSize: '9px', color: C.textDim }}>
          {messages.length} entries
        </span>
      </div>

      {/* Messages */}
      <div ref={listRef} className="br-scroll" style={{
        flex: 1, overflowY: 'auto', padding: '8px',
        display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        {loading && messages.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '9px', color: C.textDim, letterSpacing: '0.14em' }}>
              LOADING...
            </span>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '9px', color: C.textDim, letterSpacing: '0.14em' }}>
              NO MESSAGES YET
            </span>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id}>
            <div style={{ fontSize: '9px', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: C.btcOrange }}>{msg.author}</span>
              <span style={{ color: C.textDim }}>{fmtTime(msg.timestamp)}</span>
            </div>
            <div style={{
              fontSize: '11px', lineHeight: 1.5, padding: '5px 7px',
              background: C.bgElevated, border: `1px solid ${C.border}`,
              borderLeft: '2px solid color-mix(in srgb, var(--accent-primary) 15%, transparent)',
            }}>
              {colorise(msg.content)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
