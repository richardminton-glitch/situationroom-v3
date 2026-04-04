/**
 * Agent domain definitions for the reactive intelligence network.
 * Five threat-intelligence agents + one coordinator (Threat Assessment Module).
 *
 * Domains represent the five categories of events that feed the threat score:
 *   GEOPOLITICAL — conflict, war, sanctions, coups, invasions
 *   ECONOMIC     — rates, inflation, bank runs, defaults, market halts
 *   BITCOIN      — exchange insolvency, chain halts, ETF rulings, hacks, bans
 *   DISASTER     — natural disasters, nuclear events, pandemics, infrastructure
 *   POLITICAL    — legislation, executive orders, regulatory enforcement
 */

export type AgentDomain = 'GEOPOLITICAL' | 'ECONOMIC' | 'BITCOIN' | 'DISASTER' | 'POLITICAL';
export type AgentId = AgentDomain | 'COORDINATOR';

export interface AgentDefinition {
  id: AgentId;
  label: string;
  shortLabel: string;
  color: string;        // primary tint
  dimColor: string;     // resting state
  description: string;
}

export const AGENTS: Record<AgentId, AgentDefinition> = {
  GEOPOLITICAL: {
    id: 'GEOPOLITICAL',
    label: 'GEOPOLITICAL',
    shortLabel: 'GEO',
    color: '#e03030',
    dimColor: '#701818',
    description: 'Conflict, war, sanctions, coups, invasions, military escalation',
  },
  ECONOMIC: {
    id: 'ECONOMIC',
    label: 'ECONOMIC',
    shortLabel: 'ECON',
    color: '#f0a500',
    dimColor: '#7a5500',
    description: 'Monetary policy, rate decisions, inflation, bank runs, market halts',
  },
  BITCOIN: {
    id: 'BITCOIN',
    label: 'BITCOIN',
    shortLabel: 'BTC',
    color: '#00e5c8',
    dimColor: '#006b5e',
    description: 'Exchange insolvency, chain halts, ETF rulings, hacks, protocol events',
  },
  DISASTER: {
    id: 'DISASTER',
    label: 'DISASTER',
    shortLabel: 'DSTR',
    color: '#9b7fdd',
    dimColor: '#4d3f6e',
    description: 'Natural disasters, nuclear events, pandemics, infrastructure failures',
  },
  POLITICAL: {
    id: 'POLITICAL',
    label: 'POLITICAL',
    shortLabel: 'POL',
    color: '#4a9eff',
    dimColor: '#1a4a8a',
    description: 'Legislation, executive orders, arrests, regulatory enforcement',
  },
  COORDINATOR: {
    id: 'COORDINATOR',
    label: 'THREAT ASSESSOR',
    shortLabel: 'TAM',
    color: '#f0a500',
    dimColor: '#7a5500',
    description: 'Threat Assessment Module — aggregates domain intelligence into composite threat posture',
  },
};

export const DOMAIN_AGENTS: AgentDomain[] = ['GEOPOLITICAL', 'ECONOMIC', 'BITCOIN', 'DISASTER', 'POLITICAL'];

/** Agent event — the core data unit flowing through the system */
export interface AgentEvent {
  id: string;
  headline: string;
  source: string;
  url: string;
  tier: 1 | 2 | 3 | 4;
  domains: AgentDomain[];
  primaryDomain: AgentDomain;
  scoreImpact: number;
  timestamp: string;     // ISO8601
  category: string;
  relevance: number;
}
