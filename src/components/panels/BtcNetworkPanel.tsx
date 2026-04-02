'use client';

import { useData } from '@/components/layout/DataProvider';
import { DataRow, formatPrice, formatLargeNumber, PanelLoading } from './shared';

export function BtcNetworkPanel() {
  const { data, loading } = useData();

  if (loading || !data?.btcNetwork) return <PanelLoading />;

  const n = data.btcNetwork;

  return (
    <div>
      <DataRow label="Block Height" value={n.blockHeight.toLocaleString()} />
      <DataRow label="Fee (fast)" value={`${n.feeFast}`} suffix="sat/vB" />
      <DataRow label="Fee (med)" value={`${n.feeMed}`} suffix="sat/vB" />
      <DataRow label="Fee (slow)" value={`${n.feeSlow}`} suffix="sat/vB" />
      <DataRow label="Mempool" value={`${formatPrice(n.mempoolSizeMB, 1)}`} suffix="MB" />
      <DataRow label="Hashrate" value={`${formatPrice(n.hashrateEH, 1)}`} suffix="EH/s" />
      <DataRow label="Difficulty Δ" value={`${formatPrice(n.difficulty, 2)}%`} />
      <DataRow label="Next Halving" value={`${formatLargeNumber(n.blocksUntilHalving)}`} suffix="blocks" />
    </div>
  );
}
