'use client';

/**
 * Queue-based animation sequencer for the R3F network graph.
 * Events are enqueued and drained sequentially — never interrupts a running sequence.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { AgentDomain } from '@/lib/room/agentDomains';

export type AnimationType = 'flash' | 'pulse' | 'ripple' | 'cascade';

export interface AnimationSequence {
  id: string;
  type: AnimationType;
  tier: 1 | 2 | 3 | 4;
  primaryNode: AgentDomain;
  secondaryNodes: AgentDomain[];
  duration: number;     // ms
  headline?: string;
}

export interface AnimationState {
  currentAnimation: AnimationSequence | null;
  isPlaying: boolean;
  /** Per-node activation level (0–1) for the current animation frame */
  nodeActivations: Record<string, number>;
  /** Global edge brightness multiplier (0–1) */
  edgeBrightness: number;
  /** Per-node expansion scale */
  nodeScales: Record<string, number>;
}

/** Tier-to-duration mapping */
const TIER_DURATIONS: Record<1 | 2 | 3 | 4, number> = {
  1: 300,
  2: 2000,
  3: 5000,
  4: 12000,
};

/** Tier-to-animation type mapping */
const TIER_TYPES: Record<1 | 2 | 3 | 4, AnimationType> = {
  1: 'flash',
  2: 'pulse',
  3: 'ripple',
  4: 'cascade',
};

export function useAnimationQueue() {
  const [state, setState] = useState<AnimationState>({
    currentAnimation: null,
    isPlaying: false,
    nodeActivations: {},
    edgeBrightness: 0,
    nodeScales: {},
  });

  const queueRef = useRef<AnimationSequence[]>([]);
  const playingRef = useRef(false);
  const mountedRef = useRef(true);

  const processNext = useCallback(() => {
    if (playingRef.current || queueRef.current.length === 0) return;

    const next = queueRef.current.shift()!;
    playingRef.current = true;

    if (mountedRef.current) {
      setState({
        currentAnimation: next,
        isPlaying: true,
        nodeActivations: buildActivations(next),
        edgeBrightness: next.tier >= 3 ? 1.0 : next.tier >= 2 ? 0.6 : 0.3,
        nodeScales: buildScales(next),
      });
    }

    // Clear animation after duration
    setTimeout(() => {
      playingRef.current = false;
      if (mountedRef.current) {
        setState({
          currentAnimation: null,
          isPlaying: false,
          nodeActivations: {},
          edgeBrightness: 0,
          nodeScales: {},
        });
      }
      // Process next in queue
      setTimeout(() => processNext(), 100);
    }, next.duration);
  }, []);

  const enqueue = useCallback(
    (event: {
      id: string;
      tier: 1 | 2 | 3 | 4;
      primaryDomain: AgentDomain;
      domains: AgentDomain[];
      headline?: string;
    }) => {
      const seq: AnimationSequence = {
        id: event.id,
        type: TIER_TYPES[event.tier],
        tier: event.tier,
        primaryNode: event.primaryDomain,
        secondaryNodes: event.domains.filter((d) => d !== event.primaryDomain),
        duration: TIER_DURATIONS[event.tier],
        headline: event.headline,
      };

      queueRef.current.push(seq);
      processNext();
    },
    [processNext],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { ...state, enqueue };
}

function buildActivations(seq: AnimationSequence): Record<string, number> {
  const act: Record<string, number> = {};
  act[seq.primaryNode] = 1.0;
  act['COORDINATOR'] = seq.tier >= 2 ? 0.8 : 0.3;
  for (const node of seq.secondaryNodes) {
    act[node] = seq.tier >= 3 ? 0.6 : 0.2;
  }
  return act;
}

function buildScales(seq: AnimationSequence): Record<string, number> {
  const scales: Record<string, number> = {};
  scales[seq.primaryNode] = seq.tier >= 3 ? 1.4 : 1.2;
  if (seq.tier >= 4) {
    scales['COORDINATOR'] = 1.3;
    for (const node of seq.secondaryNodes) {
      scales[node] = 1.15;
    }
  }
  return scales;
}
