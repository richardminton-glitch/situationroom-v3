'use client';

/**
 * WorkspaceRail — left rail for `/`. Switches between built-in dashboard
 * presets and (for VIP) custom dashboards. Pulls all state and actions from
 * WorkspaceContext, populated by the workspace page.
 *
 * Migrated from the in-Sidebar dashboard sub-menu (old src/components/layout/
 * Sidebar.tsx:319-550). Behaviour preserved 1:1; only the framing changed.
 */

import { useState } from 'react';
import { PencilSimple, Plus, Share } from '@phosphor-icons/react';
import { SectionRailFrame, useRailCollapsed } from './SectionRailFrame';
import { useWorkspaceControls } from '@/app/(app)/(workspace)/WorkspaceContext';
import type { CustomDashboard, DashboardControls, SharedWithMe } from '@/app/(app)/(workspace)/WorkspaceContext';
import { useTier } from '@/hooks/useTier';
import { TIER_LABELS } from '@/lib/auth/tier';
import type { Tier } from '@/types';

// Preset → required tier (null = free)
const PRESET_TIER: Record<string, Exclude<Tier, 'free'> | null> = {
  'default':           null,
  'full-data':         null,
  'macro-focus':       'general',
  'onchain-deep-dive': 'members',
  'ai':                'members',
};

export function WorkspaceRail() {
  return (
    <SectionRailFrame sectionKey="workspace" title="Workspace">
      <RailBody />
    </SectionRailFrame>
  );
}

function RailBody() {
  const collapsed = useRailCollapsed();
  const { controls } = useWorkspaceControls();

  // Page hasn't mounted yet — render a minimal placeholder. Avoids layout
  // jump while the context populates.
  if (!controls) {
    return (
      <div
        className="px-2 py-2 text-xs"
        style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
      >
        {collapsed ? '' : 'Loading…'}
      </div>
    );
  }

  return collapsed ? <CollapsedBody controls={controls} /> : <ExpandedBody controls={controls} />;
}

// ── Collapsed: just the active preset name as a vertical chip ──────────────
function CollapsedBody({ controls }: { controls: DashboardControls }) {
  const activeLabel =
    controls.activeCustomId
      ? controls.customDashboards.find((d) => d.id === controls.activeCustomId)?.name ?? '?'
      : controls.presets.find((p) => p.id === controls.activePreset)?.name ?? 'Default';

  return (
    <div
      className="flex items-center justify-center px-1 py-2"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        color: 'var(--text-muted)',
        letterSpacing: '0.08em',
        writingMode: 'vertical-rl',
        textOrientation: 'mixed',
        height: '100%',
      }}
      title={`Active layout: ${activeLabel}`}
    >
      {activeLabel.toUpperCase()}
    </div>
  );
}

// ── Expanded: full preset list + custom dashboards + edit toggle ───────────
function ExpandedBody({ controls }: { controls: DashboardControls }) {
  const { canAccess } = useTier();
  const [newDashName, setNewDashName] = useState('');
  const [showNewDash, setShowNewDash] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  return (
    <div className="space-y-3">
      {/* ── Preset layouts ── */}
      <div>
        <RailSubhead>Layouts</RailSubhead>
        <div className="space-y-0.5">
          {controls.presets.map((preset) => {
            const lockedTier = PRESET_TIER[preset.id];
            const isLocked = lockedTier !== null && lockedTier !== undefined && !canAccess(lockedTier);
            const isActive = controls.activeCustomId === null && controls.activePreset === preset.id;

            return (
              <button
                key={preset.id}
                onClick={() => controls.onSwitchPreset(preset.id)}
                className="flex items-center justify-between w-full text-left px-2 py-1 rounded text-xs transition-colors"
                style={{
                  backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                  color: isLocked ? 'var(--text-muted)' : isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
                  opacity: isLocked ? 0.6 : 1,
                  fontFamily: 'inherit',
                }}
                title={preset.description}
              >
                <span className="truncate">{preset.name}</span>
                {isLocked && lockedTier && (
                  <span style={{ fontSize: '9px', color: 'var(--accent-primary)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
                    {TIER_LABELS[lockedTier].toUpperCase()} ↑
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Custom dashboards (VIP only) ── */}
      {canAccess('vip') && (
        <div>
          <RailSubhead>Custom Dashboards</RailSubhead>
          <div className="space-y-0.5">
            {controls.customDashboards.map((cd: CustomDashboard) => {
              const isActive = controls.activeCustomId === cd.id;
              const isRenaming = renamingId === cd.id;

              return (
                <div key={cd.id} className="flex items-center group">
                  {isRenaming ? (
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && renameValue.trim()) {
                          controls.onRenameDashboard(cd.id, renameValue.trim());
                          setRenamingId(null);
                        }
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onBlur={() => {
                        if (renameValue.trim()) {
                          controls.onRenameDashboard(cd.id, renameValue.trim());
                        }
                        setRenamingId(null);
                      }}
                      className="flex-1 px-2 py-1 text-xs rounded"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--accent-primary)',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                      autoFocus
                    />
                  ) : (
                    <>
                      <button
                        onClick={() => controls.onSwitchCustom(cd)}
                        className="flex-1 text-left px-2 py-1 rounded text-xs transition-colors truncate"
                        style={{
                          backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                          border: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
                          fontFamily: 'inherit',
                        }}
                        title={cd.name}
                      >
                        {cd.name}
                      </button>
                      <button
                        onClick={() => controls.onShareDashboard(cd.id)}
                        className="px-1 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Share with friends & family"
                      >
                        <Share size={11} />
                      </button>
                      <button
                        onClick={() => {
                          setRenamingId(cd.id);
                          setRenameValue(cd.name);
                        }}
                        className="px-1 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Rename"
                      >
                        <PencilSimple size={11} />
                      </button>
                      <button
                        onClick={() => controls.onDeleteDashboard(cd.id)}
                        className="px-1 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Delete dashboard"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              );
            })}

            {/* + New Dashboard */}
            {controls.canCreateDashboard && (
              showNewDash ? (
                <input
                  value={newDashName}
                  onChange={(e) => setNewDashName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newDashName.trim()) {
                      controls.onCreateDashboard(newDashName.trim());
                      setNewDashName('');
                      setShowNewDash(false);
                    }
                    if (e.key === 'Escape') {
                      setShowNewDash(false);
                      setNewDashName('');
                    }
                  }}
                  onBlur={() => {
                    setShowNewDash(false);
                    setNewDashName('');
                  }}
                  placeholder="Dashboard name…"
                  className="w-full px-2 py-1 text-xs rounded"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setShowNewDash(true)}
                  className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded text-xs transition-colors"
                  style={{
                    color: 'var(--accent-primary)',
                    backgroundColor: 'transparent',
                    border: '1px dashed var(--border-subtle)',
                    opacity: 0.85,
                    fontFamily: 'inherit',
                  }}
                >
                  <Plus size={10} weight="bold" />
                  <span>New Dashboard ({controls.customDashboards.length}/{controls.maxDashboards})</span>
                </button>
              )
            )}

            {!controls.canCreateDashboard && controls.customDashboards.length >= controls.maxDashboards && (
              <span
                className="block px-2 py-1 text-xs"
                style={{ color: 'var(--text-muted)', fontSize: '9px', fontFamily: 'var(--font-mono)' }}
              >
                {controls.maxDashboards}/{controls.maxDashboards} dashboards
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Dashboards shared WITH this user ── */}
      {controls.sharedWithMe.length > 0 && (
        <div>
          <RailSubhead>Shared With Me</RailSubhead>
          <div className="space-y-0.5">
            {controls.sharedWithMe.map((s: SharedWithMe) => {
              const isActive = controls.activeSharedId === s.shareId;
              return (
                <button
                  key={s.shareId}
                  onClick={() => controls.onSwitchShared(s)}
                  className="flex flex-col items-start w-full text-left px-2 py-1 rounded text-xs transition-colors"
                  style={{
                    backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
                    fontFamily: 'inherit',
                  }}
                  title={`${s.name} · curated by ${s.ownerDisplay}`}
                >
                  <span className="truncate w-full">{s.name}</span>
                  <span
                    className="truncate w-full"
                    style={{
                      fontSize: 9,
                      color: 'var(--text-muted)',
                      letterSpacing: '0.06em',
                      fontFamily: 'var(--font-mono)',
                      marginTop: 1,
                    }}
                  >
                    by {s.ownerDisplay}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VIP upsell for non-VIP users ── */}
      {!canAccess('vip') && (
        <div>
          <RailSubhead>Custom Dashboards</RailSubhead>
          <a
            href="/support"
            className="flex items-center justify-between w-full text-left px-2 py-1 rounded text-xs"
            style={{
              color: 'var(--text-muted)',
              opacity: 0.7,
              border: '1px solid transparent',
              textDecoration: 'none',
              fontFamily: 'inherit',
            }}
          >
            <span>Build your own</span>
            <span style={{ fontSize: '9px', color: 'var(--accent-primary)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
              VIP ↑
            </span>
          </a>
        </div>
      )}

      {/* ── Edit Layout — only when a custom dashboard is active ── */}
      {controls.activeCustomId !== null && canAccess('vip') && (
        <button
          onClick={() => controls.onToggleEdit()}
          className="flex items-center justify-center w-full text-xs transition-colors px-2 py-1.5 rounded"
          style={{
            backgroundColor: controls.editMode ? 'var(--accent-primary)' : 'transparent',
            color: controls.editMode ? 'var(--bg-primary)' : 'var(--text-muted)',
            border: controls.editMode ? 'none' : '1px solid var(--border-subtle)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.06em',
          }}
        >
          {controls.editMode ? '✓ Done Editing' : 'Edit Layout'}
        </button>
      )}
    </div>
  );
}

function RailSubhead({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-2 pb-1"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
      }}
    >
      {children}
    </div>
  );
}
