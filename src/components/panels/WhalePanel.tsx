'use client';

import { useData } from '@/components/layout/DataProvider';
import { formatPrice, formatLargeNumber, timeAgo, PanelLoading } from './shared';

export function WhalePanel() {
  const { data, loading } = useData();

  if (loading || !data?.whales) return <PanelLoading />;

  if (data.whales.length === 0) {
    return (
      <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
        No whale transactions detected
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {data.whales.map((tx) => (
        <div
          key={tx.txid}
          className="flex items-center justify-between py-1.5"
          style={{ borderBottom: '1px dotted var(--border-subtle)' }}
        >
          <div>
            <a
              href={`https://mempool.space/tx/${tx.txid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs hover:underline"
              style={{ fontFamily: 'var(--font-data)', color: 'var(--accent-primary)' }}
            >
              {tx.txid.slice(0, 8)}…
            </a>
            <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
              {timeAgo(tx.time)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm" style={{ fontFamily: 'var(--font-data)', color: 'var(--text-primary)' }}>
              {formatPrice(tx.valueBTC, 2)} BTC
            </span>
            <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
              ${formatLargeNumber(tx.valueUSD)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
