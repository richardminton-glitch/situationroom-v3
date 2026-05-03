'use client';

import { useData } from '@/components/layout/DataProvider';
import { formatPct, pctColor, PanelLoading } from './shared';

export function BtcSatsHeroPanel() {
  const { data, loading } = useData();

  if (loading || !data?.btcMarket) return <PanelLoading />;

  const { price, change24h } = data.btcMarket;
  const sats = price > 0 ? Math.round(100_000_000 / price) : 0;
  // Sats-per-dollar moves inverse to price: (1 / (1 + r)) - 1
  const satsChange = change24h != null && !isNaN(change24h)
    ? (1 / (1 + change24h / 100) - 1) * 100
    : 0;

  return (
    <div className="flex items-baseline justify-center gap-2 py-1">
      <span
        className="font-bold"
        style={{ fontFamily: 'var(--font-data)', color: 'var(--text-primary)', fontSize: '26px' }}
      >
        {sats.toLocaleString('en-US')}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-data)',
          color: 'var(--text-muted)',
          fontSize: '11px',
          letterSpacing: '0.04em',
        }}
      >
        sats/$
      </span>
      <span
        className="font-medium"
        style={{ fontFamily: 'var(--font-data)', color: pctColor(satsChange), fontSize: '20px', marginLeft: '4px' }}
      >
        {formatPct(satsChange)}
      </span>
    </div>
  );
}
