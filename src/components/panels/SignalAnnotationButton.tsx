'use client';

import { useState } from 'react';
import { useTier } from '@/hooks/useTier';

interface Props {
  panelId: string;
  valueKey: string;  // the current metric value as a string key
}

export function SignalAnnotationButton({ panelId, valueKey }: Props) {
  const { canAccess } = useTier();
  const [expanded, setExpanded] = useState(false);
  const [annotation, setAnnotation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!canAccess('general')) return null;

  const handleClick = async () => {
    if (expanded) { setExpanded(false); return; }
    if (annotation) { setExpanded(true); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/annotation?panel=${panelId}&value=${encodeURIComponent(valueKey)}`);
      if (res.ok) {
        const data = await res.json() as { annotation: string };
        setAnnotation(data.annotation);
        setExpanded(true);
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div style={{ marginTop: '6px' }}>
      <button
        onClick={handleClick}
        style={{
          fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em',
          color: 'var(--accent-primary)', background: 'none', border: 'none',
          cursor: 'pointer', padding: '0', opacity: 0.7,
        }}
      >
        {loading ? '…' : expanded ? '▲ COLLAPSE' : '⚡ WHY THIS MATTERS'}
      </button>
      {expanded && annotation && (
        <div style={{
          marginTop: '6px', padding: '8px 10px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          fontFamily: 'var(--font-mono)', fontSize: '10px',
          color: 'var(--text-secondary)', lineHeight: 1.6,
        }}>
          {annotation}
        </div>
      )}
    </div>
  );
}
