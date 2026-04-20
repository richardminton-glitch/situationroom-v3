'use client';

/**
 * WorkspaceContext — bridge between the workspace page (which owns the
 * dashboard state) and the WorkspaceRail (which displays / mutates it).
 *
 * The page builds a `dashboardControls` object from its own state +
 * useSavedLayouts hook, then pushes it into this context via setControls in
 * an effect. The rail reads from the context. Until the page mounts, the
 * rail renders a small placeholder.
 *
 * This is a deliberately thin wrapper — Phase 2 keeps page.tsx as the owner
 * of dashboard state to avoid a deeper refactor of the canvas / preset /
 * custom-dashboard logic. A future pass can lift the state itself into the
 * layout if a second workspace page (e.g. /workspace/[dashboardId]) ever
 * needs to share it.
 */

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { LayoutPanelItem } from '@/lib/panels/layouts';

export interface CustomDashboard {
  id:    string;
  name:  string;
  panels: LayoutPanelItem[];
}

export interface SharedWithMe {
  shareId:      string;
  layoutId:     string;
  name:         string;
  panels:       LayoutPanelItem[];
  ownerDisplay: string;
}

export interface DashboardControls {
  presets:           { id: string; name: string; description: string }[];
  activePreset:      string;
  activeCustomId:    string | null;
  activeSharedId:    string | null;
  onSwitchPreset:    (id: string) => void;
  onSwitchCustom:    (dashboard: CustomDashboard) => void;
  onSwitchShared:    (shared: SharedWithMe) => void;
  editMode:          boolean;
  onToggleEdit:      () => void;
  customDashboards:  CustomDashboard[];
  sharedWithMe:      SharedWithMe[];
  canCreateDashboard: boolean;
  maxDashboards:     number;
  onCreateDashboard: (name: string) => void;
  onDeleteDashboard: (id: string) => void;
  onRenameDashboard: (id: string, name: string) => void;
  onShareDashboard:  (id: string) => void;
}

interface CtxValue {
  controls:    DashboardControls | null;
  setControls: (c: DashboardControls | null) => void;
}

const WorkspaceCtx = createContext<CtxValue>({
  controls:    null,
  setControls: () => {},
});

export function useWorkspaceControls(): CtxValue {
  return useContext(WorkspaceCtx);
}

export function WorkspaceContextProvider({ children }: { children: ReactNode }) {
  const [controls, setControls] = useState<DashboardControls | null>(null);
  return (
    <WorkspaceCtx.Provider value={{ controls, setControls }}>
      {children}
    </WorkspaceCtx.Provider>
  );
}
