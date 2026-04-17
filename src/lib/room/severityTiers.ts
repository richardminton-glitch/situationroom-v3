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
 *   Apr 2026 (pass 2): Tier 2 dropped 6→4 after diagnostic rawScore showed
 *                      9 Tier 2 events / 2h = 54 pts alone.
 *   Apr 2026 (pass 3): Tier 1 halved 2→1, Tier 2 halved 4→2. Removed
 *                      relevance-based tier promotion entirely. The threat
 *                      meter is a global threat assessment — Bitcoin relevance
 *                      doesn't make a headline more threatening. Only threat
 *                      vocabulary should drive tiers. With 30+ events/2h the
 *                      old values saturated the score even on routine days.
 *
 * Target: normal daily news flow (20-30 events / 2h, mostly Tier 1)
 * should rest in MONITORING (16-40). ELEVATED when threat vocabulary
 * appears. ALERT/CRITICAL only on genuine high-impact events.
 */
export const TIER_IMPACT: Record<1 | 2 | 3 | 4, number> = {
  1: 1,   // routine domain match — background hum
  2: 2,   // moderate threat vocabulary — notable but not alarming
  3: 14,  // high-impact concrete event
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

export function matchesTerm(lower: string, term: string): boolean {
  let re = termRegexCache.get(term);
  if (!re) {
    re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    termRegexCache.set(term, re);
  }
  return re.test(lower);
}

/**
 * Determine severity tier from headline text and classification metrics.
 *
 * Tuning (Apr 2026): removed all relevanceToBitcoin-based tier promotion.
 * The threat assessor is a GLOBAL threat meter with a Bitcoin flavour, not
 * a Bitcoin-specific threat meter. A headline's indirect relevance to BTC
 * doesn't make it more threatening — only actual threat vocabulary does.
 * Previously, high relevance scores were auto-promoting ~60% of headlines
 * to Tier 2+, pinning the score at CRITICAL on routine news days.
 */
export function classifyTier(
  headline: string,
  _relevance: number,
  confidence: number,
  _domainCount: number,
): 1 | 2 | 3 | 4 {
  const lower = headline.toLowerCase();

  // Tier 4: reserved for explicit shock vocabulary only. Previously we also
  // promoted on domainCount >= 3 ("multi-domain convergence"), but with
  // the substring-based domain matcher in eventMapper this fired on benign
  // stories (Netflix retirements, UK petrol prices). Topical breadth ≠
  // severity — leave Tier 4 to the TIER_4_TERMS list.
  if (TIER_4_TERMS.some((t) => matchesTerm(lower, t))) return 4;

  // Tier 3: high-impact terms with HIGH classifier confidence.
  // Confidence gate at 0.7 prevents editorial "crisis language" from
  // triggering — the classifier has to be certain this is a real event.
  if (TIER_3_TERMS.some((t) => matchesTerm(lower, t)) && confidence >= 0.7) return 3;

  // Tier 2: moderate threat vocabulary
  if (TIER_2_TERMS.some((t) => matchesTerm(lower, t))) return 2;

  // Tier 1: baseline signal
  return 1;
}
