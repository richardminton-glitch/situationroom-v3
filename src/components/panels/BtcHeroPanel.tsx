'use client';

import { useData } from '@/components/layout/DataProvider';
import { formatPrice, formatPct, pctColor, PanelLoading } from './shared';

export function BtcHeroPanel() {
  const { data, loading } = useData();

  if (loading || !data?.btcMarket) return <PanelLoading />;

  const { price, change24h } = data.btcMarket;

  return (
    <div className="flex items-baseline justify-center gap-3 py-1">
      <span
        className="font-bold"
        style={{ fontFamily: 'var(--font-data)', color: 'var(--text-primary)', fontSize: '26px' }}
      >
        ${formatPrice(price, 0)}
      </span>
      <span
        className="font-medium"
        style={{ fontFamily: 'var(--font-data)', color: pctColor(change24h), fontSize: '20px' }}
      >
        {formatPct(change24h)}
      </span>
    </div>
  );
}
