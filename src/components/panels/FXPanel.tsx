'use client';

import { useData } from '@/components/layout/DataProvider';
import { TickerRow, PanelLoading } from './shared';

const FX_ORDER: { id: string; exchange: string }[] = [
  { id: 'eur', exchange: 'fx' },
  { id: 'gbp', exchange: 'fx' },
  { id: 'jpy', exchange: 'fx' },
  { id: 'cny', exchange: 'fx' },
];

export function FXPanel() {
  const { data, loading } = useData();

  if (loading || !data?.fx) return <PanelLoading />;

  return (
    <div>
      {FX_ORDER.map(({ id, exchange }) => {
        const d = data.fx?.[id];
        if (!d) return null;
        return (
          <TickerRow key={id} name={d.name} price={d.price} changePct={d.changePct} exchange={exchange} />
        );
      })}
    </div>
  );
}
