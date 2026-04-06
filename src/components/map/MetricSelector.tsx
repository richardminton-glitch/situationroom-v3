'use client';

import { useState, useRef, useEffect } from 'react';
import { METRICS, METRIC_GROUPS, METRIC_BY_KEY } from './metrics';
import { CaretDown } from '@phosphor-icons/react';

interface MetricSelectorProps {
  activeKey: string;
  onChange: (key: string) => void;
}

export function MetricSelector({ activeKey, onChange }: MetricSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = METRIC_BY_KEY[activeKey];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="absolute z-30" style={{ top: 12, left: 12, minWidth: 220 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.04em',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          backdropFilter: 'blur(4px)',
          width: '100%',
          textAlign: 'left',
        }}
      >
        <span style={{ flex: 1 }}>{active?.label ?? activeKey}</span>
        <CaretDown size={12} weight="bold" style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div
          style={{
            marginTop: 2,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            maxHeight: '60vh',
            overflowY: 'auto',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}
        >
          {METRIC_GROUPS.map((group) => (
            <div key={group}>
              <div
                style={{
                  padding: '6px 12px 4px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--accent-primary)',
                  fontWeight: 600,
                }}
              >
                {group}
              </div>
              {METRICS.filter((m) => m.group === group).map((m) => {
                const isActive = m.key === activeKey;
                return (
                  <button
                    key={m.key}
                    onClick={() => { onChange(m.key); setOpen(false); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '5px 12px 5px 20px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: isActive ? 700 : 400,
                      background: isActive ? 'var(--bg-secondary)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {isActive && <span style={{ marginRight: 4 }}>&#9642;</span>}
                    {m.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
