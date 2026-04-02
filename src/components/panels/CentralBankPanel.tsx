'use client';

import { useData } from '@/components/layout/DataProvider';
import { DataRow, PanelLoading } from './shared';

export function CentralBankPanel() {
  const { data, loading } = useData();

  if (loading || !data?.rates) return <PanelLoading />;

  return (
    <div>
      {data.rates.map((r) => (
        <DataRow
          key={r.country}
          label={r.country}
          value={`${r.rate.toFixed(2)}%`}
        />
      ))}
    </div>
  );
}
