'use client';

/**
 * Foreign Holders of US Treasuries — who is America in debt to?
 *
 * Treasury TIC (Treasury International Capital) data, top-10 ranked. Updated
 * monthly with a two-month lag. The figures here are the latest TIC release,
 * pasted in; refresh by hand each month from
 *   https://home.treasury.gov/data/treasury-international-capital-tic-system
 *
 * Note: Cayman / Belgium / Luxembourg / Ireland disproportionately appear
 * because they are custodial / Euroclear / fund-domicile jurisdictions —
 * the beneficial owner is rarely a Cayman pension fund. The list still
 * tells the truth about *via where* the world lends to Washington.
 */

interface Holder {
  flag: string;
  name: string;
  /** Holdings in USD billions */
  holdings: number;
  /** Tagged 'official' if predominantly central bank / sovereign wealth, 'custodial' if Euroclear / fund hub */
  tag: 'official' | 'custodial';
}

// Trimmed to top 7 — beyond Canada the holdings drop below ~$300B and the
// list becomes a sea of custodial fund hubs (Ireland, Switzerland, Taiwan).
// Better to keep the panel readable than exhaustive.
const HOLDERS: Holder[] = [
  { flag: '🇯🇵', name: 'Japan',          holdings: 1135, tag: 'official'  },
  { flag: '🇬🇧', name: 'United Kingdom', holdings:  809, tag: 'custodial' },
  { flag: '🇨🇳', name: 'China',          holdings:  759, tag: 'official'  },
  { flag: '🇰🇾', name: 'Cayman Islands', holdings:  432, tag: 'custodial' },
  { flag: '🇱🇺', name: 'Luxembourg',     holdings:  410, tag: 'custodial' },
  { flag: '🇧🇪', name: 'Belgium',        holdings:  397, tag: 'custodial' },
  { flag: '🇨🇦', name: 'Canada',         holdings:  375, tag: 'official'  },
];

const TOTAL_FOREIGN_HOLDINGS = 8550; // approx total foreign holdings in $B
const MAX_BAR = HOLDERS[0].holdings;

export function TreasuryHoldersPanel() {
  return (
    <div className="h-full w-full flex flex-col" style={{ fontFamily: 'var(--font-mono)' }}>
      {/* Sub-header */}
      <div
        className="flex items-center justify-between pb-1 mb-0.5"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span style={{ fontSize: '10px', letterSpacing: '0.14em', color: 'var(--text-muted)' }}>
          TOP HOLDERS · US TREASURIES · TIC
        </span>
        <span style={{ fontSize: '9px', letterSpacing: '0.10em', color: 'var(--text-muted)' }}>
          ${(TOTAL_FOREIGN_HOLDINGS / 1000).toFixed(2)}T total foreign
        </span>
      </div>

      {/* Holders list */}
      <div className="flex-1" style={{ minHeight: 0, overflow: 'hidden' }}>
        {HOLDERS.map((h, i) => {
          const widthPct = (h.holdings / MAX_BAR) * 100;
          const sharePct = (h.holdings / TOTAL_FOREIGN_HOLDINGS) * 100;
          const tagColor = h.tag === 'official' ? 'var(--accent-danger)' : 'var(--text-muted)';
          return (
            <div
              key={h.name}
              className="grid items-center py-1"
              style={{
                gridTemplateColumns: '18px 18px 110px 1fr 70px',
                gap: '6px',
                fontSize: '11px',
              }}
            >
              <span
                style={{
                  fontSize: '9px',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.08em',
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ fontSize: '14px', lineHeight: 1, textAlign: 'center' }}>{h.flag}</span>
              <span style={{ color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                {h.name}
                <span
                  title={h.tag === 'official' ? 'Predominantly central bank / sovereign holdings' : 'Predominantly custodial / fund-domicile holdings'}
                  style={{
                    fontSize: '8px',
                    color: tagColor,
                    marginLeft: '6px',
                    letterSpacing: '0.10em',
                    opacity: 0.75,
                  }}
                >
                  {h.tag === 'official' ? '◆' : '○'}
                </span>
              </span>
              <div className="relative h-3">
                <div
                  style={{
                    width: `${widthPct}%`,
                    height: '100%',
                    backgroundColor: h.tag === 'official' ? 'var(--accent-danger)' : '#b89a4a',
                    opacity: 0.7,
                  }}
                />
              </div>
              <div
                className="text-right"
                style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}
              >
                ${h.holdings.toLocaleString('en-US')}B
                <span
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '9px',
                    marginLeft: '4px',
                  }}
                >
                  {sharePct.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer legend */}
      <div
        className="flex items-center justify-between pt-1.5 mt-1"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '9px',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
        }}
      >
        <span>
          <span style={{ color: 'var(--accent-danger)', marginRight: '4px' }}>◆</span>OFFICIAL · CB / SOVEREIGN
        </span>
        <span>
          <span style={{ marginRight: '4px' }}>○</span>CUSTODIAL · FUND HUB
        </span>
      </div>
    </div>
  );
}
