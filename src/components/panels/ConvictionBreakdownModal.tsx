'use client';

/**
 * Conviction Breakdown Modal — comprehensive signal analysis overlay.
 *
 * Opens when user clicks the ConvictionPanel gauge.
 * Free users see an upgrade prompt; General+ see the full breakdown
 * with individual signal scores, weights, interpretations, and methodology.
 */

import { useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/layout/ThemeProvider';
import { useTier } from '@/hooks/useTier';
import { TIER_LABELS } from '@/lib/auth/tier';
import { usePricing, formatTierPrice } from '@/hooks/usePricing';
import type { ConvictionResult } from '@/lib/conviction/engine';
import {
  ChatCircleDots,
  TrendUp,
  LinkSimple,
  Graph,
  Globe,
  Lightning,
  X,
} from '@phosphor-icons/react';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DARK_BAND_COLORS: Record<string, string> = {
  'Maximum Conviction': '#2dd4bf',
  'Strong Conviction':  '#0aa89e',
  'Moderate':           '#c4885a',
  'Weak Signal':        '#d06050',
  'Contra-Conviction':  '#c04040',
};

const SIGNAL_ICONS: Record<string, ReactNode> = {
  sentiment: <ChatCircleDots size={16} weight="regular" />,
  momentum:  <TrendUp size={16} weight="regular" />,
  onchain:   <LinkSimple size={16} weight="regular" />,
  network:   <Graph size={16} weight="regular" />,
  macro:     <Globe size={16} weight="regular" />,
};

const SIGNAL_DESCRIPTIONS: Record<string, string> = {
  sentiment: 'Contrarian indicator — extreme fear signals opportunity, extreme greed signals risk.',
  momentum:  '30-day price trajectory — steady gains are healthier than parabolic moves.',
  onchain:   'MVRV ratio + distance from all-time high — valuation context from on-chain data.',
  network:   'Current hashrate vs 90-day average — miner conviction and network security trend.',
  macro:     'Federal Reserve interest rate — monetary policy tailwind or headwind for hard assets.',
};

const BAND_THRESHOLDS = [
  { min: 80, label: 'Maximum Conviction', desc: 'All signals aligned — historically strongest accumulation conditions' },
  { min: 65, label: 'Strong Conviction', desc: 'Majority of signals favourable — conditions support allocation' },
  { min: 50, label: 'Moderate', desc: 'Mixed signals — neutral positioning recommended' },
  { min: 35, label: 'Weak Signal', desc: 'Multiple headwinds — caution warranted, reduce exposure' },
  { min: 0,  label: 'Contra-Conviction', desc: 'Significant risk factors — defensive positioning advised' },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function GaugeLarge({ score, color }: { score: number; color: string }) {
  const GAUGE_START = 225;
  const GAUGE_SPAN = 270;
  const R = 58;
  const CX = 66;
  const CY = 66;

  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const arcPoint = (deg: number) => ({
    x: CX + R * Math.cos(toRad(deg)),
    y: CY + R * Math.sin(toRad(deg)),
  });

  const bgStart = arcPoint(GAUGE_START);
  const bgEnd = arcPoint(GAUGE_START + GAUGE_SPAN);
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${R} ${R} 0 1 1 ${bgEnd.x} ${bgEnd.y}`;

  const fillEnd = GAUGE_START + GAUGE_SPAN * (score / 100);
  const fillEndPt = arcPoint(fillEnd);
  const largeArc = (fillEnd - GAUGE_START) > 180 ? 1 : 0;
  const fillPath = `M ${bgStart.x} ${bgStart.y} A ${R} ${R} 0 ${largeArc} 1 ${fillEndPt.x} ${fillEndPt.y}`;

  return (
    <svg width="132" height="132" viewBox="0 0 132 132">
      <path d={bgPath} fill="none" stroke="var(--border-subtle)" strokeWidth="8" strokeLinecap="round" />
      <path d={fillPath} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
      <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize="28" fontWeight="bold" fontFamily="var(--font-data)">
        {score}
      </text>
      <text x={CX} y={CY + 16} textAnchor="middle" dominantBaseline="middle"
        fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)" letterSpacing="0.1em">
        / 100
      </text>
    </svg>
  );
}

function dirColor(dir: string): string {
  if (dir === 'bullish') return 'var(--accent-success)';
  if (dir === 'bearish') return 'var(--accent-danger)';
  return 'var(--text-muted)';
}

function dirLabel(dir: string): string {
  if (dir === 'bullish') return 'BULLISH';
  if (dir === 'bearish') return 'BEARISH';
  return 'NEUTRAL';
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

interface ConvictionBreakdownModalProps {
  data: ConvictionResult;
  onClose: () => void;
}

export function ConvictionBreakdownModal({
  data,
  onClose,
}: ConvictionBreakdownModalProps) {
  const { theme } = useTheme();
  const { canAccess } = useTier();
  const pricing = usePricing();
  const router = useRouter();
  const hasGeneral = canAccess('general');

  const bandColor = theme === 'dark'
    ? (DARK_BAND_COLORS[data.band] ?? data.bandColor)
    : data.bandColor;

  // Close on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Frosted backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: theme === 'dark'
            ? 'rgba(5, 8, 12, 0.75)'
            : 'rgba(120, 110, 90, 0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />

      {/* Modal card */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: hasGeneral ? 580 : 340,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          boxShadow: theme === 'dark'
            ? '0 16px 64px rgba(0,0,0,0.6)'
            : '0 16px 64px rgba(0,0,0,0.15)',
          animation: 'convictionModalIn 0.2s ease-out',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 4,
            lineHeight: 0,
            zIndex: 2,
          }}
          title="Close"
        >
          <X size={18} weight="bold" />
        </button>

        {!hasGeneral ? (
          /* ── FREE TIER: Upgrade prompt ── */
          <div style={{ padding: '40px 32px', textAlign: 'center' }}>
            {/* Show the score but gate the details */}
            <div style={{ marginBottom: 24 }}>
              <GaugeLarge score={data.composite} color={bandColor} />
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  color: bandColor,
                  marginTop: 4,
                  textTransform: 'uppercase',
                }}
              >
                {data.band}
              </div>
            </div>

            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.12em',
                color: 'var(--text-muted)',
                marginBottom: 8,
              }}
            >
              CONVICTION BREAKDOWN
            </div>
            <div
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: 14,
                color: 'var(--text-primary)',
                marginBottom: 6,
              }}
            >
              {TIER_LABELS.general} — {pricing ? formatTierPrice('general', pricing) : '...'}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: 12,
                color: 'var(--text-muted)',
                marginBottom: 24,
                lineHeight: 1.6,
              }}
            >
              Unlock the full 5-signal breakdown — individual scores,
              weights, interpretations, and methodology behind the
              conviction engine.
            </div>
            <button
              onClick={() => { onClose(); router.push('/support'); }}
              style={{
                padding: '10px 28px',
                background: 'var(--accent-primary)',
                color: 'var(--bg-primary)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                letterSpacing: '0.1em',
                fontWeight: 'bold',
              }}
            >
              UNLOCK <Lightning size={14} weight="fill" style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
            </button>
          </div>
        ) : (
          /* ── GENERAL+: Full breakdown ── */
          <div style={{ padding: '24px 28px' }}>
            {/* Header */}
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
                color: 'var(--text-muted)',
                marginBottom: 20,
              }}
            >
              CONVICTION SCORE BREAKDOWN
            </div>

            {/* Top section: gauge + summary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
              <div style={{ flexShrink: 0 }}>
                <GaugeLarge score={data.composite} color={bandColor} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: bandColor,
                    letterSpacing: '0.08em',
                    marginBottom: 4,
                    textTransform: 'uppercase',
                  }}
                >
                  {data.band}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    marginBottom: 8,
                  }}
                >
                  {BAND_THRESHOLDS.find((b) => data.composite >= b.min)?.desc}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {data.signalsAvailable}/{data.signalsTotal} SIGNALS ACTIVE
                  {data.calculatedAt && (
                    <> · {new Date(data.calculatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} UTC</>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border-subtle)', marginBottom: 20 }} />

            {/* Signal breakdown */}
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.12em',
                color: 'var(--text-muted)',
                marginBottom: 12,
              }}
            >
              SIGNAL ANALYSIS
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {data.signals.map((sig) => {
                const weightPct = (sig.weight * 100).toFixed(0);
                const contribution = (sig.score * sig.weight).toFixed(1);

                return (
                  <div key={sig.key}>
                    {/* Signal header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: dirColor(sig.direction), lineHeight: 0 }}>
                          {SIGNAL_ICONS[sig.key]}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            letterSpacing: '0.06em',
                          }}
                        >
                          {sig.name}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 8,
                            letterSpacing: '0.08em',
                            color: dirColor(sig.direction),
                            background: sig.direction === 'bullish'
                              ? 'rgba(74, 124, 89, 0.15)'
                              : sig.direction === 'bearish'
                              ? 'rgba(155, 50, 50, 0.15)'
                              : 'rgba(138, 126, 108, 0.15)',
                            padding: '1px 6px',
                          }}
                        >
                          {dirLabel(sig.direction)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 9,
                            color: 'var(--text-muted)',
                          }}
                        >
                          {weightPct}% weight
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-data)',
                            fontSize: 16,
                            fontWeight: 'bold',
                            color: dirColor(sig.direction),
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {sig.score}
                        </span>
                      </div>
                    </div>

                    {/* Score bar */}
                    <div
                      style={{
                        height: 4,
                        background: 'var(--border-subtle)',
                        borderRadius: 2,
                        overflow: 'hidden',
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${sig.score}%`,
                          background: dirColor(sig.direction),
                          borderRadius: 2,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>

                    {/* Details row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-data)',
                          fontSize: 11,
                          color: 'var(--text-secondary)',
                          lineHeight: 1.4,
                          flex: 1,
                        }}
                      >
                        {sig.interpretation}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          color: 'var(--text-muted)',
                          flexShrink: 0,
                          marginLeft: 12,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {sig.rawLabel}
                      </span>
                    </div>

                    {/* Contribution + methodology hint */}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 9,
                          color: 'var(--text-muted)',
                          fontStyle: 'italic',
                        }}
                      >
                        {SIGNAL_DESCRIPTIONS[sig.key]}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 9,
                          color: 'var(--text-muted)',
                          flexShrink: 0,
                          marginLeft: 12,
                        }}
                      >
                        +{contribution}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '20px 0' }} />

            {/* Band scale */}
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.12em',
                color: 'var(--text-muted)',
                marginBottom: 10,
              }}
            >
              CONVICTION BANDS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {BAND_THRESHOLDS.map((b) => {
                const isActive = data.band === b.label;
                const bColor = theme === 'dark'
                  ? (DARK_BAND_COLORS[b.label] ?? 'var(--text-muted)')
                  : b.label === 'Maximum Conviction' ? '#2a6e2a'
                  : b.label === 'Strong Conviction' ? '#4a7c59'
                  : b.label === 'Moderate' ? '#b8860b'
                  : b.label === 'Weak Signal' ? '#c85a2d'
                  : '#8b2020';

                return (
                  <div
                    key={b.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '3px 0',
                      opacity: isActive ? 1 : 0.5,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: bColor,
                        flexShrink: 0,
                        boxShadow: isActive ? `0 0 6px ${bColor}` : 'none',
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: isActive ? bColor : 'var(--text-muted)',
                        fontWeight: isActive ? 600 : 400,
                        letterSpacing: '0.06em',
                        width: 140,
                        flexShrink: 0,
                      }}
                    >
                      {b.label}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        color: 'var(--text-muted)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {b.min === 80 ? '80–100'
                        : b.min === 65 ? '65–79'
                        : b.min === 50 ? '50–64'
                        : b.min === 35 ? '35–49'
                        : '0–34'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Methodology */}
            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '16px 0' }} />
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.12em',
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              METHODOLOGY
            </div>
            <div
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: 11,
                color: 'var(--text-muted)',
                lineHeight: 1.6,
              }}
            >
              Five independent signals are scored 0–100 and combined via weighted average.
              Higher scores indicate stronger conditions for Bitcoin accumulation.
              Sentiment is applied as a contrarian indicator — fear increases conviction,
              greed decreases it. Updated every 5 minutes from live data sources.
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes convictionModalIn {
          0% { opacity: 0; transform: scale(0.97) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
