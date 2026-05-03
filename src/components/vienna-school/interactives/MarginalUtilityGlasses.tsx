'use client';

/**
 * MarginalUtilityGlasses (Module 2) — visceral marginal-utility demo.
 *
 * Five glasses of water. Five competing uses, sorted by descending
 * importance (drink → wash → plant → paddling pool → lawn). The user
 * clicks a glass to allocate it to the next-most-pressing use; each
 * successive glass is worth less to the owner because it serves a
 * less-urgent need (10, 7, 4, 2, 1 — the classic Mengerian schedule).
 *
 * Then the twist: remove the highest-priority use ("drinking water
 * disappears"). Every glass revalues automatically — the lawn glass
 * was worth 1, but its unit isn't tied to lawn-watering, so it
 * reshuffles up to wash-the-car. The marginal value of every remaining
 * unit rises in lockstep. That is the foundation of monetary inflation
 * in 30 seconds: shrink the supply of valued uses (or expand the supply
 * of units) and per-unit value moves the opposite way.
 */

import { useMemo, useState } from 'react';

// Use-cases in descending priority. Index 0 = most-pressing.
interface UseCase {
  id:    string;
  label: string;
  emoji: string;
  value: number;        // marginal utility points
}

const FULL_USES: UseCase[] = [
  { id: 'drink',  label: 'Drink',          emoji: '🚰', value: 10 },
  { id: 'cook',   label: 'Cook a meal',    emoji: '🍳', value: 7  },
  { id: 'wash',   label: 'Wash the car',   emoji: '🚗', value: 4  },
  { id: 'plant',  label: 'Water plants',   emoji: '🪴', value: 2  },
  { id: 'lawn',   label: 'Sprinkle lawn',  emoji: '🌱', value: 1  },
];

const TOTAL_GLASSES = 5;

const HEADING_FONT = 'Georgia, serif';
const BODY_FONT    = "'Source Serif 4', Georgia, serif";
const MONO_FONT    = 'var(--font-mono)';

export function MarginalUtilityGlasses() {
  const [allocated,        setAllocated]       = useState<number>(0);    // glasses allocated so far
  const [drinkRemoved,     setDrinkRemoved]    = useState<boolean>(false);

  const activeUses = useMemo(
    () => drinkRemoved ? FULL_USES.slice(1) : FULL_USES,
    [drinkRemoved],
  );

  // The marginal value of the *next* glass = the value of the (allocated-th)
  // priority-ranked use. We always allocate to the highest-priority unmet use.
  const nextGlassValue = activeUses[allocated]?.value ?? 0;

  const totalUtility = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < allocated && i < activeUses.length; i++) {
      sum += activeUses[i].value;
    }
    return sum;
  }, [allocated, activeUses]);

  function handleAllocate() {
    if (allocated < TOTAL_GLASSES && allocated < activeUses.length) {
      setAllocated((a) => a + 1);
    }
  }

  function handleReset() {
    setAllocated(0);
    setDrinkRemoved(false);
  }

  function handleRemoveDrink() {
    setDrinkRemoved(true);
    // Optionally cap allocated to fit shorter list — but keep allocations.
    setAllocated((a) => Math.min(a, FULL_USES.length - 1));
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
      {/* Atmospheric banner — frames the desert-thirst thought experiment */}
      <div style={{
        position: 'relative', width: '100%',
        aspectRatio: '21 / 6', maxHeight: 220,
        overflow: 'hidden', backgroundColor: '#1a1a1a',
      }}>
        <img
          src="/images/vienna-school/module-2-water-desert.png"
          alt="A single glass of water on cracked desert ground — the marginal-utility thought experiment."
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
            INTERACTIVE · MARGINAL UTILITY
          </p>
          <h3 style={{
            fontFamily: HEADING_FONT, fontSize: 26, fontWeight: 700,
            margin: 0, lineHeight: 1.15, letterSpacing: '-0.005em',
            textShadow: '0 2px 12px rgba(0,0,0,0.7)',
          }}>
            Allocate five glasses. Watch utility decline at the margin.
          </h3>
        </div>
      </div>

      <div style={{ padding: '20px 28px 24px' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'none' }}>
          <p style={{ fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-muted)', margin: 0 }}>
            INTERACTIVE · MARGINAL UTILITY
          </p>
          <h3 style={{ fontFamily: HEADING_FONT, fontSize: 20, color: 'var(--text-primary)', margin: '4px 0 0 0', fontWeight: 600 }}>
            Allocate five glasses. Watch utility decline at the margin.
          </h3>
        </div>
        <div style={{
          fontFamily: MONO_FONT, fontSize: 11, color: 'var(--text-muted)',
          letterSpacing: '0.14em', textAlign: 'right',
        }}>
          TOTAL UTILITY
          <div style={{
            fontSize: 28, color: 'var(--accent-primary)', fontWeight: 600,
            letterSpacing: '0.02em', marginTop: 2,
          }}>
            {totalUtility}
          </div>
        </div>
      </div>

      {/* ── Glass row ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 12, justifyContent: 'center',
        marginTop: 20, marginBottom: 28, flexWrap: 'wrap',
      }}>
        {Array.from({ length: TOTAL_GLASSES }).map((_, i) => {
          const used      = i < allocated;
          const isNext    = i === allocated && allocated < activeUses.length;
          const useFor    = used ? activeUses[i] : null;

          return (
            <div
              key={i}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                width: 92, opacity: used ? 0.55 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <div
                style={{
                  width: 64, height: 80, position: 'relative',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 56, lineHeight: 1,
                  filter: isNext ? 'drop-shadow(0 0 8px var(--accent-primary))' : undefined,
                }}
              >
                💧
              </div>
              <div style={{
                fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.12em',
                color: used ? 'var(--text-muted)' : 'var(--accent-primary)',
                marginTop: 4, fontWeight: 600,
              }}>
                GLASS {i + 1}
              </div>
              {useFor ? (
                <div style={{
                  fontFamily: BODY_FONT, fontSize: 12, fontStyle: 'italic',
                  color: 'var(--text-secondary)', marginTop: 2, textAlign: 'center',
                }}>
                  → {useFor.label}<br />
                  <span style={{
                    fontFamily: MONO_FONT, fontSize: 11, fontStyle: 'normal',
                    color: 'var(--accent-primary)', fontWeight: 600,
                  }}>
                    +{useFor.value}
                  </span>
                </div>
              ) : (
                <div style={{
                  fontFamily: BODY_FONT, fontSize: 12, fontStyle: 'italic',
                  color: 'var(--text-muted)', marginTop: 2,
                }}>
                  unallocated
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Use-case ladder ──────────────────────────────────────── */}
      <div style={{
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-primary)',
        padding: '14px 18px',
      }}>
        <div style={{
          fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em',
          color: 'var(--text-muted)', marginBottom: 10,
        }}>
          USES — RANKED BY URGENCY
        </div>
        {FULL_USES.map((u, i) => {
          const removed = drinkRemoved && i === 0;
          const adjustedIdx = drinkRemoved ? i - 1 : i;
          const isAllocated = !removed && adjustedIdx < allocated && adjustedIdx >= 0;
          const isNextToFill = !removed && adjustedIdx === allocated && allocated < activeUses.length;

          return (
            <div
              key={u.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '6px 0',
                borderBottom: i < FULL_USES.length - 1 ? '1px dotted var(--border-subtle)' : 'none',
                opacity: removed ? 0.35 : 1,
                textDecoration: removed ? 'line-through' : 'none',
              }}
            >
              <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{u.emoji}</span>
              <span style={{
                fontFamily: BODY_FONT, fontSize: 14, color: 'var(--text-primary)',
                flex: 1,
              }}>
                {u.label}
              </span>
              <span style={{
                fontFamily: MONO_FONT, fontSize: 11, letterSpacing: '0.1em',
                color: removed ? 'var(--accent-danger)' : isAllocated ? 'var(--accent-success)' : isNextToFill ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontWeight: 600, minWidth: 40, textAlign: 'right',
              }}>
                {removed ? 'GONE' : isAllocated ? `✓ ${u.value}` : isNextToFill ? `NEXT · ${u.value}` : u.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Controls ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, flexWrap: 'wrap',
      }}>
        <button
          type="button"
          onClick={handleAllocate}
          disabled={allocated >= TOTAL_GLASSES || allocated >= activeUses.length}
          style={{
            padding: '10px 20px',
            fontFamily: MONO_FONT, fontSize: 11, letterSpacing: '0.14em', fontWeight: 600,
            backgroundColor: (allocated >= TOTAL_GLASSES || allocated >= activeUses.length)
              ? 'var(--border-primary)' : 'var(--accent-primary)',
            color: (allocated >= TOTAL_GLASSES || allocated >= activeUses.length)
              ? 'var(--text-muted)' : '#F8F1E3',
            border: 'none',
            cursor: (allocated >= TOTAL_GLASSES || allocated >= activeUses.length) ? 'not-allowed' : 'pointer',
          }}
        >
          {allocated >= activeUses.length ? 'NO USES LEFT' : `ALLOCATE NEXT GLASS · +${nextGlassValue}`}
        </button>

        {!drinkRemoved && (
          <button
            type="button"
            onClick={handleRemoveDrink}
            disabled={allocated === 0}
            style={{
              padding: '10px 20px',
              fontFamily: MONO_FONT, fontSize: 11, letterSpacing: '0.14em', fontWeight: 600,
              backgroundColor: 'transparent',
              color: allocated === 0 ? 'var(--text-muted)' : 'var(--accent-danger)',
              border: `1px solid ${allocated === 0 ? 'var(--border-primary)' : 'var(--accent-danger)'}`,
              cursor: allocated === 0 ? 'not-allowed' : 'pointer',
            }}
            title="Disaster: drinking water source disappears. Watch every remaining unit revalue."
          >
            REMOVE DRINKING WATER
          </button>
        )}

        <button
          type="button"
          onClick={handleReset}
          style={{
            padding: '10px 16px',
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

      {/* ── Status caption ────────────────────────────────────────── */}
      <p style={{
        fontFamily: BODY_FONT, fontSize: 13, fontStyle: 'italic',
        color: 'var(--text-secondary)', lineHeight: 1.55,
        marginTop: 14, marginBottom: 0,
      }}>
        {drinkRemoved
          ? 'The drinking-water source is gone. Every glass that remains is now allocated up the priority ladder — the lawn-watering glass is now cooking dinner. The marginal value of each unit just rose. This is exactly how monetary inflation works in reverse: shrink the supply of valued uses, and per-unit value follows.'
          : allocated === 0
            ? 'Click ALLOCATE NEXT GLASS to assign your most-precious glass of water to its most-pressing use. Watch the value drop as you continue.'
            : allocated < TOTAL_GLASSES
              ? `Glass ${allocated} added +${activeUses[allocated - 1].value} to total utility. Each next glass is worth less because it serves a less-urgent need — that\'s the law of marginal utility.`
              : 'All five glasses allocated. Total utility 24. Now try removing the drinking-water use and watch every remaining unit revalue.'
        }
      </p>
      </div>
    </div>
  );
}
