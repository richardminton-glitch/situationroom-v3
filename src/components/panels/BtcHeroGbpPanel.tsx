'use client';

/**
 * BtcHeroGbpPanel — BTC price in GBP using CoinGecko's native GBP price.
 * No FX conversion — CoinGecko sources GBP directly from sterling-quoted
 * exchanges, so the figure reflects the real sterling market not a
 * dollar number divided by a cross.
 */

import { useData } from '@/components/layout/DataProvider';
import { formatPrice, formatPct, pctColor, PanelLoading } from './shared';

export function BtcHeroGbpPanel() {
  const { data, loading } = useData();

  if (loading || !data?.btcMarket?.priceGbp) return <PanelLoading />;

  const { priceGbp, change24h } = data.btcMarket;

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
