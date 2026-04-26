'use client';

/**
 * CBCard — single-cell currency intelligence card in the CB Divergence Matrix.
 *
 * Shows the central bank's stance arrow (▲ ━ ▼), current policy rate,
 * last move + date, and the market-implied 12mo path. Cell background
 * shifts subtly based on stance: easing = teal-tinted, tightening =
 * red-tinted, holding = neutral.
 */

import type { CBRate, CBStance } from '@/lib/feh/cb-rates-seed';

const STANCE_COLOR: Record<CBStance, string> = {
  easing: 'var(--feh-stable)',
  holding: 'var(--text-muted)',
  tightening: 'var(--feh-critical)',
};

const STANCE_ARROW: Record<CBStance, string> = {
  easing: '▼',
  holding: '━',
  tightening: '▲',
};

const STANCE_LABEL: Record<CBStance, string> = {
  easing: 'EASING',
  holding: 'HOLDING',
  tightening: 'TIGHTENING',
};

interface CBCardProps {
  rate: CBRate;
}

export function CBCard({ rate }: CBCardProps) {
  const color = STANCE_COLOR[rate.stance];
  const moveSign = rate.lastMoveBps > 0 ? '+' : '';

  // Market-implied path bar — shows current rate ━━●━━ direction
  const impliedPct = Math.max(-100, Math.min(100, rate.marketImpliedBps12m / 5)); // -500..+500 → -100..+100
  const dotPos = 50 + impliedPct / 2; // 0..100

  return (
    <div
      className="border p-2.5 flex flex-col gap-1 transition-colors"
      style={{
        borderColor: 'var(--border-subtle)',
        backgroundColor: `color-mix(in srgb, ${color} 6%, var(--bg-card))`,
      }}
    >
      {/* Header: bank code + stance arrow */}
      <div className="flex items-center justify-between gap-2">
        <span
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '0.12em',
          }}
        >
          {rate.bank}
        </span>
        <span
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 9,
            fontWeight: 700,
            color,
            letterSpacing: '0.18em',
          }}
        >
          <span style={{ marginRight: 3 }}>{STANCE_ARROW[rate.stance]}</span>
          {STANCE_LABEL[rate.stance]}
        </span>
      </div>

      {/* Current rate — big number */}
      <div
        style={{
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '0.04em',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}
      >
        {rate.rate.toFixed(2)}%
      </div>

      {/* Last move + date */}
      <div
        style={{
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 9,
          color: 'var(--text-muted)',
          letterSpacing: '0.12em',
        }}
      >
        {rate.lastMoveBps === 0 ? 'NO CHANGE' : `${moveSign}${rate.lastMoveBps}BPS`} · {rate.lastMoveDate}
      </div>

      {/* Market-implied 12mo bar */}
      <div className="mt-1">
        <div
          className="relative w-full"
          style={{ height: 4, backgroundColor: 'var(--border-subtle)' }}
        >
          {/* Centre line */}
          <div
            className="absolute top-0 bottom-0"
            style={{
              left: '50%',
              width: 1,
              backgroundColor: 'var(--text-muted)',
              opacity: 0.4,
            }}
          />
          {/* Dot at implied position */}
          <div
            className="absolute"
            style={{
              top: -2,
              left: `${dotPos}%`,
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: color,
              transform: 'translateX(-50%)',
              transition: 'left 240ms ease',
            }}
          />
        </div>
        <div
          className="flex items-center justify-between"
          style={{
            marginTop: 3,
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 9,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
          }}
        >
          <span>MKT 12M</span>
          <span style={{ color }}>
            {rate.marketImpliedBps12m > 0 ? '+' : ''}
            {rate.marketImpliedBps12m}BPS
          </span>
        </div>
      </div>
    </div>
  );
}
