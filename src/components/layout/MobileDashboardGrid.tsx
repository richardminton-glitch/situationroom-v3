'use client';

import type { LayoutPanelItem } from '@/lib/panels/layouts';
import { getPanelById } from '@/lib/panels/registry';
import { PANEL_COMPONENTS } from '@/components/panels';

interface MobileDashboardGridProps {
  layout: LayoutPanelItem[];
}

// Shared mobile ordering across all dashboard presets (default, full-data, custom).
// Grouping: Bitcoin block first, then markets, intel, macro, tickers.
// Panel IDs not listed fall to the end in their original layout order.
const MOBILE_PANEL_ORDER = [
  // Bitcoin block — prominent at top
  'btc-hero',
  'globe',
  'btc-market',
  'btc-network',
  'btc-mining',
  'fear-greed',
  'lightning',
  'onchain-sentiment',
  'conviction',
  'btc-charts',
  // Markets
  'market-indices',
  'commodities',
  // Intelligence
  'intel-feed',
  'ai-briefing',
  // Macro
  'fx-macro',
  'central-bank',
  // Tickers / bars — bottom
  'economic-events',
  'tikr',
  'wire',
] as const;

/**
 * MobileDashboardGrid — replaces the react-rnd canvas on mobile.
 * Renders panels as a vertically stacked, scrollable list of cards
 * in an explicit topic-grouped order (Bitcoin → markets → intel → macro → tickers).
 * Panels not listed in MOBILE_PANEL_ORDER fall to the end.
 */
export function MobileDashboardGrid({ layout }: MobileDashboardGridProps) {
  const orderIndex = (panelId: string) => {
    const base = panelId.replace(/-\d+$/, '');
    const idx = MOBILE_PANEL_ORDER.indexOf(base as typeof MOBILE_PANEL_ORDER[number]);
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  };
  const sorted = [...layout].sort((a, b) => orderIndex(a.panelId) - orderIndex(b.panelId));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
      {sorted.map((item) => {
        const entry = getPanelById(item.panelId);
        if (!entry) return null;

        // Skip separator UI components on mobile — they're decorative
        if (entry.uiComponent) return null;

        const componentKey = item.panelId.replace(/-\d+$/, '');
        const PanelComponent = PANEL_COMPONENTS[componentKey] ?? PANEL_COMPONENTS[item.panelId];
        if (!PanelComponent) return null;

        const isBar = !!entry.noHeader && !entry.uiComponent;

        // Bars (wire, tikr, economic-events) render as full-width strips
        if (isBar) {
          return (
            <div key={item.panelId} className="panel-card panel-bar" style={{ height: '44px', overflow: 'hidden' }}>
              <PanelComponent />
            </div>
          );
        }

        // Regular panels — card with header + body
        return (
          <div key={item.panelId} className="panel-card">
            {/* Panel header */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <h3
                className="font-medium uppercase tracking-wider truncate flex-1"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--text-panel-title)',
                  letterSpacing: '0.08em',
                  fontSize: '11px',
                }}
              >
                {entry.name.includes(' — ') ? entry.name.split(' — ')[0] : entry.name}
              </h3>
              {entry.name.includes(' — ') && (
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.06em',
                    fontSize: '9px',
                    textTransform: 'uppercase',
                  }}
                >
                  {entry.name.split(' — ')[1]}
                </span>
              )}
            </div>
            <div style={{ margin: '0 10px', height: '1px', backgroundColor: 'var(--border-primary)' }} />

            {/* Panel body */}
            <div className="px-3 py-2" style={{ minHeight: entry.resizable ? '200px' : undefined }}>
              <PanelComponent />
            </div>
          </div>
        );
      })}
    </div>
  );
}
