'use client';

/**
 * CentralPlannerGame (Module 5) — Hayek's knowledge problem in 30 seconds.
 *
 * Two modes:
 *
 *   1. PLANNER MODE — user sets the price for 5 essential goods. 100
 *      simulated agents try to buy/sell at those prices given individual
 *      WTP/WTA distributions. Mismatched prices generate shortages
 *      (red queue) or surpluses (green pile). Score = citizens served.
 *
 *   2. MARKET MODE — prices float. A simple tâtonnement loop: if shortage,
 *      price rises; if surplus, price falls. Equilibrium reached in seconds.
 *      Score climbs toward ~98/100 — never quite 100, because frictions.
 *
 * The point is visceral, not literal. No real general-equilibrium maths.
 * Each good has a hidden "natural price" sampled at mount; planner mode
 * is hard not because economics is hard but because the planner doesn't
 * know the natural prices and never can.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

interface Good {
  id:           string;
  name:         string;
  emoji:        string;
  initialPrice: number;
  naturalPrice: number;     // Hidden — what the market would discover.
  agentDemand:  number;     // Buyers at price P
  agentSupply:  number;     // Sellers at price P
}

const HEADING_FONT = 'Georgia, serif';
const BODY_FONT    = "'Source Serif 4', Georgia, serif";
const MONO_FONT    = 'var(--font-mono)';

const TOTAL_AGENTS = 100;

// Each good's true natural price is hidden from the user. Demand/supply
// elasticities baked in: linear curves around natural price.
function makeGoods(): Good[] {
  // Natural prices sampled with a little variation each load so the user
  // can't memorise them between attempts.
  const jitter = (base: number) => base + Math.round((Math.random() - 0.5) * 6);
  return [
    { id: 'bread',    name: 'Bread',     emoji: '🍞', initialPrice: 5,  naturalPrice: jitter(12), agentDemand: 0, agentSupply: 0 },
    { id: 'fuel',     name: 'Fuel',      emoji: '⛽', initialPrice: 5,  naturalPrice: jitter(28), agentDemand: 0, agentSupply: 0 },
    { id: 'housing',  name: 'Housing',   emoji: '🏠', initialPrice: 5,  naturalPrice: jitter(42), agentDemand: 0, agentSupply: 0 },
    { id: 'medicine', name: 'Medicine',  emoji: '💊', initialPrice: 5,  naturalPrice: jitter(35), agentDemand: 0, agentSupply: 0 },
    { id: 'clothing', name: 'Clothing',  emoji: '👕', initialPrice: 5,  naturalPrice: jitter(18), agentDemand: 0, agentSupply: 0 },
  ];
}

/** Linear demand: buyers willing to buy 20 at price=natural, more cheaper, fewer dearer. */
function demandAt(price: number, natural: number): number {
  const d = Math.round(20 + (natural - price) * 0.7);
  return Math.max(0, Math.min(20, d));
}

/** Linear supply: sellers willing to supply 20 at price=natural, more dearer, fewer cheaper. */
function supplyAt(price: number, natural: number): number {
  const s = Math.round(20 - (natural - price) * 0.7);
  return Math.max(0, Math.min(20, s));
}

type Mode = 'planner' | 'market';

export function CentralPlannerGame() {
  const [mode,   setMode]   = useState<Mode>('planner');
  const [goods,  setGoods]  = useState<Good[]>(() => makeGoods());
  const [tick,   setTick]   = useState(0);
  const intervalRef         = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Recompute outcomes whenever prices change ─────────────────────
  const outcomes = useMemo(() => goods.map((g) => {
    const d = demandAt(g.initialPrice, g.naturalPrice);
    const s = supplyAt(g.initialPrice, g.naturalPrice);
    const transactions = Math.min(d, s);
    const shortage = Math.max(0, d - s);
    const surplus  = Math.max(0, s - d);
    return { id: g.id, demand: d, supply: s, transactions, shortage, surplus };
  }), [goods]);

  const served = outcomes.reduce((sum, o) => sum + o.transactions, 0);

  // ── Market-mode tâtonnement ──────────────────────────────────────
  useEffect(() => {
    if (mode !== 'market') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setGoods((curr) => curr.map((g) => {
        const d = demandAt(g.initialPrice, g.naturalPrice);
        const s = supplyAt(g.initialPrice, g.naturalPrice);
        const gap = d - s;
        // Adjust price ~1 unit per tick toward equilibrium.
        const delta = Math.sign(gap) * Math.min(2, Math.max(1, Math.abs(gap) * 0.15));
        return { ...g, initialPrice: Math.max(1, Math.min(80, Math.round(g.initialPrice + delta))) };
      }));
      setTick((t) => t + 1);
    }, 250);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [mode]);

  function setPrice(id: string, price: number) {
    if (mode !== 'planner') return;
    setGoods((curr) => curr.map((g) => g.id === id ? { ...g, initialPrice: Math.max(1, Math.min(80, price)) } : g));
  }

  function switchToMarket() {
    setMode('market');
  }

  function switchToPlanner() {
    setMode('planner');
    setTick(0);
  }

  function handleReset() {
    setMode('planner');
    setGoods(makeGoods());
    setTick(0);
  }

  const passingScore = TOTAL_AGENTS * 0.8;
  const scoreColor = served >= passingScore ? 'var(--accent-success)' : served >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)';

  return (
    <div
      style={{
        border:     '1px solid var(--border-primary)',
        background: 'var(--bg-card)',
        marginTop:  20,
        overflow:   'hidden',
      }}
    >
      {/* Atmospheric banner — bureaucrat at empty desk vs the market */}
      <div style={{
        position: 'relative', width: '100%',
        aspectRatio: '21 / 6', maxHeight: 220,
        overflow: 'hidden', backgroundColor: '#1a1a1a',
      }}>
        <img
          src="/images/vienna-school/module-5-planner-vs-market.png"
          alt="A single bureaucrat at a vast empty desk on the left, a teeming market on the right — the calculation problem made visual."
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.05) 50%, var(--bg-card) 100%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          bottom: 16, width: 'calc(100% - 56px)', maxWidth: 760,
          textAlign: 'center', color: '#F8F1E3',
        }}>
          <p style={{
            fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.22em',
            margin: 0, marginBottom: 6, opacity: 0.9,
          }}>
            INTERACTIVE · CALCULATION PROBLEM
          </p>
          <h3 style={{
            fontFamily: HEADING_FONT, fontSize: 26, fontWeight: 700,
            margin: 0, lineHeight: 1.15, letterSpacing: '-0.005em',
            textShadow: '0 2px 12px rgba(0,0,0,0.7)',
          }}>
            {mode === 'planner' ? 'Set the prices. Govern the citizens.' : 'Markets discovering equilibrium…'}
          </h3>
        </div>
      </div>

      <div style={{ padding: '20px 28px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div style={{
          fontFamily: MONO_FONT, fontSize: 11, color: 'var(--text-muted)',
          letterSpacing: '0.14em', textAlign: 'right',
        }}>
          CITIZENS SERVED
          <div style={{
            fontSize: 28, color: scoreColor, fontWeight: 600,
            letterSpacing: '0.02em', marginTop: 2,
          }}>
            {served} / {TOTAL_AGENTS}
          </div>
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <button
          type="button"
          onClick={switchToPlanner}
          style={{
            padding: '6px 14px',
            fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em', fontWeight: 600,
            backgroundColor: mode === 'planner' ? 'var(--accent-danger)' : 'transparent',
            color: mode === 'planner' ? '#F8F1E3' : 'var(--text-muted)',
            border: `1px solid ${mode === 'planner' ? 'var(--accent-danger)' : 'var(--border-primary)'}`,
            cursor: 'pointer',
          }}
        >
          PLANNER MODE
        </button>
        <button
          type="button"
          onClick={switchToMarket}
          style={{
            padding: '6px 14px',
            fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em', fontWeight: 600,
            backgroundColor: mode === 'market' ? 'var(--accent-success)' : 'transparent',
            color: mode === 'market' ? '#F8F1E3' : 'var(--text-muted)',
            border: `1px solid ${mode === 'market' ? 'var(--accent-success)' : 'var(--border-primary)'}`,
            cursor: 'pointer',
          }}
        >
          FREE MARKET MODE
        </button>
        <button
          type="button"
          onClick={handleReset}
          style={{
            padding: '6px 14px',
            fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em',
            backgroundColor: 'transparent',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-primary)',
            cursor: 'pointer',
            marginLeft: 'auto',
          }}
        >
          RESET
        </button>
      </div>

      {/* Goods grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {goods.map((g, i) => {
          const o = outcomes[i];
          const status = o.shortage > 0 ? 'SHORTAGE' : o.surplus > 0 ? 'SURPLUS' : 'BALANCED';
          const statusColor = status === 'SHORTAGE' ? 'var(--accent-danger)' : status === 'SURPLUS' ? 'var(--accent-warning)' : 'var(--accent-success)';

          return (
            <div
              key={g.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '36px 1fr 1fr 90px',
                alignItems: 'center', gap: 14,
                padding: '10px 0',
                borderBottom: i < goods.length - 1 ? '1px dotted var(--border-subtle)' : 'none',
              }}
            >
              <div style={{ fontSize: 22, textAlign: 'center' }}>{g.emoji}</div>

              <div>
                <div style={{ fontFamily: BODY_FONT, fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>
                  {g.name}
                </div>
                <div style={{ fontFamily: MONO_FONT, fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginTop: 1 }}>
                  D · {o.demand}    S · {o.supply}    TRADES · {o.transactions}
                </div>
              </div>

              <div>
                <input
                  type="range"
                  min={1}
                  max={80}
                  value={g.initialPrice}
                  onChange={(e) => setPrice(g.id, Number(e.target.value))}
                  disabled={mode === 'market'}
                  style={{
                    width: '100%', accentColor: 'var(--accent-primary)',
                    cursor: mode === 'market' ? 'not-allowed' : 'pointer',
                  }}
                />
                <div style={{
                  fontFamily: MONO_FONT, fontSize: 10, color: 'var(--text-muted)',
                  letterSpacing: '0.1em', marginTop: 2,
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>£1</span>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>£{g.initialPrice}</span>
                  <span>£80</span>
                </div>
              </div>

              <div style={{
                fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em',
                color: statusColor, fontWeight: 600, textAlign: 'right',
              }}>
                {status === 'SHORTAGE' ? `−${o.shortage} SHORT` : status === 'SURPLUS' ? `+${o.surplus} GLUT` : '✓ CLEARED'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status caption */}
      <p style={{
        fontFamily: BODY_FONT, fontSize: 13, fontStyle: 'italic',
        color: 'var(--text-secondary)', lineHeight: 1.55,
        marginTop: 18, marginBottom: 0,
      }}>
        {mode === 'planner'
          ? served >= passingScore
            ? `Remarkable. You served ${served} citizens by happening to set prices near their natural levels. You don't know what those levels are — you guessed. Now hand the system to ${TOTAL_AGENTS}M people coordinating across ${goods.length}M goods, with weather changing tomorrow, and try again.`
            : served < 50
              ? `Shortages and gluts everywhere. ${TOTAL_AGENTS - served} citizens went unserved. You can\'t see the natural prices because they don\'t exist independently of trading — they emerge from it. This is Hayek\'s knowledge problem.`
              : `Mediocre. You're guessing in the dark. The planner has no way to know whether bread should be £8 or £18 because the price is the *output* of millions of micro-decisions, not the input.`
          : tick < 8
            ? 'The market is feeling its way toward equilibrium. No central command. No price authority. Just buyers and sellers adjusting until shortages and gluts disappear.'
            : `${served} of ${TOTAL_AGENTS} served — and climbing. No one set these prices. They were *discovered* by the market. This is the spontaneous order Hayek won the Nobel for.`
        }
      </p>
      </div>
    </div>
  );
}
