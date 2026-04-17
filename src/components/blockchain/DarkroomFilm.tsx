'use client';

import { useEffect, useRef } from 'react';
import type { StripBlock } from './types';
import { formatSats, formatTxCount, minutesAgo, feeRangeLabel, medianSatVb } from './utils';

interface Props {
  blocks: StripBlock[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  keyFor: (b: StripBlock) => string;
}

const CELL_W = 132;
const CELL_H = 186;
const GAP    = 6;

// Darkroom palette — silver-sepia prints on black film base
const FILM_BASE   = '#08090b';
const FILM_EDGE   = '#12141a';
const SPROCKET_BG = '#050608';
const SPROCKET    = '#e6e1d3';
const FRAME_LINE  = '#3a3d46';
const FRAME_HI    = '#5a5e68';
const SEPIA_HI    = '#c9b892';
const SEPIA_MID   = '#8a7a5a';
const SEPIA_LO    = '#3c2f1e';
const SILVER      = '#d8dcdf';
const RED_GEL     = '#d03a28';

export function DarkroomFilm({ blocks, selectedKey, onSelect, keyFor }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (!el) return;
        const divider = el.querySelector('[data-now-divider]') as HTMLElement | null;
        if (!divider) return;
        const target = divider.offsetLeft - el.clientWidth / 2 + divider.offsetWidth / 2;
        el.scrollLeft = Math.max(0, target);
      });
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, [blocks.length]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: CELL_H + 52,
      borderRadius: 3,
      background: FILM_BASE,
      overflow: 'hidden',
      boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6), 0 0 0 1px rgba(100,100,100,0.08)',
    }}>
      {/* Sprocket rows — top & bottom */}
      <SprocketRow position="top" />
      <SprocketRow position="bottom" />

      {/* Scrollable cells */}
      <div ref={scrollRef} style={{
        position: 'absolute',
        top: 26, bottom: 26,
        left: 14, right: 14,
        overflowX: 'auto',
        overflowY: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: GAP,
          height: '100%',
          paddingRight: 8,
        }}>
          {blocks.map((b, i) => {
            const k = keyFor(b);
            const isSelected = k === selectedKey;
            const nextIsDivider = b.kind === 'confirmed' && blocks[i + 1]?.kind === 'pending';

            return (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: GAP }}>
                {b.kind === 'pending'
                  ? <LatentCell b={b} selected={isSelected} onClick={() => onSelect(k)} />
                  : <DevelopedCell b={b} selected={isSelected} onClick={() => onSelect(k)} />}
                {nextIsDivider && <FilmDivider />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SprocketRow({ position }: { position: 'top' | 'bottom' }) {
  const holes = 28;
  return (
    <div style={{
      position: 'absolute',
      left: 0, right: 0,
      [position]: 0,
      height: 20,
      background: SPROCKET_BG,
      borderBottom: position === 'top' ? `1px solid ${FILM_EDGE}` : 'none',
      borderTop:    position === 'bottom' ? `1px solid ${FILM_EDGE}` : 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '0 8px',
      pointerEvents: 'none',
    }}>
      {Array.from({ length: holes }).map((_, i) => (
        <div key={i} style={{
          width: 10,
          height: 8,
          background: SPROCKET,
          borderRadius: 1,
          opacity: 0.88,
          boxShadow: 'inset 0 0 2px rgba(0,0,0,0.4)',
        }} />
      ))}
    </div>
  );
}

function FilmDivider() {
  return (
    <div data-now-divider style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: CELL_H,
      width: 28,
      gap: 6,
      flexShrink: 0,
    }}>
      <div style={{
        width: 2,
        flex: 1,
        background: `linear-gradient(to bottom, transparent 0%, ${RED_GEL} 40%, ${RED_GEL} 60%, transparent 100%)`,
        opacity: 0.85,
        boxShadow: `0 0 6px ${RED_GEL}`,
      }} />
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 8,
        letterSpacing: '0.28em',
        color: RED_GEL,
        textShadow: `0 0 4px ${RED_GEL}80`,
      }}>
        NOW
      </div>
      <div style={{
        width: 2,
        flex: 1,
        background: `linear-gradient(to top, transparent 0%, ${RED_GEL} 40%, ${RED_GEL} 60%, transparent 100%)`,
        opacity: 0.85,
        boxShadow: `0 0 6px ${RED_GEL}`,
      }} />
    </div>
  );
}

function LatentCell({
  b, selected, onClick,
}: {
  b: Extract<StripBlock, { kind: 'pending' }>;
  selected: boolean;
  onClick: () => void;
}) {
  const { data, minutesAway } = b;
  return (
    <button
      onClick={onClick}
      style={{
        width: CELL_W,
        height: CELL_H,
        flexShrink: 0,
        background: `
          radial-gradient(ellipse at 50% 50%, rgba(60, 70, 78, 0.35) 0%, rgba(20, 24, 28, 0.85) 100%)
        `,
        border: `1px dashed ${FRAME_LINE}`,
        borderRadius: 2,
        padding: '10px 9px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        textAlign: 'left',
        fontFamily: 'var(--font-mono)',
        color: SILVER,
        transition: 'all 120ms',
        opacity: 0.72,
        boxShadow: selected ? `inset 0 0 0 1px ${RED_GEL}, 0 0 10px rgba(208, 58, 40, 0.3)` : 'none',
      }}
      title={`Latent block — ${data.nTx} tx, ~${minutesAway} min`}
    >
      <div>
        <div style={{
          fontSize: 8,
          letterSpacing: '0.3em',
          color: '#5a6068',
          textTransform: 'uppercase',
        }}>
          Latent
        </div>
        <div style={{
          fontSize: 13,
          color: SILVER,
          marginTop: 2,
          fontWeight: 500,
        }}>
          +{minutesAway}m
        </div>
      </div>

      <div style={{ fontSize: 10, lineHeight: 1.5 }}>
        <div style={{ color: SEPIA_HI, fontWeight: 600, fontSize: 11 }}>
          {medianSatVb(data.medianFee)}
        </div>
        <div style={{ color: '#6a7078', fontSize: 9 }}>
          {feeRangeLabel(data.feeRange)}
        </div>
      </div>

      <div style={{ fontSize: 10 }}>
        <div style={{ color: SEPIA_MID }}>{formatSats(data.totalFees)}</div>
        <div style={{ color: '#5a6068', marginTop: 2 }}>{formatTxCount(data.nTx)} tx</div>
      </div>
    </button>
  );
}

function DevelopedCell({
  b, selected, onClick,
}: {
  b: Extract<StripBlock, { kind: 'confirmed' }>;
  selected: boolean;
  onClick: () => void;
}) {
  const { data, isTip } = b;
  const pool = data.extras?.pool?.name;
  // Fee tier → exposure density (higher fees = more exposed / sepia-brighter)
  const median = data.extras?.medianFee ?? 1;
  const exposure = Math.min(1, Math.log2(median + 1) / 8);

  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        width: CELL_W,
        height: CELL_H,
        flexShrink: 0,
        background: `
          radial-gradient(ellipse at 50% 40%,
            rgba(201, 184, 146, ${0.08 + exposure * 0.28}) 0%,
            rgba(60, 47, 30, ${0.4 + exposure * 0.35}) 60%,
            rgba(12, 10, 8, 0.95) 100%)
        `,
        border: `1px solid ${isTip ? RED_GEL : FRAME_LINE}`,
        borderRadius: 2,
        padding: '10px 9px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        textAlign: 'left',
        fontFamily: 'var(--font-mono)',
        color: SEPIA_HI,
        boxShadow: selected
          ? `inset 0 0 0 2px ${SEPIA_HI}, 0 0 12px rgba(201, 184, 146, 0.25)`
          : isTip
            ? `inset 0 0 0 1px ${RED_GEL}88, 0 0 10px rgba(208, 58, 40, 0.25)`
            : `inset 0 0 0 1px ${FRAME_HI}30`,
        transition: 'box-shadow 120ms',
        animation: isTip ? 'dr-fix 3.5s ease-in-out infinite' : undefined,
      }}
      title={`Block ${data.height} — ${pool ?? 'unknown pool'}`}
    >
      {/* Frame index — top left, like a film edge marker */}
      <div style={{
        fontSize: 8,
        letterSpacing: '0.3em',
        color: isTip ? RED_GEL : FRAME_HI,
        textTransform: 'uppercase',
      }}>
        {isTip ? 'FIXING' : `#${data.height % 1000}`}
      </div>

      {/* Height — the print's main subject */}
      <div style={{
        fontSize: 17,
        fontWeight: 600,
        color: SEPIA_HI,
        letterSpacing: '0.02em',
        textShadow: isTip ? `0 0 8px ${SEPIA_HI}55` : 'none',
      }}>
        {data.height.toLocaleString()}
      </div>

      <div style={{ fontSize: 10, lineHeight: 1.5 }}>
        <div style={{ color: SEPIA_HI, fontWeight: 600 }}>
          {medianSatVb(data.extras?.medianFee)}
        </div>
        <div style={{ color: SEPIA_MID, fontSize: 9 }}>
          {feeRangeLabel(data.extras?.feeRange)}
        </div>
      </div>

      <div style={{ fontSize: 10 }}>
        <div style={{ color: SEPIA_HI }}>{formatTxCount(data.tx_count)} tx</div>
        <div style={{ color: SEPIA_MID, marginTop: 2 }}>{minutesAgo(data.timestamp)}</div>
        {pool && (
          <div style={{
            marginTop: 3,
            fontSize: 9,
            color: SEPIA_MID,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: '0.06em',
          }}>
            {pool}
          </div>
        )}
      </div>

      <style>{`
        @keyframes dr-fix {
          0%,   100% { filter: brightness(1); }
          50%        { filter: brightness(1.18); }
        }
      `}</style>
    </button>
  );
}
