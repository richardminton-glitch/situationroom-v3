'use client';

/**
 * Client-side decaying threat score engine.
 * Consumes AgentEvent[] and produces a continuously-updating score and state.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { AgentEvent } from '@/lib/room/agentDomains';
import {
  computeDecayedScore,
  computeDomainContributions,
  getStateForScore,
  type ThreatState,
  type ThreatStatus,
} from '@/lib/room/threatEngine';

const TICK_INTERVAL = 1000; // Recalculate every second

export interface DomainContribution {
  domain: string;
  score: number;
}

export interface ThreatScoreState {
  score: number;
  state: ThreatState;
  prevState: ThreatState;
  stateChanged: boolean;
  history: { score: number; time: number }[];
  domainContributions: DomainContribution[];
}

export function useThreatScore(events: AgentEvent[]) {
  const [status, setStatus] = useState<ThreatScoreState>({
    score: 0,
    state: 'QUIET',
    prevState: 'QUIET',
    stateChanged: false,
    history: [],
    domainContributions: [],
  });

  const prevStateRef = useRef<ThreatState>('QUIET');
  const historyRef = useRef<{ score: number; time: number }[]>([]);

  const tick = useCallback(() => {
    const now = Date.now();
    const result: ThreatStatus = computeDecayedScore(events, now);
    const prevState = prevStateRef.current;
    const stateChanged = result.state !== prevState;

    if (stateChanged) {
      prevStateRef.current = result.state;
    }

    // Keep last 60 history entries (1 per second = 1 minute)
    historyRef.current = [
      ...historyRef.current.slice(-59),
      { score: result.score, time: now },
    ];

    // Compute per-domain contributions
    const domainMap = computeDomainContributions(events, now);
    const domainContributions: DomainContribution[] = Object.entries(domainMap)
      .map(([domain, score]) => ({ domain, score }))
      .sort((a, b) => b.score - a.score);

    setStatus({
      score: result.score,
      state: result.state,
      prevState,
      stateChanged,
      history: historyRef.current,
      domainContributions,
    });
  }, [events]);

  useEffect(() => {
    // Initial tick
    tick();
    const interval = setInterval(tick, TICK_INTERVAL);
    return () => clearInterval(interval);
  }, [tick]);

  return status;
}
