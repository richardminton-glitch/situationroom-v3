/**
 * UK Cash ISA real-returns dataset.
 *
 * Hardcoded annual table covering every tax year since the ISA's 1999/00
 * launch. Drives /tools/cash-isa. Numbers don't change for past years; the
 * current year ticks once a quarter as new ONS / BoE prints land. Live APIs
 * would buy us a day or two of freshness in exchange for FRED/ONS quota
 * dependence and CSV-parser maintenance — not worth it for an annual series.
 *
 * Sources:
 *   ISA cash allowance schedule — HMRC ISA guidance.
 *   CPI / RPI annual % change — ONS series CDKO (CPI), CHAW (RPI).
 *   M4 broad money annual % change — Bank of England Money & Credit (LPMAUYM).
 *   Cash ISA average rate — BoE / Moneyfacts variable Cash ISA averages.
 *   S&P 500 total return (GBP-converted) — Shiller TR series × GBP/USD.
 *   FTSE 100 total return — FTSE Russell TR index (UK ITR), calendar year.
 *   Bitcoin annual return — CoinGecko / Coinbase, USD ≈ GBP for magnitude.
 *
 * Methodology: each year, contribute that year's full Cash ISA allowance,
 * then compound the running balance at that year's growth rate. Same model
 * applied to CPI, RPI, M4, SPX, FTSE and BTC (each gives "what you'd have
 * if your contributions had grown at that rate instead"). Bitcoin years
 * before 2010/11 carry a null rate and skip the contribution — you couldn't
 * have bought BTC with that money before it was tradeable.
 */

export interface CashIsaYearRow {
  /** Tax-year label, e.g. "1999/00". */
  taxYear:           string;
  /** Calendar year the tax year starts in — used for chart x-axis. */
  startYear:         number;
  /** Maximum cash-ISA subscription that year (£). Pre-2008 was the cash sub-limit
   *  inside the wider stocks-and-shares allowance; from 2014/15 the NISA rules
   *  let savers put the full allowance into cash. */
  isaCashAllowance:  number;
  /** ONS CPI annual % change for the calendar year. */
  cpiPct:            number;
  /** ONS RPI annual % change for the calendar year. */
  rpiPct:            number;
  /** BoE M4 broad-money annual % change. */
  m4Pct:             number;
  /** Average variable Cash ISA rate (BoE / Moneyfacts) for the year. */
  isaRatePct:        number;
  /** S&P 500 total return for the year, converted to GBP (approx). */
  spxGbpTrPct:       number;
  /** FTSE 100 total return for the year (GBP, dividends reinvested). */
  ftse100TrPct:      number;
  /** Bitcoin annual return (% change). null = pre-tradeable years (no BTC bucket). */
  btcPct:            number | null;
}

/**
 * One row per tax year, 1999/00 → 2025/26.
 *
 * Rates are calendar-year averages aligned to the tax year that starts in
 * that calendar year — close enough for a 27-year compounding chart whose
 * point is the *shape*, not month-of-the-year accuracy.
 *
 * Pre-2014 cash allowances reflect the cash-only sub-limit of the broader
 * ISA wrapper; 2014/15 onwards are the full allowance (NISA reform). The
 * 2014/15 figure (£15,000) is the post-July level; sum matches HMRC's
 * 27-year nominal contribution total (£281,520).
 */
export const CASH_ISA_YEARS: CashIsaYearRow[] = [
  { taxYear: '1999/00', startYear: 1999, isaCashAllowance:  3000, cpiPct: 1.3, rpiPct: 1.5, m4Pct:  4.2, isaRatePct: 5.5, spxGbpTrPct:  20.0, ftse100TrPct:  20.6, btcPct: null    },
  { taxYear: '2000/01', startYear: 2000, isaCashAllowance:  3000, cpiPct: 0.8, rpiPct: 3.0, m4Pct:  8.4, isaRatePct: 5.7, spxGbpTrPct: -22.0, ftse100TrPct:  -8.2, btcPct: null    },
  { taxYear: '2001/02', startYear: 2001, isaCashAllowance:  3000, cpiPct: 1.2, rpiPct: 1.8, m4Pct:  7.0, isaRatePct: 4.5, spxGbpTrPct:  -1.0, ftse100TrPct: -14.1, btcPct: null    },
  { taxYear: '2002/03', startYear: 2002, isaCashAllowance:  3000, cpiPct: 1.3, rpiPct: 1.7, m4Pct:  7.0, isaRatePct: 3.8, spxGbpTrPct: -25.0, ftse100TrPct: -22.2, btcPct: null    },
  { taxYear: '2003/04', startYear: 2003, isaCashAllowance:  3000, cpiPct: 1.4, rpiPct: 2.9, m4Pct:  7.5, isaRatePct: 3.5, spxGbpTrPct:  24.0, ftse100TrPct:  17.9, btcPct: null    },
  { taxYear: '2004/05', startYear: 2004, isaCashAllowance:  3000, cpiPct: 1.3, rpiPct: 3.0, m4Pct:  9.9, isaRatePct: 4.2, spxGbpTrPct:   5.0, ftse100TrPct:  11.3, btcPct: null    },
  { taxYear: '2005/06', startYear: 2005, isaCashAllowance:  3000, cpiPct: 2.1, rpiPct: 2.8, m4Pct: 11.0, isaRatePct: 4.5, spxGbpTrPct:  13.0, ftse100TrPct:  20.8, btcPct: null    },
  { taxYear: '2006/07', startYear: 2006, isaCashAllowance:  3000, cpiPct: 2.3, rpiPct: 3.2, m4Pct: 12.8, isaRatePct: 4.7, spxGbpTrPct:  12.0, ftse100TrPct:  14.4, btcPct: null    },
  { taxYear: '2007/08', startYear: 2007, isaCashAllowance:  3000, cpiPct: 2.3, rpiPct: 4.3, m4Pct: 12.3, isaRatePct: 5.5, spxGbpTrPct:  -2.0, ftse100TrPct:   7.4, btcPct: null    },
  { taxYear: '2008/09', startYear: 2008, isaCashAllowance:  3600, cpiPct: 3.6, rpiPct: 4.0, m4Pct: 16.4, isaRatePct: 4.8, spxGbpTrPct: -27.0, ftse100TrPct: -28.3, btcPct: null    },
  { taxYear: '2009/10', startYear: 2009, isaCashAllowance:  3600, cpiPct: 2.2, rpiPct: -0.5, m4Pct:  4.9, isaRatePct: 1.5, spxGbpTrPct:  47.0, ftse100TrPct:  27.3, btcPct: null    },
  { taxYear: '2010/11', startYear: 2010, isaCashAllowance:  5100, cpiPct: 3.3, rpiPct: 4.6, m4Pct: -1.6, isaRatePct: 1.2, spxGbpTrPct:  10.0, ftse100TrPct:  12.6, btcPct: 1000.0  },
  { taxYear: '2011/12', startYear: 2011, isaCashAllowance:  5340, cpiPct: 4.5, rpiPct: 5.2, m4Pct: -1.5, isaRatePct: 1.5, spxGbpTrPct:   3.0, ftse100TrPct:  -2.2, btcPct:  400.0  },
  { taxYear: '2012/13', startYear: 2012, isaCashAllowance:  5640, cpiPct: 2.8, rpiPct: 3.2, m4Pct: -2.5, isaRatePct: 1.8, spxGbpTrPct:  20.0, ftse100TrPct:  10.0, btcPct: 2700.0  },
  { taxYear: '2013/14', startYear: 2013, isaCashAllowance:  5760, cpiPct: 2.6, rpiPct: 3.0, m4Pct: -0.4, isaRatePct: 1.5, spxGbpTrPct:  13.0, ftse100TrPct:  18.7, btcPct:  220.0  },
  { taxYear: '2014/15', startYear: 2014, isaCashAllowance: 15000, cpiPct: 1.5, rpiPct: 2.4, m4Pct:  0.3, isaRatePct: 1.4, spxGbpTrPct:  20.0, ftse100TrPct:   0.7, btcPct:  -48.0  },
  { taxYear: '2015/16', startYear: 2015, isaCashAllowance: 15240, cpiPct: 0.0, rpiPct: 1.0, m4Pct:  0.5, isaRatePct: 1.4, spxGbpTrPct:  -2.0, ftse100TrPct:  -1.3, btcPct:   79.0  },
  { taxYear: '2016/17', startYear: 2016, isaCashAllowance: 15240, cpiPct: 0.7, rpiPct: 1.8, m4Pct:  7.4, isaRatePct: 1.0, spxGbpTrPct:  33.0, ftse100TrPct:  19.1, btcPct:  162.0  },
  { taxYear: '2017/18', startYear: 2017, isaCashAllowance: 20000, cpiPct: 2.7, rpiPct: 3.6, m4Pct:  4.0, isaRatePct: 0.8, spxGbpTrPct:   1.0, ftse100TrPct:  11.9, btcPct:  536.0  },
  { taxYear: '2018/19', startYear: 2018, isaCashAllowance: 20000, cpiPct: 2.5, rpiPct: 3.3, m4Pct:  1.6, isaRatePct: 0.9, spxGbpTrPct:  13.0, ftse100TrPct:  -8.7, btcPct:  -24.0  },
  { taxYear: '2019/20', startYear: 2019, isaCashAllowance: 20000, cpiPct: 1.8, rpiPct: 2.6, m4Pct:  3.6, isaRatePct: 1.0, spxGbpTrPct:  -3.0, ftse100TrPct:  17.3, btcPct:   32.0  },
  { taxYear: '2020/21', startYear: 2020, isaCashAllowance: 20000, cpiPct: 0.9, rpiPct: 1.5, m4Pct: 13.5, isaRatePct: 0.6, spxGbpTrPct:  33.0, ftse100TrPct: -11.5, btcPct:  728.0  },
  { taxYear: '2021/22', startYear: 2021, isaCashAllowance: 20000, cpiPct: 2.6, rpiPct: 4.1, m4Pct:  6.7, isaRatePct: 0.4, spxGbpTrPct:   8.0, ftse100TrPct:  18.4, btcPct:  -21.0  },
  { taxYear: '2022/23', startYear: 2022, isaCashAllowance: 20000, cpiPct: 9.1, rpiPct: 11.6, m4Pct:  1.0, isaRatePct: 1.5, spxGbpTrPct:  -1.0, ftse100TrPct:   4.7, btcPct:  -39.0  },
  { taxYear: '2023/24', startYear: 2023, isaCashAllowance: 20000, cpiPct: 7.4, rpiPct: 8.6, m4Pct:  0.0, isaRatePct: 4.0, spxGbpTrPct:  24.0, ftse100TrPct:   7.7, btcPct:  136.0  },
  { taxYear: '2024/25', startYear: 2024, isaCashAllowance: 20000, cpiPct: 2.5, rpiPct: 3.5, m4Pct:  1.5, isaRatePct: 4.5, spxGbpTrPct:  14.0, ftse100TrPct:   9.4, btcPct:   29.0  },
  { taxYear: '2025/26', startYear: 2025, isaCashAllowance: 20000, cpiPct: 2.5, rpiPct: 3.6, m4Pct:  3.0, isaRatePct: 3.8, spxGbpTrPct:   5.0, ftse100TrPct:   8.0, btcPct:   20.0  },
];

export interface CashIsaSeriesPoint {
  startYear:    number;
  taxYear:      string;
  contributed:  number; // running nominal total
  isaPot:       number; // grown at typical Cash ISA rate
  cpiNeeded:    number; // grown at CPI
  rpiNeeded:    number; // grown at RPI
  m4Needed:     number; // grown at M4 broad money
  spxValue:     number; // grown at S&P 500 GBP total return
  ftseValue:    number; // grown at FTSE 100 total return
  btcValue:     number; // grown at BTC return (zero before 2010/11)
}

export interface CashIsaSummary {
  totalContributed:  number;
  finalIsaPot:       number;
  finalCpi:          number;
  finalRpi:          number;
  finalM4:           number;
  finalSpx:          number;
  finalFtse:         number;
  finalBtc:          number;
  /** Sum of contributions actually deployed into BTC (i.e. from 2010/11). */
  btcContributed:    number;
  /** Real loss vs CPI in £ (negative if Cash ISA < CPI line). */
  realLossVsCpi:     number;
  realLossVsRpi:     number;
  realLossVsM4:      number;
  /** Opportunity cost vs SPX in £ (negative if Cash ISA < SPX). */
  oppCostVsSpx:      number;
  oppCostVsFtse:     number;
  oppCostVsBtc:      number;
  /** % loss vs each benchmark (Cash ISA / Benchmark − 1). */
  realLossPctVsCpi:  number;
  realLossPctVsRpi:  number;
  realLossPctVsM4:   number;
  oppCostPctVsSpx:   number;
  oppCostPctVsFtse:  number;
  oppCostPctVsBtc:   number;
  /** Compound multipliers over the full period. */
  cpiMultiplier:     number;
  rpiMultiplier:     number;
  m4Multiplier:      number;
  isaMultiplier:     number;
  spxMultiplier:     number;
  ftseMultiplier:    number;
  /** BTC multiplier, compounded over tradeable years only. */
  btcMultiplier:     number;
  firstYear:         string;
  lastYear:          string;
}

export interface CashIsaPayload {
  series:   CashIsaSeriesPoint[];
  summary:  CashIsaSummary;
  rows:     CashIsaYearRow[];
  generatedAt: string;
}

/**
 * Walk the year table, compounding each running line by its rate. The point
 * just before contribution (start of year) is included as a "0,0,0,..." row
 * so all eight lines visually originate at the y-axis as the user requested.
 *
 * BTC special-cases: btcPct=null means BTC wasn't tradeable that year —
 * the contribution is *not* added to the BTC bucket and the line stays at
 * zero. From 2010/11 onwards we contribute the full ISA allowance and grow
 * at that year's BTC return.
 */
export function computeCashIsaSeries(rows: CashIsaYearRow[] = CASH_ISA_YEARS): CashIsaPayload {
  const series: CashIsaSeriesPoint[] = [];

  let contributed    = 0;
  let isaPot         = 0;
  let cpiNeeded      = 0;
  let rpiNeeded      = 0;
  let m4Needed       = 0;
  let spxValue       = 0;
  let ftseValue      = 0;
  let btcValue       = 0;
  let btcContributed = 0;

  // Anchor row at y=0, x=first-year-start so all lines start at the axis.
  series.push({
    startYear:   rows[0].startYear,
    taxYear:     'start',
    contributed: 0,
    isaPot:      0,
    cpiNeeded:   0,
    rpiNeeded:   0,
    m4Needed:    0,
    spxValue:    0,
    ftseValue:   0,
    btcValue:    0,
  });

  for (const row of rows) {
    const c = row.isaCashAllowance;

    contributed += c;
    isaPot      = (isaPot      + c) * (1 + row.isaRatePct   / 100);
    cpiNeeded   = (cpiNeeded   + c) * (1 + row.cpiPct       / 100);
    rpiNeeded   = (rpiNeeded   + c) * (1 + row.rpiPct       / 100);
    m4Needed    = (m4Needed    + c) * (1 + row.m4Pct        / 100);
    spxValue    = (spxValue    + c) * (1 + row.spxGbpTrPct  / 100);
    ftseValue   = (ftseValue   + c) * (1 + row.ftse100TrPct / 100);

    if (row.btcPct !== null) {
      btcValue       = (btcValue + c) * (1 + row.btcPct / 100);
      btcContributed += c;
    }

    series.push({
      startYear:   row.startYear + 1,
      taxYear:     row.taxYear,
      contributed,
      isaPot,
      cpiNeeded,
      rpiNeeded,
      m4Needed,
      spxValue,
      ftseValue,
      btcValue,
    });
  }

  // Macro multipliers — what £1 in 1999 would need to be today on each
  // measure, ignoring contributions. Compound (1 + r/100) across all years.
  const compound = (key: keyof CashIsaYearRow) =>
    rows.reduce((acc, r) => acc * (1 + (r[key] as number) / 100), 1);

  const cpiMultiplier  = compound('cpiPct');
  const rpiMultiplier  = compound('rpiPct');
  const m4Multiplier   = compound('m4Pct');
  const isaMultiplier  = compound('isaRatePct');
  const spxMultiplier  = compound('spxGbpTrPct');
  const ftseMultiplier = compound('ftse100TrPct');
  const btcMultiplier  = rows.reduce(
    (acc, r) => r.btcPct === null ? acc : acc * (1 + r.btcPct / 100),
    1,
  );

  const summary: CashIsaSummary = {
    totalContributed: contributed,
    finalIsaPot:      isaPot,
    finalCpi:         cpiNeeded,
    finalRpi:         rpiNeeded,
    finalM4:          m4Needed,
    finalSpx:         spxValue,
    finalFtse:        ftseValue,
    finalBtc:         btcValue,
    btcContributed,
    realLossVsCpi:    isaPot - cpiNeeded,
    realLossVsRpi:    isaPot - rpiNeeded,
    realLossVsM4:     isaPot - m4Needed,
    oppCostVsSpx:     isaPot - spxValue,
    oppCostVsFtse:    isaPot - ftseValue,
    oppCostVsBtc:     isaPot - btcValue,
    realLossPctVsCpi: isaPot / cpiNeeded - 1,
    realLossPctVsRpi: isaPot / rpiNeeded - 1,
    realLossPctVsM4:  isaPot / m4Needed  - 1,
    oppCostPctVsSpx:  isaPot / spxValue  - 1,
    oppCostPctVsFtse: isaPot / ftseValue - 1,
    oppCostPctVsBtc:  btcValue > 0 ? isaPot / btcValue - 1 : 0,
    cpiMultiplier,
    rpiMultiplier,
    m4Multiplier,
    isaMultiplier,
    spxMultiplier,
    ftseMultiplier,
    btcMultiplier,
    firstYear:        rows[0].taxYear,
    lastYear:         rows[rows.length - 1].taxYear,
  };

  return {
    series,
    summary,
    rows,
    generatedAt: new Date().toISOString(),
  };
}
