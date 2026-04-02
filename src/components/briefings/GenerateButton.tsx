'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Phase =
  | { id: 'idle' }
  | { id: 'data';       label: string }
  | { id: 'agents';     label: string }
  | { id: 'synthesis';  label: string }
  | { id: 'saving';     label: string }
  | { id: 'done';       headline: string; date: string; sourcesCount: number }
  | { id: 'error';      message: string };

const PHASES: { id: string; label: string; minMs: number }[] = [
  { id: 'data',      label: 'Gathering live market data & headlines…',          minMs: 0    },
  { id: 'agents',    label: 'Running 4 intelligence agents in parallel…',       minMs: 5000 },
  { id: 'synthesis', label: 'Running synthesis agent (Agent 5)…',               minMs: 40000 },
  { id: 'saving',    label: 'Post-processing & saving to database…',            minMs: 90000 },
];

export function GenerateButton({ todayExists }: { todayExists: boolean }) {
  const [phase, setPhase] = useState<Phase>({ id: 'idle' });
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const router = useRouter();

  // Clean up timers on unmount
  useEffect(() => {
    return () => { timerRefs.current.forEach(clearTimeout); };
  }, []);

  async function handleGenerate() {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];

    // Start phase animation — timers advance the displayed phase independently
    // of actual API progress (the API returns one big response at the end)
    PHASES.forEach(({ id, label, minMs }) => {
      const t = setTimeout(() => {
        setPhase({ id: id as 'data' | 'agents' | 'synthesis' | 'saving', label });
      }, minMs);
      timerRefs.current.push(t);
    });

    try {
      const res = await fetch('/api/briefing/trigger', { method: 'POST' });
      timerRefs.current.forEach(clearTimeout);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        setPhase({ id: 'error', message: err.error || `HTTP ${res.status}` });
        return;
      }

      const data = await res.json();
      setPhase({
        id: 'done',
        headline: data.headline,
        date: data.date,
        sourcesCount: data.sourcesCount ?? 0,
      });

      // Refresh the archive list after a short pause
      setTimeout(() => router.refresh(), 800);
    } catch (err) {
      timerRefs.current.forEach(clearTimeout);
      setPhase({ id: 'error', message: String(err) });
    }
  }

  // ── Idle ──────────────────────────────────────────────────────────────
  if (phase.id === 'idle') {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerate}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '6px 16px',
            border: '1px solid var(--accent-primary)',
            color: 'var(--accent-primary)',
            background: 'transparent',
            cursor: 'pointer',
          }}
          className="hover:opacity-80 transition-opacity"
        >
          ⚡ Generate Today&apos;s Briefing
        </button>
        {todayExists && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            Today&apos;s briefing already exists — regenerate?
          </span>
        )}
      </div>
    );
  }

  // ── Running ───────────────────────────────────────────────────────────
  if (phase.id === 'data' || phase.id === 'agents' || phase.id === 'synthesis' || phase.id === 'saving') {
    const currentIndex = PHASES.findIndex((p) => p.id === phase.id);

    return (
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.06em',
          padding: '10px 14px',
          border: '1px solid var(--border-primary)',
          background: 'var(--bg-card)',
          minWidth: '340px',
        }}
      >
        {/* Phase steps */}
        <div className="space-y-1.5 mb-2">
          {PHASES.map((p, i) => {
            const done   = i < currentIndex;
            const active = i === currentIndex;
            return (
              <div key={p.id} className="flex items-center gap-2">
                <span style={{
                  fontSize: '9px',
                  color: done ? 'var(--accent-success)' : active ? 'var(--accent-primary)' : 'var(--text-muted)',
                  minWidth: '12px',
                }}>
                  {done ? '✓' : active ? '▶' : '·'}
                </span>
                <span style={{
                  color: done ? 'var(--text-muted)' : active ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: active ? 600 : 400,
                }}>
                  {p.label}
                </span>
                {active && <Spinner />}
              </div>
            );
          })}
        </div>
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '6px', color: 'var(--text-muted)', fontSize: '10px' }}>
          This takes ~60–90 seconds. Do not close this page.
        </div>
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────
  if (phase.id === 'done') {
    const { headline, date, sourcesCount } = phase;
    return (
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          padding: '10px 14px',
          border: '1px solid var(--accent-success)',
          background: 'var(--bg-card)',
          minWidth: '340px',
        }}
      >
        <div className="flex items-start gap-2 mb-2">
          <span style={{ color: 'var(--accent-success)', fontSize: '13px' }}>✓</span>
          <div>
            <p style={{ color: 'var(--accent-success)', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '10px', marginBottom: '3px' }}>
              Briefing generated — {sourcesCount} sources
            </p>
            <p style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>{headline}</p>
          </div>
        </div>
        <a
          href={`/briefing/${date}`}
          style={{
            display: 'inline-block',
            color: 'var(--accent-primary)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontSize: '10px',
            textDecoration: 'none',
          }}
          className="hover:underline"
        >
          Read briefing →
        </a>
        <button
          onClick={() => setPhase({ id: 'idle' })}
          style={{ marginLeft: '16px', color: 'var(--text-muted)', fontSize: '10px', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Dismiss
        </button>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (phase.id === 'error') {
    return (
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          padding: '10px 14px',
          border: '1px solid var(--accent-danger)',
          background: 'var(--bg-card)',
          minWidth: '340px',
        }}
      >
        <p style={{ color: 'var(--accent-danger)', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '10px', marginBottom: '4px' }}>
          ✕ Generation failed
        </p>
        <p style={{ color: 'var(--text-secondary)' }}>{phase.message}</p>
        <button
          onClick={() => setPhase({ id: 'idle' })}
          style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '10px', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Try again
        </button>
      </div>
    );
  }

  return null;
}

function Spinner() {
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDot((d) => (d + 1) % 4), 400);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ color: 'var(--accent-primary)', minWidth: '16px', display: 'inline-block' }}>
      {'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'[dot * 2]}
    </span>
  );
}
