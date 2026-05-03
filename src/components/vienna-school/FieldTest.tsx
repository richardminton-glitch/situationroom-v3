'use client';

/**
 * FieldTest — multiple-choice end-of-module quiz.
 *
 * 3 questions, 4 options each. User picks an option; on submit, correct/
 * incorrect feedback appears with the explanation. Pass = 2/3 correct.
 *
 * Auth model (per Richard, 2026-05): all module *content* is open to
 * everyone — this is a teaching room, not a gated product surface. Only
 * the act of *taking the quiz and recording participation* requires a
 * sign-in. Anonymous visitors see a sign-in CTA instead of the test.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/layout/AuthProvider';
import type { FieldTestQuestion } from '@/content/vienna-school/types';

const MONO_FONT    = 'var(--font-mono)';
const HEADING_FONT = 'Georgia, serif';
const BODY_FONT    = "'Source Serif 4', Georgia, serif";

interface Props {
  questions:         FieldTestQuestion[];
  onPass?:           () => void;
  /** True if this module has been marked complete in a previous session.
   *  Adds a "ALREADY PASSED" badge so the user knows their progress is
   *  recorded — they can still re-take the test. */
  alreadyCompleted?: boolean;
}

export function FieldTest({ questions, onPass, alreadyCompleted = false }: Props) {
  const { user, loading: authLoading } = useAuth();
  if (!authLoading && !user) {
    return <FieldTestSignInGate questionCount={questions.length} />;
  }
  return <FieldTestInner questions={questions} onPass={onPass} alreadyCompleted={alreadyCompleted} />;
}

function FieldTestSignInGate({ questionCount }: { questionCount: number }) {
  return (
    <div
      style={{
        border:       '1px dashed var(--accent-primary)',
        background:   'var(--bg-card)',
        padding:      '28px 32px',
        marginTop:    32,
        marginBottom: 32,
        textAlign:    'center',
      }}
    >
      <p style={{
        fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.18em',
        color: 'var(--accent-primary)', margin: 0, fontWeight: 600,
      }}>
        FIELD TEST · SIGN-IN REQUIRED
      </p>
      <h3 style={{
        fontFamily: HEADING_FONT, fontSize: 22, color: 'var(--text-primary)',
        margin: '6px 0 8px 0', fontWeight: 600,
      }}>
        Take the quiz. Track the curriculum.
      </h3>
      <p style={{
        fontFamily: BODY_FONT, fontSize: 14, lineHeight: 1.6,
        color: 'var(--text-secondary)', margin: '0 auto 18px',
        maxWidth: 480, fontStyle: 'italic',
      }}>
        The module text is open to everyone — no account required to read.
        The {questionCount}-question field test and the curriculum-wide
        graduation stamp need a free account so we can record your progress.
      </p>
      <Link
        href="/login"
        style={{
          display:        'inline-flex',
          alignItems:     'center',
          gap:            8,
          padding:        '10px 22px',
          fontFamily:     MONO_FONT,
          fontSize:       11,
          letterSpacing:  '0.16em',
          fontWeight:     600,
          backgroundColor:'var(--accent-primary)',
          color:          '#F8F1E3',
          textDecoration: 'none',
        }}
      >
        SIGN IN TO TAKE THE QUIZ
      </Link>
      <p style={{
        fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.14em',
        color: 'var(--text-muted)', margin: '12px 0 0 0',
      }}>
        FREE · NEW ACCOUNT TAKES 30 SECONDS
      </p>
    </div>
  );
}

function FieldTestInner({ questions, onPass, alreadyCompleted }: Required<Pick<Props, 'questions'>> & { onPass?: () => void; alreadyCompleted: boolean }) {
  const [answers,   setAnswers]   = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);
  const score       = submitted
    ? questions.filter((q) => answers[q.id] === q.correctIndex).length
    : 0;
  const passed = submitted && score >= 2;

  function handleSubmit() {
    setSubmitted(true);
    if (questions.filter((q) => answers[q.id] === q.correctIndex).length >= 2) {
      onPass?.();
    }
  }

  function handleReset() {
    setAnswers({});
    setSubmitted(false);
  }

  return (
    <div
      style={{
        border:       '1px solid var(--border-primary)',
        background:   'var(--bg-card)',
        padding:      '28px 32px',
        marginTop:    32,
        marginBottom: 32,
      }}
    >
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      9,
              letterSpacing: '0.18em',
              color:         'var(--text-muted)',
              margin:        0,
            }}
          >
            FIELD TEST
          </p>
          <h3
            style={{
              fontFamily:    'Georgia, serif',
              fontSize:      22,
              color:         'var(--text-primary)',
              margin:        '4px 0 0 0',
              fontWeight:    600,
            }}
          >
            Three questions. Two of three to pass.
          </h3>
        </div>
        {alreadyCompleted && (
          <span
            title="You've previously passed this module's field test."
            style={{
              display:        'inline-flex',
              alignItems:     'center',
              gap:            6,
              padding:        '6px 12px',
              fontFamily:     'var(--font-mono)',
              fontSize:       9,
              letterSpacing:  '0.18em',
              fontWeight:     600,
              background:     'var(--accent-success)',
              color:          '#F8F1E3',
            }}
          >
            ✓ ALREADY PASSED
          </span>
        )}
      </div>

      {questions.map((q, qi) => {
        const userAnswer = answers[q.id];
        const isCorrect  = submitted && userAnswer === q.correctIndex;
        const isWrong    = submitted && userAnswer !== undefined && userAnswer !== q.correctIndex;

        return (
          <div key={q.id} style={{ marginBottom: 26 }}>
            <p
              style={{
                fontFamily:   "'Source Serif 4', Georgia, serif",
                fontSize:     16,
                lineHeight:   1.55,
                color:        'var(--text-primary)',
                marginBottom: 12,
                fontWeight:   600,
              }}
            >
              <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>{qi + 1}.</span>
              {q.question}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {q.options.map((opt, oi) => {
                const selected      = userAnswer === oi;
                const showCorrect   = submitted && oi === q.correctIndex;
                const showWrongPick = submitted && selected && oi !== q.correctIndex;

                let borderColor = 'var(--border-subtle)';
                let bg          = 'transparent';
                if (showCorrect)   { borderColor = 'var(--accent-success)'; bg = 'rgba(74,124,89,0.08)'; }
                else if (showWrongPick) { borderColor = 'var(--accent-danger)';  bg = 'rgba(155,50,50,0.08)'; }
                else if (selected) { borderColor = 'var(--accent-primary)'; bg = 'rgba(139,105,20,0.08)'; }

                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={submitted}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    style={{
                      textAlign:    'left',
                      padding:      '10px 14px',
                      border:       `1px solid ${borderColor}`,
                      background:   bg,
                      cursor:       submitted ? 'default' : 'pointer',
                      fontFamily:   "'Source Serif 4', Georgia, serif",
                      fontSize:     15,
                      lineHeight:   1.4,
                      color:        'var(--text-primary)',
                      transition:   'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', marginRight: 8, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {String.fromCharCode(65 + oi)}.
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {submitted && (
              <div
                style={{
                  marginTop:    10,
                  padding:      '10px 12px',
                  borderLeft:   `2px solid ${isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
                  background:   'var(--bg-card-hover)',
                  fontFamily:   "'Source Serif 4', Georgia, serif",
                  fontSize:     14,
                  lineHeight:   1.55,
                  color:        'var(--text-secondary)',
                }}
              >
                <strong style={{
                  color:         isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)',
                  fontFamily:    'var(--font-mono)',
                  fontSize:      10,
                  letterSpacing: '0.14em',
                  marginRight:   8,
                }}>
                  {isCorrect ? 'CORRECT' : isWrong ? 'INCORRECT' : ''}
                </strong>
                {q.explanation}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24 }}>
        {!submitted ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allAnswered}
            style={{
              padding:        '10px 24px',
              fontFamily:     'var(--font-mono)',
              fontSize:       11,
              letterSpacing:  '0.14em',
              fontWeight:     600,
              backgroundColor: allAnswered ? 'var(--accent-primary)' : 'var(--border-primary)',
              color:          allAnswered ? 'var(--bg-primary)' : 'var(--text-muted)',
              border:         'none',
              cursor:         allAnswered ? 'pointer' : 'not-allowed',
            }}
          >
            SUBMIT ANSWERS
          </button>
        ) : (
          <>
            <div
              style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      11,
                letterSpacing: '0.14em',
                fontWeight:    600,
                color:         passed ? 'var(--accent-success)' : 'var(--accent-danger)',
              }}
            >
              {passed ? `PASS — ${score} / 3` : `FAIL — ${score} / 3 · need 2 to pass`}
            </div>
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding:        '8px 16px',
                fontFamily:     'var(--font-mono)',
                fontSize:       10,
                letterSpacing:  '0.14em',
                background:     'transparent',
                color:          'var(--text-muted)',
                border:         '1px solid var(--border-primary)',
                cursor:         'pointer',
              }}
            >
              RESET
            </button>
          </>
        )}
      </div>
    </div>
  );
}
