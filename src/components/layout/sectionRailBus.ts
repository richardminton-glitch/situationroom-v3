// Lightweight bus for opening the active SectionRailFrame drawer from
// outside its own tree (e.g. the TopBar mobile menu). Only one rail is
// mounted at a time, so a window-level CustomEvent is enough — no store.

export const SECTION_RAIL_OPEN_EVENT = 'sr:open-section-rail';

export function openSectionRail(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SECTION_RAIL_OPEN_EVENT));
}
