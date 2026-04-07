'use client';

/**
 * Collapsible heatmap overlay — mounts DarkGlobe in a positioned panel.
 * Slides in from the left over the graph area.
 */

import dynamic from 'next/dynamic';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

// Lazy-load DarkGlobe — it's heavy (Three.js scene)
const DarkGlobe = dynamic(
  () => import('@/components/panels/globes/DarkGlobe').then((m) => m.DarkGlobe),
  { ssr: false },
);

interface HeatmapOverlayProps {
  visible: boolean;
  onClose: () => void;
}

export default function HeatmapOverlay({ visible, onClose }: HeatmapOverlayProps) {
  if (!visible) return null;

  return (
    <>
      {/* Backdrop — click to close */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 20,
          background: 'rgba(0,0,0,0.3)',
          cursor: 'pointer',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          bottom: 12,
          width: 'min(600px, 60%)',
          zIndex: 21,
          background: 'rgba(9, 13, 18, 0.88)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 229, 200, 0.15)',
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'heatmapSlideIn 0.4s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '8px 14px',
            fontSize: 10,
            fontFamily: FONT,
            letterSpacing: '0.12em',
            color: '#8494a7',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <span>GLOBAL THEATRE</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#8494a7',
              fontSize: 9,
              fontFamily: FONT,
              cursor: 'pointer',
              padding: '2px 8px',
              letterSpacing: '0.08em',
            }}
          >
            CLOSE
          </button>
        </div>

        {/* Globe */}
        <div style={{ flex: 1, position: 'relative' }}>
          <DarkGlobe />
        </div>
      </div>

      <style>{`
        @keyframes heatmapSlideIn {
          0% { opacity: 0; transform: translateX(-20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
