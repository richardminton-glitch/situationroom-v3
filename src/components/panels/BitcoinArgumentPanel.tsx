'use client';

import { useState, useEffect } from 'react';
import { PanelLoading } from './shared';

interface ArgumentPoint {
  title: string;
  body: string;
}

interface ArgumentData {
  points: ArgumentPoint[];
  counterpoint: string;
  updatedAt: string;
}

export function BitcoinArgumentPanel() {
  const [data, setData] = useState<ArgumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/ai/bitcoin-argument')
      .then((res) => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then((json) => {
        setData(json);
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <PanelLoading />;

  if (error || !data) {
    return (
      <div className="py-4">
        <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          AI analysis unavailable
        </p>
      </div>
    );
  }

  const updatedTime = new Date(data.updatedAt).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Argument cards */}
      <div className="flex flex-col gap-2 flex-1">
        {data.points.map((point, i) => (
          <div
            key={i}
            className="rounded p-2.5"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <p
              className="text-xs font-semibold mb-1 uppercase tracking-wider"
              style={{
                color: 'var(--accent-primary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {point.title}
            </p>
            <p
              className="text-xs leading-relaxed"
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {point.body}
            </p>
          </div>
        ))}
      </div>

      {/* Counterpoint */}
      <div
        className="rounded p-2.5 shrink-0"
        style={{
          backgroundColor: 'rgba(217, 119, 6, 0.08)',
          border: '1px solid rgba(217, 119, 6, 0.3)',
        }}
      >
        <p
          className="text-xs font-semibold mb-1 uppercase tracking-wider"
          style={{ color: 'rgb(217, 119, 6)', fontFamily: 'var(--font-mono)' }}
        >
          Counterpoint
        </p>
        <p
          className="text-xs leading-relaxed"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
        >
          {data.counterpoint}
        </p>
      </div>

      {/* Footer */}
      <p
        className="text-xs shrink-0"
        style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
      >
        UPDATED {updatedTime}
      </p>
    </div>
  );
}
