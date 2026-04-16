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
  /** Uncapped sum of decayed impacts — reveals saturation when > 100. */
  rawScore: number;
}

/**
 * Half-life in milliseconds (2 hours).
 * An event's contribution halves every 2 hours of age: after 4h it's 25%,
 * after 6h it's 12.5%, so a Tier 4 shock (25 pts) contributes roughly
 * 12/6/3 points as it rolls through the 2/4/6-hour windows. Previously 3h,
 * shortened so the score drains out faster on a quiet news cycle.
 */
const HALF_LIFE_MS = 2 * 60 * 60 * 1000;

/** Decay constant: lambda = ln(2) / halfLife */
const LAMBDA = Math.LN2 / HALF_LIFE_MS;

/** Max score cap */
const MAX_SCORE = 100;

/**
 * State thresholds — higher is worse.
 *
 * Tuning (Apr 2026):
 *   CRITICAL raised from 76 to 88 so it only fires on sustained extreme
 *   activity — genuine disaster, economic collapse, all-out war. A typical
 *   day of moderate-severity headlines should land in MONITORING (16-40),
 *   not push through ALERT on a single bad afternoon.
 */
const STATE_THRESHOLDS: [number, ThreatState][] = [
  [88, 'CRITICAL'],
  [64, 'ALERT'],
  [40, 'ELEVATED'],
  [16, 'MONITORING'],
  [0,  'QUIET'],
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

/**
 * State-to-colour mapping — CSS variables resolved against the active theme.
 * In dark these are teal/amber/red; in parchment they're gold/burnt/blood-red.
 * Both palettes communicate the same semantics: cool = quiet, warm = elevated,
 * red = alert/critical.
 *
 * For canvas drawing where computed RGB strings are required, use
 *   `getComputedStyle(document.documentElement).getPropertyValue('--room-…').trim()`
 * at draw time instead of consuming this map directly.
 */
export const STATE_COLORS: Record<ThreatState, string> = {
  QUIET:      'var(--room-positive)',
  MONITORING: 'var(--room-positive)',
  ELEVATED:   'var(--room-warning)',
  ALERT:      'var(--room-alert)',
  CRITICAL:   'var(--room-critical)',
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
    rawScore: Math.round(rawScore * 10) / 10,
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
