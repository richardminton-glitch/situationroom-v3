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
    <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a2e2e', flexShrink: 0 }}>
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
    <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a2e2e', flexShrink: 0 }}>
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

// ── Section C: Conviction Signal (expanded — fills remaining space) ─────────

const SHORT_NAMES: Record<string, string> = {
  sentiment: 'SENTIMENT',
  momentum: 'MOMENTUM',
  onchain: 'ON-CHAIN',
  macro: 'MACRO',
  network: 'NETWORK',
};

const DIRECTION_STYLE: Record<string, { symbol: string; color: string }> = {
  bullish: { symbol: '\u25B2', color: '#00d4aa' },
  bearish: { symbol: '\u25BC', color: '#cc4444' },
  neutral: { symbol: '\u25C6', color: '#d4a017' },
};

function ConvictionDisplay({
  conviction,
  outlookText,
  pool,
}: {
  conviction: ConvictionData;
  outlookText: string;
  pool: PoolData | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const score = Math.max(0, Math.min(100, conviction.composite));

  const truncated =
    outlookText.length > 120 ? outlookText.slice(0, 120) + '...' : outlookText;

  const posColor =
    pool?.position === 'LONG'
      ? '#00d4aa'
      : pool?.position === 'SHORT'
        ? '#cc4444'
        : '#e0f0f0';

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div
        className="ops-conviction-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 14px',
        }}
      >
        {/* ── Header + score ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <SectionHeader label="Conviction Signal" />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: conviction.bandColor || '#00d4aa',
                fontFamily: FONT,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              }}
            >
              {score}
            </span>
            <span
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: conviction.bandColor || '#00d4aa',
                fontFamily: FONT,
                fontWeight: 600,
                lineHeight: 1.2,
              }}
            >
              {conviction.band}
            </span>
          </div>
        </div>

        {/* ── Separator ── */}
        <div style={{ height: 1, background: '#1a2e2e', marginBottom: 14 }} />

        {/* ── Signal breakdown ── */}
        <div
          style={{
            fontSize: 9,
            letterSpacing: '0.12em',
            color: '#4a6060',
            textTransform: 'uppercase',
            marginBottom: 12,
            fontFamily: FONT,
          }}
        >
          SIGNAL BREAKDOWN
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {conviction.signals.map((sig) => {
            const shortName = SHORT_NAMES[sig.key] || sig.name.toUpperCase();
            const dir = DIRECTION_STYLE[sig.direction] || DIRECTION_STYLE.neutral;
            const barColor = dir.color;
            const weight = sig.weight ? `${Math.round(sig.weight * 100)}%` : '';

            return (
              <div key={sig.key || sig.name}>
                {/* Name + weight */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      letterSpacing: '0.06em',
                      color: '#e0f0f0',
                      fontFamily: FONT,
                      fontWeight: 600,
                    }}
                  >
                    {shortName}
                  </span>
                  <span
                    style={{
                      fontSize: 8,
                      color: '#4a6060',
                      fontFamily: FONT,
                    }}
                  >
                    {weight}
                  </span>
                </div>

                {/* Bar + score + direction */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: 4,
                      background: '#1a2e2e',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${sig.score}%`,
                        height: '100%',
                        background: barColor,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color: '#e0f0f0',
                      fontVariantNumeric: 'tabular-nums',
                      fontFamily: FONT,
                      width: 22,
                      textAlign: 'right',
                      flexShrink: 0,
                    }}
                  >
                    {sig.score}
                  </span>
                  <span
                    style={{
                      fontSize: 8,
                      color: dir.color,
                      flexShrink: 0,
                      width: 10,
                      textAlign: 'center',
                    }}
                  >
                    {dir.symbol}
                  </span>
                </div>

                {/* Raw data label */}
                <div
                  style={{
                    fontSize: 8,
                    color: '#4a6060',
                    marginTop: 3,
                    fontFamily: FONT,
                    lineHeight: 1.3,
                  }}
                >
                  {sig.rawLabel || sig.interpretation}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── AI Outlook ── */}
        {outlookText && (
          <>
            <div style={{ height: 1, background: '#1a2e2e', margin: '14px 0' }} />
            <div
              style={{
                fontSize: 9,
                letterSpacing: '0.12em',
                color: '#4a6060',
                textTransform: 'uppercase',
                marginBottom: 8,
                fontFamily: FONT,
              }}
            >
              AI OUTLOOK
            </div>
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
              &ldquo;{expanded ? outlookText : truncated}&rdquo;
            </div>
          </>
        )}

        {/* ── Pool Status (compact) ── */}
        {pool && (
          <>
            <div style={{ height: 1, background: '#1a2e2e', margin: '14px 0' }} />
            <div
              style={{
                fontSize: 9,
                letterSpacing: '0.12em',
                color: '#4a6060',
                textTransform: 'uppercase',
                marginBottom: 8,
                fontFamily: FONT,
              }}
            >
              POOL STATUS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  fontFamily: FONT,
                  color: '#e0f0f0',
                }}
              >
                <span style={{ color: '#4a6060' }}>BAL</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {pool.balanceSats.toLocaleString('en-US')} sats
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  fontFamily: FONT,
                  color: '#e0f0f0',
                }}
              >
                <span style={{ color: '#4a6060' }}>POS</span>
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
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  fontFamily: FONT,
                  color: '#e0f0f0',
                }}
              >
                <span style={{ color: '#4a6060' }}>P&amp;L</span>
                <span
                  style={{
                    color: pool.unrealisedPlSats >= 0 ? '#00d4aa' : '#cc4444',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {pool.unrealisedPlSats >= 0 ? '+' : ''}
                  {pool.unrealisedPlSats.toLocaleString('en-US')} sats
                </span>
              </div>
            </div>
          </>
        )}
      </div>
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
    <>
      <style>{`
        .ops-conviction-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .ops-conviction-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .ops-conviction-scroll::-webkit-scrollbar-thumb {
          background: #1a2e2e;
        }
      `}</style>

      <aside
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#0d1414',
          borderRight: '1px solid #1a2e2e',
          fontFamily: FONT,
          overflow: 'hidden',
        }}
      >
        {/* A — Asset Status */}
        <AssetStatusSection assets={assets} />

        {/* B — Network Health */}
        {network && <NetworkHealthSection network={network} />}

        {/* C — Conviction Signal (fills remaining space to channel) */}
        {conviction ? (
          <ConvictionDisplay conviction={conviction} outlookText={outlookText} pool={pool} />
        ) : (
          <div style={{ flex: 1 }} />
        )}
      </aside>
    </>
  );
}
