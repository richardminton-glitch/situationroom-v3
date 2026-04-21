'use client';

/**
 * MinerTreasuryStress — public-miner treasury vs all-in cost, margin
 * compression, and capitulation probability gauge.
 *
 * Three stacked sections matching the existing parchment/dark mining card
 * language. Pure presentational — fed by data.minerTreasuries.
 */

import { useMemo, useState } from 'react';
import { useTheme } from '@/components/layout/ThemeProvider';
import type { MinerTreasurySummary } from '@/lib/signals/mining-engine';

const MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface Props {
  data: MinerTreasurySummary;
}

function fmtUsdShort(v: number): string {
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3)  return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtBtc(v: number): string {
  return `${v.toLocaleString('en-US', { maximumFractionDigits: 0 })} ₿`;
}

function bandColour(band: string, isDark: boolean): string {
  if (band === 'healthy' || band === 'LOW')      return isDark ? '#2dd4bf' : '#4a7c59';
  if (band === 'tight'   || band === 'ELEVATED') return isDark ? '#c4885a' : '#b8860b';
  if (band === 'stressed'|| band === 'HIGH')     return isDark ? '#e08055' : '#b85a25';
  return isDark ? '#d06050' : '#9b3232'; // critical / ACUTE
}

export function MinerTreasuryStress({ data }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';
  const [hover, setHover] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...data.miners].sort((a, b) => b.treasuryUsd - a.treasuryUsd),
    [data.miners],
  );
  const maxUsd = useMemo(
    () => Math.max(
      ...sorted.flatMap(m => [m.treasuryUsd, m.monthlyAllInCostUsd * 12]),
      1,
    ),
    [sorted],
  );

  const cap = data.capitulation;
  const capColour = bandColour(cap.band, isDark);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      border: '1px solid var(--border-primary)',
      backgroundColor: 'var(--bg-card)',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      }}>
        <div>
          <div style={{
            fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em',
            color: 'var(--text-muted)', textTransform: 'uppercase',
          }}>
            MINER TREASURY STRESS
          </div>
          <div style={{
            fontFamily: isDark ? MONO : "'Georgia', 'Times New Roman', serif",
            fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2,
          }}>
            Public miner balance sheet vs production cost
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)' }}>
            AS OF {data.updatedAt}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)' }}>
            BTC ${data.btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* Capitulation gauge strip */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 92 }}>
          <div style={{
            fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em',
            color: 'var(--text-muted)', textTransform: 'uppercase',
          }}>
            CAPITULATION
          </div>
          <div style={{
            fontFamily: 'var(--font-data)', fontSize: 28, fontWeight: 700,
            color: capColour, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
          }}>
            {cap.score}
          </div>
          <div style={{
            fontFamily: MONO, fontSize: 9, fontWeight: 600,
            letterSpacing: '0.1em', color: capColour,
          }}>
            {cap.band}
          </div>
        </div>

        {/* Driver bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {cap.drivers.map((d) => (
            <div key={d.label}
                 onMouseEnter={() => setHover(d.label)}
                 onMouseLeave={() => setHover(null)}
                 style={{ cursor: 'help' }}
                 title={d.detail}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)', marginBottom: 2,
              }}>
                <span>{d.label}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{d.contribution}/25</span>
              </div>
              <div style={{ height: 4, backgroundColor: 'var(--border-subtle)', position: 'relative' }}>
                <div style={{
                  width: `${(d.contribution / 25) * 100}%`,
                  height: '100%', backgroundColor: capColour,
                  opacity: hover && hover !== d.label ? 0.4 : 0.85,
                  transition: 'opacity 120ms',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bars: Treasury vs annualised all-in cost */}
      <div style={{ padding: '10px 14px 12px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em',
          color: 'var(--text-muted)', textTransform: 'uppercase',
          paddingBottom: 6, borderBottom: '1px solid var(--border-subtle)',
        }}>
          <span>MINER · TREASURY ▮ vs ANNUAL COST ▮ · QoQ Δ</span>
          <span>COVER (mo)</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
          {sorted.map((m) => {
            const annualCost = m.monthlyAllInCostUsd * 12;
            const trWidthPct = (m.treasuryUsd / maxUsd) * 100;
            const ctWidthPct = (annualCost      / maxUsd) * 100;
            const stressCol = bandColour(m.stressBand, isDark);
            const deltaCol  = m.marginDeltaPct >= 0
              ? (isDark ? '#2dd4bf' : '#4a7c59')
              : (isDark ? '#d06050' : '#9b3232');
            const deltaSign = m.marginDeltaPct >= 0 ? '+' : '';
            return (
              <div key={m.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 56, fontFamily: MONO, fontSize: 10,
                  color: 'var(--text-primary)', fontWeight: 600,
                }}>
                  {m.ticker}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Treasury bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      height: 8, width: `${Math.max(trWidthPct, 0.5)}%`,
                      backgroundColor: stressCol, opacity: 0.85,
                    }} />
                    <span style={{
                      fontFamily: MONO, fontSize: 9, color: 'var(--text-secondary)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {fmtUsdShort(m.treasuryUsd)} · {fmtBtc(m.btcHeld)}
                    </span>
                  </div>
                  {/* Annual cost bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      height: 4, width: `${Math.max(ctWidthPct, 0.5)}%`,
                      backgroundColor: 'var(--text-muted)', opacity: 0.55,
                    }} />
                    <span style={{
                      fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {fmtUsdShort(annualCost)}/yr · margin {deltaSign === '' ? '' : ''}
                      <span style={{ color: deltaCol }}>
                        {m.quarterlyMarginPct >= 0 ? '+' : ''}{m.quarterlyMarginPct.toFixed(1)}%
                        {' '}({deltaSign}{m.marginDeltaPct.toFixed(1)})
                      </span>
                    </span>
                  </div>
                </div>
                <div style={{
                  width: 60, textAlign: 'right',
                  fontFamily: 'var(--font-data)', fontSize: 12, fontWeight: 600,
                  color: stressCol, fontVariantNumeric: 'tabular-nums',
                }}>
                  {m.treasuryCoverMonths >= 99 ? '∞' : m.treasuryCoverMonths.toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer: fleet aggregates */}
      <div style={{
        padding: '8px 14px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex', justifyContent: 'space-between',
        fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        <span>Fleet treasury <span style={{ color: 'var(--text-secondary)' }}>{fmtUsdShort(data.fleet.totalTreasuryUsd)}</span> · {fmtBtc(data.fleet.totalBtcHeld)}</span>
        <span>Weighted margin <span style={{ color: 'var(--text-secondary)' }}>{data.fleet.weightedMarginPct >= 0 ? '+' : ''}{data.fleet.weightedMarginPct.toFixed(1)}%</span></span>
        <span>Cover <span style={{ color: 'var(--text-secondary)' }}>{data.fleet.aggregateCoverMonths.toFixed(1)} mo</span></span>
      </div>
    </div>
  );
}
