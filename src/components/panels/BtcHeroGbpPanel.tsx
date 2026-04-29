'use client';

/**
 * BtcHeroGbpPanel — BTC price in GBP using the live GBP/USD cross.
 * Mirrors BtcHeroPanel but converts USD → GBP via data.fx.gbp.price.
 * Used by the UK Focus dashboard layout.
 */

import { useData } from '@/components/layout/DataProvider';
import { formatPrice, formatPct, pctColor, PanelLoading } from './shared';

export function BtcHeroGbpPanel() {
  const { data, loading } = useData();

  const gbpUsd = data?.fx?.gbp?.price;
  if (loading || !data?.btcMarket || !gbpUsd) return <PanelLoading />;

  const { price, change24h } = data.btcMarket;
  const priceGbp = price / gbpUsd;

  return (
    <div className="flex items-baseline justify-center gap-3 py-1">
      <span
        className="font-bold"
        style={{ fontFamily: 'var(--font-data)', color: 'var(--text-primary)', fontSize: '26px' }}
      >
        £{formatPrice(priceGbp, 0)}
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
