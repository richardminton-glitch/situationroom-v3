'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { C, FONT } from './constants';

const CANDLE_LIMIT = 96;
const CANDLE_POLL_MS = 30_000;
const POOL_POLL_MS = 60_000;

// Take-profit / stop-loss are bright signal colours that read well on both
// themes — kept hard-coded.
const TP_COLOUR = '#00c853';
const SL_COLOUR = '#d32f2f';

// ── Theme reader ───────────────────────────────────────────────────────────
//
// lightweight-charts paints into a canvas and so needs concrete colour
// strings, not CSS var references. Snapshot the active theme at init and
// re-apply whenever data-theme on <html> changes.

interface ChartTheme {
  bg:        string;
  text:      string;
  grid:      string;
  border:    string;
  crosshair: string;
  upCol:     string;
  downCol:   string;
  entry:     string;
}

function readChartTheme(): ChartTheme {
  if (typeof window === 'undefined') {
    return {
      bg: '#060a0d', text: 'rgba(232,237,242,0.55)', grid: 'rgba(255,255,255,0.04)',
      border: 'rgba(255,255,255,0.06)', crosshair: 'rgba(0,212,170,0.3)',
      upCol: '#00d4aa', downCol: '#ff6b4a', entry: 'rgba(255,255,255,0.7)',
    };
  }
  const cs = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) =>
    cs.getPropertyValue(name).trim() || fallback;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  // Subtle grid + axis lines: tinted versions of text on the active theme
  const tintHex   = isDark ? 'ffffff' : '000000';
  const grid      = `#${tintHex}0d`; // ~5% alpha on top of bg
  const border    = `#${tintHex}14`; // ~8% alpha
  // Crosshair: tinted accent, semi-transparent
  const accentHex = get('--room-accent', isDark ? '#00d4aa' : '#8b6914');
  // Entry-line: subdued text colour at ~70% alpha, theme-aware
  const entry     = isDark ? 'rgba(232,237,242,0.7)' : 'rgba(45,40,30,0.7)';

  return {
    bg:        get('--bg-primary',   '#060a0d'),
    text:      isDark ? 'rgba(232,237,242,0.55)' : 'rgba(45,40,30,0.65)',
    grid,
    border,
    crosshair: accentHex + '4d', // ~30% alpha
    upCol:     get('--room-positive', '#00d4aa'),
    downCol:   get('--room-negative', '#ff6b4a'),
    entry,
  };
}

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
    const t = readChartTheme();

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
        color: t.entry,
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
      const t = readChartTheme();

      const chart = lc.createChart(container, {
        layout: {
          background: { type: lc.ColorType.Solid, color: t.bg },
          textColor:  t.text,
          fontFamily: FONT,
          fontSize:   10,
        },
        grid: {
          vertLines: { color: t.grid },
          horzLines: { color: t.grid },
        },
        crosshair: {
          mode:     lc.CrosshairMode.Normal,
          vertLine: { color: t.crosshair, width: 1, style: lc.LineStyle.Dotted },
          horzLine: { color: t.crosshair, width: 1, style: lc.LineStyle.Dotted },
        },
        rightPriceScale: {
          borderColor:  t.border,
          scaleMargins: { top: 0.08, bottom: 0.08 },
        },
        timeScale: {
          borderColor:    t.border,
          timeVisible:    true,
          secondsVisible: false,
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true },
        handleScale:  { mouseWheel: true, pinch: true },
      });

      const series = chart.addSeries(lc.CandlestickSeries, {
        upColor:         t.upCol,
        downColor:       t.downCol,
        borderUpColor:   t.upCol,
        borderDownColor: t.downCol,
        wickUpColor:     t.upCol,
        wickDownColor:   t.downCol,
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

      // Re-apply theme whenever data-theme on <html> changes. Lightweight-
      // charts paints into a canvas so it can't pick up CSS-var changes on
      // its own — we have to hand it concrete colours each time.
      const applyTheme = () => {
        const next = readChartTheme();
        chart.applyOptions({
          layout:          { background: { type: lc.ColorType.Solid, color: next.bg }, textColor: next.text },
          grid:            { vertLines: { color: next.grid }, horzLines: { color: next.grid } },
          crosshair: {
            vertLine: { color: next.crosshair, width: 1, style: lc.LineStyle.Dotted },
            horzLine: { color: next.crosshair, width: 1, style: lc.LineStyle.Dotted },
          },
          rightPriceScale: { borderColor: next.border },
          timeScale:       { borderColor: next.border },
        });
        series.applyOptions({
          upColor:         next.upCol,
          downColor:       next.downCol,
          borderUpColor:   next.upCol,
          borderDownColor: next.downCol,
          wickUpColor:     next.upCol,
          wickDownColor:   next.downCol,
        });
        // Refresh entry-line colour on theme change
        updatePriceLines();
      };
      const themeObserver = new MutationObserver((records) => {
        for (const r of records) {
          if (r.type === 'attributes' && r.attributeName === 'data-theme') {
            applyTheme();
            return;
          }
        }
      });
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

      // Initial data fetch
      fetchCandles().then(fetchPool);

      // Store cleanup refs
      (container as any).__cleanup = () => {
        ro.disconnect();
        themeObserver.disconnect();
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
