'use client';

import { useState } from 'react';
import type { AssetStatus, NetworkHealth, ConvictionData, PoolData } from '@/hooks/useOpsRoom';

interface OperationsPanelProps {
  assets: AssetStatus[];
  network: NetworkHealth | null;
  conviction: ConvictionData | null;
  outlookText: string;
  pool: PoolData | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const FONT = "'IBM Plex Mono', 'SF Mono', monospace";

function formatPrice(key: string, price: number): string {
  switch (key) {
    case 'btc':
      return `$${Math.round(price).toLocaleString('en-US')}`;
    case 'gold':
      return `$${Math.round(price).toLocaleString('en-US')}`;
    case 'oil':
      return `$${price.toFixed(2)}`;
    case 'dxy':
      return price.toFixed(2);
    default:
      return `$${price.toFixed(2)}`;
  }
}

function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(2)}%`;
}

// ── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 9,
        letterSpacing: '0.12em',
        color: '#4a6060',
        textTransform: 'uppercase',
        marginBottom: 10,
        fontFamily: FONT,
      }}
    >
      {label}
    </div>
  );
}

// ── Section A: Asset Status ──────────────────────────────────────────────────

function AssetStatusSection({ assets }: { assets: AssetStatus[] }) {
  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a2e2e' }}>
      <SectionHeader label="Asset Status" />
      {assets.map((a) => (
        <div
          key={a.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
            fontFamily: FONT,
          }}
        >
          <span style={{ fontSize: 11, color: '#e0f0f0', width: 40, flexShrink: 0 }}>
            {a.name}
          </span>
          <span
            style={{
              fontSize: 12,
              color: '#e0f0f0',
              fontVariantNumeric: 'tabular-nums',
              flex: 1,
              textAlign: 'center',
            }}
          >
            {formatPrice(a.key, a.price)}
          </span>
          <span
            style={{
              fontSize: 11,
              color: a.delta >= 0 ? '#00d4aa' : '#cc4444',
              width: 65,
              textAlign: 'right',
              flexShrink: 0,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatDelta(a.delta)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section B: Network Health ────────────────────────────────────────────────

function StatusDot({ good }: { good: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: good ? '#00d4aa' : '#d4a017',
        marginRight: 4,
        flexShrink: 0,
      }}
    />
  );
}

function NetworkHealthSection({ network }: { network: NetworkHealth }) {
  const rows: { label: string; value: string; unit: string; status: string; good: boolean }[] = [
    {
      label: 'HASHRATE',
      value: network.hashrateEH.toFixed(1),
      unit: 'EH/s',
      status: network.hashrateStatus,
      good: network.hashrateStatus === 'NOMINAL',
    },
    {
      label: 'MEMPOOL',
      value: network.mempoolMB.toFixed(1),
      unit: 'MB',
      status: network.mempoolStatus,
      good: network.mempoolStatus === 'CLEAR',
    },
    {
      label: 'FEES',
      value: network.feeFast.toFixed(0),
      unit: 'sat/vB',
      status: network.feeStatus,
      good: network.feeStatus === 'LOW',
    },
    {
      label: 'NEXT BLOCK',
      value: '~10',
      unit: 'min',
      status: '',
      good: true,
    },
  ];

  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a2e2e' }}>
      <SectionHeader label="Network Health" />
      {rows.map((r) => (
        <div
          key={r.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
            fontFamily: FONT,
            fontSize: 11,
            color: '#e0f0f0',
          }}
        >
          <span style={{ width: 85, flexShrink: 0 }}>{r.label}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', flex: 1, textAlign: 'center' }}>
            {r.value} {r.unit}
          </span>
          {r.status && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: r.good ? '#00d4aa' : '#d4a017',
                flexShrink: 0,
              }}
            >
              <StatusDot good={r.good} />
              {r.status}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Section C: Conviction Signal ─────────────────────────────────────────────

function ConvictionGauge({
  conviction,
  outlookText,
}: {
  conviction: ConvictionData;
  outlookText: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Score 0-100 mapped to arc fraction (start at top-left, sweep 270 degrees max)
  const maxArc = 0.75;
  const score = Math.max(0, Math.min(100, conviction.composite));
  const arcLength = (score / 100) * maxArc * circumference;
  const dashOffset = circumference - arcLength;
  // Rotate so the arc starts from the bottom-left (~135 degrees)
  const rotation = 135;

  const truncated =
    outlookText.length > 80 ? outlookText.slice(0, 80) + '...' : outlookText;

  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a2e2e' }}>
      <SectionHeader label="Conviction Signal" />

      {/* Gauge */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size}>
            {/* Background track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#1a2e2e"
              strokeWidth={strokeWidth}
              strokeDasharray={`${maxArc * circumference} ${circumference}`}
              strokeLinecap="round"
              transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
            />
            {/* Active arc */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={conviction.bandColor || '#00d4aa'}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          </svg>
          {/* Centered score */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: size,
              height: size,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FONT,
            }}
          >
            <span style={{ fontSize: 36, color: '#00d4aa', fontWeight: 600, lineHeight: 1 }}>
              {score}
            </span>
          </div>
        </div>

        {/* Band label */}
        <div
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: conviction.bandColor || '#00d4aa',
            fontFamily: FONT,
            marginTop: 4,
          }}
        >
          {conviction.band}
        </div>
      </div>

      {/* AI Rationale */}
      {outlookText && (
        <div
          onClick={() => setExpanded((prev) => !prev)}
          style={{
            fontSize: 10,
            color: '#4a6060',
            fontStyle: 'italic',
            fontFamily: FONT,
            lineHeight: 1.5,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          {expanded ? outlookText : truncated}
        </div>
      )}
    </div>
  );
}

// ── Section D: Pool Status ───────────────────────────────────────────────────

function PoolStatusSection({ pool }: { pool: PoolData }) {
  const posColor =
    pool.position === 'LONG'
      ? '#00d4aa'
      : pool.position === 'SHORT'
        ? '#cc4444'
        : '#e0f0f0';

  const plColor = pool.unrealisedPlSats >= 0 ? '#00d4aa' : '#cc4444';

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: 'POOL',
      value: (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {pool.balanceSats.toLocaleString('en-US')} sats
        </span>
      ),
    },
    {
      label: 'POS',
      value: (
        <span
          style={{
            color: posColor,
            textShadow:
              pool.position === 'LONG'
                ? '0 0 6px #00d4aa'
                : pool.position === 'SHORT'
                  ? '0 0 6px #cc4444'
                  : 'none',
          }}
        >
          {pool.position}
        </span>
      ),
    },
    {
      label: 'LAST',
      value: pool.lastTradeDesc,
    },
    {
      label: 'P&L',
      value: (
        <span style={{ color: plColor, fontVariantNumeric: 'tabular-nums' }}>
          {pool.unrealisedPlSats >= 0 ? '+' : ''}
          {pool.unrealisedPlSats.toLocaleString('en-US')} sats
        </span>
      ),
    },
  ];

  return (
    <div style={{ padding: '12px 14px' }}>
      <SectionHeader label="Pool Status" />
      {rows.map((r) => (
        <div
          key={r.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
            fontFamily: FONT,
            fontSize: 11,
            color: '#e0f0f0',
          }}
        >
          <span style={{ width: 45, flexShrink: 0, color: '#4a6060' }}>{r.label}</span>
          <span style={{ flex: 1, textAlign: 'right' }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────────────

export default function OperationsPanel({
  assets,
  network,
  conviction,
  outlookText,
  pool,
}: OperationsPanelProps) {
  return (
    <aside
      style={{
        width: '100%',
        height: '100%',
        background: '#0d1414',
        borderRight: '1px solid #1a2e2e',
        overflowY: 'auto',
        fontFamily: FONT,
      }}
    >
      {/* A — Asset Status */}
      <AssetStatusSection assets={assets} />

      {/* B — Network Health */}
      {network && <NetworkHealthSection network={network} />}

      {/* C — Conviction Signal */}
      {conviction && (
        <ConvictionGauge conviction={conviction} outlookText={outlookText} />
      )}

      {/* D — Pool Status */}
      {pool && <PoolStatusSection pool={pool} />}
    </aside>
  );
}
