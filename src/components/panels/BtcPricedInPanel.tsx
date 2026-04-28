'use client';

import { useData } from '@/components/layout/DataProvider';
import { DataRow, formatLargeNumber, PanelLoading } from './shared';

const ITEMS: { id: string; label: string; unit: string }[] = [
  { id: 'gold',        label: 'BTC in Gold',    unit: 'oz' },
  { id: 'silver',      label: 'BTC in Silver',  unit: 'oz' },
  { id: 'crude-oil',   label: 'BTC in Oil',     unit: 'bbl' },
  { id: 'natural-gas', label: 'BTC in NatGas',  unit: 'MMBtu' },
  { id: 'copper',      label: 'BTC in Copper',  unit: 'lb' },
];

function formatRatio(n: number): string {
  if (!isFinite(n) || n <= 0) return '—';
  if (n >= 1000) return formatLargeNumber(n);
  if (n >= 100)  return n.toFixed(0);
  if (n >= 10)   return n.toFixed(1);
  return n.toFixed(2);
}

export function BtcPricedInPanel() {
  const { data, loading } = useData();

  if (loading || !data?.btcMarket) return <PanelLoading />;

  const btc = data.btcMarket.price;
  const c = data.commodities ?? {};

  return (
    <div>
      {ITEMS.map(({ id, label, unit }) => {
        const price = c[id]?.price;
        const ratio = price && price > 0 ? btc / price : 0;
        return (
          <DataRow
            key={id}
            label={label}
            value={formatRatio(ratio)}
            suffix={unit}
          />
        );
      })}
    </div>
  );
}
