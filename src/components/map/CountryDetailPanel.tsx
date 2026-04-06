'use client';

import { METRICS, METRIC_GROUPS, METRIC_BY_KEY } from './metrics';
import { X } from '@phosphor-icons/react';

interface CountryRecord {
  countryName: string;
  countryCode: string;
  capital?: string | null;
  region?: string | null;
  areaKm2?: number | null;
  currency?: string | null;
  language?: string | null;
  trivia?: string | null;
  aqiLabel?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
}

interface CountryDetailPanelProps {
  country: CountryRecord;
  activeMetric: string;
  onClose: () => void;
}

export function CountryDetailPanel({ country, activeMetric, onClose }: CountryDetailPanelProps) {
  const activeM = METRIC_BY_KEY[activeMetric];
  const activeVal = country[activeMetric] as number | null;

  return (
    <div
      className="absolute top-0 right-0 bottom-0 overflow-y-auto z-20"
      style={{
        width: 320,
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border-primary)',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--text-primary)',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border-primary)' }}
      >
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.04em' }}>
            {country.countryName}
          </div>
          {country.capital && (
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 2 }}>
              {country.capital}
              {country.region && <span> &middot; {country.region}</span>}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: '1px solid var(--border-subtle)',
            padding: '4px',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={14} weight="bold" />
        </button>
      </div>

      {/* Active metric highlight */}
      {activeM && (
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
            {activeM.label}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {activeVal != null ? activeM.format(activeVal) : '--'}
          </div>
        </div>
      )}

      {/* Basic info */}
      <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <Row label="Area" value={country.areaKm2 ? `${(country.areaKm2 as number).toLocaleString()} km\u00B2` : null} />
        <Row label="Currency" value={country.currency as string | null} />
        <Row label="Language" value={country.language as string | null} />
      </div>

      {/* Metric groups */}
      {METRIC_GROUPS.map((group) => {
        const groupMetrics = METRICS.filter((m) => m.group === group);
        return (
          <div key={group} className="px-4 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: 4, fontWeight: 600 }}>
              {group}
            </div>
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
          </div>
        );
      })}

      {/* AQI label */}
      {country.aqiLabel && (
        <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <Row label="Air Quality" value={`${country.aqi ?? '--'} (${country.aqiLabel})`} />
        </div>
      )}

      {/* Trivia */}
      {country.trivia && (
        <div className="px-4 py-3">
          <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: 4, fontWeight: 600 }}>
            Intel Note
          </div>
          <p style={{ fontStyle: 'italic', fontSize: '11px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            {country.trivia as string}
          </p>
        </div>
      )}

      {/* Updated timestamp */}
      {country.updatedAt && (
        <div className="px-4 py-2" style={{ borderTop: '1px solid var(--border-subtle)', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Updated: {new Date(country.updatedAt as string).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  return (
    <div
      className="flex items-center justify-between py-1"
      style={{
        color: highlight ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: highlight ? 600 : 400,
      }}
    >
      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <span>{value ?? '--'}</span>
    </div>
  );
}
