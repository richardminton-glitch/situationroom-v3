'use client';

/**
 * CentralBankUkPanel — UK-prioritised version of CentralBankPanel. BOE
 * leads, ECB and Fed follow. Used by the UK Focus dashboard.
 */

import { useData } from '@/components/layout/DataProvider';
import { DataRow, PanelLoading } from './shared';

// Same order the rates feed labels them: 'Fed (US)' | 'ECB (EU)' | 'BOJ (Japan)' | 'BOE (UK)'
const PRIORITY: Record<string, number> = {
  'BOE (UK)':   0,
  'ECB (EU)':   1,
  'Fed (US)':   2,
  'BOJ (Japan)':3,
};

export function CentralBankUkPanel() {
  const { data, loading } = useData();

  if (loading || !data?.rates) return <PanelLoading />;

  const ordered = [...data.rates].sort((a, b) => {
    const ai = PRIORITY[a.country] ?? 99;
    const bi = PRIORITY[b.country] ?? 99;
    return ai - bi;
  });

  return (
    <div>
      {ordered.map((r) => (
        <DataRow
          key={r.country}
          label={r.country}
          value={`${r.rate.toFixed(2)}%`}
        />
      ))}
    </div>
  );
}
