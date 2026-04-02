'use client';

import { useData } from '@/components/layout/DataProvider';
import { PanelLoading } from './shared';

function getColor(value: number): string {
  if (value <= 25) return 'var(--accent-danger)';
  if (value <= 45) return 'var(--accent-warning)';
  if (value <= 55) return 'var(--text-muted)';
  if (value <= 75) return 'var(--accent-success)';
  return 'var(--accent-danger)'; // extreme greed is also a warning
}

export function FearGreedPanel() {
  const { data, loading } = useData();

  if (loading || !data?.fearGreed) return <PanelLoading />;

  const { value, classification } = data.fearGreed;

  return (
    <div className="text-center py-2">
      <div
        className="text-3xl font-bold"
        style={{ fontFamily: 'var(--font-data)', color: getColor(value) }}
      >
        {value}
      </div>
      <div className="text-xs uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>
        {classification}
      </div>
      {/* Simple bar gauge */}
      <div
        className="mt-3 mx-auto rounded-full overflow-hidden"
        style={{ width: '80%', height: '6px', backgroundColor: 'var(--bg-secondary)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: getColor(value) }}
        />
      </div>
    </div>
  );
}
