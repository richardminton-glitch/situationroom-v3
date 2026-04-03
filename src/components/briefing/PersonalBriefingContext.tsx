'use client';

import { useEffect, useState } from 'react';
import { useTier } from '@/hooks/useTier';

interface Props {
  date: string; // YYYY-MM-DD format
}

interface PersonalContext {
  portfolioCtx: string | null;
  topics: string[];
  outlook: string | null;
}

export function PersonalBriefingContext({ date }: Props) {
  const { canAccess } = useTier();
  const [ctx, setCtx] = useState<PersonalContext | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!canAccess('vip')) return;
    setLoading(true);
    fetch(`/api/briefing/${date}/personal`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { personal?: PersonalContext } | null) =>
        d?.personal ? setCtx(d.personal) : null,
      )
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [date, canAccess]);

  if (!canAccess('vip') || (!loading && !ctx)) return null;
  if (loading) return null;
  if (!ctx?.portfolioCtx) return null;

  return (
    <div style={{ borderTop: '2px solid var(--accent-primary)', padding: '20px 0', marginTop: '24px' }}>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        letterSpacing: '0.18em',
        color: 'var(--text-muted)',
        marginBottom: '8px',
        textTransform: 'uppercase',
      }}>
        YOUR POSITION · VIP INSIGHT
      </p>
      <p style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: '14px',
        color: 'var(--text-secondary)',
        lineHeight: 1.7,
        margin: 0,
      }}>
        {ctx.portfolioCtx}
      </p>
      {ctx.topics.length > 0 && (
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--text-muted)',
          marginTop: '12px',
          letterSpacing: '0.08em',
        }}>
          Focus: {ctx.topics.join(' · ')}
        </p>
      )}
    </div>
  );
}
