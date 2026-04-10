'use client';

import { useState, useEffect } from 'react';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

const LS_FREQ = 'sr-dca-frequency';

type Frequency = 'weekly' | 'monthly';

interface Props {
  composite:          number;
  tier:               string;
  baseAmount:         number;                    // lifted to DCASignalPage
  onBaseAmountChange: (n: number) => void;       // lifted to DCASignalPage
}

function compositeColour(composite: number): string {
  if (composite >= 1.5) return '#00d4c8';  // teal
  if (composite >= 0.85) return '#c4885a'; // amber
  return '#d06050';                         // coral
}

export function HeroSignal({ composite, tier, baseAmount, onBaseAmountChange }: Props) {
  const [frequency, setFrequency] = useState<Frequency>('weekly');

  // Hydrate frequency from localStorage only
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_FREQ) as Frequency | null;
      if (stored === 'weekly' || stored === 'monthly') setFrequency(stored);
    } catch { /* SSR guard */ }
  }, []);

  function handleAmountChange(val: string) {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0 && n <= 9_999_999) {
      onBaseAmountChange(n);
    }
  }

  function handleFreqChange(freq: Frequency) {
    setFrequency(freq);
    try { localStorage.setItem(LS_FREQ, freq); } catch { /* noop */ }
  }

  const recommendedBuy = Math.round(baseAmount * composite);
  const colour         = compositeColour(composite);

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'flex-start',
      gap:            12,
      padding:        '24px 28px',
      background:     'rgba(255,255,255,0.03)',
      border:         '1px solid rgba(255,255,255,0.07)',
    }}>

      {/* Section label */}
      <span style={{
        fontSize:      9,
        letterSpacing: '0.18em',
        color:         '#6b7a8d',
      }}>
        COMPOSITE SIGNAL
      </span>

      {/* Large composite number */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{
          fontSize:      56,
          lineHeight:    1,
          fontFamily:    FONT,
          fontWeight:    600,
          letterSpacing: '-0.02em',
          color:         colour,
          transition:    'none',
        }}>
          {composite.toFixed(2)}
        </span>
        <span style={{ fontSize: 18, color: colour, letterSpacing: '0.04em' }}>×</span>
      </div>

      {/* Tier label */}
      <span style={{
        fontSize:      11,
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
              onClick={() => handleFreqChange(f)}
              style={{
                padding:          '4px 10px',
                fontSize:         9,
                letterSpacing:    '0.1em',
                fontFamily:       FONT,
                cursor:           'pointer',
                border:           '1px solid rgba(255,255,255,0.12)',
                background:       frequency === f ? 'rgba(0,212,200,0.15)' : 'transparent',
                color:            frequency === f ? '#00d4c8' : '#6b7a8d',
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
          <span style={{ fontSize: 9, color: '#6b7a8d', letterSpacing: '0.1em' }}>BASE</span>
          <span style={{ fontSize: 11, color: '#6b7a8d' }}>$</span>
          <input
            type="number"
            min={1}
            max={9999999}
            step={1}
            value={baseAmount}
            onChange={e => handleAmountChange(e.target.value)}
            style={{
              width:           112,
              fontSize:        13,
              fontFamily:      FONT,
              background:      '#0d1520',
              border:          '1px solid rgba(255,255,255,0.12)',
              color:           '#e8edf2',
              padding:         '4px 8px',
              outline:         'none',
              transition:      'none',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#00d4c8'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
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
          fontSize:      22,
          fontFamily:    FONT,
          fontWeight:    500,
          color:         '#e8edf2',
          letterSpacing: '0.02em',
        }}>
          ${recommendedBuy.toLocaleString()}
        </span>
        <span style={{
          fontSize:      10,
          color:         '#6b7a8d',
          letterSpacing: '0.1em',
        }}>
          THIS {frequency === 'weekly' ? 'WEEK' : 'MONTH'}
        </span>
      </div>

      {/* Context line */}
      <span style={{ fontSize: 9, color: '#4a5568', letterSpacing: '0.08em' }}>
        {composite.toFixed(2)}× your ${baseAmount.toLocaleString()} base · signal-adjusted DCA
      </span>

    </div>
  );
}
