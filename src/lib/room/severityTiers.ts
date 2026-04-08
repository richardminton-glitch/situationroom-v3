/**
 * Severity tier classification for agent events.
 *
 * Tier 1 (Signal):     routine domain match, low impact
 * Tier 2 (Development): moderate impact terms detected
 * Tier 3 (Event):      high-impact terms, single domain
 * Tier 4 (Shock):      extreme terms or multi-domain hit
 */

/**
 * Impact scores added to the threat score on event arrival.
 *
 * Tuning history:
 *   Apr 2026: halved across the board after the indicator sat pinned at
 *   CRITICAL [100] for 24+ hours on a normal news day. A single Tier 4
 *   shock event used to be enough to cross the ALERT threshold on its
 *   own (50 pts), and two fresh Tier 4s would saturate the cap. Normal
 *   daily flow should rest in the MONITORING band (16-35); CRITICAL is
 *   reserved for genuine disaster, economic collapse, or all-out war.
 */
export const TIER_IMPACT: Record<1 | 2 | 3 | 4, number> = {
  1: 2,   // was 4  — routine domain match
  2: 6,   // was 12 — moderate escalation
  3: 14,  // was 28 — high-impact single event
  4: 25,  // was 50 — shock event; two fresh shocks now sum to 50 (ALERT, not CRITICAL)
};

/** Tier 2 — moderate escalation keywords */
const TIER_2_TERMS = [
  'unexpected', 'surge', 'collapse', 'halt', 'plunge', 'spike',
  'reversal', 'shock', 'downgrade', 'upgrade', 'breach', 'record',
  'selloff', 'sell-off', 'rally', 'rout', 'volatility', 'breakout',
  'tumble', 'soar', 'dump', 'pump', 'liquidation', 'capitulation',
  'default', 'contagion', 'systemic', 'flash crash', 'circuit breaker',
];

/** Tier 3 — high-impact event keywords */
const TIER_3_TERMS = [
  'emergency', 'crisis', 'ban', 'rate hike', 'rate cut', 'etf approved',
  'etf rejected', 'hack', 'exploit', 'insolvent', 'bankruptcy',
  'indictment', 'arrest', 'seized', 'frozen', 'delisted', 'subpoena',
  'executive order', 'intervention', 'bailout', 'stimulus',
  'quantitative easing', 'taper', 'pivot', 'pause', 'escalation',
  'ceasefire', 'missile strike', 'airstrike', 'invasion', 'blockade',
];

/** Tier 4 — extreme / shock keywords */
const TIER_4_TERMS = [
  'war declared', 'exchange insolvent', 'btc banned', 'bitcoin banned',
  'fed emergency', 'nuclear', 'martial law', 'coup', 'assassination',
  'sovereign default', 'bank run', 'systemic collapse', 'market halt',
  'trading suspended', 'protocol exploit', 'chain halted', 'zero day',
];

/**
 * Determine severity tier from headline text and classification metrics.
 */
export function classifyTier(
  headline: string,
  relevance: number,
  confidence: number,
  domainCount: number,
): 1 | 2 | 3 | 4 {
  const lower = headline.toLowerCase();

  // Tier 4: extreme terms OR multi-domain with high relevance
  if (TIER_4_TERMS.some((t) => lower.includes(t))) return 4;
  if (domainCount >= 3 && relevance >= 8) return 4;

  // Tier 3: high-impact terms with reasonable confidence
  if (TIER_3_TERMS.some((t) => lower.includes(t)) && confidence >= 0.5) return 3;
  if (relevance >= 9 && confidence >= 0.7) return 3;

  // Tier 2: moderate terms or elevated relevance
  if (TIER_2_TERMS.some((t) => lower.includes(t))) return 2;
  if (relevance >= 7) return 2;

  // Tier 1: baseline signal
  return 1;
}
