/**
 * Threat score engine — decaying composite score (0–100).
 *
 * Each event adds its scoreImpact immediately.
 * Score decays with a 3-hour half-life via exponential decay.
 * Maps to five operational states.
 */

import type { AgentEvent } from './agentDomains';

export type ThreatState = 'QUIET' | 'MONITORING' | 'ELEVATED' | 'ALERT' | 'CRITICAL';

export interface ThreatStatus {
  score: number;
  state: ThreatState;
  prevState: ThreatState;
  stateChanged: boolean;
}

/** Half-life in milliseconds (3 hours) */
const HALF_LIFE_MS = 3 * 60 * 60 * 1000;

/** Decay constant: lambda = ln(2) / halfLife */
const LAMBDA = Math.LN2 / HALF_LIFE_MS;

/** Max score cap */
const MAX_SCORE = 100;

/** State thresholds */
const STATE_THRESHOLDS: [number, ThreatState][] = [
  [76, 'CRITICAL'],
  [56, 'ALERT'],
  [36, 'ELEVATED'],
  [16, 'MONITORING'],
  [0, 'QUIET'],
];

export function getStateForScore(score: number): ThreatState {
  for (const [threshold, state] of STATE_THRESHOLDS) {
    if (score >= threshold) return state;
  }
  return 'QUIET';
}

/** State-to-colour mapping */
export const STATE_COLORS: Record<ThreatState, string> = {
  QUIET: '#00e5c8',
  MONITORING: '#00e5c8',
  ELEVATED: '#f0a500',
  ALERT: '#f07000',
  CRITICAL: '#e03030',
};

/**
 * Compute decayed threat score from a list of events.
 * Each event's contribution decays exponentially from its arrival time.
 */
export function computeDecayedScore(
  events: AgentEvent[],
  now: number,
): ThreatStatus {
  let rawScore = 0;

  for (const evt of events) {
    const evtTime = new Date(evt.timestamp).getTime();
    const age = now - evtTime;
    if (age < 0) continue; // future event, skip

    const decayedImpact = evt.scoreImpact * Math.exp(-LAMBDA * age);
    rawScore += decayedImpact;
  }

  const score = Math.min(MAX_SCORE, Math.round(rawScore));
  const state = getStateForScore(score);

  return {
    score,
    state,
    prevState: state, // caller tracks transitions
    stateChanged: false,
  };
}

/**
 * Format a threat state transition for the agent log.
 */
export function formatStateTransition(from: ThreatState, to: ThreatState): string {
  return `[SYSTEM] Threat posture updated \u2014 ${from} \u2192 ${to}`;
}
