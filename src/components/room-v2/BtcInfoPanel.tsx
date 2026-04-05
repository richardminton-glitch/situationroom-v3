'use client';

/**
 * Bitcoin information panel for Members Room left sidebar.
 * Displays BTC price, network stats, and macro markets
 * in a compact dark-themed ops room style.
 */

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

const COLORS = {
  label: '#6b7a8d',
  primary: '#e8edf2',
  positive: '#00e5c8',
  negative: '#e03030',
  amber: '#f0a500',
  dimBorder: 'rgba(255,255,255,0.06)',
};

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface BtcInfoPanelProps {
  btcPrice: number;
  btcDelta: number;
  network: {
    hashrateEH: number;
    hashrateStatus: 'NOMINAL' | 'DEGRADED';
    mempoolMB: number;
    mempoolTxCount: number;
    mempoolTotalFeeBTC: number;
    mempoolStatus: 'CLEAR' | 'CONGESTED';
    feeFast: number;
    feeMed: number;
    feeSlow: number;
    feeEconomy: number;
    feeStatus: 'LOW' | 'ELEVATED';
    difficultyT: number;
    difficultyChange: number;
    difficultyProgress: number;
    difficultyRemainBlocks: number;
    blockHeight: number;
  } | null;
  goldPrice: number;
  goldDelta: number;
  oilPrice: number;
  oilDelta: number;
  dxyPrice: number;
  dxyDelta: number;
  threatScore: number;
  threatState: string;
}

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

function fmtPrice(v: number, decimals = 2): string {
  return '$' + v.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDelta(v: number): string {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}

function deltaColor(v: number): string {
  return v >= 0 ? COLORS.positive : COLORS.negative;
}

function threatColor(state: string): string {
  const s = state.toUpperCase();
  if (s === 'STABLE' || s === 'LOW') return COLORS.positive;
  if (s === 'ELEVATED' || s === 'GUARDED') return COLORS.amber;
  return COLORS.negative;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        fontFamily: FONT,
        letterSpacing: '0.12em',
        color: COLORS.label,
        padding: '8px 12px 4px',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  );
}

function StatusBadge({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <span
      style={{
        fontSize: 8,
        fontFamily: FONT,
        letterSpacing: '0.08em',
        color,
        background: color.startsWith('#')
          ? `${color}26`
          : color.replace(')', ', 0.15)').replace('rgb(', 'rgba('),
        padding: '1px 5px',
        borderRadius: 2,
        fontWeight: 600,
        lineHeight: '14px',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

function NetworkCell({
  label,
  value,
  unit,
  status,
  statusColor,
}: {
  label: string;
  value: string;
  unit: string;
  status: string;
  statusColor: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '4px 0',
      }}
    >
      <span
        style={{
          fontSize: 8,
          fontFamily: FONT,
          letterSpacing: '0.12em',
          color: COLORS.label,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span
          style={{
            fontSize: 12,
            fontFamily: FONT,
            color: COLORS.primary,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: 8,
            fontFamily: FONT,
            color: COLORS.label,
          }}
        >
          {unit}
        </span>
      </div>
      <StatusBadge label={status} color={statusColor} />
    </div>
  );
}

function MarketRow({
  label,
  price,
  delta,
}: {
  label: string;
  price: string;
  delta: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '3px 12px',
        fontFamily: FONT,
      }}
    >
      <span
        style={{
          fontSize: 9,
          letterSpacing: '0.12em',
          color: COLORS.label,
          width: 32,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 11,
          color: COLORS.primary,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {price}
      </span>
      <span
        style={{
          fontSize: 10,
          color: deltaColor(delta),
          fontVariantNumeric: 'tabular-nums',
          minWidth: 52,
          textAlign: 'right',
        }}
      >
        {fmtDelta(delta)}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function BtcInfoPanel({
  btcPrice,
  btcDelta,
  network,
  goldPrice,
  goldDelta,
  oilPrice,
  oilDelta,
  dxyPrice,
  dxyDelta,
  threatScore,
  threatState,
}: BtcInfoPanelProps) {
  const statusColor = (
    status: string,
  ): string => {
    const s = status.toUpperCase();
    if (s === 'NOMINAL' || s === 'CLEAR' || s === 'LOW') return COLORS.positive;
    if (s === 'CONGESTED' || s === 'ELEVATED') return COLORS.amber;
    return COLORS.negative;
  };

  return (
    <div
      className="btc-info-panel"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(9, 13, 18, 0.75)',
        backdropFilter: 'blur(6px)',
        borderRight: '1px solid rgba(0, 229, 200, 0.12)',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: FONT,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '6px 12px',
          fontSize: 9,
          fontFamily: FONT,
          letterSpacing: '0.14em',
          color: COLORS.label,
          borderBottom: `1px solid ${COLORS.dimBorder}`,
          flexShrink: 0,
        }}
      >
        BTC DATA FEED
      </div>

      {/* Scrollable content */}
      <div
        className="btc-info-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* -- BTC PRICE ------------------------------------------ */}
        <SectionLabel>BTC PRICE</SectionLabel>
        <div style={{ padding: '0 12px 6px' }}>
          <div
            style={{
              fontSize: 16,
              fontFamily: FONT,
              color: COLORS.primary,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.3,
            }}
          >
            {fmtPrice(btcPrice, 0)}
          </div>
          <div
            style={{
              fontSize: 11,
              fontFamily: FONT,
              color: deltaColor(btcDelta),
              fontVariantNumeric: 'tabular-nums',
              marginTop: 2,
            }}
          >
            {fmtDelta(btcDelta)} <span style={{ fontSize: 8, color: COLORS.label }}>24H</span>
          </div>
        </div>

        {/* -- NETWORK -------------------------------------------- */}
        <SectionLabel>NETWORK</SectionLabel>
        {network ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '2px 12px',
                padding: '0 12px 6px',
              }}
            >
              <NetworkCell
                label="HASHRATE"
                value={network.hashrateEH.toFixed(1)}
                unit="EH/s"
                status={network.hashrateStatus}
                statusColor={statusColor(network.hashrateStatus)}
              />
              <NetworkCell
                label="MEMPOOL"
                value={network.mempoolMB.toFixed(1)}
                unit={`MB / ${network.mempoolTxCount.toLocaleString()} txs`}
                status={network.mempoolStatus}
                statusColor={statusColor(network.mempoolStatus)}
              />
              <NetworkCell
                label="FEE RATE"
                value={String(network.feeFast)}
                unit="sat/vB"
                status={network.feeStatus}
                statusColor={statusColor(network.feeStatus)}
              />
              <NetworkCell
                label="THREAT"
                value={`${threatScore}/100`}
                unit=""
                status={threatState}
                statusColor={threatColor(threatState)}
              />
            </div>

            {/* Extended network data */}
            <div style={{ padding: '0 12px 6px' }}>
              {/* Fee tiers */}
              <div style={{
                display: 'flex', gap: 6, alignItems: 'center',
                padding: '3px 0', borderTop: `1px solid ${COLORS.dimBorder}`,
              }}>
                <span style={{ fontSize: 8, fontFamily: FONT, letterSpacing: '0.1em', color: COLORS.label, width: 42 }}>FEES</span>
                {[
                  { label: 'FAST', value: network.feeFast },
                  { label: 'MED', value: network.feeMed },
                  { label: 'SLOW', value: network.feeSlow },
                  { label: 'ECO', value: network.feeEconomy },
                ].map((f) => (
                  <span key={f.label} style={{ fontSize: 9, fontFamily: FONT, color: COLORS.primary, fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ color: COLORS.label, fontSize: 7 }}>{f.label} </span>{f.value}
                  </span>
                ))}
              </div>

              {/* Mempool pending fees */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '3px 0',
              }}>
                <span style={{ fontSize: 8, fontFamily: FONT, letterSpacing: '0.1em', color: COLORS.label }}>PENDING FEES</span>
                <span style={{ fontSize: 10, fontFamily: FONT, color: COLORS.primary, fontVariantNumeric: 'tabular-nums' }}>
                  {network.mempoolTotalFeeBTC.toFixed(4)} <span style={{ fontSize: 8, color: COLORS.label }}>BTC</span>
                </span>
              </div>

              {/* Block height */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '3px 0',
              }}>
                <span style={{ fontSize: 8, fontFamily: FONT, letterSpacing: '0.1em', color: COLORS.label }}>BLOCK</span>
                <span style={{ fontSize: 10, fontFamily: FONT, color: COLORS.primary, fontVariantNumeric: 'tabular-nums' }}>
                  {network.blockHeight.toLocaleString()}
                </span>
              </div>

              {/* Difficulty */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '3px 0',
              }}>
                <span style={{ fontSize: 8, fontFamily: FONT, letterSpacing: '0.1em', color: COLORS.label }}>DIFFICULTY</span>
                <span style={{ fontSize: 10, fontFamily: FONT, color: COLORS.primary, fontVariantNumeric: 'tabular-nums' }}>
                  {network.difficultyT.toFixed(1)} <span style={{ fontSize: 8, color: COLORS.label }}>T</span>
                  <span style={{ fontSize: 9, color: network.difficultyChange >= 0 ? COLORS.positive : COLORS.negative, marginLeft: 4 }}>
                    {network.difficultyChange >= 0 ? '+' : ''}{network.difficultyChange.toFixed(1)}%
                  </span>
                </span>
              </div>

              {/* Epoch progress bar */}
              <div style={{ padding: '3px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 8, fontFamily: FONT, letterSpacing: '0.1em', color: COLORS.label }}>EPOCH</span>
                  <span style={{ fontSize: 9, fontFamily: FONT, color: COLORS.primary, fontVariantNumeric: 'tabular-nums' }}>
                    {network.difficultyProgress.toFixed(1)}%
                    <span style={{ fontSize: 8, color: COLORS.label, marginLeft: 4 }}>
                      {network.difficultyRemainBlocks.toLocaleString()} blks
                    </span>
                  </span>
                </div>
                <div style={{
                  height: 3, borderRadius: 1.5,
                  background: 'rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 1.5,
                    width: `${Math.min(100, network.difficultyProgress)}%`,
                    background: COLORS.positive,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div
            style={{
              padding: '4px 12px 6px',
              fontSize: 9,
              color: COLORS.label,
            }}
          >
            AWAITING DATA...
          </div>
        )}

        {/* -- MARKETS -------------------------------------------- */}
        <SectionLabel>MARKETS</SectionLabel>
        <div style={{ paddingBottom: 6 }}>
          <MarketRow label="GOLD" price={fmtPrice(goldPrice)} delta={goldDelta} />
          <MarketRow label="OIL" price={fmtPrice(oilPrice)} delta={oilDelta} />
          <MarketRow label="DXY" price={dxyPrice.toFixed(2)} delta={dxyDelta} />
        </div>

      </div>

      {/* Scanline overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)',
          zIndex: 1,
        }}
      />

      <style>{`
        .btc-info-scroll::-webkit-scrollbar { width: 3px; }
        .btc-info-scroll::-webkit-scrollbar-track { background: transparent; }
        .btc-info-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}
