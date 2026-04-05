'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { C, FONT } from './constants';

const CANDLE_LIMIT = 96;
const CANDLE_POLL_MS = 30_000;
const POOL_POLL_MS = 60_000;

const TP_COLOUR = '#00ff41';
const SL_COLOUR = '#ff3333';
const ENTRY_COLOUR = 'rgba(255,255,255,0.7)';

interface PoolData {
  position: 'LONG' | 'SHORT' | 'FLAT';
  leverage: number;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  poolBalanceBtc: number;
}

export function ChartPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceLinesRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lcRef = useRef<any>(null); // lightweight-charts module
  const poolRef = useRef<PoolData>({
    position: 'FLAT', leverage: 0, entryPrice: null,
    stopLoss: null, takeProfit: null, poolBalanceBtc: 0,
  });

  const [position, setPosition] = useState<'LONG' | 'SHORT' | 'FLAT'>('FLAT');
  const [leverage, setLeverage] = useState(0);
  const [poolBalance, setPoolBalance] = useState(0);

  // Update price lines on chart
  const updatePriceLines = useCallback(() => {
    const series = seriesRef.current;
    const lc = lcRef.current;
    if (!series || !lc) return;

    // Remove old lines
    for (const line of priceLinesRef.current) {
      series.removePriceLine(line);
    }
    priceLinesRef.current = [];

    const pool = poolRef.current;
    if (pool.position === 'FLAT') return;

    if (pool.takeProfit) {
      priceLinesRef.current.push(series.createPriceLine({
        price: pool.takeProfit,
        color: TP_COLOUR,
        lineWidth: 1,
        lineStyle: lc.LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'TP',
      }));
    }

    if (pool.entryPrice) {
      priceLinesRef.current.push(series.createPriceLine({
        price: pool.entryPrice,
        color: ENTRY_COLOUR,
        lineWidth: 1,
        lineStyle: lc.LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Entry',
      }));
    }

    if (pool.stopLoss) {
      priceLinesRef.current.push(series.createPriceLine({
        price: pool.stopLoss,
        color: SL_COLOUR,
        lineWidth: 1,
        lineStyle: lc.LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'SL',
      }));
    }
  }, []);

  // Fetch pool status
  const fetchPool = useCallback(async () => {
    try {
      const res = await fetch('/api/pool/status');
      if (!res.ok) return;
      const data = await res.json();
      if (data.error) return;
      const pd: PoolData = {
        position: data.position ?? 'FLAT',
        leverage: data.leverage ?? 0,
        entryPrice: data.entryPrice ?? null,
        stopLoss: data.stopLoss ?? null,
        takeProfit: data.takeProfit ?? null,
        poolBalanceBtc: data.poolBalanceBtc ?? 0,
      };
      poolRef.current = pd;
      setPosition(pd.position);
      setLeverage(pd.leverage);
      setPoolBalance(pd.poolBalanceBtc);
      updatePriceLines();
    } catch { /* silent */ }
  }, [updatePriceLines]);

  // Fetch candle data
  const fetchCandles = useCallback(async () => {
    const series = seriesRef.current;
    if (!series) return;
    try {
      const res = await fetch(`/api/lnm/candles?interval=5&limit=${CANDLE_LIMIT}`);
      if (!res.ok) return;
      const candles = await res.json();
      if (!Array.isArray(candles) || candles.length === 0) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = candles
        .filter((c: { open: number | null }) => c.open != null)
        .map((c: { time: string; open: number; high: number; low: number; close: number }) => ({
          time: Math.floor(new Date(c.time).getTime() / 1000),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
        .sort((a: { time: number }, b: { time: number }) => a.time - b.time);

      if (formatted.length > 0) {
        series.setData(formatted);
      }
    } catch { /* silent */ }
  }, []);

  // Init chart — dynamic import to avoid SSR crash
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    import('lightweight-charts').then((lc) => {
      if (cancelled) return;
      lcRef.current = lc;

      const chart = lc.createChart(container, {
        layout: {
          background: { type: lc.ColorType.Solid, color: C.bgPrimary },
          textColor: 'rgba(255,255,255,0.35)',
          fontFamily: FONT,
          fontSize: 10,
        },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.04)' },
          horzLines: { color: 'rgba(255,255,255,0.04)' },
        },
        crosshair: {
          mode: lc.CrosshairMode.Normal,
          vertLine: { color: 'rgba(0,212,170,0.3)', width: 1, style: lc.LineStyle.Dotted },
          horzLine: { color: 'rgba(0,212,170,0.3)', width: 1, style: lc.LineStyle.Dotted },
        },
        rightPriceScale: {
          borderColor: 'rgba(255,255,255,0.06)',
          scaleMargins: { top: 0.08, bottom: 0.08 },
        },
        timeScale: {
          borderColor: 'rgba(255,255,255,0.06)',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true },
        handleScale: { mouseWheel: true, pinch: true },
      });

      const series = chart.addSeries(lc.CandlestickSeries, {
        upColor: C.teal,
        downColor: C.coral,
        borderUpColor: C.teal,
        borderDownColor: C.coral,
        wickUpColor: C.teal,
        wickDownColor: C.coral,
      });

      chartRef.current = chart;
      seriesRef.current = series;

      // Responsive resize
      const ro = new ResizeObserver(() => {
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          chart.resize(rect.width, rect.height);
        }
      });
      ro.observe(container);
      // Initial resize — retry on next frame if container hasn't laid out yet
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        chart.resize(container.clientWidth, container.clientHeight);
      } else {
        requestAnimationFrame(() => {
          chart.resize(container.clientWidth, container.clientHeight);
        });
      }

      // Initial data fetch
      fetchCandles().then(fetchPool);

      // Store cleanup refs
      (container as any).__cleanup = () => {
        ro.disconnect();
        chart.remove();
        chartRef.current = null;
        seriesRef.current = null;
      };
    });

    // Polling
    const candleInterval = setInterval(fetchCandles, CANDLE_POLL_MS);
    const poolInterval = setInterval(fetchPool, POOL_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(candleInterval);
      clearInterval(poolInterval);
      if ((container as any).__cleanup) {
        (container as any).__cleanup();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const posLabel =
    position === 'FLAT'
      ? 'FLAT'
      : `NET ${position} ${(poolBalance * leverage * 100 / 100).toFixed(4)}%`;
  const posColor =
    position === 'LONG' ? C.teal : position === 'SHORT' ? C.coral : C.textDim;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: C.bgPrimary }}>
      {/* Header */}
      <div style={{
        height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 10px', borderBottom: `1px solid ${C.border}`, fontFamily: FONT,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '9px', color: posColor, padding: '1px 6px',
            background: `${posColor}11`, border: `1px solid ${posColor}33`,
            letterSpacing: '0.06em',
          }}>
            {'\u25CF'} {posLabel}
          </span>
          <span style={{ fontSize: '10px', color: C.textPrimary, letterSpacing: '0.04em' }}>
            BTCUSD {'\u00B7'} 5M
          </span>
        </div>
      </div>

      {/* Lightweight Charts container */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative' }} />
    </div>
  );
}
