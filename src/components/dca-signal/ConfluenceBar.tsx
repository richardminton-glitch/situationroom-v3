'use client';

import { useTheme } from '@/components/layout/ThemeProvider';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface Props {
  maMult:    number;
  puellMult: number;
}

function zone(mult: number): 'bull' | 'neutral' | 'bear' {
  if (mult >= 1.5) return 'bull';
  if (mult >= 0.8) return 'neutral';
  return 'bear';
}

export function ConfluenceBar({ maMult, puellMult }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

  const bullColour    = isDark ? '#00d4c8' : '#4a7c59';
  const neutralColour = isDark ? '#c4885a' : '#b8860b';
  const bearColour    = isDark ? '#d06050' : '#9b3232';

  const zones  = [zone(maMult), zone(puellMult)];
  const bull   = zones.filter(z => z === 'bull').length;
  const neutral = zones.filter(z => z === 'neutral').length;
  const bear   = zones.filter(z => z === 'bear').length;

  const total = 2; // always 2 signals
  const bullPct    = (bull    / total) * 100;
  const neutralPct = (neutral / total) * 100;
  const bearPct    = (bear    / total) * 100;

  let statusLabel: string;
  let statusColour: string;
  if (bull === 2) {
    statusLabel  = 'Signals aligned — accumulate';
    statusColour = bullColour;
  } else if (bear === 2) {
    statusLabel  = 'Headwinds';
    statusColour = bearColour;
  } else {
    statusLabel  = 'Mixed signal';
    statusColour = neutralColour;
  }

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap:           16,
      padding:       '14px 16px',
      background:    'var(--bg-card)',
      border:        '1px solid var(--border-subtle)',
      fontFamily:    FONT,
    }}>

      {/* Section label */}
      <span style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--text-secondary)' }}>
        CONFLUENCE
      </span>

      {/* Proportional bar */}
      <div style={{
        display:      'flex',
        height:       8,
        borderRadius: 2,
        overflow:     'hidden',
        gap:          1,
      }}>
        {bullPct > 0 && (
          <div style={{
            width:      `${bullPct}%`,
            background: bullColour,
            transition: 'none',
          }} />
        )}
        {neutralPct > 0 && (
          <div style={{
            width:      `${neutralPct}%`,
            background: neutralColour,
            transition: 'none',
          }} />
        )}
        {bearPct > 0 && (
          <div style={{
            width:      `${bearPct}%`,
            background: bearColour,
            transition: 'none',
          }} />
        )}
      </div>

      {/* Counts */}
      <div style={{ display: 'flex', gap: 12 }}>
        {bull > 0 && (
          <span style={{ fontSize: 11, color: bullColour, letterSpacing: '0.1em' }}>
            {bull} BULL
          </span>
        )}
        {neutral > 0 && (
          <span style={{ fontSize: 11, color: neutralColour, letterSpacing: '0.1em' }}>
            {neutral} NEUTRAL
          </span>
        )}
        {bear > 0 && (
          <span style={{ fontSize: 11, color: bearColour, letterSpacing: '0.1em' }}>
            {bear} BEAR
          </span>
        )}
      </div>

      {/* Status label */}
      <span style={{
        fontSize: 13,
        letterSpacing: '0.06em',
        color:         statusColour,
        fontWeight:    600,
        lineHeight:    1.3,
      }}>
        {statusLabel}
      </span>

      {/* Signal breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
        {[
          { label: '200W MA',        z: zone(maMult),    mult: maMult },
          { label: 'PUELL MULTIPLE', z: zone(puellMult), mult: puellMult },
        ].map(({ label, z, mult }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>{label}</span>
            <span style={{
              fontSize: 11,
              letterSpacing: '0.1em',
              color: z === 'bull' ? bullColour : z === 'neutral' ? neutralColour : bearColour,
              fontWeight:    600,
            }}>
              {z.toUpperCase()} · {mult.toFixed(1)}×
            </span>
          </div>
        ))}
      </div>

    </div>
  );
}
