'use client';

/**
 * BtcMiningGbpPanel — UK-localised version of BtcMiningPanel. Same rows,
 * but daily issuance revenue is priced in GBP using the live GBP/USD
 * cross. Used by the UK Focus dashboard.
 */

import { useData } from '@/components/layout/DataProvider';
import { DataRow, formatLargeNumber, PanelLoading } from './shared';

export function BtcMiningGbpPanel() {
  const { data, loading } = useData();

  const gbpUsd = data?.fx?.gbp?.price;
  if (loading || !data?.btcNetwork || !gbpUsd) return <PanelLoading />;

  const n = data.btcNetwork;
  const reward = 3.125;
  const blocksPerDay = 144;
  const dailyRevBTC = reward * blocksPerDay;
  const btcPriceUsd = data.btcMarket?.price || 0;
  const dailyRevUsd = dailyRevBTC * btcPriceUsd;
  const dailyRevGbp = dailyRevUsd / gbpUsd;
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
