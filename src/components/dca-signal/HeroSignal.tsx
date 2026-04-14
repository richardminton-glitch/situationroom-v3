'use client';

import { useTheme } from '@/components/layout/ThemeProvider';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

type Frequency = 'weekly' | 'monthly';

interface Props {
  composite:          number;
  tier:               string;
  baseAmount:         number;
  onBaseAmountChange: (n: number) => void;
  frequency:          Frequency;
  onFrequencyChange:  (f: Frequency) => void;
}

function compositeColour(composite: number, isDark: boolean): string {
  if (composite >= 1.5) return isDark ? '#00d4c8' : '#4a7c59';
  if (composite >= 0.85) return isDark ? '#c4885a' : '#b8860b';
  return isDark ? '#d06050' : '#9b3232';
}

export function HeroSignal({ composite, tier, baseAmount, onBaseAmountChange, frequency, onFrequencyChange }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

  function handleAmountChange(val: string) {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0 && n <= 9_999_999) {
      onBaseAmountChange(n);
    }
  }

  const recommendedBuy = Math.round(baseAmount * composite);
  const colour         = compositeColour(composite, isDark);

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'flex-start',
      gap:            12,
      padding:        '24px 28px',
      background:     'var(--bg-card)',
      border:         '1px solid var(--border-subtle)',
    }}>

      {/* Section label */}
      <span style={{
        fontSize: 11,
        letterSpacing: '0.18em',
        color:         'var(--text-secondary)',
      }}>
        COMPOSITE SIGNAL
      </span>

      {/* Large composite number */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{
          fontSize: 58,
          lineHeight:    1,
          fontFamily:    FONT,
          fontWeight:    600,
          letterSpacing: '-0.02em',
          color:         colour,
          transition:    'none',
        }}>
          {composite.toFixed(2)}
        </span>
        <span style={{ fontSize: 20, color: colour, letterSpacing: '0.04em' }}>×</span>
      </div>

      {/* Tier label */}
      <span style={{
        fontSize: 13,
        letterSpacing: '0.12em',
        color:         colour,
        fontWeight:    600,
        textTransform: 'uppercase' as const,
      }}>
        {tier}
      </span>

      {/* Base amount + frequency row */}
      <div style={{
        display:    'flex',
        alignItems: 'center',
        gap:        12,
        marginTop:  8,
      }}>
        {/* Frequency toggle */}
        <div style={{ display: 'flex', gap: 0 }}>
          {(['weekly', 'monthly'] as Frequency[]).map(f => (
            <button
              key={f}
              onClick={() => onFrequencyChange(f)}
              style={{
                padding:          '4px 10px',
                fontSize: 11,
                letterSpacing:    '0.1em',
                fontFamily:       FONT,
                cursor:           'pointer',
                border:           '1px solid var(--border-primary)',
                background:       frequency === f
                  ? (isDark ? 'rgba(0,212,200,0.15)' : 'rgba(74,124,89,0.15)')
                  : 'transparent',
                color:            frequency === f
                  ? (isDark ? '#00d4c8' : '#4a7c59')
                  : 'var(--text-secondary)',
                transition:       'none',
                textTransform:    'uppercase' as const,
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Base amount input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>BASE</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>$</span>
          <input
            type="number"
            min={1}
            max={9999999}
            step={1}
            value={baseAmount}
            onChange={e => handleAmountChange(e.target.value)}
            style={{
              width:           112,
              fontSize: 15,
              fontFamily:      FONT,
              background:      'var(--bg-card)',
              border:          '1px solid var(--border-primary)',
              color:           'var(--text-primary)',
              padding:         '4px 8px',
              outline:         'none',
              transition:      'none',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = isDark ? '#00d4c8' : '#4a7c59'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
          />
        </div>
      </div>

      {/* Recommended buy */}
      <div style={{
        display:    'flex',
        alignItems: 'baseline',
        gap:        8,
        marginTop:  4,
      }}>
        <span style={{
          fontSize: 24,
          fontFamily:    FONT,
          fontWeight:    500,
          color:         'var(--text-primary)',
          letterSpacing: '0.02em',
        }}>
          ${recommendedBuy.toLocaleString()}
        </span>
        <span style={{
          fontSize: 12,
          color:         'var(--text-secondary)',
          letterSpacing: '0.1em',
        }}>
          THIS {frequency === 'weekly' ? 'WEEK' : 'MONTH'}
        </span>
      </div>

      {/* Context line */}
      <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
        {composite.toFixed(2)}× your ${baseAmount.toLocaleString()} base · signal-adjusted DCA
      </span>

    </div>
  );
}
