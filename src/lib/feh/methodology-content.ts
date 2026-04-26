/**
 * Fiscal Event Horizon — methodology content (single source of truth).
 *
 * Both the per-module slide-in drawers and the full methodology page at
 * `/tools/fiscal-event-horizon/methodology` consume from this module.
 */

export interface MethodologyParagraph {
  heading: string;
  /** Plain-text paragraphs separated by blank lines. */
  body: string;
}

export interface MethodologyEntry {
  slug: string;            // matches the hash fragment / URL slug
  index: string;           // "01" .. "06"
  title: string;
  cadence: string;
  paragraphs: MethodologyParagraph[];
  sources: string[];
  editorialNote?: string;
}

export const METHODOLOGY: MethodologyEntry[] = [
  {
    slug: '01',
    index: '01',
    title: 'SOVEREIGN COUNTDOWN GLOBE',
    cadence: 'Quarterly refresh — staggered against IMF WEO and Fiscal Monitor releases.',
    paragraphs: [
      {
        heading: 'Runway calculation',
        body:
          `Each sovereign's runway is the minimum of two threshold crossings:\n\n` +
          `(1) Years until debt/GDP exceeds 150% under the standard debt-dynamics equation:\n` +
          `    debt_t+1 / GDP_t+1 = debt_t/GDP_t × (1 + r) / (1 + g) − primary_balance/GDP\n\n` +
          `where r is the effective interest rate on outstanding stock and g is nominal GDP growth (real growth + 2% assumed inflation).\n\n` +
          `(2) Years until interest expense exceeds 25% of general government revenue, with interest scaling linearly with the projected debt/GDP path while the effective rate is held constant.\n\n` +
          `Whichever crosses first defines the runway and the dossier surfaces the failure mode (DEBT_STOCK or INTEREST_CROWD_OUT). The 25%-of-revenue trigger is editorially load-bearing — historically it's the metric that actually kills sovereigns (UK 1976, Greece 2010, repeated Argentine episodes), not the debt stock itself.`,
      },
      {
        heading: 'Sovereignty Score composite',
        body:
          `0-100, higher = stronger. Weighted composite per the locked editorial weights:\n\n` +
          `  • Debt/GDP — 30%\n` +
          `  • Interest as % of revenue — 30% (the killer metric)\n` +
          `  • FX-denominated debt share — 15%\n` +
          `  • External debt share — 15%\n` +
          `  • Reserve adequacy — 10%`,
      },
      {
        heading: 'Stressed-rates toggle',
        body:
          `The "STRESSED" view applies +200bps to the effective rate and -100bps to real GDP growth. The differential between current-rates and stressed runways shows which sovereigns are solvent only at zero (Japan being the obvious example).`,
      },
      {
        heading: 'Confidence band',
        body:
          `Reported as ±N years on the countdown clock. v1 uses a simple proxy (~20% of runway). The intended derivation is a rolling 5-year volatility of (r-g) and primary balance — wired alongside the Phase 8c DB connection.`,
      },
    ],
    sources: [
      'IMF WEO database (semi-annual)',
      'IMF Fiscal Monitor (April / October)',
      'World Bank Quarterly External Debt',
      'BIS debt securities statistics',
      'National treasuries (US Treasury Daily Statement, UK DMO, JGB) for high-frequency updates',
    ],
    editorialNote:
      `The 150% / 25% pair is defensible but adjustable. Different sovereigns hit the wall via different mechanisms — Japan via interest, Argentina via interest, the US trajectory looks more like debt stock. The hybrid threshold is the editorial choice that makes the page an intelligence product rather than a calculator.`,
  },
  {
    slug: '02',
    index: '02',
    title: 'RESERVE CURRENCY DECAY INDEX',
    cadence: 'Monthly refresh, slightly behind the COFER quarterly release schedule.',
    paragraphs: [
      {
        heading: 'Composite construction',
        body:
          `The RCDI is a z-score normalised weighted mean of four components, each scaled 0-100 against a 2010-2020 baseline (higher = more decay):\n\n` +
          `  • CB Gold vs USD allocation shift — 30%\n` +
          `  • CIPS / SWIFT volume ratio — 25%\n` +
          `  • Yuan-denominated oil settlement % — 25%\n` +
          `  • BRICS+ bilateral swap notional vs Fed swap notional — 20%`,
      },
      {
        heading: 'Component derivation',
        body:
          `Gold/USD: aggregate quarterly Δ(gold reserves / USD reserves) across all CBs, weighted by reserve size. Source: IMF COFER + WGC.\n\n` +
          `CIPS/SWIFT: ratio of CIPS message volume to SWIFT volume. Where official disclosure is incomplete, estimated from PBoC monthly statements + BIS Triennial cross-referenced.\n\n` +
          `Yuan oil: yuan-settled % of global oil trade — built from Aramco / CNPC / Russian disclosures and major bilateral deals. Quarterly granularity at best.\n\n` +
          `BRICS swaps: aggregate notional outstanding of BRICS+ bilateral swap lines, divided by Fed swap line notional. Source: BIS bilateral swap database.`,
      },
    ],
    sources: [
      'IMF COFER (quarterly, free)',
      'World Gold Council monthly CB gold reserves',
      'PBoC monthly statements (CIPS volume — manual scrape)',
      'BIS Triennial Survey + bilateral swap database',
      'Custom news scrape pipeline for bilateral oil/gold deals',
    ],
  },
  {
    slug: '03',
    index: '03',
    title: 'CENTRAL BANK DIVERGENCE MATRIX',
    cadence: 'Daily refresh — most rates are also live via API-Ninjas.',
    paragraphs: [
      {
        heading: 'Stance classification',
        body:
          `Each bank classified easing / holding / tightening based on trailing 6-month policy moves: net cuts → easing, net hikes → tightening, no net move → holding. Hand-classified at refresh time; the 6-month window is editorially adjustable.`,
      },
      {
        heading: 'Market-implied 12mo path',
        body:
          `From OIS curves where liquid; futures-implied where not (and short-rate proxy where neither). Reported in cumulative basis points over the next 12 months relative to current.`,
      },
      {
        heading: 'Divergence Index',
        body:
          `GDP-weighted standard deviation of stance scores (-1 easing, 0 holding, +1 tightening) across the 24-cell universe. Above 0.55 = HIGH (capital is moving), 0.35-0.55 = MODERATE, below 0.35 = LOW.`,
      },
    ],
    sources: [
      'BIS policy rates dataset (free, monthly)',
      'Trading Economics rate scrape',
      'Each CB website for last decision date + minutes',
      'Refinitiv / Bloomberg if available; OIS prints from CB websites otherwise',
    ],
  },
  {
    slug: '04',
    index: '04',
    title: 'MALINVESTMENT MAPPER',
    cadence: 'Weekly refresh — Mondays after weekend FRED + Coinglass settle.',
    paragraphs: [
      {
        heading: 'Sector stress score (0-100)',
        body:
          `Each sector's headline metric (zombie ratio, vacancy rate, mark-to-model spread, perp funding, etc.) is z-score normalised against its own 20-year history. The result is rescaled 0-100, with 50 = long-run average and 100 = worst observed reading.`,
      },
      {
        heading: 'BUST PROBABILITY composite',
        body:
          `Equal-weight geometric mean across all 9 sector stress scores. The geometric mean is editorially deliberate — a cluster of moderate signals beats a single extreme one, which matches the Austrian-flavoured framing: cycle theory does not predict the day of the bust, it maps the kindling.`,
      },
      {
        heading: 'Half-life-at-current-rates',
        body:
          `Per-sector estimate of months until a secondary stress trigger fires under the current rate path. Hand-modelled — not a formal projection, an editorial signal.`,
      },
    ],
    sources: [
      'FRED (credit, delinquency, BBB-OAS, HY-OAS series)',
      'S&P / Bloomberg for zombie ratio (fallback: Russell 3000 EPS scrape)',
      'Pitchbook (paid) or Crunchbase API for VC dry powder',
      'SPAC Research (free)',
      'Coinglass / CoinAnk for perp funding & liquidations',
      'Trepp / commercial RE — partial via REIT 10-K scrape',
    ],
    editorialNote:
      `Equal weights across sectors is a deliberate flat prior. As specific sectors prove more predictive of broader busts, the weights become an editorial knob — not an empirical one.`,
  },
  {
    slug: '05',
    index: '05',
    title: 'WARTIME FINANCE MONITOR',
    cadence: 'Monthly refresh + on-demand for breaking decrees / capital-control announcements.',
    paragraphs: [
      {
        heading: 'Stage classification',
        body:
          `Each country gets the deepest stage it has triggered (cumulative — Stage 3 implies 1+2 also fired). Thresholds:\n\n` +
          `  • Stage 1: defence spending >2.5% GDP AND 3-year CAGR >5%\n` +
          `  • Stage 2: net new sovereign issuance specifically marked for defence/security\n` +
          `  • Stage 3: any documented capital outflow restriction in last 24 months\n` +
          `  • Stage 4: any documented price/wage decree or cap in last 24 months\n` +
          `  • Stage 5: M2 growth >15% sustained 3 years AND CPI double-digit\n\n` +
          `The thresholds are editorial. Different cycles will demand different cuts — the framework is the point, not the specific numbers.`,
      },
      {
        heading: 'Evidence requirement',
        body:
          `Every classification must be backed by at least one documented news event or formal release within the trigger window. Evidence bullets render in the country drilldown so the reader can audit the call.`,
      },
    ],
    sources: [
      'SIPRI Military Expenditure Database (annual)',
      'IMF AREAER (annual capital control survey)',
      'Trading Economics CPI / M2 dump',
      'News scrape pipeline for decrees + bond issuance — keyword-matched',
    ],
    editorialNote:
      `This is the most editorially-driven module. Stage 3 (capital controls) is increasingly common — the page intends to surface those quietly even when individual countries don't make headlines.`,
  },
  {
    slug: '06',
    index: '06',
    title: 'PETRO-DOLLAR EROSION TRACKER',
    cadence: 'Daily-ish — DXY available live from FRED / API-Ninjas; the three erosion overlays settle at quarterly cadence.',
    paragraphs: [
      {
        heading: 'Indexing methodology',
        body:
          `All four series are indexed to Apr 2016 = 100 so they share a comparable y-axis. The editorial point is that DXY can rise simultaneously with the erosion layers: DXY measures relative strength against G7 peers, not absolute dollar dominance.`,
      },
      {
        heading: 'Component derivation',
        body:
          `DXY: standard ICE / FRED daily.\n\n` +
          `Yuan oil settlement %: estimated from Aramco / CNPC / Russian disclosures plus named bilateral deals.\n\n` +
          `Gold repatriation index: aggregate cross-border gold flows back to source nations (ECB, Bundesbank, India, etc.) per WGC quarterly.\n\n` +
          `BRICS bilateral swap notional: BIS bilateral swap database, summed.`,
      },
      {
        heading: 'Annotated events',
        body:
          `The chart is overlaid with discrete inflection events drawn from a curated event list. Hovering reveals the event label; the event timeline is the page's narrative spine for the post-2022 acceleration.`,
      },
    ],
    sources: [
      'FRED — DXY (DTWEXBGS) and dollar series',
      'World Gold Council (quarterly)',
      'BIS bilateral swap database',
      'News scrape pipeline for oil settlement deals',
    ],
    editorialNote:
      `DXY is a relative measure. It does not measure decay; it measures who is decaying faster this quarter.`,
  },
];

export function getMethodology(slug: string): MethodologyEntry | undefined {
  return METHODOLOGY.find((m) => m.slug === slug);
}
