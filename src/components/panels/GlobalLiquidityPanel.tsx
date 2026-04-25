'use client';

/**
 * GlobalLiquidityPanel — dashboard panel wrapping the LiquidityChart.
 *
 * Fetches /api/data/global-liquidity and renders the dual-axis chart
 * (BTC log right, M2 composite linear left, shifted +84d). Panel chrome
 * comes from the dashboard host; this component just owns the chart.
 */

import { useEffect, useState } from 'react';
import { LiquidityChart } from '@/components/global-liquidity/LiquidityChart';
import { PanelLoading } from './shared';

interface BtcPoint { date: string; price: number }
interface IdxPoint { date: string; value: number }

interface ApiPayload {
  btc:        BtcPoint[];
  composite:  IdxPoint[];
  leadDays:   number;
}

export function GlobalLiquidityPanel() {
  const [data, setData]       = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/data/global-liquidity')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d: ApiPayload) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <PanelLoading />;

  if (error || !data) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: 11, padding: 12, textAlign: 'center',
      }}>
        {error ? `Liquidity data unavailable: ${error}` : 'No liquidity data'}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', padding: '8px 12px', overflow: 'hidden' }}>
      <LiquidityChart
        btc={data.btc}
        composite={data.composite}
        leadDays={data.leadDays}
      />
    </div>
  );
}
