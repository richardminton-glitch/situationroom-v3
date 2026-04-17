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

const CELL_W   = 132;
const CELL_H   = 168;
const GAP      = 6;
const ROLL_W   = 44;
const HEIGHT   = 224;
const SERIF    = "'Georgia', 'Times New Roman', serif";

// Palette — aligned with --accent-primary, --text-panel-title, --border-primary
// Muted tan, not yellow — harmonises with bg-primary (#F8F1E3) and border-primary (#d4c9b8).
const PAPER         = '#f1e8d4';
const PAPER_LIT     = '#fbf5e5';
const PAPER_EDGE    = '#d4c6ad';
const INK           = '#3e2c1a';
const INK_SOFT      = '#6a5236';
const INK_FAINT     = '#9b8662';
const RULE          = '#b8a585';
const WAX           = '#8b6914'; // --accent-primary
const WAX_DEEP      = '#5d4509';
const WAX_HIGHLIGHT = '#d6a93a';
const ROLL_SHADOW   = '#5a4526';
const ROLL_BODY     = '#bba486';
const ROLL_FACE     = '#d8c8a8';
const ROLL_HIGH     = '#ecdcbe';
const ROLL_DARK     = '#8a6f4a';

export function ParchmentScroll({ blocks, selectedKey, onSelect, keyFor }: Props) {
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
      height: HEIGHT,
      userSelect: 'none',
    }}>
      {/* Flat unrolled paper between the rolls */}
      <div style={{
        position: 'absolute',
        top: 14,
        bottom: 14,
        left: ROLL_W - 6,   // tuck slightly behind the rolls
        right: ROLL_W - 6,
        background: `
          radial-gradient(ellipse at 50% 50%, ${PAPER_LIT} 0%, ${PAPER} 60%, ${PAPER_EDGE} 100%)
        `,
        boxShadow: `
          inset  22px 0 28px -18px rgba(60, 40, 14, 0.55),
          inset -22px 0 28px -18px rgba(60, 40, 14, 0.55),
          inset   0 12px 18px -14px rgba(90, 60, 20, 0.3),
          inset   0 -12px 18px -14px rgba(90, 60, 20, 0.3)
        `,
      }}>
        {/* Paper grain — very subtle cross-texture */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(120, 90, 40, 0.025) 2px, rgba(120, 90, 40, 0.025) 3px),
            repeating-linear-gradient(90deg, transparent 0, transparent 3px, rgba(120, 90, 40, 0.02) 3px, rgba(120, 90, 40, 0.02) 4px)
          `,
          pointerEvents: 'none',
        }} />

        {/* Ruled horizontal guides */}
        <RuledLine top="22%" />
        <RuledLine top="78%" />
      </div>

      {/* Scroll rolls — 3D cylinders on each end */}
      <ScrollRoll side="left"  />
      <ScrollRoll side="right" />

      {/* Scrollable horizontal block strip */}
      <div ref={scrollRef} style={{
        position: 'absolute',
        top: 24,
        bottom: 24,
        left: ROLL_W + 10,
        right: ROLL_W + 10,
        overflowX: 'auto',
        overflowY: 'hidden',
        zIndex: 1,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: GAP,
          height: '100%',
          paddingRight: 6,
        }}>
          {blocks.map((b, i) => {
            const k = keyFor(b);
            const isSelected = k === selectedKey;
            const nextIsDivider = b.kind === 'confirmed' && blocks[i + 1]?.kind === 'pending';

            return (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: GAP }}>
                {b.kind === 'pending'
                  ? <PendingEntry b={b} selected={isSelected} onClick={() => onSelect(k)} />
                  : <ConfirmedEntry b={b} selected={isSelected} onClick={() => onSelect(k)} />}
                {nextIsDivider && <ParchmentDivider />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RuledLine({ top }: { top: string }) {
  return (
    <div style={{
      position: 'absolute',
      top,
      left: 12,
      right: 12,
      height: 1,
      background: `repeating-linear-gradient(to right, ${RULE} 0 5px, transparent 5px 9px)`,
      opacity: 0.35,
      pointerEvents: 'none',
    }} />
  );
}

function ScrollRoll({ side }: { side: 'left' | 'right' }) {
  // Cylindrical roll — 44px wide, spans the full height.
  // Gradient left-to-right simulates light on a cylinder:
  //   outer edge dark → body light → inner edge dark (where paper enters the roll).
  // Elliptical caps top and bottom.
  const inner = side === 'left' ? 'right' : 'left';
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      bottom: 0,
      [side]: 0,
      width: ROLL_W,
      zIndex: 3,
      pointerEvents: 'none',
    }}>
      {/* Elliptical top cap */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 22,
        borderRadius: '50%',
        background: `radial-gradient(ellipse at 50% 60%, ${ROLL_HIGH} 0%, ${ROLL_FACE} 40%, ${ROLL_DARK} 100%)`,
        boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.25)',
      }} />
      {/* Elliptical bottom cap */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 22,
        borderRadius: '50%',
        background: `radial-gradient(ellipse at 50% 40%, ${ROLL_HIGH} 0%, ${ROLL_FACE} 40%, ${ROLL_DARK} 100%)`,
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.25)',
      }} />
      {/* Cylindrical body — the visible round face of the scroll roll */}
      <div style={{
        position: 'absolute',
        top: 11, bottom: 11, left: 0, right: 0,
        background: `
          linear-gradient(to right,
            ${ROLL_DARK} 0%,
            ${ROLL_BODY} 14%,
            ${ROLL_FACE} 38%,
            ${ROLL_HIGH} 50%,
            ${ROLL_FACE} 62%,
            ${ROLL_BODY} 86%,
            ${ROLL_DARK} 100%)
        `,
        boxShadow: `
          inset 0 6px 8px -4px rgba(0,0,0,0.4),
          inset 0 -6px 8px -4px rgba(0,0,0,0.4)
        `,
      }}>
        {/* Paper-wrap coil hints — thin horizontal highlight lines */}
        {[0.2, 0.4, 0.55, 0.75].map((t, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: 2, right: 2,
            top: `${t * 100}%`,
            height: 1,
            background: `linear-gradient(to right, transparent 0%, rgba(255, 230, 180, 0.28) 50%, transparent 100%)`,
          }} />
        ))}
      </div>
      {/* Shadow cast onto the flat paper where it meets the roll */}
      <div style={{
        position: 'absolute',
        top: 16, bottom: 16,
        [inner]: -10,
        width: 12,
        background: `linear-gradient(to ${inner}, ${ROLL_SHADOW}66 0%, transparent 100%)`,
        pointerEvents: 'none',
      }} />
    </div>
  );
}

function ParchmentDivider() {
  return (
    <div data-now-divider style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      height: CELL_H,
      width: 26,
      justifyContent: 'center',
      gap: 6,
      flexShrink: 0,
    }}>
      <div style={{
        width: 1,
        flex: 1,
        background: `repeating-linear-gradient(to bottom, ${INK_SOFT} 0 4px, transparent 4px 8px)`,
        opacity: 0.55,
      }} />
      <div style={{
        fontFamily: SERIF,
        fontSize: 9,
        letterSpacing: '0.24em',
        color: INK_SOFT,
        fontStyle: 'italic',
        writingMode: 'vertical-rl',
        transform: 'rotate(180deg)',
        padding: '3px 0',
      }}>
        ❦ NOW ❦
      </div>
      <div style={{
        width: 1,
        flex: 1,
        background: `repeating-linear-gradient(to bottom, ${INK_SOFT} 0 4px, transparent 4px 8px)`,
        opacity: 0.55,
      }} />
    </div>
  );
}

function PendingEntry({
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
        background: selected ? `${WAX}14` : 'transparent',
        border: `1px dashed ${INK_SOFT}`,
        borderRadius: 2,
        padding: '10px 10px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        textAlign: 'left',
        fontFamily: SERIF,
        color: INK_SOFT,
        transition: 'background 120ms',
        boxShadow: selected ? `inset 0 0 0 1px ${WAX}` : 'none',
      }}
      title={`Pending block — ${data.nTx} tx, ~${minutesAway} min away`}
    >
      <div>
        <div style={{
          fontStyle: 'italic',
          fontSize: 11,
          color: INK_FAINT,
          letterSpacing: '0.04em',
        }}>
          pending entry
        </div>
        <div style={{
          fontSize: 16,
          color: INK_SOFT,
          marginTop: 2,
          fontWeight: 500,
          letterSpacing: '0.02em',
        }}>
          In ~{minutesAway} min
        </div>
      </div>

      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
        <div style={{ color: INK, fontWeight: 600 }}>{medianSatVb(data.medianFee)}</div>
        <div style={{ color: INK_FAINT, fontSize: 10 }}>{feeRangeLabel(data.feeRange)} sat/vB</div>
      </div>

      <div style={{ fontSize: 11, color: INK }}>
        {formatSats(data.totalFees)}
        <div style={{ color: INK_FAINT, fontSize: 10, marginTop: 1 }}>
          {formatTxCount(data.nTx)} tx
        </div>
      </div>
    </button>
  );
}

function ConfirmedEntry({
  b, selected, onClick,
}: {
  b: Extract<StripBlock, { kind: 'confirmed' }>;
  selected: boolean;
  onClick: () => void;
}) {
  const { data, isTip } = b;
  const pool = data.extras?.pool?.name;

  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        width: CELL_W,
        height: CELL_H,
        flexShrink: 0,
        background: isTip
          ? `linear-gradient(180deg, ${PAPER_LIT} 0%, #ead9a8 100%)`
          : PAPER_LIT,
        border: `1px solid ${isTip ? WAX_DEEP : INK_SOFT}`,
        borderRadius: 2,
        padding: '10px 10px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        textAlign: 'left',
        fontFamily: SERIF,
        color: INK,
        boxShadow: selected
          ? `inset 0 0 0 2px ${WAX}, 0 1px 3px rgba(60, 40, 14, 0.15)`
          : isTip
            ? `inset 0 0 0 1px ${WAX_DEEP}, 0 1px 3px rgba(60, 40, 14, 0.18)`
            : `0 1px 2px rgba(60, 40, 14, 0.1)`,
        transition: 'box-shadow 120ms',
      }}
      title={`Block ${data.height} — ${pool ?? 'unknown pool'}`}
    >
      {/* Wax seal over the tip */}
      {isTip && (
        <div style={{
          position: 'absolute',
          top: -8,
          right: -8,
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, ${WAX_HIGHLIGHT} 0%, ${WAX} 50%, ${WAX_DEEP} 100%)`,
          boxShadow: `
            0 2px 5px rgba(0,0,0,0.35),
            inset 0 1px 2px rgba(255, 220, 140, 0.55),
            inset 0 -2px 3px rgba(40, 26, 0, 0.45)
          `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f4e7bc',
          fontFamily: SERIF,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.1em',
          zIndex: 2,
          transform: 'rotate(-10deg)',
          textShadow: '0 1px 1px rgba(0,0,0,0.4)',
        }}>
          TIP
        </div>
      )}

      <div>
        <div style={{
          fontSize: 9,
          letterSpacing: '0.22em',
          color: INK_FAINT,
          textTransform: 'uppercase',
          fontStyle: 'italic',
        }}>
          Block
        </div>
        <div style={{
          fontSize: 19,
          fontWeight: 600,
          color: INK,
          letterSpacing: '0.01em',
          marginTop: 1,
        }}>
          {data.height.toLocaleString()}
        </div>
      </div>

      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
        <div style={{ color: INK, fontWeight: 600 }}>{medianSatVb(data.extras?.medianFee)}</div>
        <div style={{ color: INK_FAINT, fontSize: 10 }}>
          {feeRangeLabel(data.extras?.feeRange)} sat/vB
        </div>
      </div>

      <div style={{ fontSize: 10, color: INK_SOFT }}>
        <div style={{ color: INK, fontSize: 11, fontWeight: 600 }}>
          {formatTxCount(data.tx_count)} tx
        </div>
        <div style={{ marginTop: 1 }}>{minutesAgo(data.timestamp)}</div>
        {pool && (
          <div style={{
            marginTop: 3,
            fontStyle: 'italic',
            fontSize: 10,
            color: INK_SOFT,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {pool}
          </div>
        )}
      </div>
    </button>
  );
}
