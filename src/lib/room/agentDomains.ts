/**
 * Agent domain definitions for the reactive intelligence network.
 * Four specialist agents + one coordinator.
 */

export type AgentDomain = 'MACRO' | 'PRICE' | 'SENTIMENT' | 'RISK';
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
  MACRO: {
    id: 'MACRO',
    label: 'MACRO-AGENT',
    shortLabel: 'MACRO',
    color: '#f0a500',
    dimColor: '#7a5500',
    description: 'Monetary policy, rates, yields, inflation, DXY',
  },
  PRICE: {
    id: 'PRICE',
    label: 'PRICE-AGENT',
    shortLabel: 'PRICE',
    color: '#00e5c8',
    dimColor: '#006b5e',
    description: 'Bitcoin spot, ETF flows, hashrate, mining, exchange',
  },
  SENTIMENT: {
    id: 'SENTIMENT',
    label: 'SENTIMENT-AGENT',
    shortLabel: 'SENT',
    color: '#9b7fdd',
    dimColor: '#4d3f6e',
    description: 'Narrative shifts, social, media, adoption signals',
  },
  RISK: {
    id: 'RISK',
    label: 'RISK-AGENT',
    shortLabel: 'RISK',
    color: '#e03030',
    dimColor: '#701818',
    description: 'Geopolitical, sanctions, regulatory, energy, conflict',
  },
  COORDINATOR: {
    id: 'COORDINATOR',
    label: 'COORDINATOR',
    shortLabel: 'COORD',
    color: '#00e5c8',
    dimColor: '#004d44',
    description: 'Central routing, threat aggregation, cross-domain synthesis',
  },
};

export const DOMAIN_AGENTS: AgentDomain[] = ['MACRO', 'PRICE', 'SENTIMENT', 'RISK'];

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
