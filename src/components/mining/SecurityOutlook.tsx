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
  energyValueFair: number;
  energyValuePremiumPct: number;
  btcPrice: number;
}

export function SecurityOutlook({
  editorial,
  current,
  nextHalving,
  energyValueFair,
  energyValuePremiumPct,
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

  const paragraphs = editorial.body.split('\n\n');

  const subsidyBarWidth = current.dailyTotalUsd > 0
    ? (current.dailySubsidyUsd / current.dailyTotalUsd) * 60
    : 0;
  const feesBarWidth = current.dailyTotalUsd > 0
    ? (current.dailyFeesUsd / current.dailyTotalUsd) * 60
    : 0;

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
          marginBottom: 16,
        }}
      >
        THE LONG VIEW
      </div>

      {/* Editorial container */}
      <div
        style={{
          borderLeft: '3px solid var(--accent-primary)',
          paddingLeft: 20,
          marginBottom: 20,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 18,
            fontWeight: 400,
            letterSpacing: '0.02em',
            color: 'var(--text-primary)',
            marginBottom: 14,
          }}
        >
          {editorial.title}
        </div>

        {/* Body paragraphs */}
        {paragraphs.map((p, i) => (
          <p
            key={i}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: i === 0 ? 14 : 13,
              lineHeight: 1.75,
              color: 'var(--text-secondary)',
              marginBottom: 12,
              marginTop: 0,
              maxWidth: 640,
            }}
          >
            {p}
          </p>
        ))}
      </div>

      {/* Security budget strip */}
      <div
        style={{
          display: 'flex',
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {/* DAILY BUDGET cell */}
        <div
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRight: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 8,
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            DAILY BUDGET
          </div>
          <div
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
              marginBottom: 6,
            }}
          >
            {fmtUsd(current.dailyTotalUsd)}
          </div>
          {/* Proportional bar */}
          <div style={{ display: 'flex', height: 6, width: 60 }}>
            <div
              style={{
                width: subsidyBarWidth,
                backgroundColor: 'var(--accent-primary)',
              }}
            />
            <div
              style={{
                width: feesBarWidth,
                backgroundColor: '#f59e0b',
              }}
            />
          </div>
        </div>

        {/* SUBSIDY cell */}
        <div
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRight: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 8,
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            SUBSIDY
          </div>
          <div
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {current.subsidyPct.toFixed(0)}%
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 9,
              color: 'var(--text-muted)',
              marginTop: 2,
            }}
          >
            of total
          </div>
        </div>

        {/* NEXT HALVING cell */}
        <div
          style={{
            flex: 1,
            padding: '10px 12px',
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 8,
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            NEXT HALVING (2028)
          </div>
          <div
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {nextHalving ? fmtUsd(nextHalving.dailyTotalUsd) : '\u2014'}
          </div>
          {nextHalving && (
            <div
              style={{
                fontFamily: MONO,
                fontSize: 9,
                color: 'var(--text-muted)',
                marginTop: 2,
              }}
            >
              daily budget
            </div>
          )}
        </div>
      </div>

      {/* Energy value note */}
      <div
        style={{
          fontFamily: MONO,
          fontSize: 10,
          color: 'var(--text-muted)',
          marginTop: 12,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        Energy Value model: {fmtFairValue(energyValueFair)} fair value (
        {energyValuePremiumPct > 0 ? '+' : ''}
        {energyValuePremiumPct.toFixed(0)}% vs spot)
      </div>

      {/* Updated timestamp */}
      <div
        style={{
          fontFamily: MONO,
          fontSize: 9,
          color: 'var(--text-muted)',
          textAlign: 'right',
          marginTop: 8,
        }}
      >
        Updated {editorial.updatedAt}
      </div>
    </div>
  );
}
