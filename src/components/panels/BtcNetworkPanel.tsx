'use client';

import { useData } from '@/components/layout/DataProvider';
import { DataRow, formatPrice, formatLargeNumber, PanelLoading } from './shared';

export function BtcNetworkPanel() {
  const { data, loading } = useData();

  if (loading || !data?.btcNetwork) return <PanelLoading />;

  const n = data.btcNetwork;

  // Format retarget ETA
  const retargetEta = n.difficultyEstRetarget
    ? (() => {
        const ms = n.difficultyEstRetarget - Date.now();
        if (ms <= 0) return 'imminent';
        const days = Math.floor(ms / 86400000);
        const hours = Math.floor((ms % 86400000) / 3600000);
        return days > 0 ? `~${days}d ${hours}h` : `~${hours}h`;
      })()
    : null;

  return (
    <div>
      <DataRow label="Block Height" value={n.blockHeight.toLocaleString()} />
      <DataRow label="Fee (fast)" value={`${n.feeFast}`} suffix="sat/vB" />
      <DataRow label="Fee (med)" value={`${n.feeMed}`} suffix="sat/vB" />
      <DataRow label="Fee (slow)" value={`${n.feeSlow}`} suffix="sat/vB" />
      <DataRow label="Fee (economy)" value={`${n.feeEconomy}`} suffix="sat/vB" />
      <DataRow label="Mempool" value={`${formatPrice(n.mempoolSizeMB, 1)}`} suffix="MB" />
      <DataRow label="Unconfirmed" value={n.mempoolTxCount.toLocaleString()} suffix="txs" />
      <DataRow label="Pending Fees" value={`${formatPrice(n.mempoolTotalFeeBTC, 4)}`} suffix="BTC" />
      <DataRow label="Hashrate" value={`${formatPrice(n.hashrateEH, 1)}`} suffix="EH/s" />
      <DataRow label="Difficulty" value={`${formatPrice(n.difficultyT, 1)}`} suffix="T" />
      <DataRow label="Difficulty Δ" value={`${n.difficulty >= 0 ? '+' : ''}${formatPrice(n.difficulty, 2)}%`} />
      <DataRow label="Epoch Progress" value={`${formatPrice(n.difficultyProgress, 1)}%`} suffix={retargetEta ? `(${retargetEta})` : undefined} />
      <DataRow label="Next Retarget" value={`${formatLargeNumber(n.difficultyRemainBlocks)}`} suffix="blocks" />
      <DataRow label="Next Halving" value={`${formatLargeNumber(n.blocksUntilHalving)}`} suffix="blocks" />
    </div>
  );
}
