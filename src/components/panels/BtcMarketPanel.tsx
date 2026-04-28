'use client';

import { useData } from '@/components/layout/DataProvider';
import { DataRow, formatPrice, formatLargeNumber, formatPct, pctColor, PanelLoading } from './shared';

function daysSince(iso: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

export function BtcMarketPanel() {
  const { data, loading } = useData();

  if (loading || !data?.btcMarket) return <PanelLoading />;

  const m = data.btcMarket;
  const daysFromAth = daysSince(m.athDate);

  return (
    <div>
      <DataRow label="7d Change" value={formatPct(m.change7d)} color={pctColor(m.change7d)} />
      <DataRow label="30d Change" value={formatPct(m.change30d)} color={pctColor(m.change30d)} />
      <DataRow label="1y Change" value={formatPct(m.change1y)} color={pctColor(m.change1y)} />
      <DataRow label="Market Cap" value={`$${formatLargeNumber(m.marketCap)}`} />
      <DataRow label="24h Volume" value={`$${formatLargeNumber(m.volume24h)}`} />
      <DataRow label="Supply" value={`${formatLargeNumber(m.circulatingSupply)}`} suffix="BTC" />
      <DataRow label="ATH" value={`$${formatPrice(m.ath, 0)}`} />
      <DataRow label="From ATH" value={formatPct(m.athChangePct)} color={pctColor(m.athChangePct)} />
      <DataRow
        label="Days from ATH"
        value={daysFromAth != null ? daysFromAth.toLocaleString('en-US') : '—'}
      />
    </div>
  );
}
