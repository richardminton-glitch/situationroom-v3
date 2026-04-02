'use client';

import { useData } from '@/components/layout/DataProvider';
import { DataRow, formatLargeNumber, PanelLoading } from './shared';

export function BtcMiningPanel() {
  const { data, loading } = useData();

  if (loading || !data?.btcNetwork) return <PanelLoading />;

  const n = data.btcNetwork;
  const reward = 3.125; // current block subsidy
  const blocksPerDay = 144;
  const dailyRevBTC = reward * blocksPerDay;
  const btcPrice = data.btcMarket?.price || 0;
  const dailyRevUSD = dailyRevBTC * btcPrice;
  const avgBlockTime = 10; // minutes, approximate

  return (
    <div>
      <DataRow label="Block Subsidy" value={`${reward}`} suffix="BTC" />
      <DataRow label="Blocks/Day" value={`~${blocksPerDay}`} />
      <DataRow label="Avg Block Time" value={`~${avgBlockTime}`} suffix="min" />
      <DataRow label="Daily Revenue" value={`$${formatLargeNumber(dailyRevUSD)}`} />
      <DataRow label="Epoch" value={`${n.difficultyEpoch}`} />
      <DataRow label="Next Retarget" value={`${n.blocksUntilRetarget.toLocaleString()}`} suffix="blocks" />
    </div>
  );
}
