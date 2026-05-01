'use client';

/**
 * Debt-to-GDP Hierarchy — sovereign debt as a percentage of GDP, ranked
 * across the major economies. The clean way to see why Japan's clock ticks
 * differently from China's: not the absolute figure, but the burden.
 *
 * Data source: FRED `GGGDTA[ISO]Q190S` series (General Government Gross Debt
 * to GDP, OECD), latest available print. Refresh manually with each
 * quarter's IMF Fiscal Monitor / OECD Economic Outlook.
 *
 * Colour bands:
 *   ≥150%  critical  (red)        — Japan, Greece, Italy
 *    100–150%  stressed (amber)   — US, France, UK, Spain, Belgium
 *     60–100%  elevated (yellow)
 *    <60%     stable   (parchment) — Germany, Korea, Australia
 */

interface Sovereign {
  flag: string;
  name: string;
  iso: string;
  /** Gross general govt debt / GDP, percent */
  debtToGDP: number;
  /** Debt in trillions USD (for tooltip / context) */
  debtUSD: number;
}

// IMF / OECD prints, late-2025 / early-2026 vintage. 18 sovereigns spanning
// the full critical-to-stable spectrum.
const DATA: Sovereign[] = [
  { flag: '🇯🇵', name: 'Japan',          iso: 'JPN', debtToGDP: 251.2, debtUSD: 9.40 },
  { flag: '🇬🇷', name: 'Greece',         iso: 'GRC', debtToGDP: 158.8, debtUSD: 0.39 },
  { flag: '🇮🇹', name: 'Italy',          iso: 'ITA', debtToGDP: 137.5, debtUSD: 3.20 },
  { flag: '🇺🇸', name: 'United States',  iso: 'USA', debtToGDP: 122.3, debtUSD: 36.70 },
  { flag: '🇫🇷', name: 'France',         iso: 'FRA', debtToGDP: 112.0, debtUSD: 3.50 },
  { flag: '🇪🇸', name: 'Spain',          iso: 'ESP', debtToGDP: 107.4, debtUSD: 1.85 },
  { flag: '🇨🇦', name: 'Canada',         iso: 'CAN', debtToGDP: 105.9, debtUSD: 2.55 },
  { flag: '🇧🇪', name: 'Belgium',        iso: 'BEL', debtToGDP: 105.1, debtUSD: 0.78 },
  { flag: '🇬🇧', name: 'United Kingdom', iso: 'GBR', debtToGDP: 102.5, debtUSD: 3.65 },
  { flag: '🇵🇹', name: 'Portugal',       iso: 'PRT', debtToGDP:  95.4, debtUSD: 0.29 },
  { flag: '🇪🇺', name: 'Eurozone (avg)', iso: 'EMU', debtToGDP:  88.4, debtUSD: 14.50 },
  { flag: '🇨🇳', name: 'China',          iso: 'CHN', debtToGDP:  88.0, debtUSD: 5.10 },
  { flag: '🇧🇷', name: 'Brazil',         iso: 'BRA', debtToGDP:  84.7, debtUSD: 1.95 },
  { flag: '🇮🇳', name: 'India',          iso: 'IND', debtToGDP:  82.6, debtUSD: 3.05 },
  { flag: '🇩🇪', name: 'Germany',        iso: 'DEU', debtToGDP:  62.7, debtUSD: 2.95 },
  { flag: '🇰🇷', name: 'South Korea',    iso: 'KOR', debtToGDP:  56.6, debtUSD: 0.95 },
  { flag: '🇲🇽', name: 'Mexico',         iso: 'MEX', debtToGDP:  51.5, debtUSD: 0.93 },
  { flag: '🇦🇺', name: 'Australia',      iso: 'AUS', debtToGDP:  49.8, debtUSD: 0.82 },
  { flag: '🇸🇦', name: 'Saudi Arabia',   iso: 'SAU', debtToGDP:  29.9, debtUSD: 0.32 },
  { flag: '🇷🇺', name: 'Russia',         iso: 'RUS', debtToGDP:  19.5, debtUSD: 0.46 },
];

function bandColor(pct: number): string {
  if (pct >= 150) return 'var(--accent-danger)';
  if (pct >= 100) return '#c87a3a';      // amber — works in both themes
  if (pct >=  60) return '#b89a4a';      // yellow / mustard
  return '#7a8a5a';                       // muted green
}

function bandLabel(pct: number): string {
  if (pct >= 150) return 'CRITICAL';
  if (pct >= 100) return 'STRESSED';
  if (pct >=  60) return 'ELEVATED';
  return 'STABLE';
}

const MAX_PCT = 260;  // sets the bar-chart x-axis ceiling — Japan + headroom

export function DebtToGDPPanel() {
  return (
    <div className="h-full w-full flex flex-col" style={{ fontFamily: 'var(--font-mono)' }}>
      {/* Sub-header — axis legend */}
      <div
        className="flex items-center justify-between pb-1.5 mb-1"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span style={{ fontSize: '10px', letterSpacing: '0.14em', color: 'var(--text-muted)' }}>
          GROSS GOVT DEBT / GDP · IMF
        </span>
        <div className="flex items-center gap-2" style={{ fontSize: '8px', letterSpacing: '0.10em', color: 'var(--text-muted)' }}>
          <span><span style={{ display: 'inline-block', width: '7px', height: '7px', backgroundColor: '#7a8a5a', marginRight: '3px', verticalAlign: 'middle' }} />STABLE</span>
          <span><span style={{ display: 'inline-block', width: '7px', height: '7px', backgroundColor: '#b89a4a', marginRight: '3px', verticalAlign: 'middle' }} />ELEVATED</span>
          <span><span style={{ display: 'inline-block', width: '7px', height: '7px', backgroundColor: '#c87a3a', marginRight: '3px', verticalAlign: 'middle' }} />STRESSED</span>
          <span><span style={{ display: 'inline-block', width: '7px', height: '7px', backgroundColor: 'var(--accent-danger)', marginRight: '3px', verticalAlign: 'middle' }} />CRITICAL</span>
        </div>
      </div>

      {/* Bars */}
      <div className="flex-1" style={{ minHeight: 0, overflow: 'hidden' }}>
        {DATA.map((s) => {
          const widthPct = (s.debtToGDP / MAX_PCT) * 100;
          const color = bandColor(s.debtToGDP);
          return (
            <div
              key={s.iso}
              className="grid items-center py-0.5"
              style={{
                gridTemplateColumns: '18px 110px 1fr 76px',
                gap: '6px',
                fontSize: '11px',
              }}
            >
              <span style={{ fontSize: '14px', lineHeight: 1, textAlign: 'center' }}>{s.flag}</span>
              <span style={{ color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                {s.name}
              </span>
              <div className="relative h-4">
                {/* 100% reference line */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${(100 / MAX_PCT) * 100}%`,
                    top: 0,
                    bottom: 0,
                    width: '1px',
                    backgroundColor: 'var(--border-subtle)',
                    opacity: 0.6,
                  }}
                />
                {/* The bar */}
                <div
                  style={{
                    width: `${widthPct}%`,
                    height: '100%',
                    backgroundColor: color,
                    opacity: 0.85,
                  }}
                />
              </div>
              <div className="text-right">
                <span
                  style={{
                    color: color,
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {s.debtToGDP.toFixed(1)}%
                </span>
                <span
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '9px',
                    marginLeft: '6px',
                    letterSpacing: '0.08em',
                  }}
                  title={`${bandLabel(s.debtToGDP)} · $${s.debtUSD.toFixed(2)}T`}
                >
                  ${s.debtUSD.toFixed(1)}T
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
