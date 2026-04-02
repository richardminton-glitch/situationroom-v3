'use client';

import { useCallback, useMemo, useRef } from 'react';
import { Rnd } from 'react-rnd';
import type { LayoutPanelItem } from '@/lib/panels/layouts';
import { getPanelById } from '@/lib/panels/registry';
import { PANEL_COMPONENTS } from '@/components/panels';
import { useAlignmentGuides } from '@/lib/panels/useAlignmentGuides';
import { AlignmentGuides } from './AlignmentGuides';

const GRID_SNAP = 44; // matches the 44px visual grid lines
const snapRound = (v: number) => Math.round(v / GRID_SNAP) * GRID_SNAP;

interface DashboardGridProps {
  layout: LayoutPanelItem[];
  onLayoutChange?: (layout: LayoutPanelItem[]) => void;
  editable?: boolean;
}

export function DashboardGrid({ layout, onLayoutChange, editable = false }: DashboardGridProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { guides, calcSnap, clearGuides, updateGuides } = useAlignmentGuides(layout);

  // Canvas must be large enough to contain all panels.
  // Full-width bars (noHeader) are excluded from maxW — they stretch to fill the canvas.
  const canvasSize = useMemo(() => {
    let maxW = 0;
    let maxH = 0;
    for (const p of layout) {
      const entry = getPanelById(p.panelId);
      if (!entry?.noHeader) maxW = Math.max(maxW, p.x + p.w + 40);
      maxH = Math.max(maxH, p.y + p.h + 40);
    }
    return { width: Math.max(maxW, 1200), height: Math.max(maxH, 800) };
  }, [layout]);

  const updatePanel = useCallback(
    (panelId: string, updates: Partial<LayoutPanelItem>) => {
      if (!onLayoutChange) return;
      onLayoutChange(layout.map((p) => (p.panelId === panelId ? { ...p, ...updates } : p)));
    },
    [layout, onLayoutChange]
  );

  const removePanel = useCallback(
    (panelId: string) => {
      if (!onLayoutChange) return;
      onLayoutChange(layout.filter((p) => p.panelId !== panelId));
    },
    [layout, onLayoutChange]
  );

  const toggleCollapse = useCallback(
    (panelId: string) => {
      const panel = layout.find((p) => p.panelId === panelId);
      if (!panel || !onLayoutChange) return;
      onLayoutChange(
        layout.map((p) =>
          p.panelId === panelId ? { ...p, collapsed: !p.collapsed, h: p.collapsed ? (getPanelById(panelId)?.defaultH ?? 200) : 44 } : p
        )
      );
    },
    [layout, onLayoutChange]
  );

  return (
    <div
      ref={canvasRef}
      className="relative"
      style={{ width: canvasSize.width, height: canvasSize.height, minWidth: '100%', minHeight: '100%' }}
    >
      <AlignmentGuides guides={guides} />

      {layout.map((item) => {
        const entry = getPanelById(item.panelId);
        if (!entry) return null;
        const PanelComponent = PANEL_COMPONENTS[item.panelId];

        return (
          <Rnd
            key={item.panelId}
            position={{ x: item.x, y: item.y }}
            size={{ width: entry.noHeader ? canvasSize.width : item.w, height: item.collapsed ? 44 : item.h }}
            minWidth={entry.minW}
            minHeight={item.collapsed ? 44 : entry.minH}
            dragGrid={[GRID_SNAP, GRID_SNAP]}
            resizeGrid={[GRID_SNAP, GRID_SNAP]}
            bounds={false as unknown as string}
            enableResizing={editable && !item.collapsed && item.resizable
              ? (entry.noHeader
                ? { right: true, top: false, bottom: false, left: false, topRight: false, topLeft: false, bottomRight: false, bottomLeft: false }
                : true)
              : false}
            disableDragging={!editable}
            onDrag={(_e, d) => {
              const result = calcSnap(item.panelId, d.x, d.y, item.w, item.collapsed ? 44 : item.h);
              updateGuides(result.guides);
            }}
            onDragStop={(_e, d) => {
              // Apply edge snap, then grid-round as safety net
              const result = calcSnap(item.panelId, d.x, d.y, item.w, item.collapsed ? 44 : item.h);
              updatePanel(item.panelId, { x: snapRound(result.x), y: snapRound(result.y) });
              clearGuides();
            }}
            onResizeStop={(_e, _dir, ref, _delta, position) => {
              updatePanel(item.panelId, {
                x: snapRound(position.x),
                y: snapRound(position.y),
                w: snapRound(parseInt(ref.style.width, 10)),
                h: snapRound(parseInt(ref.style.height, 10)),
              });
              clearGuides();
            }}
            onResize={(_e, _dir, _ref, _delta, position) => {
              const w = parseInt(_ref.style.width, 10);
              const h = parseInt(_ref.style.height, 10);
              const result = calcSnap(item.panelId, position.x, position.y, w, h);
              updateGuides(result.guides);
            }}
            className={`panel-card${entry.noHeader ? ' panel-bar' : ''}${editable ? ' panel-editing' : ''}`}
            style={{
              zIndex: 1,
              cursor: 'default',
            }}
            resizeHandleStyles={{
              bottomRight: { cursor: 'nwse-resize' },
              bottomLeft: { cursor: 'nesw-resize' },
              topRight: { cursor: 'nesw-resize' },
              topLeft: { cursor: 'nwse-resize' },
              right: { cursor: 'ew-resize' },
              left: { cursor: 'ew-resize' },
              top: { cursor: 'ns-resize' },
              bottom: { cursor: 'ns-resize' },
            }}
          >
            {/* Panel header — skip for noHeader panels (ticker bars) */}
            {!entry.noHeader && (
              <div
                className="select-none"
                style={{ cursor: 'grab' }}
              >
              <div
                className="flex items-center justify-between px-3 py-1.5"
              >
                <h3
                  className="font-medium uppercase tracking-wider truncate flex-1"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    color: 'var(--text-panel-title)',
                    letterSpacing: '0.08em',
                    fontSize: '11px',
                  }}
                >
                  {entry.name.includes(' — ')
                    ? entry.name.split(' — ')[0]
                    : entry.name}
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
                <div className="flex items-center gap-1 shrink-0">
                  {item.resizable && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.4 }} title="Resizable">
                      ⤡
                    </span>
                  )}
                  {editable && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removePanel(item.panelId); }}
                      className="p-0.5 text-xs hover:opacity-80"
                      style={{ color: 'var(--text-muted)' }}
                      title="Remove panel"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div style={{ margin: '0 10px', height: '1px', backgroundColor: 'var(--border-primary)' }} />
              </div>
            )}

            {/* Remove button for noHeader panels (ticker bars) in edit mode */}
            {entry.noHeader && editable && (
              <button
                onClick={(e) => { e.stopPropagation(); removePanel(item.panelId); }}
                className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center text-xs hover:opacity-80 rounded"
                style={{ color: 'var(--text-muted)', zIndex: 5, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
                title="Remove panel"
              >
                ✕
              </button>
            )}

            {/* Panel body */}
            {!item.collapsed && (
              <div
                className={entry.noHeader ? '' : 'px-3 py-2'}
                style={
                  entry.noHeader
                    ? { height: '100%' }
                    : item.resizable
                      ? { height: 'calc(100% - 32px)', overflow: 'hidden' }
                      : {}
                }
              >
                {PanelComponent ? <PanelComponent /> : (
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>
                    {entry.description}
                  </p>
                )}
              </div>
            )}
          </Rnd>
        );
      })}
    </div>
  );
}
