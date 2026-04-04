'use client';

/**
 * Orchestrates all nodes and edges in the 3D network graph.
 * Five nodes (4 agents + COORDINATOR) in a pentagon layout.
 * Edges connect each agent to COORDINATOR and to adjacent agents.
 */

import { useMemo } from 'react';
import AgentNode from './AgentNode';
import EdgeConnection from './EdgeConnection';
import { AGENTS, DOMAIN_AGENTS, type AgentDomain, type AgentId } from '@/lib/room/agentDomains';
import type { ThreatState } from '@/lib/room/threatEngine';
import type { AnimationState } from '@/hooks/useAnimationQueue';

interface GraphSceneProps {
  threatState: ThreatState;
  animationState: AnimationState;
}

const R = 3.2; // Pentagon radius

/** Pentagon layout — COORDINATOR at centre, 4 agents at vertices */
function getNodePosition(agentId: AgentId): [number, number, number] {
  if (agentId === 'COORDINATOR') return [0, 0, 0];

  const index = DOMAIN_AGENTS.indexOf(agentId as AgentDomain);
  // Distribute around pentagon starting from top
  // MACRO=top, PRICE=upper-right, SENTIMENT=lower-right, RISK=lower-left
  const angle = (-Math.PI / 2) + (index * (2 * Math.PI / 4));
  return [
    Math.cos(angle) * R,
    Math.sin(angle) * R,
    0,
  ];
}

export default function GraphScene({ threatState, animationState }: GraphSceneProps) {
  const positions = useMemo(() => {
    const map: Record<string, [number, number, number]> = {};
    map['COORDINATOR'] = getNodePosition('COORDINATOR');
    for (const domain of DOMAIN_AGENTS) {
      map[domain] = getNodePosition(domain);
    }
    return map;
  }, []);

  // Build edge list: each agent to COORDINATOR + ring edges
  const edges = useMemo(() => {
    const edgeList: {
      key: string;
      from: [number, number, number];
      to: [number, number, number];
      color: string;
    }[] = [];

    // Agent-to-coordinator edges
    for (const domain of DOMAIN_AGENTS) {
      edgeList.push({
        key: `${domain}-COORD`,
        from: positions[domain],
        to: positions['COORDINATOR'],
        color: AGENTS[domain].color,
      });
    }

    // Ring edges (adjacent agents)
    for (let i = 0; i < DOMAIN_AGENTS.length; i++) {
      const a = DOMAIN_AGENTS[i];
      const b = DOMAIN_AGENTS[(i + 1) % DOMAIN_AGENTS.length];
      edgeList.push({
        key: `${a}-${b}`,
        from: positions[a],
        to: positions[b],
        color: '#1a3a3a', // dim teal for ring edges
      });
    }

    return edgeList;
  }, [positions]);

  return (
    <group>
      {/* Edges */}
      {edges.map((edge) => (
        <EdgeConnection
          key={edge.key}
          from={edge.from}
          to={edge.to}
          color={edge.color}
          threatState={threatState}
          active={animationState.isPlaying}
          edgeBrightness={animationState.edgeBrightness}
        />
      ))}

      {/* Nodes */}
      {([...DOMAIN_AGENTS, 'COORDINATOR'] as AgentId[]).map((agentId) => (
        <AgentNode
          key={agentId}
          agentId={agentId}
          position={positions[agentId]}
          threatState={threatState}
          activation={animationState.nodeActivations[agentId] || 0}
          scale={animationState.nodeScales[agentId] || 1.0}
        />
      ))}
    </group>
  );
}
