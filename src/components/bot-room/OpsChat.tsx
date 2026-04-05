'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { C, FONT, MOCK_MESSAGES, type BotMessage } from './constants';

function fmtTime(ts: number): string {
  return new Date(ts).toISOString().slice(11, 16);
}

/** Simple coloriser — highlights key terms in bot messages */
function colorise(text: string): ReactNode {
  // Split into segments around known keywords
  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  const patterns: { re: RegExp; color: string; bold?: boolean }[] = [
    { re: /\b(LONG|OPENED|HOLDING|SCANNING)\b/, color: C.teal, bold: true },
    { re: /\b(SHORT|CLOSED|ALERT)\b/, color: C.coral, bold: true },
    { re: /\b(FLAT)\b/, color: C.textDim, bold: true },
    { re: /P&L:\s*[\+\-]?\d+\s*sats/, color: C.teal },
    { re: /Conv\.\s*\d+\/10/, color: C.textPrimary },
    { re: /TP:\s*\$[\d,\.]+/, color: C.teal },
    { re: /SL:\s*\$[\d,\.]+/, color: C.coral },
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
  const [messages] = useState<BotMessage[]>(MOCK_MESSAGES);
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      borderLeft: `1px solid ${C.border}`, fontFamily: FONT, backgroundColor: C.bgPrimary,
    }}>
      {/* Header */}
      <div style={{
        height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 10px', borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="br-blink" style={{ width: '4px', height: '4px', borderRadius: '50%', background: C.teal, display: 'inline-block' }} />
          <span style={{ fontSize: '7px', letterSpacing: '0.12em', color: C.textDim }}>OPS CHAT</span>
        </div>
        <span style={{ fontSize: '7px', color: C.textDim, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="br-blink" style={{ width: '4px', height: '4px', borderRadius: '50%', background: C.teal, display: 'inline-block' }} />
          3 online
        </span>
      </div>

      {/* Messages */}
      <div ref={listRef} className="br-scroll" style={{
        flex: 1, overflowY: 'auto', padding: '8px',
        display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        {messages.map(msg => (
          <div key={msg.id}>
            <div style={{ fontSize: '7px', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: C.btcOrange }}>{msg.author}</span>
              <span style={{ color: C.textDim }}>{fmtTime(msg.timestamp)}</span>
            </div>
            <div style={{
              fontSize: '8.5px', lineHeight: 1.5, padding: '5px 7px',
              background: C.bgElevated, border: `1px solid ${C.border}`,
              borderLeft: '2px solid rgba(0,212,170,0.1)',
            }}>
              {colorise(msg.content)}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '4px', padding: '6px 8px', borderTop: `1px solid ${C.border}` }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Message…"
          style={{
            flex: 1, fontFamily: FONT, fontSize: '8.5px',
            background: C.bgElevated, border: `1px solid ${C.borderSoft}`,
            color: C.textMuted, padding: '4px 8px', outline: 'none',
          }}
        />
        <button style={{
          fontFamily: FONT, fontSize: '11px', color: C.teal,
          background: 'rgba(0,212,170,0.05)', border: `1px solid ${C.teal}`,
          padding: '2px 8px', cursor: 'pointer',
        }}>
          ↑
        </button>
      </div>
    </div>
  );
}
