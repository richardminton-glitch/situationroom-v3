'use client';

import { useTheme } from '@/components/layout/ThemeProvider';

const MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface SecurityBudgetProjection {
  year: number;
  halvingEpoch: number;
  subsidyBtc: number;
  dailySubsidyUsd: number;
  dailyFeesUsd: number;
  dailyTotalUsd: number;
  subsidyPct: number;
  feePct: number;
}

interface Props {
  editorial: { title: string; body: string; updatedAt: string };
  current: SecurityBudgetProjection;
  nextHalving: SecurityBudgetProjection | null;
  projections: SecurityBudgetProjection[];   // base-case multi-epoch trajectory
  energyValueFair: number;
  energyValuePremiumPct: number;
  fleetEfficiency: number;
  btcPrice: number;
}

export function SecurityOutlook({
  editorial,
  current,
  nextHalving,
  projections,
  energyValueFair,
  energyValuePremiumPct,
  fleetEfficiency,
  btcPrice,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'parchment';

  const fmtUsd = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

  const fmtFairValue = (v: number) => {
    return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  const subsidyBarWidth = current.dailyTotalUsd > 0
    ? (current.dailySubsidyUsd / current.dailyTotalUsd) * 60
    : 0;
  const feesBarWidth = current.dailyTotalUsd > 0
    ? (current.dailyFeesUsd / current.dailyTotalUsd) * 60
    : 0;

  // Trajectory accent colours
  const subsidyCol = 'var(--accent-primary)';
  const feeCol     = isDark ? '#f59e0b' : '#b8860b';
  const positiveCol = isDark ? '#2dd4bf' : '#4a7c59';
  const warnCol     = isDark ? '#d06050' : '#9b3232';

  // Fee dependency: to hold today's USD security level through the next
  // halving, fees must grow by this multiplier (subsidy USD is halving anyway).
  const feeMultiplierToHoldBudget = (() => {
    if (!nextHalving) return null;
    const targetTotal      = current.dailyTotalUsd;
    const subsidyAtNext    = nextHalving.dailySubsidyUsd;
    const requiredFees     = Math.max(0, targetTotal - subsidyAtNext);
    if (current.dailyFeesUsd <= 0) return null;
    return requiredFees / current.dailyFeesUsd;
  })();

  return (
    <div>
      {/* Section label */}
      <div
        style={{
          fontFamily: MONO,
          fontSize: 9,
          letterSpacing: '0.16em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        THE LONG VIEW
      </div>

      {/* Editorial body (left) + Halving trajectory (right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 7fr) minmax(280px, 5fr)',
          gap: 28,
          marginBottom: 18,
          alignItems: 'start',
        }}
      >
        {/* ── Left column: editorial ── */}
        <div style={{ minWidth: 0 }}>
          {editorial.title && (
            <div
              style={{
                fontFamily: isDark ? MONO : "'Georgia', 'Times New Roman', serif",
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: 10,
                lineHeight: 1.2,
              }}
            >
              {editorial.title}
            </div>
          )}
          {editorial.body && (
            <div
              style={{
                fontFamily: isDark ? MONO : 'var(--font-body)',
                fontSize: isDark ? 12 : 14,
                lineHeight: isDark ? 1.55 : 1.6,
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {editorial.body}
            </div>
          )}
        </div>

        {/* ── Right column: halving trajectory ── */}
        {projections.length > 0 && (
          <div
            style={{
              border: '1px solid var(--border-subtle)',
              padding: '12px 14px',
              backgroundColor: 'var(--bg-card, transparent)',
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 9,
                letterSpacing: '0.14em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              HALVING TRAJECTORY · BASE CASE
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 9,
                color: 'var(--text-muted)',
                marginBottom: 10,
              }}
            >
              Holds current fees flat in USD · subsidy halves every 4y
            </div>

            {/* Header row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '36px 56px 64px 1fr',
                gap: 8,
                fontFamily: MONO,
                fontSize: 8,
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                paddingBottom: 6,
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <span>YEAR</span>
              <span style={{ textAlign: 'right' }}>SUBSIDY</span>
              <span style={{ textAlign: 'right' }}>BUDGET</span>
              <span>SUBSIDY ▮ / FEES ▮</span>
            </div>

            {/* Projection rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8 }}>
              {projections.map((p, idx) => {
                const isCurrent = idx === 0;
                const subPct = Math.max(0, Math.min(100, p.subsidyPct));
                const feePct = Math.max(0, Math.min(100, p.feePct));
                return (
                  <div
                    key={p.year}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '36px 56px 64px 1fr',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 10,
                        fontWeight: isCurrent ? 700 : 500,
                        color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {p.year}
                      {isCurrent && (
                        <span
                          style={{
                            fontSize: 7,
                            marginLeft: 3,
                            color: positiveCol,
                            letterSpacing: '0.1em',
                          }}
                        >
                          NOW
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 10,
                        textAlign: 'right',
                        color: 'var(--text-secondary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {p.subsidyBtc < 1 ? p.subsidyBtc.toFixed(3) : p.subsidyBtc.toFixed(2)}₿
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-data)',
                        fontSize: 12,
                        fontWeight: 700,
                        textAlign: 'right',
                        color: 'var(--text-primary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {fmtUsd(p.dailyTotalUsd)}
                    </span>
                    <div style={{ display: 'flex', height: 8, gap: 1 }}>
                      <div
                        style={{
                          width: `${subPct}%`,
                          backgroundColor: subsidyCol,
                          opacity: 0.85,
                        }}
                        title={`Subsidy ${subPct.toFixed(0)}%`}
                      />
                      <div
                        style={{
                          width: `${feePct}%`,
                          backgroundColor: feeCol,
                          opacity: 0.85,
                        }}
                        title={`Fees ${feePct.toFixed(0)}%`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Fee dependency callout */}
            {feeMultiplierToHoldBudget !== null && nextHalving && (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 8,
                    letterSpacing: '0.12em',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}
                >
                  FEE DEPENDENCY · {nextHalving.year} HALVING
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: 18,
                    fontWeight: 700,
                    color: feeMultiplierToHoldBudget > 2 ? warnCol : feeCol,
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.1,
                  }}
                >
                  {feeMultiplierToHoldBudget.toFixed(1)}×
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 9,
                    color: 'var(--text-muted)',
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}
                >
                  fee growth required to hold today&apos;s {fmtUsd(current.dailyTotalUsd)} daily security level through the {nextHalving.year} halving
                  {' '}({fmtUsd(current.dailyFeesUsd)} → {fmtUsd(current.dailyFeesUsd * feeMultiplierToHoldBudget)}/day)
                </div>
              </div>
            )}

            {/* 2040 dependency snapshot */}
            {projections.length >= 5 && (
              <div
                style={{
                  marginTop: 10,
                  fontFamily: MONO,
                  fontSize: 9,
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                }}
              >
                By {projections[projections.length - 1].year}: subsidy {projections[projections.length - 1].subsidyPct.toFixed(0)}% of budget. Network security becomes a {projections[projections.length - 1].feePct.toFixed(0)}% fee economy.
              </div>
            )}

            {/* ── Today snapshot strip (was full-width below) ── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                marginTop: 12,
                borderTop: '1px solid var(--border-subtle)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              {/* DAILY BUDGET */}
              <div style={{ padding: '8px 10px', borderRight: '1px solid var(--border-subtle)' }}>
                <div style={{
                  fontFamily: MONO, fontSize: 8, letterSpacing: '0.12em',
                  color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4,
                }}>
                  DAILY BUDGET
                </div>
                <div style={{
                  fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700,
                  color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums',
                  marginBottom: 4,
                }}>
                  {fmtUsd(current.dailyTotalUsd)}
                </div>
                <div style={{ display: 'flex', height: 5, width: 50 }}>
                  <div style={{ width: subsidyBarWidth * (50 / 60), backgroundColor: subsidyCol }} />
                  <div style={{ width: feesBarWidth    * (50 / 60), backgroundColor: feeCol }} />
                </div>
              </div>

              {/* SUBSIDY */}
              <div style={{ padding: '8px 10px', borderRight: '1px solid var(--border-subtle)' }}>
                <div style={{
                  fontFamily: MONO, fontSize: 8, letterSpacing: '0.12em',
                  color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4,
                }}>
                  SUBSIDY
                </div>
                <div style={{
                  fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700,
                  color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums',
                }}>
                  {current.subsidyPct.toFixed(0)}%
                </div>
                <div style={{
                  fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)', marginTop: 1,
                }}>
                  of total
                </div>
              </div>

              {/* NEXT HALVING */}
              <div style={{ padding: '8px 10px' }}>
                <div style={{
                  fontFamily: MONO, fontSize: 8, letterSpacing: '0.12em',
                  color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4,
                }}>
                  NEXT HALVING ({nextHalving?.year ?? 2028})
                </div>
                <div style={{
                  fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700,
                  color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums',
                }}>
                  {nextHalving ? fmtUsd(nextHalving.dailyTotalUsd) : '\u2014'}
                </div>
                {nextHalving && (
                  <div style={{
                    fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)', marginTop: 1,
                  }}>
                    daily budget
                  </div>
                )}
              </div>
            </div>

            {/* ── Energy value note ── */}
            <div
              style={{
                fontFamily: MONO,
                fontSize: 10,
                color: 'var(--text-muted)',
                marginTop: 10,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.5,
              }}
            >
              Energy Value model: {fmtFairValue(energyValueFair)} fair value — spot {Math.abs(energyValuePremiumPct).toFixed(0)}% {energyValuePremiumPct < 0 ? 'below' : 'above'} fair value (fleet: {fleetEfficiency} J/TH)
            </div>

            {/* ── Updated timestamp ── */}
            <div
              style={{
                fontFamily: MONO,
                fontSize: 9,
                color: 'var(--text-muted)',
                textAlign: 'right',
                marginTop: 6,
              }}
            >
              Updated {editorial.updatedAt}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
