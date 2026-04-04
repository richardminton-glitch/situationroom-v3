/**
 * Agent log template strings — ~50 per domain.
 *
 * Placeholders:
 *   {source}  — feed source name
 *   {n}       — count/number
 *   {t}       — time period (minutes)
 *   {tier}    — severity tier (1-4)
 *   {domain}  — agent domain name
 *   {headline}— event headline (truncated)
 */

export interface LogEntry {
  id: string;
  domain: string;
  message: string;
  timestamp: number;
  tier?: number;
  isSystem?: boolean;
}

// ── MACRO-AGENT templates ────────────────────────────────────────────────────

export const MACRO_AMBIENT = [
  'Scanning yield curve differentials \u2014 10Y-2Y spread monitored',
  'Re-weighting rate sensitivity model \u2014 Fed funds futures active',
  'Polling central bank communication channels \u2014 no new signals',
  'DXY correlation matrix updated \u2014 cross-asset scan complete',
  'Monitoring ECB forward guidance \u2014 awaiting next statement',
  'Inflation expectations model recalibrated \u2014 breakeven yields stable',
  'Treasury auction data ingested \u2014 bid-to-cover within range',
  'M2 money supply tracking \u2014 quarterly trend analysis running',
  'Sovereign bond market scan complete \u2014 no anomalies detected',
  'GDP nowcast model refreshed \u2014 growth estimate holding',
  'CPI components decomposition active \u2014 shelter/energy monitored',
  'Fiscal policy signal scan \u2014 no legislative changes detected',
  'Cross-border capital flow monitor \u2014 EM outflows within norm',
  'Interest rate swap curve analysis \u2014 inversion depth tracked',
  'Real yield computation updated \u2014 TIPS spread logged',
];

export const MACRO_EVENT = [
  'Rate sensitivity model triggered \u2014 {source} feed active',
  'Monetary policy signal intercepted \u2014 tier {tier} classification',
  'Yield curve response calculated \u2014 routing to COORDINATOR',
  'Macro environment shift detected \u2014 {headline}',
  'Central bank action flagged \u2014 impact assessment running',
  'DXY deviation alert \u2014 cross-referencing with PRICE-AGENT',
  'Inflation indicator anomaly \u2014 scoring impact at tier {tier}',
  'Treasury market stress signal \u2014 escalating to threat engine',
  'Fiscal stimulus detection \u2014 monetary base impact modelled',
  'Rate path probability recalculated \u2014 {source} data integrated',
];

// ── PRICE-AGENT templates ────────────────────────────────────────────────────

export const PRICE_AMBIENT = [
  'Monitoring spot delta \u2014 24h price action within bounds',
  'Order book depth analysis running \u2014 major exchanges scanned',
  'Hashrate trend model updated \u2014 difficulty adjustment projected',
  'ETF flow tracker active \u2014 awaiting next filing window',
  'Exchange reserve monitor \u2014 net position change logged',
  'Futures basis scan complete \u2014 contango/backwardation tracked',
  'Whale wallet clustering analysis \u2014 large holder movements logged',
  'Mining profitability model refreshed \u2014 breakeven prices updated',
  'Liquidation heatmap recalculated \u2014 leverage clusters mapped',
  'On-chain velocity metrics computed \u2014 entity-adjusted volume stable',
  'UTXO age distribution analysed \u2014 holder behaviour profiled',
  'Fee market conditions assessed \u2014 mempool depth nominal',
  'Options market scan \u2014 put/call ratio and max pain updated',
  'Correlation matrix refreshed \u2014 BTC vs traditional assets logged',
  'Accumulation trend score computed \u2014 supply dynamics tracked',
];

export const PRICE_EVENT = [
  'Spot price signal intercepted \u2014 {source} reporting',
  'Exchange flow anomaly detected \u2014 {headline}',
  'Hashrate deviation flagged \u2014 tier {tier} event routed',
  'ETF filing/flow update \u2014 impact scoring in progress',
  'Large transaction cluster identified \u2014 {source} data confirmed',
  'Liquidation cascade potential \u2014 cross-referencing with RISK-AGENT',
  'Mining difficulty signal \u2014 network adjustment imminent',
  'Price action trigger \u2014 {headline}',
  'On-chain metric anomaly \u2014 scoring impact at tier {tier}',
  'Market structure shift detected \u2014 routing to COORDINATOR',
];

// ── SENTIMENT-AGENT templates ────────────────────────────────────────────────

export const SENTIMENT_AMBIENT = [
  'Narrative tracking model active \u2014 discourse vectors updated',
  'Social signal aggregator running \u2014 volume within baseline',
  'Media tone classifier scanning \u2014 no sentiment shift detected',
  'Fear & Greed index correlation checked \u2014 stable band',
  'Regulatory commentary monitor \u2014 no new statements parsed',
  'Institutional adoption tracker \u2014 corporate treasury scan idle',
  'Public discourse sentiment scored \u2014 neutral-to-cautious',
  'Legislative tracker active \u2014 no new crypto bills filed',
  'Influencer signal-to-noise filter \u2014 noise ratio within bounds',
  'Adoption metric pipeline refreshed \u2014 wallet growth rate logged',
  'Compliance landscape scan \u2014 jurisdiction updates monitored',
  'CBDC development tracker \u2014 no pilot programme changes',
  'Retail investor behaviour model \u2014 search volume baselined',
  'Cross-platform narrative comparison \u2014 theme divergence minimal',
  'Regulatory enforcement action log \u2014 no new filings detected',
];

export const SENTIMENT_EVENT = [
  'Narrative shift detected \u2014 scanning {source}',
  'Regulatory action flagged \u2014 {headline}',
  'Sentiment divergence alert \u2014 tier {tier} classification',
  'Media volume spike \u2014 topic clustering in progress',
  'Institutional signal intercepted \u2014 {source} confirmation pending',
  'Public discourse inflection point \u2014 routing to COORDINATOR',
  'Adoption metric deviation \u2014 {headline}',
  'Legislative development \u2014 impact assessment at tier {tier}',
  'Social amplification detected \u2014 narrative propagation tracked',
  'Compliance landscape change \u2014 cross-referencing with RISK-AGENT',
];

// ── RISK-AGENT templates ─────────────────────────────────────────────────────

export const RISK_AMBIENT = [
  'Cross-referencing geopolitical index \u2014 baseline threat nominal',
  'Energy market correlation scan \u2014 supply chain stable',
  'Sanctions compliance checker active \u2014 no new designations',
  'Cyber threat intelligence feed \u2014 no critical advisories',
  'Infrastructure resilience monitor \u2014 uptime metrics green',
  'Regional conflict tracker \u2014 escalation indicators within range',
  'Supply chain disruption model \u2014 shipping routes monitored',
  'Counter-party risk engine \u2014 exchange solvency scores updated',
  'Regulatory enforcement tracker \u2014 no new actions logged',
  'Natural disaster early warning \u2014 seismic and weather data clean',
  'Nuclear threat assessment \u2014 DEFCON status unchanged',
  'Trade route vulnerability scan \u2014 chokepoint status nominal',
  'Banking sector stress indicators \u2014 CDS spreads monitored',
  'Sovereign credit watch \u2014 rating agency updates checked',
  'Critical infrastructure status \u2014 power grid and comms stable',
];

export const RISK_EVENT = [
  'Geopolitical escalation flagged \u2014 {headline}',
  'Threat vector identified \u2014 {source} reporting tier {tier}',
  'Energy market disruption signal \u2014 supply impact modelled',
  'Sanctions event detected \u2014 cross-referencing with MACRO-AGENT',
  'Cyber security advisory \u2014 {headline}',
  'Regional conflict escalation \u2014 routing to COORDINATOR',
  'Infrastructure threat alert \u2014 tier {tier} assessment',
  'Counter-party risk elevation \u2014 exchange solvency flag',
  'Regulatory enforcement action \u2014 {source} data confirmed',
  'Supply chain disruption \u2014 cascading impact analysis running',
];

// ── COORDINATOR templates ────────────────────────────────────────────────────

export const COORDINATOR_AMBIENT = [
  'All agents reporting nominal \u2014 threat posture stable',
  'Cross-domain correlation check \u2014 no convergent signals',
  'Agent heartbeat verification \u2014 4/4 responding',
  'Threat score decay applied \u2014 current posture maintained',
  'Signal-to-noise ratio optimal \u2014 filtering thresholds held',
  'Network graph telemetry \u2014 all nodes synchronised',
  'Event queue drained \u2014 awaiting next ingestion cycle',
  'Composite threat model refreshed \u2014 no state transition',
  'Inter-agent routing table updated \u2014 pathways nominal',
  'System watchdog check \u2014 all feeds active',
];

export const COORDINATOR_EVENT = [
  'Routing {domain} event \u2014 severity tier {tier}',
  'Multi-domain convergence detected \u2014 agents {domain} activated',
  'Threat score impact calculated \u2014 +{n} to composite',
  'State transition evaluation \u2014 threshold proximity assessed',
  'Event sequence initiated \u2014 tier {tier} protocol',
  'Cross-domain synthesis \u2014 {headline}',
  'Agent activation command issued \u2014 {domain} responding',
  'Threat posture recalculation \u2014 score updated',
  'Signal aggregation complete \u2014 composite analysis routed',
  'Priority escalation \u2014 tier {tier} event from {source}',
];

// ── Lookup ───────────────────────────────────────────────────────────────────

export const AMBIENT_TEMPLATES: Record<string, string[]> = {
  MACRO: MACRO_AMBIENT,
  PRICE: PRICE_AMBIENT,
  SENTIMENT: SENTIMENT_AMBIENT,
  RISK: RISK_AMBIENT,
  COORDINATOR: COORDINATOR_AMBIENT,
};

export const EVENT_TEMPLATES: Record<string, string[]> = {
  MACRO: MACRO_EVENT,
  PRICE: PRICE_EVENT,
  SENTIMENT: SENTIMENT_EVENT,
  RISK: RISK_EVENT,
  COORDINATOR: COORDINATOR_EVENT,
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
 * Pick a random ambient log entry for a given domain.
 */
export function randomAmbientEntry(domain: string): LogEntry {
  const templates = AMBIENT_TEMPLATES[domain] || COORDINATOR_AMBIENT;
  const msg = templates[Math.floor(Math.random() * templates.length)];
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
  const primaryTemplates = EVENT_TEMPLATES[primaryDomain] || COORDINATOR_EVENT;
  const primaryMsg = primaryTemplates[Math.floor(Math.random() * primaryTemplates.length)];
  entries.push({
    id: `log-${Date.now()}-${++logIdCounter}`,
    domain: primaryDomain,
    message: fillTemplate(primaryMsg, vars),
    timestamp: Date.now(),
    tier: event.tier,
  });

  // Coordinator routing entry
  const coordTemplates = COORDINATOR_EVENT;
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
