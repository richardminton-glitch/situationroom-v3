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

/**
 * Normalise any historical or legacy threat-state string into the current
 * unified ThreatState vocabulary used across the site (Members Room algorithm).
 *
 * Legacy briefings stored in the DB may carry the older keyword-based labels
 * (LOW / GUARDED / ELEVATED / HIGH / SEVERE / CRITICAL). This helper maps them
 * to the current decay-based states so every surface displays consistent
 * vocabulary.
 */
const LEGACY_STATE_MAP: Record<string, ThreatState> = {
  LOW:        'QUIET',
  GUARDED:    'MONITORING',
  ELEVATED:   'ELEVATED',
  HIGH:       'ALERT',
  SEVERE:     'ALERT',
  CRITICAL:   'CRITICAL',
  QUIET:      'QUIET',
  MONITORING: 'MONITORING',
  ALERT:      'ALERT',
};

export function normaliseThreatState(raw: string | null | undefined): ThreatState {
  if (!raw) return 'QUIET';
  const upper = raw.toUpperCase();
  return LEGACY_STATE_MAP[upper] ?? 'QUIET';
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
 * Compute per-domain decayed contributions.
 * Returns an object mapping each domain to its current decayed score contribution.
 */
export function computeDomainContributions(
  events: AgentEvent[],
  now: number,
): Record<string, number> {
  const contributions: Record<string, number> = {};

  for (const evt of events) {
    const evtTime = new Date(evt.timestamp).getTime();
    const age = now - evtTime;
    if (age < 0) continue;

    const decayedImpact = evt.scoreImpact * Math.exp(-LAMBDA * age);
    const domain = evt.primaryDomain;
    contributions[domain] = (contributions[domain] || 0) + decayedImpact;
  }

  // Round to 1 decimal
  for (const key of Object.keys(contributions)) {
    contributions[key] = Math.round(contributions[key] * 10) / 10;
  }

  return contributions;
}

/**
 * Format a threat state transition for the agent log.
 */
export function formatStateTransition(from: ThreatState, to: ThreatState): string {
  return `[SYSTEM] Threat posture updated \u2014 ${from} \u2192 ${to}`;
}
