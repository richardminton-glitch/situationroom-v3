'use client';

import type { LayoutPanelItem } from '@/lib/panels/layouts';
import { getPanelById } from '@/lib/panels/registry';
import { PANEL_COMPONENTS } from '@/components/panels';

interface MobileDashboardGridProps {
  layout: LayoutPanelItem[];
}

/**
 * MobileDashboardGrid — replaces the react-rnd canvas on mobile.
 * Renders panels as a vertically stacked, scrollable list of cards
 * sorted in reading order (top-to-bottom, left-to-right from the desktop layout).
 */
export function MobileDashboardGrid({ layout }: MobileDashboardGridProps) {
  // Sort panels by y then x for natural reading order
  const sorted = [...layout].sort((a, b) => a.y - b.y || a.x - b.x);

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
