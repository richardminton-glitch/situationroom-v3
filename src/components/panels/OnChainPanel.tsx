'use client';

import { useData } from '@/components/layout/DataProvider';
import { DataRow, formatPrice, formatLargeNumber, PanelLoading } from './shared';

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
      {(() => {
        const sig = oc.signal ?? 'neutral';
        const [line1, line2] = (oc.interpretation ?? '').split('\n');
        const sigColor = sig === 'bullish' ? 'var(--accent-success)'
                       : sig === 'bearish' ? 'var(--accent-danger)'
                       : 'var(--text-muted)';
        const sigBg    = sig === 'bullish' ? 'rgba(42,110,42,0.08)'
                       : sig === 'bearish' ? 'rgba(139,32,32,0.08)'
                       : 'var(--bg-secondary)';
        return (
          <div className="mt-2 px-2 py-1.5" style={{ backgroundColor: sigBg, borderLeft: `2px solid ${sigColor}` }}>
            <p className="text-xs" style={{ color: sigColor, fontStyle: 'italic', marginBottom: line2 ? 2 : 0 }}>
              {line1}
            </p>
            {line2 && (
              <p className="text-xs" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {line2}
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}
