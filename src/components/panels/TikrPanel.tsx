'use client';

import { useData } from '@/components/layout/DataProvider';
import { formatPrice, formatPct, pctColor } from './shared';

const EQUITY_ORDER = ['ibit', 'fbtc', 'arkb', 'bitb', 'hodl', 'mstr', 'coin', 'mara', 'riot', 'clsk', 'hut'];

export function TikrPanel() {
  const { data } = useData();
  const equities = data?.btcEquities;

  const items = EQUITY_ORDER.map((id) => {
    const eq = equities?.[id];
    return {
      symbol: id.toUpperCase(),
      price: eq?.price ?? null,
      changePct: eq?.changePct ?? null,
    };
  });

  // Duplicate for seamless loop
  const allItems = [...items, ...items];

  return (
    <div className="flex items-center gap-0 h-full">
      <div
        className="shrink-0 px-3 text-xs uppercase tracking-wider font-medium"
        style={{
          color: 'var(--border-primary)',
          fontFamily: 'var(--font-heading)',
          letterSpacing: '0.08em',
          fontSize: '10px',
          minWidth: '40px',
        }}
      >
        Tikr
      </div>
      <div className="ticker-track">
        <div className="ticker-content">
          {allItems.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1.5" style={{ fontSize: '11px' }}>
              <span
                className="uppercase font-medium"
                style={{ color: 'var(--text-secondary)', fontSize: '10px', letterSpacing: '0.04em' }}
              >
                {item.symbol}
              </span>
              {item.price != null ? (
                <>
                  <span style={{ fontFamily: 'var(--font-data)', color: 'var(--text-primary)' }}>
                    ${formatPrice(item.price, item.price >= 1000 ? 0 : 2)}
                  </span>
                  <span style={{ fontFamily: 'var(--font-data)', color: pctColor(item.changePct), fontSize: '10px' }}>
                    {formatPct(item.changePct)}
                  </span>
                </>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'var(--font-data)' }}>—</span>
              )}
              <span style={{ color: 'var(--border-primary)', margin: '0 6px', fontSize: '8px' }}>|</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
