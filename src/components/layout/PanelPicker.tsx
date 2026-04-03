'use client';

import { PANEL_REGISTRY } from '@/lib/panels/registry';
import type { LayoutPanelItem } from '@/lib/panels/layouts';

interface PanelPickerProps {
  currentPanels: LayoutPanelItem[];
  onAdd: (panelId: string) => void;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  bitcoin: 'Bitcoin',
  macro: 'Macro',
  onchain: 'On-Chain',
  geopolitical: 'Geopolitical',
  ui: 'UI Components',
};

// Display order for categories in the picker
const CATEGORY_ORDER = ['bitcoin', 'macro', 'onchain', 'geopolitical', 'ui'];

export function PanelPicker({ currentPanels, onAdd, onClose }: PanelPickerProps) {
  const currentIds = new Set(currentPanels.map((p) => p.panelId));
  // UI components (separators) can be added multiple times — always show them as available
  const available = PANEL_REGISTRY.filter((p) => p.uiComponent || !currentIds.has(p.id));

  const grouped = available.reduce((acc, panel) => {
    const cat = panel.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(panel);
    return acc;
  }, {} as Record<string, typeof PANEL_REGISTRY>);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[70vh] overflow-y-auto p-6"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: 'var(--text-primary)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 'normal' }}
          >
            Add Panel
          </h2>
          <button onClick={onClose} className="text-lg" style={{ color: 'var(--text-muted)' }}>
            ✕
          </button>
        </div>

        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          New panels appear at the top-left. Drag them to position.
        </p>

        {available.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            All panels are already in your layout.
          </p>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => {
              const ai = CATEGORY_ORDER.indexOf(a); const bi = CATEGORY_ORDER.indexOf(b);
              return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
            })
            .map(([category, panels]) => (
            <div key={category} className="mb-4">
              <h3
                className="text-xs uppercase tracking-wider mb-2"
                style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
              >
                {CATEGORY_LABELS[category] || category}
              </h3>
              <div className="space-y-1">
                {panels.map((panel) => (
                  <button
                    key={panel.id}
                    onClick={() => {
                      onAdd(panel.id);
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2 rounded flex items-center justify-between hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {panel.name}
                      </span>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {panel.description}
                      </p>
                    </div>
                    <span className="text-lg" style={{ color: 'var(--accent-primary)' }}>+</span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
