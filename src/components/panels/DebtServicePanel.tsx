'use client';

/**
 * Debt Service Burden — annual interest payments as a percentage of tax
 * revenue, for the five reserve sovereigns.
 *
 * The debt-service trap: when interest costs eat an ever-larger share of
 * revenue, less is left for everything else (defence, healthcare, schools).
 * In the US, interest now exceeds defence spending — first time since the
 * 1990s that bond holders are paid more than the Pentagon.
 *
 * Sources:
 *   USD — FRED FYOINT (interest outlays) / FYFRGDA188S × IRRECPT (revenue)
 *   GBP — UK ONS PSF1 series (debt interest / total receipts)
 *   EUR — ECB / Eurostat consolidated (interest payable / govt revenue)
 *   JPY — Japan MOF FY budget (debt service / general account revenue)
 *   CNY — IMF Article IV staff report (interest / general govt revenue)
 *
 * Refresh annually — these are budget-cycle figures, not live tickers.
 */

interface ServiceData {
  flag: string;
  code: string;
  name: string;
  /** Annual interest payments, native currency, in billions */
  interest: number;
  /** Annual tax revenue, native currency, in billions */
  revenue: number;
  symbol: string;
  /** Trailing 5-year direction: 'rising' | 'flat' | 'falling' */
  trend: 'rising' | 'flat' | 'falling';
}

const DATA: ServiceData[] = [
  // USD: ~$1,020B interest on ~$4,400B revenue = 23.2%
  { flag: '🇺🇸', code: 'USD', name: 'US',       interest: 1020,    revenue: 4400,    symbol: '$', trend: 'rising'  },
  // JPY: ~¥9.4T debt service on ~¥73T general account revenue = 12.9%
  { flag: '🇯🇵', code: 'JPY', name: 'Japan',    interest: 9400,    revenue: 73000,   symbol: '¥', trend: 'rising'  },
  // GBP: ~£105B debt interest on ~£1,015B receipts = 10.3%
  { flag: '🇬🇧', code: 'GBP', name: 'UK',       interest: 105,     revenue: 1015,    symbol: '£', trend: 'rising'  },
  // EUR (aggregate): ~€420B interest payable on ~€7,300B govt revenue = 5.8%
  { flag: '🇪🇺', code: 'EUR', name: 'Eurozone', interest: 420,     revenue: 7300,    symbol: '€', trend: 'rising'  },
  // CNY: ~¥1.9T interest on ~¥34T revenue = 5.6%
  { flag: '🇨🇳', code: 'CNY', name: 'China',    interest: 1900,    revenue: 34000,   symbol: '¥', trend: 'rising'  },
];

function pctColor(pct: number): string {
  if (pct >= 20) return 'var(--accent-danger)';
  if (pct >= 12) return '#c87a3a';
  if (pct >=  6) return '#b89a4a';
  return '#7a8a5a';
}

function trendGlyph(trend: 'rising' | 'flat' | 'falling'): { glyph: string; color: string } {
  if (trend === 'rising')  return { glyph: '↑', color: 'var(--accent-danger)' };
  if (trend === 'falling') return { glyph: '↓', color: '#7a8a5a' };
  return { glyph: '→', color: 'var(--text-muted)' };
}

function fmtMoney(symbol: string, billions: number): string {
  if (billions >= 1000) {
    return `${symbol}${(billions / 1000).toFixed(2)}T`;
  }
  return `${symbol}${billions.toFixed(0)}B`;
}

const MAX_PCT = 26; // Y-axis cap for the bars

export function DebtServicePanel() {
  return (
    <div className="h-full w-full flex flex-col" style={{ fontFamily: 'var(--font-mono)' }}>
      <div
        className="flex items-center justify-between pb-1.5 mb-1"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span style={{ fontSize: '10px', letterSpacing: '0.16em', color: 'var(--text-muted)' }}>
          DEBT SERVICE · INTEREST / TAX REVENUE
        </span>
        <span style={{ fontSize: '9px', letterSpacing: '0.10em', color: 'var(--text-muted)' }}>
          ANNUAL · LATEST FY
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-around" style={{ minHeight: 0 }}>
        {DATA.map((d) => {
          const pct = (d.interest / d.revenue) * 100;
          const widthPct = (pct / MAX_PCT) * 100;
          const color = pctColor(pct);
          const t = trendGlyph(d.trend);
          return (
            <div
              key={d.code}
              className="grid items-center"
              style={{
                gridTemplateColumns: '18px 80px 1fr 150px',
                gap: '6px',
                fontSize: '11px',
              }}
            >
              <span style={{ fontSize: '14px', lineHeight: 1, textAlign: 'center' }}>{d.flag}</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {d.code}
                <span style={{ color: 'var(--text-muted)', fontSize: '9px', marginLeft: '6px', letterSpacing: '0.08em' }}>
                  {d.name}
                </span>
              </span>

              <div className="relative h-4">
                <div
                  style={{
                    width: `${widthPct}%`,
                    height: '100%',
                    backgroundColor: color,
                    opacity: 0.85,
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: `${Math.min(widthPct + 1, 96)}%`,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: color,
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {pct.toFixed(1)}%
                </span>
              </div>

              <div
                className="text-right"
                style={{ color: 'var(--text-muted)', fontSize: '10px', fontVariantNumeric: 'tabular-nums' }}
              >
                {fmtMoney(d.symbol, d.interest)}
                <span style={{ opacity: 0.6 }}> / {fmtMoney(d.symbol, d.revenue)}</span>
                <span style={{ color: t.color, marginLeft: '6px', fontSize: '11px' }} title={`5y trend: ${d.trend}`}>
                  {t.glyph}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="pt-1.5 mt-1 text-center"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '9px',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
        }}
      >
        US INTEREST OUTLAYS NOW EXCEED DEFENCE SPENDING — FIRST TIME SINCE 1998
      </div>
    </div>
  );
}
