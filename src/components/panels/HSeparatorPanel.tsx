'use client';

/**
 * HSeparatorPanel — Horizontal visual separator line.
 *
 * Renders a 1px horizontal rule centred within its container, inset by 10px
 * on each side (matching the panel-title underline margin).  The container is
 * a free-floating, resizable Rnd panel with no header chrome — the whole
 * surface acts as the drag handle in edit mode.
 */

export function HSeparatorPanel() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        boxSizing: 'border-box',
        pointerEvents: 'none', // drag handled by parent Rnd
      }}
    >
      <div
        style={{
          width: '100%',
          height: '1px',
          backgroundColor: '#3a2a1a',
        }}
      />
    </div>
  );
}
