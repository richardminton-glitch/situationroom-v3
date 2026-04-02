'use client';

import { useData } from '@/components/layout/DataProvider';
import { DataRow, formatPrice, formatLargeNumber, PanelLoading } from './shared';

export function LightningPanel() {
  const { data, loading } = useData();

  if (loading || !data?.lightning) return <PanelLoading />;

  const ln = data.lightning;

  return (
    <div>
      <DataRow label="Channels"     value={formatLargeNumber(ln.channels)} />
      <DataRow label="Capacity"     value={formatPrice(ln.capacityBTC, 1)} suffix="BTC" />
      <DataRow label="Nodes"        value={formatLargeNumber(ln.nodes)} />
      <DataRow label="Tor Nodes"    value={formatLargeNumber(ln.torNodes ?? 0)} />
      <DataRow label="Clearnet"     value={formatLargeNumber(ln.clearnetNodes ?? 0)} />
      <DataRow label="Avg Channel"  value={formatPrice(ln.avgChannelSize, 4)} suffix="BTC" />
      <DataRow label="Med Channel"  value={formatPrice(ln.medCapacityBTC ?? 0, 4)} suffix="BTC" />
    </div>
  );
}
