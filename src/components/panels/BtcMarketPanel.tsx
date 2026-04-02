'use client';

import { useData } from '@/components/layout/DataProvider';
import { DataRow, formatPrice, formatLargeNumber, formatPct, pctColor, PanelLoading } from './shared';

export function BtcMarketPanel() {
  const { data, loading } = useData();

  if (loading || !data?.btcMarket) return <PanelLoading />;

  const m = data.btcMarket;

  return (
    <div>
      <DataRow label="7d Change" value={formatPct(m.change7d)} color={pctColor(m.change7d)} />
      <DataRow label="30d Change" value={formatPct(m.change30d)} color={pctColor(m.change30d)} />
      <DataRow label="Market Cap" value={`$${formatLargeNumber(m.marketCap)}`} />
      <DataRow label="24h Volume" value={`$${formatLargeNumber(m.volume24h)}`} />
      <DataRow label="Supply" value={`${formatLargeNumber(m.circulatingSupply)}`} suffix="BTC" />
      <DataRow label="ATH" value={`$${formatPrice(m.ath, 0)}`} />
      <DataRow label="From ATH" value={formatPct(m.athChangePct)} color={pctColor(m.athChangePct)} />
    </div>
  );
}
