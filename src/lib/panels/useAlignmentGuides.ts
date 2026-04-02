'use client';

import { useState, useCallback, useRef } from 'react';
import type { LayoutPanelItem } from './layouts';

export interface GuideLine {
  orientation: 'horizontal' | 'vertical';
  position: number; // px from canvas edge
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const SNAP_THRESHOLD = 6; // px — snap when within this distance

function panelToRect(p: LayoutPanelItem): Rect {
  return { left: p.x, top: p.y, right: p.x + p.w, bottom: p.y + p.h };
}

/**
 * Hook that calculates alignment snap targets and guide lines.
 * Call `calcSnap` during onDrag/onResize to get snapped position + active guides.
 */
export function useAlignmentGuides(allPanels: LayoutPanelItem[]) {
  const [guides, setGuides] = useState<GuideLine[]>([]);
  const panelsRef = useRef(allPanels);
  panelsRef.current = allPanels;

  const calcSnap = useCallback(
    (
      draggedId: string,
      x: number,
      y: number,
      w: number,
      h: number
    ): { x: number; y: number; guides: GuideLine[] } => {
      const others = panelsRef.current.filter((p) => p.panelId !== draggedId);
      const dragRect: Rect = { left: x, top: y, right: x + w, bottom: y + h };

      let snappedX = x;
      let snappedY = y;
      const activeGuides: GuideLine[] = [];

      // Collect all edge positions from other panels
      const vEdges: number[] = [];
      const hEdges: number[] = [];

      for (const p of others) {
        const r = panelToRect(p);
        vEdges.push(r.left, r.right);
        hEdges.push(r.top, r.bottom);
      }

      // Snap dragged panel's left/right edges to vertical edges
      for (const edge of vEdges) {
        // Left edge aligns
        if (Math.abs(dragRect.left - edge) < SNAP_THRESHOLD) {
          snappedX = edge;
          activeGuides.push({ orientation: 'vertical', position: edge });
          break;
        }
        // Right edge aligns
        if (Math.abs(dragRect.right - edge) < SNAP_THRESHOLD) {
          snappedX = edge - w;
          activeGuides.push({ orientation: 'vertical', position: edge });
          break;
        }
      }

      // Snap dragged panel's top/bottom edges to horizontal edges
      for (const edge of hEdges) {
        // Top edge aligns
        if (Math.abs(dragRect.top - edge) < SNAP_THRESHOLD) {
          snappedY = edge;
          activeGuides.push({ orientation: 'horizontal', position: edge });
          break;
        }
        // Bottom edge aligns
        if (Math.abs(dragRect.bottom - edge) < SNAP_THRESHOLD) {
          snappedY = edge - h;
          activeGuides.push({ orientation: 'horizontal', position: edge });
          break;
        }
      }

      return { x: snappedX, y: snappedY, guides: activeGuides };
    },
    []
  );

  const clearGuides = useCallback(() => setGuides([]), []);

  const updateGuides = useCallback((newGuides: GuideLine[]) => setGuides(newGuides), []);

  return { guides, calcSnap, clearGuides, updateGuides };
}
