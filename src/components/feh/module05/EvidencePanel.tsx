'use client';

/**
 * EvidencePanel — drilldown for a selected wartime-finance country.
 *
 * Renders below or alongside the pipeline. Shows the country's stage
 * number, the four monitored metrics, and the documented evidence list
 * that put it at that stage.
 */

import type { WartimeCountry } from '@/lib/feh/wartime-seed';

interface EvidencePanelProps {
  country: WartimeCountry | null;
  onClose: () => void;
}

const STAGE_LABEL: Record<number, string> = {
  1: 'DEFENCE SPENDING ↑',
  2: 'WAR BOND ISSUANCE',
  3: 'CAPITAL CONTROLS',
  4: 'PRICE / WAGE DECREES',
  5: 'MONETARY DEBASEMENT',
};

export function EvidencePanel({ country, onClose }: EvidencePanelProps) {
  if (!country) {
    return (
      <div
        className="border p-5 flex items-center justify-center text-center"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'var(--bg-card)',
          minHeight: 240,
        }}
      >
        <p
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 11,
            letterSpacing: '0.16em',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            maxWidth: 320,
            lineHeight: 1.7,
          }}
        >
          [ SELECT A COUNTRY TAG ABOVE TO LOAD EVIDENCE DOSSIER ]
        </p>
      </div>
    );
  }

  const stageColor =
    country.stage >= 5 ? 'var(--feh-critical)' :
    country.stage >= 3 ? 'var(--feh-warning)' :
    'var(--feh-stable)';

  return (
    <div
      className="border"
      style={{
        borderColor: 'var(--border-primary)',
        backgroundColor: 'var(--bg-card)',
      }}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-2.5"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-baseline gap-3">
          <span style={{ fontSize: 22, lineHeight: 1 }}>{country.flag}</span>
          <span
            style={{
              fontFamily: 'var(--feh-font-mono)',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '0.1em',
            }}
          >
            {country.name.toUpperCase()}
          </span>
          <span
            style={{
              fontFamily: 'var(--feh-font-mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              color: stageColor,
              fontWeight: 700,
            }}
          >
            STAGE {country.stage} · {STAGE_LABEL[country.stage]}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            background: 'transparent',
            border: 'none',
          }}
        >
          [ CLOSE ✕ ]
        </button>
      </div>

      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <Metric label="DEFENCE / GDP" value={`${country.defenceSpendPctGdp.toFixed(1)}%`} />
        <Metric label="DEF CAGR 3Y"   value={`${country.defenceCagr3y >= 0 ? '+' : ''}${country.defenceCagr3y.toFixed(1)}%`} />
        <Metric label="M2 CAGR 3Y"    value={`${country.m2Growth3y.toFixed(1)}%`} />
        <Metric label="CPI YoY"       value={`${country.cpiYoY.toFixed(1)}%`} />
      </div>

      <div className="px-4 py-3">
        <div
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 9,
            letterSpacing: '0.22em',
            color: 'var(--text-muted)',
            marginBottom: 6,
          }}
        >
          DOCUMENTED EVIDENCE
        </div>
        <ul className="space-y-1.5">
          {country.evidence.map((e, i) => (
            <li
              key={i}
              style={{
                fontFamily: 'var(--feh-font-mono)',
                fontSize: 11,
                letterSpacing: '0.04em',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                paddingLeft: 14,
                position: 'relative',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  color: stageColor,
                  fontWeight: 700,
                }}
              >
                ▸
              </span>
              {e}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span
        style={{
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 9,
          letterSpacing: '0.16em',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.04em',
        }}
      >
        {value}
      </span>
    </div>
  );
}
