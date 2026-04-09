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
 *   Apr 2026 (pass 1): halved across the board — CRITICAL had been pinned
 *                      at 100 for 24h.
 *   Apr 2026 (pass 2): Tier 2 dropped further after the diagnostic
 *                      rawScore showed 9 Tier 2 events / 2h = 54 pts
 *                      which alone pushes into ELEVATED. Tier 2 is just
 *                      "moderate market vocabulary" — it should be a
 *                      background hum, not a threat driver.
 *
 * Target: normal daily news flow (15-20 events / 2h, mostly Tier 1-2)
 * should rest in MONITORING (16-40). CRITICAL is reserved for genuine
 * disaster, economic collapse, or all-out war.
 */
export const TIER_IMPACT: Record<1 | 2 | 3 | 4, number> = {
  1: 2,   // routine domain match
  2: 4,   // was 6 — moderate market vocabulary
  3: 14,  // high-impact single event
  4: 25,  // shock event
};

/**
 * Tier 2 — moderate escalation keywords.
 *
 * Tuning (Apr 2026): removed positive/neutral price-movement vocabulary
 * (surge, rally, breakout, soar, pump, upgrade, record) because a BTC
 * rally isn't a threat — it's normal bull behaviour. Only downside /
 * forced-selling / systemic-stress language belongs here.
 */
const TIER_2_TERMS = [
  // Downside movement
  'collapse', 'halt', 'plunge', 'reversal', 'shock', 'downgrade',
  'selloff', 'sell-off', 'rout', 'tumble', 'dump',
  // Forced selling
  'liquidation', 'capitulation',
  // Systemic stress
  'default', 'contagion', 'systemic', 'flash crash', 'circuit breaker',
  // Breach (security or level)
  'breach', 'unexpected',
];

/**
 * Tier 3 — high-impact event keywords.
 *
 * Tuning (Apr 2026): pruned aggressively after diagnostic rawScore showed
 * 7 Tier 3 events in a 2-hour window on a normal news day, saturating the
 * score. Words that describe routine-if-significant monetary policy
 * (pause, pivot, taper, stimulus, rate hike, rate cut, bailout,
 * intervention, QE, etf approved/rejected) and editorial framing
 * (emergency, crisis) were demoted — they belong in Tier 2 at most.
 * Tier 3 now only fires on language that describes a concrete high-impact
 * event: legal actions, security breaches, kinetic military, bans.
 */
const TIER_3_TERMS = [
  // BTC/crypto-specific shocks
  'ban', 'hack', 'exploit', 'insolvent', 'bankruptcy', 'delisted',
  // Legal / enforcement
  'indictment', 'arrest', 'seized', 'frozen', 'subpoena', 'executive order',
  // Kinetic military / geopolitical rupture
  'escalation', 'missile strike', 'airstrike', 'invasion', 'blockade',
];

/**
 * Tier 4 — extreme / shock keywords.
 *
 * Tuning (Apr 2026): replaced bare "nuclear" with threat-specific phrases.
 * "Nuclear moratorium lifted" (energy policy) was hitting Tier 4. Only
 * nuclear *weapon/strike/threat* context belongs at shock level.
 */
const TIER_4_TERMS = [
  'war declared', 'exchange insolvent', 'btc banned', 'bitcoin banned',
  'fed emergency', 'nuclear strike', 'nuclear attack', 'nuclear threat',
  'nuclear war', 'martial law', 'coup', 'assassination',
  'sovereign default', 'bank run', 'systemic collapse', 'market halt',
  'trading suspended', 'protocol exploit', 'chain halted', 'zero day',
];

/**
 * Word-boundary-aware term matching.
 *
 * Uses \b word boundaries so "ban" matches "ban", "bans", "banned" but NOT
 * "Lebanon", "bank", "bargain", "abandon". Multi-word phrases like
 * "war declared" still work because \b only wraps the full phrase.
 */
const termRegexCache = new Map<string, RegExp>();

function matchesTerm(lower: string, term: string): boolean {
  let re = termRegexCache.get(term);
  if (!re) {
    re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    termRegexCache.set(term, re);
  }
  return re.test(lower);
}

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
  if (TIER_4_TERMS.some((t) => matchesTerm(lower, t))) return 4;
  if (domainCount >= 3 && relevance >= 8) return 4;

  // Tier 3: high-impact terms with HIGH classifier confidence.
  // 0.5 → 0.7 after observing the classifier assigning Tier 3 to editorial
  // "crisis language" headlines. At 0.7 the classifier has to be certain.
  if (TIER_3_TERMS.some((t) => matchesTerm(lower, t)) && confidence >= 0.7) return 3;
  if (relevance >= 9 && confidence >= 0.8) return 3;

  // Tier 2: moderate terms or elevated relevance
  if (TIER_2_TERMS.some((t) => matchesTerm(lower, t))) return 2;
  if (relevance >= 7) return 2;

  // Tier 1: baseline signal
  return 1;
}
