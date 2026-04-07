'use client';

import { useData } from '@/components/layout/DataProvider';
import { TickerRow, PanelLoading } from './shared';

const DISPLAY_ORDER: { id: string; name: string; exchange: string }[] = [
  { id: 'gold',        name: 'GOLD',      exchange: 'commodity' },
  { id: 'silver',      name: 'SILVER',    exchange: 'commodity' },
  { id: 'crude-oil',   name: 'CRUDE OIL', exchange: 'commodity' },
  { id: 'natural-gas', name: 'NAT GAS',   exchange: 'commodity' },
  { id: 'copper',      name: 'COPPER',    exchange: 'commodity' },
  // DXY trades on ICE futures (~23h/day Mon–Fri), not the spot FX market
  { id: 'dxy',         name: 'DXY',       exchange: 'futures' },
  // US Treasury yields shown here come from CBOT futures, which trade nearly
  // 24h Sun 23:00 UTC → Fri 22:00 UTC. Tagging as 'us' would have shown them
  // as closed for 18 hours a day, even though the displayed value is live.
  { id: 'us10y',       name: 'US 10Y',    exchange: 'futures' },
  { id: 'us2y',        name: 'US 2Y',     exchange: 'futures' },
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
