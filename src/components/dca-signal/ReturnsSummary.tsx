'use client';

import type { BacktestPeriod } from '@/lib/data/daily-snapshot';
import { useTheme } from '@/components/layout/ThemeProvider';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface Props {
  backtestSummary: BacktestPeriod[];
  btcPrice:        number;
  baseAmount:      number;
}

function formatBtc(btc: number): string {
  if (btc >= 1) return btc.toFixed(4) + ' BTC';
  if (btc >= 0.01) return btc.toFixed(5) + ' BTC';
  return btc.toFixed(6) + ' BTC';
}

function formatUsd(v: number): string {
  return '$' + Math.round(v).toLocaleString('en-US');
}

export function ReturnsSummary({ backtestSummary, btcPrice, baseAmount }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

  if (!backtestSummary || backtestSummary.length === 0) return null;

  // Scale portfolio values by baseAmount if different from $100 base
  const scale = baseAmount / 100;

  return (
    <div style={{
      paddingTop:  16,
      borderTop:   '1px solid var(--border-subtle)',
      fontFamily:  FONT,
    }}>

      {/* Section label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--text-secondary)' }}>
          SIGNAL DCA vs VANILLA DCA
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          BACKTESTED · ${baseAmount}/WEEK BASE
        </span>
      </div>

      {/* Period cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(backtestSummary.length, 4)}, 1fr)`,
        gap: 10,
      }}>
        {backtestSummary.map(period => {
          const btcSignal  = period.btcAccumulated * scale;
          const btcVanilla = period.btcVanilla     * scale;
          const portValue  = btcSignal  * btcPrice;
          const vanValue   = btcVanilla * btcPrice;
          const advantage  = period.advantagePct; // percentage advantage is scale-invariant

          const advColour = advantage > 0
            ? (isDark ? '#00d4c8' : '#4a7c59')
            : (isDark ? '#d06050' : '#9b3232');

          return (
            <div
              key={period.label}
              style={{
                display:       'flex',
                flexDirection: 'column',
                gap:           8,
                padding:       '12px 14px',
                background:    'var(--bg-card)',
                border:        '1px solid var(--border-subtle)',
              }}
            >
              {/* Period label */}
              <span style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {period.label.toUpperCase()}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                since {period.startDate}
              </span>

              {/* Advantage callout */}
              <div style={{ paddingTop: 4, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>ADVANTAGE</span>
                <div style={{ fontSize: 20, color: advColour, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                  +{advantage.toFixed(1)}%
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>MORE BTC</div>
              </div>

              {/* Signal vs vanilla */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

                {/* Signal */}
                <div>
                  <div style={{ fontSize: 10, color: isDark ? '#00d4c8' : '#4a7c59', letterSpacing: '0.1em', marginBottom: 2 }}>SIGNAL DCA</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{formatBtc(btcSignal)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatUsd(portValue)}</div>
                </div>

                {/* Vanilla */}
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 2 }}>VANILLA DCA</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{formatBtc(btcVanilla)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatUsd(vanValue)}</div>
                </div>

              </div>

            </div>
          );
        })}
      </div>

      <p style={{
        marginTop:     8,
        fontSize: 10,
        color:         'var(--text-muted)',
        letterSpacing: '0.08em',
      }}>
        BACKTESTED WEEKLY DCA · SIGNAL V3 (200W MA + PUELL) · NOT FINANCIAL ADVICE
      </p>

    </div>
  );
}
