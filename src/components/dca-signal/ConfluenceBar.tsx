'use client';

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
    statusColour = '#00d4c8';
  } else if (bear === 2) {
    statusLabel  = 'Headwinds';
    statusColour = '#d06050';
  } else {
    statusLabel  = 'Mixed signal';
    statusColour = '#c4885a';
  }

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap:           16,
      padding:       '14px 16px',
      background:    'rgba(255,255,255,0.025)',
      border:        '1px solid rgba(255,255,255,0.06)',
      fontFamily:    FONT,
    }}>

      {/* Section label */}
      <span style={{ fontSize: 11, letterSpacing: '0.14em', color: '#8a9bb0' }}>
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
            background: '#00d4c8',
            transition: 'none',
          }} />
        )}
        {neutralPct > 0 && (
          <div style={{
            width:      `${neutralPct}%`,
            background: '#c4885a',
            transition: 'none',
          }} />
        )}
        {bearPct > 0 && (
          <div style={{
            width:      `${bearPct}%`,
            background: '#d06050',
            transition: 'none',
          }} />
        )}
      </div>

      {/* Counts */}
      <div style={{ display: 'flex', gap: 12 }}>
        {bull > 0 && (
          <span style={{ fontSize: 11, color: '#00d4c8', letterSpacing: '0.1em' }}>
            {bull} BULL
          </span>
        )}
        {neutral > 0 && (
          <span style={{ fontSize: 11, color: '#c4885a', letterSpacing: '0.1em' }}>
            {neutral} NEUTRAL
          </span>
        )}
        {bear > 0 && (
          <span style={{ fontSize: 11, color: '#d06050', letterSpacing: '0.1em' }}>
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
            <span style={{ fontSize: 11, color: '#8a9bb0', letterSpacing: '0.1em' }}>{label}</span>
            <span style={{
              fontSize: 11,
              letterSpacing: '0.1em',
              color: z === 'bull' ? '#00d4c8' : z === 'neutral' ? '#c4885a' : '#d06050',
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
