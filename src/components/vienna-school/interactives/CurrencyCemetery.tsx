'use client';

/**
 * CurrencyCemetery (Module 3 secondary) — the headstone grid.
 *
 * Renders the dead-currencies dataset as a grid of small SVG headstones,
 * one per dead currency, sortable by death date or lifespan. A counter
 * at the top reports the average / median lifespan of a fiat currency
 * — the visceral reading the spec asked for.
 *
 * Hover any headstone for the cause-of-death tooltip. Filter chips
 * narrow the visible cohort by death cause (hyperinflation, monetary
 * union, state collapse, etc.).
 */

import { useMemo, useState } from 'react';
import {
  DEAD_CURRENCIES,
  TOTAL_CURRENCIES,
  averageLifespanYears,
  medianLifespanYears,
  type DeathCause,
  type DeadCurrency,
} from '@/content/vienna-school/data/dead-currencies';

const HEADING_FONT = 'Georgia, serif';
const BODY_FONT    = "'Source Serif 4', Georgia, serif";
const MONO_FONT    = 'var(--font-mono)';

const CAUSE_COLOUR: Record<DeathCause, string> = {
  hyperinflation: '#9b3232',   // dried-blood — the canonical fiat death
  redenomination: '#b8860b',   // brass — chopped zeros, technical retirement
  union:          '#5b4a8a',   // muted purple — orderly absorption
  collapse:       '#7a1a1a',   // deeper blood — state failure
  replaced:       '#5a4e3c',   // ink — orderly switch
};

const CAUSE_LABEL: Record<DeathCause, string> = {
  hyperinflation: 'Hyperinflation',
  redenomination: 'Redenomination',
  union:          'Monetary union',
  collapse:       'State collapse',
  replaced:       'Standard switch',
};

type SortKey = 'died' | 'lifespan' | 'name';

export function CurrencyCemetery() {
  const [activeCauses, setActiveCauses] = useState<Set<DeathCause>>(
    () => new Set(['hyperinflation', 'redenomination', 'union', 'collapse', 'replaced'] as DeathCause[]),
  );
  const [sortKey, setSortKey] = useState<SortKey>('died');
  const [hover,   setHover]   = useState<DeadCurrency | null>(null);

  const filtered = useMemo(() => {
    const subset = DEAD_CURRENCIES.filter((c) => activeCauses.has(c.cause));
    return [...subset].sort((a, b) => {
      switch (sortKey) {
        case 'died':     return b.died - a.died;
        case 'lifespan': return (b.died - b.born) - (a.died - a.born);
        case 'name':     return a.name.localeCompare(b.name);
      }
    });
  }, [activeCauses, sortKey]);

  function toggleCause(cause: DeathCause) {
    setActiveCauses((curr) => {
      const next = new Set(curr);
      if (next.has(cause)) next.delete(cause);
      else                 next.add(cause);
      // Don't allow zero — at least one cohort must show.
      if (next.size === 0) next.add(cause);
      return next;
    });
  }

  return (
    <div
      style={{
        border:     '1px solid var(--border-primary)',
        background: 'var(--bg-card)',
        marginTop:  20,
        overflow:   'hidden',
      }}
    >
      {/* ── Atmospheric banner — actual graveyard, then the data ── */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '21 / 6',
        maxHeight: 220,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
      }}>
        <img
          src="/images/vienna-school/module-3-currency-cemetery.png"
          alt="Rows of weathered grave markers receding into mist — a fiat-currency cemetery."
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {/* Vignette + bottom fade into the panel body */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.05) 50%, var(--bg-card) 100%)',
          pointerEvents: 'none',
        }} />
        {/* Title overlay */}
        <div style={{
          position: 'absolute',
          left: '50%', transform: 'translateX(-50%)',
          bottom: 16,
          width: 'calc(100% - 56px)',
          maxWidth: 760,
          textAlign: 'center',
          color: '#F8F1E3',
        }}>
          <p style={{
            fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.22em',
            margin: 0, marginBottom: 6, opacity: 0.9,
          }}>
            INTERACTIVE · CURRENCY CEMETERY
          </p>
          <h3 style={{
            fontFamily: HEADING_FONT, fontSize: 26, fontWeight: 700,
            margin: 0, lineHeight: 1.15, letterSpacing: '-0.005em',
            textShadow: '0 2px 12px rgba(0,0,0,0.7)',
          }}>
            {filtered.length} dead fiat currencies.
          </h3>
          <p style={{
            fontFamily: BODY_FONT, fontStyle: 'italic',
            fontSize: 14, opacity: 0.92,
            margin: '4px 0 0 0',
            textShadow: '0 1px 6px rgba(0,0,0,0.6)',
          }}>
            Lifespan: {averageLifespanYears()} yrs (mean), {medianLifespanYears()} yrs (median).
          </p>
        </div>
      </div>

      <div style={{ padding: '20px 28px 24px' }}>
      <p style={{
        fontFamily: BODY_FONT, fontSize: 14, fontStyle: 'italic',
        color: 'var(--text-secondary)', lineHeight: 1.55,
        margin: '0 0 16px 0', maxWidth: 700,
      }}>
        Every fiat currency in this graveyard had defenders, central banks, and laws backing it.
        Every one is dead. The dollar in your wallet is not exempt — it is just younger.
      </p>

      {/* ── Filter chips ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {(Object.keys(CAUSE_LABEL) as DeathCause[]).map((cause) => {
          const active = activeCauses.has(cause);
          const colour = CAUSE_COLOUR[cause];
          const count  = DEAD_CURRENCIES.filter((c) => c.cause === cause).length;
          return (
            <button
              key={cause}
              type="button"
              onClick={() => toggleCause(cause)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 10px',
                fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.1em',
                background: active ? colour : 'transparent',
                color:      active ? '#F8F1E3' : 'var(--text-muted)',
                border:     `1px solid ${active ? colour : 'var(--border-primary)'}`,
                cursor:     'pointer',
                fontWeight: 600,
              }}
            >
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: 1,
                background: colour, opacity: active ? 0.9 : 0.6,
              }} />
              {CAUSE_LABEL[cause].toUpperCase()} · {count}
            </button>
          );
        })}

        <span style={{ flex: 1 }} />

        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          style={{
            padding: '6px 10px',
            fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.1em',
            background: 'transparent', color: 'var(--text-secondary)',
            border: '1px solid var(--border-primary)', cursor: 'pointer',
          }}
        >
          <option value="died">SORT · DEATH DATE</option>
          <option value="lifespan">SORT · LIFESPAN</option>
          <option value="name">SORT · NAME</option>
        </select>
      </div>

      {/* ── Headstone grid ──────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
          gap: 8,
          padding: '16px 8px 8px',
          background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(80,60,20,0.04) 60%, rgba(80,60,20,0.10) 100%)',
          border: '1px solid var(--border-subtle)',
        }}>
          {filtered.map((c, i) => (
            <Headstone
              key={`${c.name}-${c.born}-${i}`}
              currency={c}
              onHover={() => setHover(c)}
              onLeave={() => setHover((cur) => (cur === c ? null : cur))}
            />
          ))}
        </div>

        {/* Tooltip — anchored bottom-centre of the cemetery */}
        {hover && (
          <div
            role="tooltip"
            style={{
              position:      'sticky',
              bottom:        12,
              left:          '50%',
              transform:     'translateX(-50%)',
              maxWidth:      460,
              margin:        '14px auto 0',
              padding:       '12px 14px',
              background:    'var(--bg-primary)',
              border:        `1px solid ${CAUSE_COLOUR[hover.cause]}`,
              boxShadow:     '0 6px 20px rgba(0,0,0,0.10)',
              fontFamily:    BODY_FONT,
              pointerEvents: 'none',
            }}
          >
            <div style={{
              fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.16em',
              color: CAUSE_COLOUR[hover.cause], fontWeight: 600,
              marginBottom: 4, textTransform: 'uppercase',
            }}>
              {CAUSE_LABEL[hover.cause]} · {hover.country}
            </div>
            <div style={{
              fontFamily: HEADING_FONT, fontSize: 17, fontWeight: 600,
              color: 'var(--text-primary)', marginBottom: 4,
            }}>
              {hover.name}
            </div>
            <div style={{
              fontFamily: MONO_FONT, fontSize: 11, letterSpacing: '0.08em',
              color: 'var(--text-muted)', marginBottom: 6,
            }}>
              {hover.born} – {hover.died}  ·  lifespan {hover.died - hover.born} yrs
            </div>
            <div style={{
              fontFamily: BODY_FONT, fontSize: 13, lineHeight: 1.5,
              color: 'var(--text-secondary)', fontStyle: 'italic',
            }}>
              {hover.story}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer note ─────────────────────────────────────────── */}
      <p style={{
        fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.12em',
        color: 'var(--text-muted)', margin: '14px 0 0 0',
      }}>
        SAMPLE OF {TOTAL_CURRENCIES} ENTRIES · 1769–2021 · HOVER A HEADSTONE FOR CAUSE OF DEATH
      </p>
      </div>
    </div>
  );
}

// ── Headstone shape ─────────────────────────────────────────────────────

function Headstone({
  currency, onHover, onLeave,
}: { currency: DeadCurrency; onHover: () => void; onLeave: () => void }) {
  const lifespan = currency.died - currency.born;
  const colour   = CAUSE_COLOUR[currency.cause];

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      tabIndex={0}
      style={{
        cursor:       'help',
        outline:      'none',
        textAlign:    'center',
        padding:      '6px 4px 8px',
      }}
    >
      <svg viewBox="0 0 64 80" width="100%" style={{ display: 'block', maxHeight: 96 }} aria-label={`Headstone: ${currency.name}, ${currency.born}–${currency.died}`}>
        {/* Headstone — rounded-top arch shape */}
        <path
          d="M 12 80 L 12 32 Q 12 8 32 8 Q 52 8 52 32 L 52 80 Z"
          fill="#3e2c1a"
          fillOpacity={0.78}
          stroke={colour}
          strokeWidth={1.5}
        />
        {/* Inscription cross */}
        <line x1={32} y1={16} x2={32} y2={26} stroke="#F0E4CE" strokeOpacity={0.55} strokeWidth={1.2} />
        <line x1={28} y1={20} x2={36} y2={20} stroke="#F0E4CE" strokeOpacity={0.55} strokeWidth={1.2} />
        {/* Year of death */}
        <text x={32} y={50} textAnchor="middle"
              fontFamily="Georgia, serif" fontWeight={700} fontSize={12} fill="#F0E4CE" fillOpacity={0.85}>
          {currency.died}
        </text>
        {/* Lifespan */}
        <text x={32} y={64} textAnchor="middle"
              fontFamily="var(--font-mono)" fontSize={8} letterSpacing="0.08em" fill="#b89456">
          {lifespan}y
        </text>
      </svg>
      <div style={{
        marginTop: 4,
        fontFamily: BODY_FONT,
        fontSize: 10, lineHeight: 1.25,
        color: 'var(--text-secondary)',
        wordBreak: 'break-word',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        minHeight: 26,
      }}>
        {currency.name}
      </div>
    </div>
  );
}
