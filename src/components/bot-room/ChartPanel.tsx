'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { C, FONT, MOCK_BOT_STATE, type BotState } from './constants';

// ── TradingView type declarations ─────────────────────────────────────────────
declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => TradingViewWidget;
    };
  }
}

interface TradingViewWidget {
  onChartReady: (cb: () => void) => void;
  save: (cb: (state: Record<string, unknown>) => void) => void;
  load: (state: Record<string, unknown>) => void;
  activeChart: () => {
    onIntervalChanged: () => { subscribe: (id: string | null, cb: () => void) => void };
    onSymbolChanged: () => { subscribe: (id: string | null, cb: () => void) => void };
  };
  subscribe: (event: string, cb: () => void) => void;
  remove: () => void;
}

// ── Debounced save helper ─────────────────────────────────────────────────────
let _saveTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(widget: TradingViewWidget, persistFn: (state: Record<string, unknown>) => void) {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try {
      widget.save((state: Record<string, unknown>) => {
        persistFn(state);
      });
    } catch {
      // Widget may have been removed
    }
  }, 2000);
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ChartPanel({ state = MOCK_BOT_STATE }: { state?: BotState }) {
  const { user, updateUser } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<TradingViewWidget | null>(null);
  const scriptLoadedRef = useRef(false);

  const posLabel =
    state.position === 'FLAT'
      ? 'FLAT'
      : `NET ${state.position} ${(state.poolBalance * state.leverage * 100 / 100).toFixed(4)}%`;
  const posColor =
    state.position === 'LONG' ? C.teal : state.position === 'SHORT' ? C.coral : C.textDim;

  // Persist chart state to API + update local auth context
  const persistChartState = useCallback((chartState: Record<string, unknown>) => {
    // Optimistic local update
    updateUser({ tvChartState: chartState });

    // Persist to server
    fetch('/api/user/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tvChartState: chartState }),
    }).catch(() => {});
  }, [updateUser]);

  useEffect(() => {
    if (!containerRef.current) return;

    const containerId = 'tv-chart-container';

    function createWidget() {
      if (!window.TradingView || !containerRef.current) return;

      // Clean up previous widget
      if (widgetRef.current) {
        try { widgetRef.current.remove(); } catch { /* noop */ }
        widgetRef.current = null;
      }

      const savedState = user?.tvChartState as Record<string, unknown> | null;

      const config: Record<string, unknown> = {
        container_id: containerId,
        autosize: true,
        symbol: 'BITSTAMP:BTCUSD',
        interval: '5',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        toolbar_bg: '#060a0d',
        hide_top_toolbar: false,
        hide_legend: false,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        save_image: false,
        details: false,
        hotlist: false,
        calendar: false,
        withdateranges: false,
        enable_publishing: false,
        hide_volume: false,
        locale: 'en',
        // Restore saved state if available
        ...(savedState ? { saved_data: savedState } : {}),
        // Disable features that don't apply
        disabled_features: [
          'header_symbol_search',
          'header_compare',
          'display_market_status',
          'popup_hints',
        ],
        enabled_features: [
          'side_toolbar_in_fullscreen_mode',
        ],
        overrides: {
          'paneProperties.background': '#060a0d',
          'paneProperties.backgroundType': 'solid',
          'mainSeriesProperties.candleStyle.upColor': '#00d4aa',
          'mainSeriesProperties.candleStyle.downColor': '#ff6b4a',
          'mainSeriesProperties.candleStyle.borderUpColor': '#00d4aa',
          'mainSeriesProperties.candleStyle.borderDownColor': '#ff6b4a',
          'mainSeriesProperties.candleStyle.wickUpColor': '#00d4aa',
          'mainSeriesProperties.candleStyle.wickDownColor': '#ff6b4a',
          'scalesProperties.textColor': '#8494a7',
          'scalesProperties.lineColor': '#0d1e28',
        },
      };

      const widget = new window.TradingView.widget(config);
      widgetRef.current = widget;

      widget.onChartReady(() => {
        // Auto-save on any chart change (interval, study, drawing)
        const saveCb = () => debouncedSave(widget, persistChartState);

        try {
          // Subscribe to chart events for auto-save
          widget.subscribe('onAutoSaveNeeded', saveCb);
          widget.activeChart().onIntervalChanged().subscribe(null, saveCb);
        } catch {
          // Some events may not be available in all widget versions
        }
      });
    }

    // Load TradingView library if not already loaded
    if (window.TradingView && scriptLoadedRef.current) {
      createWidget();
    } else if (!scriptLoadedRef.current) {
      scriptLoadedRef.current = true;
      const script = document.createElement('script');
      script.src = 'https://s.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => createWidget();
      document.head.appendChild(script);
    }

    return () => {
      if (_saveTimer) clearTimeout(_saveTimer);
      if (widgetRef.current) {
        try { widgetRef.current.remove(); } catch { /* noop */ }
        widgetRef.current = null;
      }
    };
    // Only re-create widget if user identity changes (not on every tvChartState update)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
            ● {posLabel}
          </span>
          <span style={{ fontSize: '10px', color: C.textPrimary, letterSpacing: '0.04em' }}>
            BTCUSD · 5M
          </span>
        </div>
        {state.entryPrice && (
          <span style={{
            fontSize: '10px', color: C.textPrimary, padding: '2px 7px',
            background: C.bgElevated, border: `1px solid ${C.borderSoft}`,
          }}>
            Entry ${state.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* TradingView Widget Container */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div
          id="tv-chart-container"
          ref={containerRef}
          style={{ position: 'absolute', inset: 0 }}
        />
      </div>
    </div>
  );
}
