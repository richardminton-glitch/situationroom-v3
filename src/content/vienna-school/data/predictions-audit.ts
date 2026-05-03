/**
 * Predictions audit data — paired forecasts, mainstream vs Austrian.
 *
 * Each entry has both sides where possible: a mainstream prediction (left,
 * usually wrong) and an Austrian prediction (right, usually prescient),
 * lined up by year-of-prediction. Some years have only one side (it
 * happens). The PredictionsAudit component renders them as a vertical
 * scrolling timeline.
 */

export interface AuditEntry {
  year:        number;
  mainstream?: AuditPrediction;
  austrian?:   AuditPrediction;
}

export interface AuditPrediction {
  /** Person making the prediction. */
  person:    string;
  /** Their role / authority at the time. */
  role:      string;
  /** The prediction itself. */
  claim:     string;
  /** What actually happened (in hindsight). */
  outcome:   string;
  /** Source citation — paper, speech, book, tweet. */
  source:    string;
  /** Optional URL for verification. */
  url?:      string;
}

export const PREDICTIONS_AUDIT: AuditEntry[] = [
  // ── Mises-era foundational warnings ────────────────────────────────
  {
    year: 1912,
    austrian: {
      person:  'Ludwig von Mises',
      role:    'Vienna University, lecturer',
      claim:   'The expansion of credit through fractional-reserve banking will produce booms that must end in busts. Recurring monetary crises are an inevitable feature of the system, not an accident.',
      outcome: 'Confirmed by every post-WWI banking crisis. Confirmed again 1929, 1973, 1987, 2001, 2008, 2020, 2023. Still confirming.',
      source:  'The Theory of Money and Credit',
    },
  },
  {
    year: 1931,
    mainstream: {
      person:  'John Maynard Keynes',
      role:    'Cambridge / HM Treasury',
      claim:   'In the long run we are all dead. Sustained government deficit-spending can stimulate the economy out of any depression with no long-term cost.',
      outcome: 'Decades of post-war stimulus produced the 1970s stagflation Keynesian models said could not occur. The "long run" of monetary expansion arrived in the form of $35tn US debt.',
      source:  'A Tract on Monetary Reform',
    },
    austrian: {
      person:  'Friedrich Hayek',
      role:    'LSE, Tooke Chair',
      claim:   'Credit-fuelled booms misallocate capital into long-dated stages of production that real saving cannot sustain. The recovery requires liquidating those malinvestments — not papering over them with more credit.',
      outcome: 'Confirmed by the prolonged 1930s depression as FDR\'s New Deal blocked the liquidation. Confirmed by Japan post-1990, by Europe post-2008, by zombie corporates everywhere.',
      source:  'Prices and Production',
    },
  },
  {
    year: 1944,
    austrian: {
      person:  'Friedrich Hayek',
      role:    'LSE',
      claim:   'Central economic planning leads inexorably to political tyranny. The economic logic of comprehensive state direction requires the political logic of suppressing dissent.',
      outcome: 'Confirmed by Eastern Europe 1944-1989. Confirmed by Mao\'s China. Confirmed by Venezuela 2010s. Currently being re-confirmed by every CBDC pilot.',
      source:  'The Road to Serfdom',
      url:     'https://mises.org/library/book/road-serfdom',
    },
  },

  // ── Stagflation prediction ─────────────────────────────────────────
  {
    year: 1969,
    mainstream: {
      person:  'Paul Samuelson',
      role:    'MIT, Nobel laureate (1970)',
      claim:   'The Phillips Curve trade-off between inflation and unemployment is stable. We can choose any point on it via monetary policy.',
      outcome: 'Within a decade the US had simultaneously rising inflation AND rising unemployment — stagflation, the impossible quadrant. Phillips Curve abandoned.',
      source:  'Economics, 8th edition',
    },
    austrian: {
      person:  'Murray Rothbard',
      role:    'Brooklyn Polytechnic',
      claim:   'The persistence of fiat-driven credit expansion will produce simultaneous inflation and recession — the very combination Keynesian models pronounce impossible.',
      outcome: 'Stagflation arrived 1973-1982 exactly as predicted. Volcker had to break it with 20% interest rates.',
      source:  'Economic Depressions: Their Cause and Cure',
    },
  },

  // ── Subprime ──────────────────────────────────────────────────────
  {
    year: 2005,
    austrian: {
      person:  'Peter Schiff',
      role:    'Euro Pacific Capital',
      claim:   'The US housing market is a credit-induced bubble that will collapse, taking the financial system with it. The Fed cannot raise rates enough to stop it without triggering the collapse it created.',
      outcome: 'Confirmed precisely 2007-2008. Schiff\'s public predictions on CNBC are now a YouTube genre called "Peter Schiff was right".',
      source:  'Crash Proof',
      url:     'https://www.youtube.com/watch?v=jj8rMwdQf6K',
    },
  },
  {
    year: 2007,
    mainstream: {
      person:  'Ben Bernanke',
      role:    'Federal Reserve, Chair',
      claim:   'The impact on the broader economy and financial markets of the problems in the subprime market seems likely to be contained.',
      outcome: 'Within 12 months Bear Stearns collapsed. Within 18 months Lehman Brothers, AIG, the global banking system, and Bernanke\'s career assumptions had all been incinerated.',
      source:  'Testimony to Congress, 28 March 2007',
    },
  },
  {
    year: 2008,
    mainstream: {
      person:  'Hank Paulson',
      role:    'US Treasury Secretary',
      claim:   'The TARP bailouts are necessary to restore market confidence and will be fully repaid. They are not a precedent.',
      outcome: 'They were a precedent. Every subsequent crisis (2020 COVID, 2023 SVB) has expanded the bailout machinery. Moral hazard is now load-bearing infrastructure.',
      source:  'Press conference, 19 September 2008',
    },
  },

  // ── Bitcoin obituaries ────────────────────────────────────────────
  {
    year: 2013,
    mainstream: {
      person:  'Paul Krugman',
      role:    'NYT columnist, Nobel laureate',
      claim:   '"Bitcoin Is Evil." It is essentially a Ponzi scheme with no fundamental value, useful only for criminals and tax evaders.',
      outcome: 'Bitcoin appreciated approximately 50× from the date of the column. It is now held on the balance sheets of public corporations and US states. Krugman has not retracted.',
      source:  'New York Times, 28 December 2013',
      url:     'https://krugman.blogs.nytimes.com/2013/12/28/bitcoin-is-evil/',
    },
    austrian: {
      person:  'Saifedean Ammous',
      role:    'AUB / Lebanese American Univ.',
      claim:   'Bitcoin satisfies the Austrian monetary specification more cleanly than gold ever did. It will appreciate in real terms over the long run as fiat continues to debase.',
      outcome: 'Confirmed across every multi-year horizon since publication. Now standard reference text for institutional-grade Bitcoin allocation.',
      source:  'Various early essays + The Bitcoin Standard (2018)',
    },
  },
  {
    year: 2017,
    mainstream: {
      person:  'Janet Yellen',
      role:    'Federal Reserve, Chair',
      claim:   'Would I say there will never, ever be another financial crisis? You know, probably that would be going too far, but I do think we\'re much safer, and I hope that it will not be in our lifetimes and I don\'t believe it will be.',
      outcome: 'Within 6 years: COVID liquidity crisis (2020), regional bank failures (SVB, Signature, First Republic, 2023), commercial-real-estate stress, sovereign-bond duration losses. Now Treasury Secretary, where she has presided over the largest peacetime debt expansion in US history.',
      source:  'British Academy speech, 27 June 2017',
    },
  },
  {
    year: 2019,
    mainstream: {
      person:  'Christine Lagarde',
      role:    'ECB President',
      claim:   'The ECB does not see any imminent need to issue a digital euro. We have no specific plans.',
      outcome: 'Within 4 years the digital euro had been promoted to the ECB\'s flagship initiative. Pilot rollout 2025. The "no plans" reassurance is now a museum piece.',
      source:  'ECB press conference',
    },
  },

  // ── COVID money printing ──────────────────────────────────────────
  {
    year: 2020,
    mainstream: {
      person:  'Jerome Powell',
      role:    'Federal Reserve, Chair',
      claim:   'We\'re not even thinking about thinking about raising interest rates. The forces holding inflation down are persistent and global.',
      outcome: 'Within 18 months CPI hit 9%. The Fed embarked on the fastest tightening cycle in history (0% → 5.5% in 18 months). The "transitory" framing is the most expensive two-word forecast error in central banking history.',
      source:  '60 Minutes interview + FOMC press conferences',
    },
    austrian: {
      person:  'Lyn Alden',
      role:    'Lyn Alden Investment Strategy',
      claim:   'Multi-trillion-dollar M2 expansion combined with simultaneous fiscal expansion will produce sustained inflation that the Fed cannot bring down without triggering a sovereign-debt crisis.',
      outcome: 'Confirmed. The Fed brought CPI down only by relying on Treasury issuance refinancing pressures, which are themselves now structural problems for the bond market.',
      source:  'Newsletter + Broken Money (2023)',
    },
  },

  // ── Sovereign debt ─────────────────────────────────────────────────
  {
    year: 2023,
    mainstream: {
      person:  'Janet Yellen',
      role:    'US Treasury Secretary',
      claim:   'I don\'t see anything that would cause me to anticipate that the long-term trend in interest rates is going to push our debt servicing costs to alarming levels.',
      outcome: 'Within 18 months US interest payments exceeded $1tn/year, surpassing defence spending. The 30-year Treasury yield hit 5%. The bond market reorganised the rest of the global financial system around it.',
      source:  'Press briefing, October 2023',
    },
    austrian: {
      person:  'Luke Gromen',
      role:    'FFTT, LLC',
      claim:   'The combination of structural fiscal deficits, demographic outflows from Treasuries, and geopolitical reserve diversification will force the Fed into yield-curve control. Real rates must go negative again.',
      outcome: 'Confirmed in real time. Reverse repo facility drained, Treasury issuance increasingly short-dated, BTFP and emergency facilities normalised.',
      source:  'Tree Rings newsletter',
    },
  },
];
