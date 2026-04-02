'use client';

import { useData } from '@/components/layout/DataProvider';
import { TickerRow, PanelLoading } from './shared';

const INDEX_ORDER: { id: string; name: string; exchange: string }[] = [
  { id: 'sp500', name: 'S&P 500', exchange: 'us' },
  { id: 'nasdaq', name: 'NASDAQ', exchange: 'us' },
  { id: 'dji', name: 'DOW', exchange: 'us' },
  { id: 'ftse', name: 'FTSE 100', exchange: 'uk' },
  { id: 'dax', name: 'DAX', exchange: 'eu' },
  { id: 'nikkei', name: 'NIKKEI', exchange: 'jp' },
  { id: 'hsi', name: 'HANG SENG', exchange: 'hk' },
  { id: 'vix', name: 'VIX', exchange: 'us' },
];

export function IndicesPanel() {
  const { data, loading } = useData();

  if (loading || !data?.indices) return <PanelLoading />;

  return (
    <div>
      {INDEX_ORDER.map(({ id, name, exchange }) => {
        const d = data.indices?.[id];
        if (!d) return null;
        return (
          <TickerRow key={id} name={name} price={d.price} changePct={d.changePct} exchange={exchange} />
        );
      })}
    </div>
  );
}
