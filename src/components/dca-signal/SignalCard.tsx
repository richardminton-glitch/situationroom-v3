'use client';

import { useTheme } from '@/components/layout/ThemeProvider';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface Props {
  label:      string;
  sublabel:   string;
  value:      string;
  multiplier: number;
}

function accentColour(multiplier: number, isDark: boolean): string {
  if (multiplier >= 1.4) return isDark ? '#00d4c8' : '#4a7c59';   // teal — buy zone
  if (multiplier >= 0.85) return isDark ? '#c4885a' : '#b8860b';  // amber — neutral
  return isDark ? '#d06050' : '#9b3232';                           // coral — reduce/pause
}

function stateLabel(multiplier: number): string {
  if (multiplier >= 2.0) return 'Strong buy';
  if (multiplier >= 1.4) return 'Buy';
  if (multiplier >= 0.85) return 'Neutral';
  if (multiplier >= 0.5) return 'Reduce';
  return 'Pause';
}

export function SignalCard({ label, sublabel, value, multiplier }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

  const accent = accentColour(multiplier, isDark);
  const state  = stateLabel(multiplier);

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      gap:           8,
      padding:       '14px 16px',
      background:    'var(--bg-card)',
      borderTop:     '1px solid var(--border-subtle)',
      borderRight:   '1px solid var(--border-subtle)',
      borderBottom:  '1px solid var(--border-subtle)',
      borderLeft:    `3px solid ${accent}`,
      fontFamily:    FONT,
    }}>

      {/* Label row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {label}
          </span>
          <span style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
            {sublabel}
          </span>
        </div>

        {/* Current value */}
        <span style={{
          fontSize: 22,
          color:         'var(--text-primary)',
          fontWeight:    500,
          letterSpacing: '-0.01em',
        }}>
          {value}
        </span>
      </div>

      {/* Multiplier + state */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: 11,
          letterSpacing: '0.1em',
          color:         accent,
          fontWeight:    600,
          textTransform: 'uppercase' as const,
        }}>
          {state}
        </span>
        <span style={{
          fontSize: 15,
          color:         accent,
          fontWeight:    500,
          letterSpacing: '0.02em',
        }}>
          {multiplier.toFixed(1)}×
        </span>
      </div>

    </div>
  );
}
