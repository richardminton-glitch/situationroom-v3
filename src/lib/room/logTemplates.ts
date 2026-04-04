/**
 * Agent log template strings for the 5 threat-intelligence domains.
 *
 * Ambient templates are grouped by threat level:
 *   QUIET      — routine scans, all-clear, baseline monitoring
 *   MONITORING — heightened attention, early signals, closer scrutiny
 *   ELEVATED   — active tracking, pattern detection, cross-referencing
 *   ALERT      — urgent processing, rapid assessment, escalation
 *   CRITICAL   — emergency protocols, maximum priority, system stress
 *
 * Placeholders:
 *   {source}   — feed source name
 *   {n}        — count/number
 *   {tier}     — severity tier (1-4)
 *   {domain}   — agent domain name
 *   {headline} — event headline (truncated)
 */

import type { ThreatState } from './threatEngine';

export interface LogEntry {
  id: string;
  domain: string;
  message: string;
  timestamp: number;
  tier?: number;
  isSystem?: boolean;
}

// ── GEOPOLITICAL-AGENT templates ─────────────────────────────────────────────

const GEO_AMBIENT: Record<ThreatState, string[]> = {
  QUIET: [
    'Regional conflict tracker — no active escalations detected',
    'Sanctions compliance monitor — designation list unchanged',
    'Military activity scan — force posture baseline nominal',
    'Border incident tracker — no reported crossings',
    'Diplomatic channel monitor — routine communications only',
    'Arms trade tracker — shipment volumes within norm',
    'NATO/alliance status check — readiness level unchanged',
  ],
  MONITORING: [
    'Increased military comms detected — monitoring frequency adjusted',
    'Diplomatic cables suggest rising tensions — tracking closely',
    'Arms shipment anomaly flagged — supply route analysis active',
    'Regional flashpoint indicators elevated — watch status upgraded',
    'Satellite imagery analysis — troop movement patterns shifting',
    'UN Security Council session scheduled — agenda flagged',
  ],
  ELEVATED: [
    'Multiple conflict indicators converging — threat matrix active',
    'Military mobilisation detected — cross-referencing satellite data',
    'Embassy advisory changes logged — travel warnings escalating',
    'Proxy conflict activity spiking — pattern recognition engaged',
    'Naval fleet repositioning tracked — chokepoint risk assessed',
    'Sanctions package expansion rumoured — pre-impact modelling',
  ],
  ALERT: [
    'URGENT: Military escalation confirmed — cascading impact analysis',
    'Active conflict zone expanding — civilian infrastructure at risk',
    'Strategic weapons system activity — DEFCON correlation checked',
    'Multiple theatre escalation — resource allocation maximised',
    'Emergency diplomatic channels activated — outcome probability running',
    'Alliance trigger clause proximity — Article 5 threshold monitored',
  ],
  CRITICAL: [
    'CRITICAL: Major military engagement confirmed — all systems priority',
    'Strategic asset deployment detected — nuclear posture elevated',
    'Multi-front conflict active — maximum threat correlation',
    'Global supply chain rupture imminent — cascading failure model',
    'Emergency protocols engaged — continuous monitoring activated',
  ],
};

const GEO_EVENT = [
  'Geopolitical escalation flagged — {headline}',
  'Military activity signal — {source} reporting tier {tier}',
  'Conflict zone event detected — routing to THREAT ASSESSOR',
  'Sanctions development — {headline}',
  'Regional security alert — tier {tier} classification applied',
  'Military posture change — cross-referencing with ECONOMIC agent',
  'Alliance/treaty event — {source} data confirmed',
  'Territorial dispute escalation — impact assessment at tier {tier}',
  'Arms embargo development — {headline}',
  'Diplomatic crisis signal — cascading analysis initiated',
];

// ── ECONOMIC-AGENT templates ─────────────────────────────────────────────────

const ECON_AMBIENT: Record<ThreatState, string[]> = {
  QUIET: [
    'Yield curve differentials scanned — 10Y-2Y spread stable',
    'Central bank communication channels polled — no new signals',
    'DXY correlation matrix updated — cross-asset scan complete',
    'Inflation expectations model — breakeven yields within range',
    'Treasury auction data ingested — bid-to-cover nominal',
    'M2 money supply tracking — quarterly trend holding',
    'GDP nowcast model refreshed — growth estimate stable',
  ],
  MONITORING: [
    'Rate sensitivity model recalibrated — Fed funds futures active',
    'Yield curve flattening detected — inversion probability rising',
    'CPI components showing divergence — shelter/energy tracked',
    'Cross-border capital flow anomaly — EM outflows above baseline',
    'Credit spreads widening slightly — corporate bond scan active',
    'Forward guidance language shift detected — parsing underway',
  ],
  ELEVATED: [
    'Interest rate swap curve abnormal — inversion depth critical',
    'Treasury market stress indicators active — liquidity thinning',
    'Banking sector CDS spreads widening — counter-party risk assessed',
    'Sovereign credit watch triggered — rating agency alerts logged',
    'Capital flight pattern detected — safe-haven flows accelerating',
    'Fiscal policy shock potential — deficit trajectory alarming',
  ],
  ALERT: [
    'URGENT: Market stress indicators flashing — circuit breakers proximate',
    'Interbank lending rates spiking — liquidity crisis potential',
    'Emergency central bank coordination detected — rate action imminent',
    'Sovereign debt crisis indicators — contagion model activated',
    'Currency market volatility extreme — intervention probability high',
    'Credit market seizure risk — cascading default analysis running',
  ],
  CRITICAL: [
    'CRITICAL: Systemic financial stress — all market indicators red',
    'Bank run contagion detected — deposit insurance limits tested',
    'Emergency liquidity facilities activated — monetary base expanding',
    'Market halt in progress — exchange circuit breakers triggered',
    'Global credit freeze imminent — counter-party chains failing',
  ],
};

const ECON_EVENT = [
  'Monetary policy signal intercepted — tier {tier} classification',
  'Rate decision impact assessed — routing to THREAT ASSESSOR',
  'Macro environment shift detected — {headline}',
  'Central bank action flagged — {source} feed active',
  'DXY deviation alert — cross-referencing with BITCOIN agent',
  'Inflation indicator anomaly — scoring impact at tier {tier}',
  'Treasury market stress signal — escalating to threat engine',
  'Fiscal stimulus detection — monetary base impact modelled',
  'Credit event flagged — {headline}',
  'Banking sector stress — {source} data confirmed',
];

// ── BITCOIN-AGENT templates ──────────────────────────────────────────────────

const BTC_AMBIENT: Record<ThreatState, string[]> = {
  QUIET: [
    'Exchange reserve monitor — net position change nominal',
    'Hashrate trend model updated — difficulty adjustment on track',
    'ETF flow tracker — awaiting next filing window',
    'Mempool depth scanned — fee market conditions baseline',
    'On-chain velocity metrics — entity-adjusted volume stable',
    'UTXO age distribution — holder behaviour unchanged',
    'Mining profitability model — breakeven prices within range',
  ],
  MONITORING: [
    'Exchange outflow pattern detected — whale wallet clustering active',
    'Futures basis scan — contango/backwardation shift noted',
    'Liquidation heatmap recalculated — leverage clusters forming',
    'Options market skew shifting — put/call ratio above baseline',
    'Large transaction cluster identified — on-chain tracking engaged',
    'Fee market conditions elevated — mempool congestion building',
  ],
  ELEVATED: [
    'Exchange flow anomaly confirmed — net outflows accelerating',
    'Hashrate deviation flagged — mining difficulty response modelled',
    'ETF flow reversal detected — institutional positioning shifting',
    'Whale wallet alert — large holder movement above threshold',
    'Liquidation cascade risk — leverage concentration critical',
    'Protocol governance alert — contentious proposal flagged',
  ],
  ALERT: [
    'URGENT: Major exchange flow event — solvency indicators checked',
    'Hashrate crash detected — network security assessment running',
    'Mass liquidation event — cascading leverage unwinding',
    'Exchange withdrawal suspension flagged — contagion risk assessed',
    'Protocol-level anomaly — chain integrity verification active',
    'Regulatory action against major exchange — impact propagating',
  ],
  CRITICAL: [
    'CRITICAL: Exchange insolvency confirmed — contagion model active',
    'Chain halt detected — network consensus failure assessed',
    'Systemic crypto market event — all infrastructure monitored',
    'Mass withdrawal panic — exchange reserves critical',
    'Protocol vulnerability exploit — emergency response coordinated',
  ],
};

const BTC_EVENT = [
  'Bitcoin network signal — {source} reporting',
  'Exchange flow anomaly detected — {headline}',
  'Hashrate deviation — tier {tier} event routed',
  'ETF filing/flow update — impact scoring in progress',
  'On-chain metric anomaly — scoring impact at tier {tier}',
  'Market structure shift detected — routing to THREAT ASSESSOR',
  'Mining difficulty signal — {headline}',
  'Protocol event flagged — {source} data confirmed',
  'Crypto infrastructure alert — tier {tier} assessment',
  'Large transaction cluster — cross-referencing with ECONOMIC agent',
];

// ── DISASTER-AGENT templates ─────────────────────────────────────────────────

const DSTR_AMBIENT: Record<ThreatState, string[]> = {
  QUIET: [
    'Natural disaster early warning — seismic and weather data clean',
    'Infrastructure resilience monitor — uptime metrics green',
    'Critical infrastructure status — power grid and comms stable',
    'Pandemic surveillance feed — no novel pathogen alerts',
    'Supply chain disruption model — shipping routes clear',
    'Nuclear facility monitor — all stations reporting nominal',
    'Climate event tracker — seasonal patterns within norm',
  ],
  MONITORING: [
    'Seismic activity uptick — fault line monitoring intensified',
    'Severe weather system forming — trajectory projection active',
    'Supply chain vulnerability flagged — chokepoint congestion detected',
    'Infrastructure stress detected — grid capacity margins thinning',
    'Pandemic early warning — unusual pathogen cluster flagged',
    'Volcanic activity increase — eruption probability recalculated',
  ],
  ELEVATED: [
    'Major weather system approaching critical infrastructure — alerts issued',
    'Seismic event cluster — aftershock probability model running',
    'Supply chain disruption confirmed — rerouting impact assessed',
    'Power grid strain — rolling blackout potential calculated',
    'Pandemic threshold indicators — transmission rate above baseline',
    'Nuclear facility anomaly — regulatory notification logged',
  ],
  ALERT: [
    'URGENT: Major natural disaster impact — infrastructure damage reported',
    'Critical infrastructure failure — cascading system analysis active',
    'Pandemic escalation — WHO emergency consultation expected',
    'Energy infrastructure under threat — supply disruption imminent',
    'Mass evacuation ordered — economic impact modelling initiated',
    'Multiple disaster events concurrent — resource allocation critical',
  ],
  CRITICAL: [
    'CRITICAL: Catastrophic event confirmed — maximum emergency response',
    'Critical infrastructure collapse — cascading failure across regions',
    'Nuclear incident escalation — international response coordinated',
    'Pandemic emergency declared — global containment protocols active',
    'Multi-system failure — civilisation-scale impact assessment',
  ],
};

const DSTR_EVENT = [
  'Disaster event detected — {headline}',
  'Infrastructure threat — {source} reporting tier {tier}',
  'Natural disaster impact assessed — routing to THREAT ASSESSOR',
  'Supply chain disruption signal — {headline}',
  'Critical infrastructure alert — tier {tier} classification',
  'Energy market disruption — cross-referencing with ECONOMIC agent',
  'Environmental hazard flagged — {source} data confirmed',
  'Pandemic indicator — impact assessment at tier {tier}',
  'Infrastructure failure cascade — {headline}',
  'Disaster early warning — cascading impact analysis initiated',
];

// ── POLITICAL-AGENT templates ────────────────────────────────────────────────

const POL_AMBIENT: Record<ThreatState, string[]> = {
  QUIET: [
    'Legislative tracker — no new relevant bills filed',
    'Regulatory commentary monitor — no statements parsed',
    'Compliance landscape scan — jurisdiction updates checked',
    'Executive order tracker — no new directives issued',
    'Court docket monitor — no relevant rulings pending',
    'Enforcement action log — no new filings detected',
    'CBDC development tracker — no pilot programme changes',
  ],
  MONITORING: [
    'Legislative committee hearing scheduled — subject matter flagged',
    'Regulatory commentary shift detected — tone analysis running',
    'Enforcement investigation rumoured — source credibility assessed',
    'Policy draft circulating — impact modelling initiated',
    'International regulatory coordination detected — scope expanding',
    'Election cycle rhetoric shifting — policy risk elevated',
  ],
  ELEVATED: [
    'Major legislation advancing — committee vote scheduled',
    'Regulatory enforcement action imminent — target analysis active',
    'Executive order draft leaked — market impact pre-modelled',
    'Court ruling expected — precedent-setting potential flagged',
    'Multi-jurisdiction regulatory coordination — framework convergence',
    'Political arrest/indictment — market uncertainty spiking',
  ],
  ALERT: [
    'URGENT: Major regulatory action announced — market impact cascading',
    'Emergency executive order — immediate compliance implications',
    'Landmark court ruling — industry-wide precedent set',
    'Legislative ban advancing — rapid impact assessment running',
    'Multi-nation coordinated enforcement — systemic implications',
    'Political crisis escalation — governance uncertainty critical',
  ],
  CRITICAL: [
    'CRITICAL: Blanket regulatory ban enacted — maximum market impact',
    'Emergency government intervention — asset seizure protocols active',
    'Constitutional crisis — governance framework destabilised',
    'Multi-jurisdiction coordinated crackdown — industry threat maximum',
    'Political system collapse — democratic process suspended',
  ],
};

const POL_EVENT = [
  'Regulatory action flagged — {headline}',
  'Legislative development — tier {tier} classification',
  'Political signal detected — routing to THREAT ASSESSOR',
  'Enforcement action — {source} reporting',
  'Compliance landscape change — {headline}',
  'Executive directive — impact assessment at tier {tier}',
  'Court ruling signal — cross-referencing with BITCOIN agent',
  'Political development — {source} data confirmed',
  'Regulatory framework shift — {headline}',
  'Governance event — cascading analysis initiated',
];

// ── COORDINATOR (Threat Assessment Module) templates ─────────────────────────

const TAM_AMBIENT: Record<ThreatState, string[]> = {
  QUIET: [
    'All agents reporting nominal — threat posture QUIET',
    'Cross-domain correlation check — no convergent signals',
    'Agent heartbeat verification — 5/5 responding',
    'Threat score decay applied — current posture maintained',
    'Signal-to-noise ratio optimal — filtering thresholds held',
    'Network graph telemetry — all nodes synchronised',
    'Event queue drained — awaiting next ingestion cycle',
    'Composite threat model refreshed — no state transition',
    'Inter-agent routing table updated — pathways nominal',
    'System watchdog check — all feeds active',
  ],
  MONITORING: [
    'Threat score trending upward — monitoring threshold proximity',
    'Agent signal correlation detected — watching for convergence',
    'Event ingestion rate above baseline — filter sensitivity adjusted',
    'Cross-domain weak signal — insufficient for state transition',
    'Decay rate vs inflow rate — net accumulation detected',
    'Pattern recognition active — historical match scanning',
  ],
  ELEVATED: [
    'Multi-domain convergence detected — threat correlation active',
    'State transition proximity — ELEVATED threshold maintained',
    'Agent cross-talk increasing — correlated intelligence streams',
    'Event cascade frequency above norm — scoring impact assessed',
    'Threat pattern matched — historical precedent identified',
    'Resource allocation shifted — high-priority processing active',
  ],
  ALERT: [
    'HIGH PRIORITY: Multi-agent convergence — composite score critical',
    'State transition risk — CRITICAL threshold proximity assessed',
    'Maximum event processing priority — all agents at high alert',
    'Cross-domain cascade detected — amplification factor calculated',
    'Threat model confidence high — convergent intelligence confirmed',
    'Emergency routing protocols active — latency minimised',
  ],
  CRITICAL: [
    'MAXIMUM ALERT: All agents reporting critical — threat score peak',
    'Continuous state reassessment — decay vs inflow monitored',
    'Emergency processing mode — all bandwidth allocated',
    'Historical threat comparison — severity ranking calculated',
    'System stress test — capacity limits approaching',
  ],
};

const TAM_EVENT = [
  'Routing {domain} event — severity tier {tier}',
  'Multi-domain convergence — agents {domain} activated',
  'Threat score impact +{n} — composite updated',
  'State transition evaluation — threshold proximity assessed',
  'Event sequence initiated — tier {tier} protocol',
  'Cross-domain synthesis — {headline}',
  'Agent activation command — {domain} responding',
  'Threat posture recalculation — score updated',
  'Signal aggregation complete — composite analysis routed',
  'Priority escalation — tier {tier} event from {source}',
];

// ── Lookup ───────────────────────────────────────────────────────────────────

export const AMBIENT_TEMPLATES_BY_LEVEL: Record<string, Record<ThreatState, string[]>> = {
  GEOPOLITICAL: GEO_AMBIENT,
  ECONOMIC: ECON_AMBIENT,
  BITCOIN: BTC_AMBIENT,
  DISASTER: DSTR_AMBIENT,
  POLITICAL: POL_AMBIENT,
  COORDINATOR: TAM_AMBIENT,
};

// Flat fallback for backward compatibility
export const AMBIENT_TEMPLATES: Record<string, string[]> = {
  GEOPOLITICAL: GEO_AMBIENT.QUIET,
  ECONOMIC: ECON_AMBIENT.QUIET,
  BITCOIN: BTC_AMBIENT.QUIET,
  DISASTER: DSTR_AMBIENT.QUIET,
  POLITICAL: POL_AMBIENT.QUIET,
  COORDINATOR: TAM_AMBIENT.QUIET,
};

export const EVENT_TEMPLATES: Record<string, string[]> = {
  GEOPOLITICAL: GEO_EVENT,
  ECONOMIC: ECON_EVENT,
  BITCOIN: BTC_EVENT,
  DISASTER: DSTR_EVENT,
  POLITICAL: POL_EVENT,
  COORDINATOR: TAM_EVENT,
};

/**
 * Fill template placeholders.
 */
export function fillTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}

let logIdCounter = 0;

/**
 * Pick a random ambient log entry for a given domain, aware of current threat level.
 */
export function randomAmbientEntry(domain: string, threatState?: ThreatState): LogEntry {
  const levelTemplates = AMBIENT_TEMPLATES_BY_LEVEL[domain];
  let msg: string;

  if (levelTemplates && threatState) {
    const pool = levelTemplates[threatState] || levelTemplates.QUIET;
    msg = pool[Math.floor(Math.random() * pool.length)];
  } else {
    const fallback = AMBIENT_TEMPLATES[domain] || AMBIENT_TEMPLATES.COORDINATOR;
    msg = fallback[Math.floor(Math.random() * fallback.length)];
  }

  return {
    id: `log-${Date.now()}-${++logIdCounter}`,
    domain,
    message: msg,
    timestamp: Date.now(),
  };
}

/**
 * Generate event-driven log entries for a given agent event.
 */
export function eventLogEntries(
  event: { headline: string; source: string; tier: number; domains: string[]; scoreImpact: number },
): LogEntry[] {
  const entries: LogEntry[] = [];
  const headline = event.headline.length > 60
    ? event.headline.slice(0, 57) + '...'
    : event.headline;

  const vars = {
    headline,
    source: event.source,
    tier: event.tier,
    domain: event.domains.join(', '),
    n: event.scoreImpact,
    t: 5,
  };

  // Primary domain entry
  const primaryDomain = event.domains[0];
  const primaryTemplates = EVENT_TEMPLATES[primaryDomain] || TAM_EVENT;
  const primaryMsg = primaryTemplates[Math.floor(Math.random() * primaryTemplates.length)];
  entries.push({
    id: `log-${Date.now()}-${++logIdCounter}`,
    domain: primaryDomain,
    message: fillTemplate(primaryMsg, vars),
    timestamp: Date.now(),
    tier: event.tier,
  });

  // Coordinator routing entry
  const coordTemplates = TAM_EVENT;
  const coordMsg = coordTemplates[Math.floor(Math.random() * coordTemplates.length)];
  entries.push({
    id: `log-${Date.now()}-${++logIdCounter}`,
    domain: 'COORDINATOR',
    message: fillTemplate(coordMsg, vars),
    timestamp: Date.now() + 200,
    tier: event.tier,
  });

  // For tier 3+, add secondary domain entries
  if (event.tier >= 3 && event.domains.length > 1) {
    for (const domain of event.domains.slice(1)) {
      const templates = EVENT_TEMPLATES[domain] || [];
      if (templates.length === 0) continue;
      const msg = templates[Math.floor(Math.random() * templates.length)];
      entries.push({
        id: `log-${Date.now()}-${++logIdCounter}`,
        domain,
        message: fillTemplate(msg, vars),
        timestamp: Date.now() + 400 + Math.random() * 600,
        tier: event.tier,
      });
    }
  }

  return entries;
}
