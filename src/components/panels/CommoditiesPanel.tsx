'use client';

import { useData } from '@/components/layout/DataProvider';
import { TickerRow, PanelLoading } from './shared';

const DISPLAY_ORDER: { id: string; name: string; exchange: string }[] = [
  { id: 'gold', name: 'GOLD', exchange: 'commodity' },
  { id: 'silver', name: 'SILVER', exchange: 'commodity' },
  { id: 'crude-oil', name: 'CRUDE OIL', exchange: 'commodity' },
  { id: 'natural-gas', name: 'NAT GAS', exchange: 'commodity' },
  { id: 'copper', name: 'COPPER', exchange: 'commodity' },
  { id: 'dxy', name: 'DXY', exchange: 'fx' },
  { id: 'us10y', name: 'US 10Y', exchange: 'us' },
  { id: 'us2y', name: 'US 2Y', exchange: 'us' },
];

export function CommoditiesPanel() {
  const { data, loading } = useData();

  if (loading || !data?.commodities) return <PanelLoading />;

  return (
    <div>
      {DISPLAY_ORDER.map(({ id, name, exchange }) => {
        const d = data.commodities?.[id];
        if (!d) return null;
        return (
          <TickerRow key={id} name={name} price={d.price} changePct={d.changePct} exchange={exchange} />
        );
      })}
    </div>
  );
}
