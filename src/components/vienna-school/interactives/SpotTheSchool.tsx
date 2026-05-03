'use client';

/**
 * SpotTheSchool (Module 1) — quote attribution game.
 *
 * Rounds through 12 real economist quotes one at a time. The reader has
 * to commit to "AUSTRIAN" or "MAINSTREAM" before the reveal. Each answer
 * surfaces the attribution and a one-line explanation of *why* the quote
 * is characteristic of its tradition. The score at the end carries a
 * verdict that calibrates expectations for the rest of the curriculum.
 *
 * Editorial intent: not a trivia game. The point is the *why* — reading
 * the explanation panels end-to-end is the framework's lens being
 * installed by induction. Many readers will get the obvious tells right
 * and miss the subtle ones; that gap is the educational signal.
 */

import { useMemo, useState } from 'react';
import {
  SPOT_THE_SCHOOL,
  verdictFor,
  type QuoteRound,
  type School,
} from '@/content/vienna-school/data/spot-the-school';

const HEADING_FONT = 'Georgia, serif';
const BODY_FONT    = "'Source Serif 4', Georgia, serif";
const MONO_FONT    = 'var(--font-mono)';

const C = {
  austrian:   '#b8860b',     // brass
  mainstream: '#9b3232',     // dried-blood red
  correct:    '#4a7c59',
  wrong:      '#9b3232',
  axis:       '#8a7e6c',
};

/** Stable shuffle — different per page-load, deterministic within a session. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface RoundAnswer {
  guess: School;
  correct: boolean;
}

export function SpotTheSchool() {
  // Stable order for SSR; shuffled client-side after mount via the
  // initial state lazy initialiser pattern. Hydration mismatches avoided
  // by *not* shuffling on the first render — order is shuffled on the
  // very first user click via setRounds.
  const [rounds] = useState<QuoteRound[]>(() => SPOT_THE_SCHOOL);
  const [shuffled, setShuffled] = useState<QuoteRound[] | null>(null);
  const active = shuffled ?? rounds;

  const [idx,     setIdx]     = useState(0);
  const [answers, setAnswers] = useState<Record<string, RoundAnswer>>({});
  // Set to true only after the user clicks through the final reveal.
  // Without this, the verdict would replace the last round's reveal panel
  // the moment the user committed an answer — they'd never see *why* the
  // final quote was Austrian or mainstream.
  const [showVerdict, setShowVerdict] = useState(false);

  const current   = active[idx];
  const answered  = answers[current.id];
  const isLast    = idx === active.length - 1;
  const score     = useMemo(
    () => Object.values(answers).filter((a) => a.correct).length,
    [answers],
  );

  function handleGuess(guess: School) {
    if (answered) return;
    setAnswers((curr) => ({
      ...curr,
      [current.id]: { guess, correct: guess === current.school },
    }));
  }

  function handleNext() {
    if (isLast) {
      setShowVerdict(true);
    } else {
      setIdx((i) => i + 1);
    }
  }

  function handleReset() {
    setShuffled(shuffle(rounds));
    setAnswers({});
    setIdx(0);
    setShowVerdict(false);
  }

  return (
    <div
      style={{
        border:     '1px solid var(--border-primary)',
        background: 'var(--bg-card)',
        padding:    '24px 28px',
        marginTop:  20,
      }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <p style={{ fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-muted)', margin: 0 }}>
            INTERACTIVE · SPOT THE SCHOOL
          </p>
          <h3 style={{ fontFamily: HEADING_FONT, fontSize: 22, color: 'var(--text-primary)', margin: '4px 0 0 0', fontWeight: 600 }}>
            {showVerdict ? 'Your calibration.' : 'Read the quote. Pick the tradition. See the why.'}
          </h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.16em', color: 'var(--text-muted)', margin: 0 }}>
            {showVerdict ? 'FINAL SCORE' : `ROUND ${idx + 1} OF ${active.length}`}
          </p>
          <p style={{
            fontFamily: MONO_FONT, fontSize: 24, fontWeight: 600,
            color: showVerdict
              ? (score >= 9 ? C.correct : score >= 5 ? 'var(--accent-warning)' : C.wrong)
              : 'var(--text-secondary)',
            margin: '2px 0 0 0', letterSpacing: '0.04em',
          }}>
            {score} / {active.length}
          </p>
        </div>
      </div>

      {/* ── Game stage ─────────────────────────────────────────── */}
      {!showVerdict ? (
        <>
          {/* Quote — large, centred */}
          <blockquote style={{
            margin: '24px auto',
            maxWidth: 700,
            padding: '0 16px',
            textAlign: 'center',
          }}>
            <span style={{
              fontFamily: HEADING_FONT,
              fontSize: 56, lineHeight: 0,
              color: 'var(--accent-primary)',
              opacity: 0.4,
              display: 'block', marginBottom: -8,
            }}>&ldquo;</span>
            <p style={{
              fontFamily: HEADING_FONT, fontStyle: 'italic',
              fontSize: 22, lineHeight: 1.45,
              color: 'var(--text-primary)', margin: 0,
            }}>
              {current.text}
            </p>
          </blockquote>

          {/* Guess buttons / reveal */}
          {!answered ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(140px, 1fr))',
              gap: 12, maxWidth: 540, margin: '20px auto 8px',
            }}>
              <GuessButton label="AUSTRIAN"   accent={C.austrian}   onClick={() => handleGuess('austrian')} />
              <GuessButton label="MAINSTREAM" accent={C.mainstream} onClick={() => handleGuess('mainstream')} />
            </div>
          ) : (
            <Reveal round={current} answer={answered} onNext={handleNext} isLast={isLast} />
          )}

          {/* Footer hint */}
          <p style={{
            fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.14em',
            color: 'var(--text-muted)', textAlign: 'center', margin: '20px 0 0 0',
          }}>
            COMMIT FIRST. THE EXPLANATION IS THE LESSON.
          </p>
        </>
      ) : (
        <FinalVerdict
          score={score}
          total={active.length}
          answers={answers}
          rounds={active}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function GuessButton({ label, accent, onClick }: { label: string; accent: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '14px 20px',
        fontFamily: MONO_FONT, fontSize: 12, letterSpacing: '0.2em', fontWeight: 700,
        background: 'transparent',
        color: accent,
        border: `2px solid ${accent}`,
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = accent;
        e.currentTarget.style.color      = '#F8F1E3';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color      = accent;
      }}
    >
      {label}
    </button>
  );
}

function Reveal({ round, answer, onNext, isLast }: { round: QuoteRound; answer: RoundAnswer; onNext: () => void; isLast: boolean }) {
  const verdictColour = answer.correct ? C.correct : C.wrong;
  const schoolAccent  = round.school === 'austrian' ? C.austrian : C.mainstream;
  const schoolLabel   = round.school === 'austrian' ? 'AUSTRIAN' : 'MAINSTREAM';

  return (
    <div style={{ maxWidth: 700, margin: '20px auto 0' }}>
      {/* Verdict badge */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        marginBottom: 12,
      }}>
        <span style={{
          padding: '6px 14px',
          fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.18em', fontWeight: 600,
          background: verdictColour, color: '#F8F1E3',
        }}>
          {answer.correct ? '✓ CORRECT' : '✗ INCORRECT'}
        </span>
        <span style={{
          fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.16em',
          color: 'var(--text-muted)',
        }}>
          ANSWER: <span style={{ color: schoolAccent, fontWeight: 600 }}>{schoolLabel}</span>
        </span>
      </div>

      {/* Attribution */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-subtle)',
        marginBottom: 12,
      }}>
        <p style={{
          fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em',
          color: schoolAccent, fontWeight: 600, margin: 0,
          textTransform: 'uppercase',
        }}>
          {round.author}
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
            · {round.role}
          </span>
        </p>
        <p style={{
          fontFamily: BODY_FONT, fontSize: 12, fontStyle: 'italic',
          color: 'var(--text-muted)', margin: '4px 0 0 0',
        }}>
          {round.source}{round.year && ` · ${round.year}`}
        </p>
      </div>

      {/* The why — the actual lesson */}
      <div style={{
        padding: '14px 16px',
        background: 'var(--bg-card-hover)',
        borderLeft: `3px solid ${schoolAccent}`,
      }}>
        <p style={{
          fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em',
          color: schoolAccent, fontWeight: 600, margin: 0,
        }}>
          WHY THIS IS {schoolLabel}
        </p>
        <p style={{
          fontFamily: BODY_FONT, fontSize: 14, lineHeight: 1.6,
          color: 'var(--text-primary)', margin: '6px 0 0 0', fontStyle: 'italic',
        }}>
          {round.why}
        </p>
      </div>

      {/* Next */}
      <div style={{ textAlign: 'center', marginTop: 18 }}>
        <button
          type="button"
          onClick={onNext}
          style={{
            padding: '10px 22px',
            fontFamily: MONO_FONT, fontSize: 11, letterSpacing: '0.16em', fontWeight: 600,
            background: 'var(--accent-primary)', color: '#F8F1E3',
            border: 'none', cursor: 'pointer',
          }}
        >
          {isLast ? 'REVEAL MY SCORE →' : 'NEXT QUOTE →'}
        </button>
      </div>
    </div>
  );
}

function FinalVerdict({
  score, total, answers, rounds, onReset,
}: {
  score: number; total: number;
  answers: Record<string, RoundAnswer>;
  rounds:  QuoteRound[];
  onReset: () => void;
}) {
  const verdict = verdictFor(score);
  const austrianCorrect   = rounds.filter((r) => r.school === 'austrian'   && answers[r.id]?.correct).length;
  const mainstreamCorrect = rounds.filter((r) => r.school === 'mainstream' && answers[r.id]?.correct).length;
  const austrianTotal     = rounds.filter((r) => r.school === 'austrian').length;
  const mainstreamTotal   = rounds.filter((r) => r.school === 'mainstream').length;

  return (
    <div style={{ maxWidth: 700, margin: '20px auto 0' }}>
      {/* Top verdict */}
      <div style={{
        padding: '24px 24px',
        border: `2px solid ${score >= 9 ? C.correct : score >= 5 ? 'var(--accent-warning)' : C.wrong}`,
        background: 'var(--bg-primary)',
        textAlign: 'center',
        marginBottom: 16,
      }}>
        <p style={{ fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.22em', color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>
          VERDICT
        </p>
        <h4 style={{
          fontFamily: HEADING_FONT, fontSize: 26, fontWeight: 700,
          color: 'var(--text-primary)', margin: '8px 0 6px 0', lineHeight: 1.2,
        }}>
          {verdict.band}
        </h4>
        <p style={{
          fontFamily: BODY_FONT, fontStyle: 'italic', fontSize: 15,
          color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55,
        }}>
          {verdict.message}
        </p>
      </div>

      {/* Per-school breakdown */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16,
      }}>
        <BreakdownCell label="Austrian quotes spotted"   correct={austrianCorrect}   total={austrianTotal}   accent={C.austrian} />
        <BreakdownCell label="Mainstream quotes spotted" correct={mainstreamCorrect} total={mainstreamTotal} accent={C.mainstream} />
      </div>

      {/* Round-by-round summary */}
      <div style={{
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-card-hover)',
        padding: '12px 16px',
        marginBottom: 14,
      }}>
        <p style={{
          fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em',
          color: 'var(--text-muted)', margin: '0 0 8px 0', fontWeight: 600,
        }}>
          ROUND BY ROUND
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {rounds.map((r, i) => {
            const a = answers[r.id];
            const ok = a?.correct;
            return (
              <span
                key={r.id}
                title={`Round ${i + 1}: ${r.author} (${r.school === 'austrian' ? 'Austrian' : 'Mainstream'})${ok ? ' — correct' : ' — incorrect'}`}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: MONO_FONT, fontSize: 11, fontWeight: 700,
                  background: ok ? C.correct : C.wrong, color: '#F8F1E3',
                }}
              >
                {i + 1}
              </span>
            );
          })}
        </div>
      </div>

      {/* CTA + reset */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <a
          href="/vienna-school/subjective-value"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px',
            fontFamily: MONO_FONT, fontSize: 11, letterSpacing: '0.16em', fontWeight: 600,
            background: 'var(--accent-primary)', color: '#F8F1E3',
            textDecoration: 'none',
          }}
        >
          NEXT · MODULE 02 — SUBJECTIVE VALUE →
        </a>
        <button
          type="button"
          onClick={onReset}
          style={{
            padding: '10px 16px',
            fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em',
            background: 'transparent',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-primary)',
            cursor: 'pointer',
          }}
        >
          PLAY AGAIN (RESHUFFLE)
        </button>
      </div>
    </div>
  );
}

function BreakdownCell({ label, correct, total, accent }: { label: string; correct: number; total: number; accent: string }) {
  const pct = total ? Math.round((correct / total) * 100) : 0;
  return (
    <div style={{
      padding: '12px 14px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
    }}>
      <p style={{
        fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.16em',
        color: 'var(--text-muted)', margin: 0, fontWeight: 600,
        textTransform: 'uppercase',
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: MONO_FONT, fontSize: 18, fontWeight: 600,
        color: accent, margin: '4px 0 0 0', letterSpacing: '0.04em',
      }}>
        {correct} / {total} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>· {pct}%</span>
      </p>
    </div>
  );
}
