'use client';

import { useTheme } from '@/components/layout/ThemeProvider';

/**
 * VSeparatorPanel — Vertical visual separator line.
 *
 * Renders a 1px vertical rule centred within its container, inset by 10px on
 * each side (matching the panel-title underline margin).  The container is a
 * free-floating, resizable Rnd panel with no header chrome — the whole
 * surface acts as the drag handle in edit mode.
 *
 * Colour adapts to the active theme: espresso brown for parchment,
 * dark teal for dark mode.
 */

export function VSeparatorPanel() {
  const { theme } = useTheme();
  const lineColor = theme === 'dark' ? 'rgba(0,180,170,0.25)' : '#3a2a1a';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        padding: '10px 0',
        boxSizing: 'border-box',
        pointerEvents: 'none', // drag handled by parent Rnd
      }}
    >
      <div
        style={{
          width: '1px',
          height: '100%',
          backgroundColor: lineColor,
        }}
      />
    </div>
  );
}
