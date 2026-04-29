'use client';

/**
 * BtcMarketGbpPanel — UK-localised version of BtcMarketPanel. All GBP
 * figures (market cap, volume, ATH, change %) come natively from
 * CoinGecko's GBP price feed — no spot FX conversion. The GBP ATH is
 * the real sterling-priced peak, not the USD ATH divided by today's
 * GBP/USD rate.
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

  if (loading || !data?.btcMarket?.priceGbp) return <PanelLoading />;

  const m = data.btcMarket;
  const daysFromAth = daysSince(m.athDateGbp);

  return (
    <div>
      <DataRow label="7d Change"     value={formatPct(m.change7dGbp)}     color={pctColor(m.change7dGbp)} />
      <DataRow label="30d Change"    value={formatPct(m.change30dGbp)}    color={pctColor(m.change30dGbp)} />
      <DataRow label="1y Change"     value={formatPct(m.change1yGbp)}     color={pctColor(m.change1yGbp)} />
      <DataRow label="Market Cap"    value={`\u00a3${formatLargeNumber(m.marketCapGbp)}`} />
      <DataRow label="24h Volume"    value={`\u00a3${formatLargeNumber(m.volume24hGbp)}`} />
      <DataRow label="Supply"        value={`${formatLargeNumber(m.circulatingSupply)}`} suffix="BTC" />
      <DataRow label="ATH"           value={`\u00a3${formatPrice(m.athGbp, 0)}`} />
      <DataRow label="From ATH"      value={formatPct(m.athChangePctGbp)} color={pctColor(m.athChangePctGbp)} />
      <DataRow
        label="Days from ATH"
        value={daysFromAth != null ? daysFromAth.toLocaleString('en-GB') : '\u2014'}
      />
    </div>
  );
}
