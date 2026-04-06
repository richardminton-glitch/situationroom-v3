'use client';

import { METRICS, METRIC_GROUPS, METRIC_BY_KEY } from './metrics';
import { MapTrifold } from '@phosphor-icons/react';

interface CountryRecord {
  countryName: string;
  countryCode: string;
  capital?: string | null;
  region?: string | null;
  areaKm2?: number | null;
  currency?: string | null;
  language?: string | null;
  population?: number | null;
  trivia?: string | null;
  aqiLabel?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
}

interface CountryDetailPanelProps {
  country: CountryRecord | null;
  activeMetric: string;
}

/** Convert 2-letter ISO code to flag emoji */
function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

function fmtPop(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toLocaleString();
}

function fmtArea(v: number): string {
  return `${v.toLocaleString()} km\u00B2`;
}

export function CountryDetailPanel({ country, activeMetric }: CountryDetailPanelProps) {
  // Empty state — always visible sidebar with prompt
  if (!country) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full"
        style={{
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          padding: '32px 24px',
          textAlign: 'center',
        }}
      >
        <MapTrifold size={40} weight="thin" style={{ marginBottom: 16, opacity: 0.4 }} />
        <div
          style={{
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Select a Country
        </div>
        <p style={{ fontSize: '10px', lineHeight: 1.6, opacity: 0.7, maxWidth: 200 }}>
          Click any territory on the map to view detailed economic, social and geographic intelligence.
        </p>
      </div>
    );
  }

  const activeM = METRIC_BY_KEY[activeMetric];
  const activeVal = country[activeMetric] as number | null;
  const flag = flagEmoji(country.countryCode);
  const pop = country.population as number | null;

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--text-primary)',
      }}
    >
      {/* Header — flag, name, capital */}
      <div
        className="px-4 py-4"
        style={{ borderBottom: '1px solid var(--border-primary)' }}
      >
        <div className="flex items-center gap-3">
          <span style={{ fontSize: '28px', lineHeight: 1 }}>{flag}</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.04em' }}>
              {country.countryName}
            </div>
            {country.capital && (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 2 }}>
                &#9737; {country.capital}
              </div>
            )}
          </div>
        </div>
        {country.region && (
          <div
            style={{
              marginTop: 8,
              fontSize: '9px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              background: 'var(--bg-secondary)',
              display: 'inline-block',
              padding: '2px 8px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {country.region}
          </div>
        )}
      </div>

      {/* Active metric highlight */}
      {activeM && (
        <div
          className="px-4 py-3"
          style={{
            borderBottom: '1px solid var(--border-primary)',
            background: 'var(--bg-secondary)',
          }}
        >
          <div
            style={{
              fontSize: '9px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: 4,
            }}
          >
            {activeM.label}
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {activeVal != null ? activeM.format(activeVal) : '--'}
          </div>
        </div>
      )}

      {/* Geography */}
      <Section title="Geography">
        <Row label="Population" value={pop != null ? fmtPop(pop) : null} />
        <Row label="Area" value={country.areaKm2 ? fmtArea(country.areaKm2 as number) : null} />
        <Row label="Currency" value={country.currency as string | null} />
        <Row label="Language" value={country.language as string | null} />
      </Section>

      {/* Metric groups */}
      {METRIC_GROUPS.map((group) => {
        const groupMetrics = METRICS.filter((m) => m.group === group);
        return (
          <Section key={group} title={group}>
            {groupMetrics.map((m) => {
              const val = country[m.key] as number | null;
              const formatted = val != null ? m.format(val) : '--';
              const isActive = m.key === activeMetric;
              return (
                <Row
                  key={m.key}
                  label={m.label}
                  value={formatted}
                  highlight={isActive}
                />
              );
            })}
            {/* AQI label inline with environment group */}
            {group === 'Environment' && country.aqiLabel && (
              <Row label="AQI Rating" value={country.aqiLabel as string} />
            )}
          </Section>
        );
      })}

      {/* Intel Note */}
      {country.trivia && (
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div
            style={{
              fontSize: '9px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--accent-primary)',
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            Intel Note
          </div>
          <p
            style={{
              fontStyle: 'italic',
              fontSize: '11px',
              lineHeight: 1.7,
              color: 'var(--text-secondary)',
            }}
          >
            {country.trivia as string}
          </p>
        </div>
      )}

      {/* Footer */}
      <div
        className="px-4 py-2 mt-auto"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '9px',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {country.updatedAt
          ? `Updated: ${new Date(country.updatedAt as string).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
          : 'Source: World Bank / IMF / UNDP'}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div
        style={{
          fontSize: '9px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--accent-primary)',
          marginBottom: 4,
          fontWeight: 600,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | null;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between py-1"
      style={{
        color: highlight ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: highlight ? 600 : 400,
      }}
    >
      <span
        style={{
          fontSize: '10px',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </span>
      <span>{value ?? '--'}</span>
    </div>
  );
}
