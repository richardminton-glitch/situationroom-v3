'use client';

/**
 * Sovereign Debt Clock — hero panel for the Sovereign Debt Countdown dashboard.
 *
 * Five major reserve currencies (USD, EUR, GBP, JPY, CNY). Each cell renders
 * the running national debt figure ticking up live, calibrated to a known
 * anchor (level + date + nominal annual growth rate). The growth rate is
 * derived from observed monetary-supply-aligned debt expansion — 5–10% p.a.
 * for most majors, ~2.5% for Japan.
 *
 * The closed-form D(t) = D0 · (1 + r)^(years_elapsed) is recomputed on every
 * animation frame, so the figure is always self-consistent regardless of
 * tab-throttling / sleep / clock skew. Per-second tick rate is the analytic
 * derivative D · ln(1 + r) / SECONDS_PER_YEAR.
 *
 * Visual reference: ukdebtclock.co.uk — the panic-inducing digit churn at
 * the cents end is the desired effect.
 */

import { useEffect, useRef, useState } from 'react';

interface DebtAnchor {
  flag: string;
  code: string;
  nation: string;
  symbol: string;
  /** Anchor moment (ms since epoch) when anchorDebt was the official figure */
  anchorTimestamp: number;
  /** Sovereign debt at anchor moment, in native currency units */
  anchorDebt: number;
  /** Annual nominal growth rate (e.g. 0.075 = 7.5%/yr) */
  growthRate: number;
  population: number;
  /** Annual GDP in native currency units */
  gdp: number;
  /** Latest YoY CPI print (percent) */
  cpiYoY: number;
}

const SECONDS_PER_YEAR = 365.25 * 86400;
const MS_PER_YEAR = SECONDS_PER_YEAR * 1000;
const ANCHOR = new Date('2026-01-01T00:00:00Z').getTime();

// Anchor figures calibrated to early-2026 official prints. Growth rates are
// 3-year trailing nominal averages — the rate at which each sovereign has
// been expanding its debt stock alongside money-supply expansion.
const DEBTS: DebtAnchor[] = [
  {
    flag: '🇺🇸', code: 'USD', nation: 'United States', symbol: '$',
    anchorTimestamp: ANCHOR,
    anchorDebt: 36_700_000_000_000,
    growthRate: 0.075,
    population: 336_000_000,
    gdp: 30_000_000_000_000,
    cpiYoY: 3.1,
  },
  {
    flag: '🇪🇺', code: 'EUR', nation: 'Eurozone', symbol: '€',
    anchorTimestamp: ANCHOR,
    anchorDebt: 13_600_000_000_000,
    growthRate: 0.045,
    population: 350_000_000,
    gdp: 15_500_000_000_000,
    cpiYoY: 2.4,
  },
  {
    flag: '🇬🇧', code: 'GBP', nation: 'United Kingdom', symbol: '£',
    anchorTimestamp: ANCHOR,
    anchorDebt: 2_850_000_000_000,
    growthRate: 0.055,
    population: 68_000_000,
    gdp: 2_650_000_000_000,
    cpiYoY: 2.8,
  },
  {
    flag: '🇯🇵', code: 'JPY', nation: 'Japan', symbol: '¥',
    anchorTimestamp: ANCHOR,
    anchorDebt: 1_330_000_000_000_000,
    growthRate: 0.025,
    population: 124_000_000,
    gdp: 600_000_000_000_000,
    cpiYoY: 2.6,
  },
  {
    flag: '🇨🇳', code: 'CNY', nation: 'China', symbol: '¥',
    anchorTimestamp: ANCHOR,
    anchorDebt: 36_000_000_000_000,
    growthRate: 0.085,
    population: 1_410_000_000,
    gdp: 126_000_000_000_000,
    cpiYoY: 0.4,
  },
];

function debtAt(a: DebtAnchor, now: number): number {
  const yearsElapsed = (now - a.anchorTimestamp) / MS_PER_YEAR;
  return a.anchorDebt * Math.pow(1 + a.growthRate, yearsElapsed);
}

function tickPerSec(a: DebtAnchor, current: number): number {
  return (current * Math.log(1 + a.growthRate)) / SECONDS_PER_YEAR;
}

function formatBig(symbol: string, value: number): string {
  return symbol + value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPerSec(symbol: string, value: number): string {
  return symbol + value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPerCitizen(symbol: string, value: number): string {
  return symbol + value.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });
}

export function SovereignDebtClockPanel() {
  const [now, setNow] = useState<number>(() => Date.now());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="h-full w-full grid grid-cols-5">
      {DEBTS.map((a, i) => {
        const current = debtAt(a, now);
        const per = tickPerSec(a, current);
        const perCitizen = current / a.population;
        const debtToGDP = (current / a.gdp) * 100;

        return (
          <div
            key={a.code}
            className="flex flex-col justify-center items-center px-2 py-2"
            style={{
              borderRight: i < DEBTS.length - 1 ? '1px solid var(--border-subtle)' : undefined,
            }}
          >
            {/* Currency / nation header */}
            <div className="flex items-center gap-2 mb-1.5">
              <span style={{ fontSize: '16px', lineHeight: 1 }}>{a.flag}</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.18em',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                {a.code} · {a.nation}
              </span>
            </div>

            {/* Live ticking debt — to two decimal places */}
            <div
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--accent-danger)',
                letterSpacing: '-0.01em',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {formatBig(a.symbol, current)}
            </div>

            {/* Per-second tick rate */}
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-muted)',
                marginTop: '3px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              +{formatPerSec(a.symbol, per)} <span style={{ opacity: 0.7 }}>/sec</span>
            </div>

            {/* Stats grid — debt per citizen, % of GDP, YoY growth, CPI */}
            <div
              className="mt-3 grid grid-cols-2 text-center"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                gap: '4px 14px',
                width: '100%',
                maxWidth: '240px',
              }}
            >
              <div>
                <div style={{ color: 'var(--text-muted)', letterSpacing: '0.10em', fontSize: '9px' }}>
                  PER CITIZEN
                </div>
                <div style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatPerCitizen(a.symbol, perCitizen)}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', letterSpacing: '0.10em', fontSize: '9px' }}>
                  % OF GDP
                </div>
                <div style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {debtToGDP.toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', letterSpacing: '0.10em', fontSize: '9px' }}>
                  YoY EXPANSION
                </div>
                <div style={{ color: 'var(--accent-danger)', fontVariantNumeric: 'tabular-nums' }}>
                  +{(a.growthRate * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', letterSpacing: '0.10em', fontSize: '9px' }}>
                  CPI
                </div>
                <div style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  +{a.cpiYoY.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
