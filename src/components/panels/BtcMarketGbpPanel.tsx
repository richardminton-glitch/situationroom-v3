'use client';

/**
 * BtcMarketGbpPanel — UK-localised version of BtcMarketPanel. Same rows,
 * but market cap, 24h volume and ATH are priced in GBP using the live
 * GBP/USD cross. Used by the UK Focus dashboard.
 */

import { useData } from '@/components/layout/DataProvider';
import { DataRow, formatPrice, formatLargeNumber, formatPct, pctColor, PanelLoading } from './shared';

function daysSince(iso: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

export function BtcMarketGbpPanel() {
  const { data, loading } = useData();

  const gbpUsd = data?.fx?.gbp?.price;
  if (loading || !data?.btcMarket || !gbpUsd) return <PanelLoading />;

  const m = data.btcMarket;
  const daysFromAth = daysSince(m.athDate);
  const fx = (usd: number) => usd / gbpUsd;

  return (
    <div>
      <DataRow label="7d Change" value={formatPct(m.change7d)} color={pctColor(m.change7d)} />
      <DataRow label="30d Change" value={formatPct(m.change30d)} color={pctColor(m.change30d)} />
      <DataRow label="1y Change" value={formatPct(m.change1y)} color={pctColor(m.change1y)} />
      <DataRow label="Market Cap" value={`\u00a3${formatLargeNumber(fx(m.marketCap))}`} />
      <DataRow label="24h Volume" value={`\u00a3${formatLargeNumber(fx(m.volume24h))}`} />
      <DataRow label="Supply" value={`${formatLargeNumber(m.circulatingSupply)}`} suffix="BTC" />
      <DataRow label="ATH" value={`\u00a3${formatPrice(fx(m.ath), 0)}`} />
      <DataRow label="From ATH" value={formatPct(m.athChangePct)} color={pctColor(m.athChangePct)} />
      <DataRow
        label="Days from ATH"
        value={daysFromAth != null ? daysFromAth.toLocaleString('en-GB') : '\u2014'}
      />
    </div>
  );
}
