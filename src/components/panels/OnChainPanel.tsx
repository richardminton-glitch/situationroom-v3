'use client';

import { useData } from '@/components/layout/DataProvider';
import { DataRow, formatPrice, formatLargeNumber, pctColor, PanelLoading } from './shared';

export function OnChainPanel() {
  const { data, loading } = useData();

  if (loading || !data?.onchain) return <PanelLoading />;

  const oc = data.onchain;

  return (
    <div>
      <DataRow label="MVRV" value={formatPrice(oc.mvrv, 2)} />
      <DataRow label="Inflow" value={`${formatLargeNumber(oc.exchangeInflow)}`} suffix="BTC" />
      <DataRow label="Outflow" value={`${formatLargeNumber(oc.exchangeOutflow)}`} suffix="BTC" />
      <DataRow
        label="Net Flow"
        value={`${oc.netFlow >= 0 ? '+' : ''}${formatLargeNumber(Math.abs(oc.netFlow))}`}
        suffix="BTC"
        color={oc.netFlow > 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}
      />
      <DataRow label="Ex. Balance" value={`${formatLargeNumber(oc.exchangeBalance)}`} suffix="BTC" />
      <div className="mt-2 px-2 py-1.5 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <p className="text-xs" style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          {oc.interpretation}
        </p>
      </div>
    </div>
  );
}
