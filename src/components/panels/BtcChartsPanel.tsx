'use client';

import { useState, useEffect, useCallback } from 'react';
import { ParchmentChart } from './charts/ParchmentChart';
import { PanelLoading } from './shared';
import { useTheme } from '@/components/layout/ThemeProvider';

interface ChartPoint {
  time: number;
  value: number;
}

interface ChartsData {
  btcPrice: ChartPoint[];
  hashrate: ChartPoint[];
  mvrv: ChartPoint[];
  exchange: ChartPoint[];
}

const PARCHMENT_COLORS = {
  price: '#3e2c1a',
  hashrate: '#b87333',
  mvrv: '#4a6741',
  exchange: '#6b4c8a',
};

const DARK_COLORS = {
  price: '#00d4c8',
  hashrate: '#c4885a',
  mvrv: '#5bbfb8',
  exchange: '#8aaba6',
};

export function BtcChartsPanel() {
  const [data, setData] = useState<ChartsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const colors = theme === 'dark' ? DARK_COLORS : PARCHMENT_COLORS;

  const fetchCharts = useCallback(async () => {
    try {
      const res = await fetch('/api/data/charts');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchCharts();
    const interval = setInterval(fetchCharts, 300_000); // 5 min
    return () => clearInterval(interval);
  }, [fetchCharts]);

  if (loading) return <PanelLoading />;
  if (!data) return <PanelLoading />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 gap-2" style={{ height: '100%', minHeight: '320px' }}>
      <div style={{ minHeight: '140px' }}>
        <ParchmentChart
          data={data.btcPrice}
          title="BTC / USD — 30 Day"
          color={colors.price}
          theme={theme}
          yFormat={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(0)}`}
        />
      </div>
      <div style={{ minHeight: '140px' }}>
        <ParchmentChart
          data={data.hashrate}
          title="Hashrate — 30 Day (EH/s)"
          color={colors.hashrate}
          theme={theme}
          yFormat={(v) => `${v.toFixed(0)} EH/s`}
        />
      </div>
      <div style={{ minHeight: '140px' }}>
        <ParchmentChart
          data={data.mvrv}
          title="MVRV Z-Score — 90 Day"
          color={colors.mvrv}
          theme={theme}
          yFormat={(v) => v.toFixed(2)}
          refLines={[
            { value: 1.0, label: 'Undervalued' },
            { value: 3.5, label: 'Overheated' },
          ]}
        />
      </div>
      <div style={{ minHeight: '140px' }}>
        <ParchmentChart
          data={data.exchange}
          title="Exchange Balance — 30 Day (K BTC)"
          color={colors.exchange}
          theme={theme}
          yFormat={(v) => `${v.toFixed(0)}K`}
        />
      </div>
    </div>
  );
}
