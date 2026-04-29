'use client';

/**
 * BtcMiningGbpPanel — UK-localised version of BtcMiningPanel. Daily
 * issuance revenue is computed from the native GBP BTC price (CoinGecko
 * `current_price.gbp`), not via FX cross conversion.
 */

import { useData } from '@/components/layout/DataProvider';
import { DataRow, formatLargeNumber, PanelLoading } from './shared';

export function BtcMiningGbpPanel() {
  const { data, loading } = useData();

  if (loading || !data?.btcNetwork || !data?.btcMarket?.priceGbp) return <PanelLoading />;

  const n = data.btcNetwork;
  const reward = 3.125;
  const blocksPerDay = 144;
  const dailyRevBTC = reward * blocksPerDay;
  const dailyRevGbp = dailyRevBTC * data.btcMarket.priceGbp;
  const avgBlockTime = 10;

  return (
    <div>
      <DataRow label="Block Subsidy" value={`${reward}`} suffix="BTC" />
      <DataRow label="Blocks/Day" value={`~${blocksPerDay}`} />
      <DataRow label="Avg Block Time" value={`~${avgBlockTime}`} suffix="min" />
      <DataRow label="Daily Revenue" value={`\u00a3${formatLargeNumber(dailyRevGbp)}`} />
      <DataRow label="Epoch" value={`${n.difficultyEpoch}`} />
      <DataRow label="Next Retarget" value={`${n.blocksUntilRetarget.toLocaleString()}`} suffix="blocks" />
    </div>
  );
}
