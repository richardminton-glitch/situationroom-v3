'use client';

import { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip,
  AreaChart, Area, XAxis, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

type BankId = 'FED' | 'ECB' | 'BOJ' | 'BOE' | 'PBoC';
type Mode = 'parchment' | 'dark';

interface AssetSlice {
  name: string;
  pct: number;
  colorKey: keyof typeof SEGMENT_COLORS;
}

interface BankData {
  label: string;
  region: string;
  totalUSD: string;
  totalNative?: string; // native currency if different from USD
  assets: AssetSlice[];
  // Fallback timeline — used when FRED data unavailable.
  // Fed/ECB/BOJ are overridden by live FRED data when fetched.
  // Units: Fed=$T, ECB=€T, BOJ=¥T, BOE=£T, PBoC=$T
  fallbackTimeline: { year: number; value: number }[];
  timelineUnit: string; // label for the chart
  preCovid: number;     // pre-COVID baseline in the same units as timeline
  narrative: string;
}

// ─── Segment colour palette ───────────────────────────────────────────────────

const SEGMENT_COLORS = {
  govBonds:  '#d4a017',  // gold — treasuries / gilts / JGBs / sovereign bonds
  mbs:       '#8b7355',  // brown — mortgage-backed securities
  gold:      '#c8960c',  // deep gold — physical gold reserves
  fx:        '#6b9a8b',  // muted teal — foreign currency / FX reserves
  equities:  '#5a7a6a',  // forest — equities / ETFs
  corporate: '#7a6e88',  // slate purple — corporate bonds
  other:     '#4a4a4a',  // dark grey — other / unspecified
} as const;

// ─── Static dataset ───────────────────────────────────────────────────────────
//
// SOURCES
// ─────────────────────────────────────────────────────────────────────────────
// Fed  — Federal Reserve H.4.1 statistical release; FRED WALCL (live timeline)
// ECB  — ECB Balance Sheet, Statistical Data Warehouse; FRED ECBASSETSW (live)
// BOJ  — Bank of Japan Accounts; FRED JPNASSETS (live timeline)
// BOE  — Bank of England Weekly Report; balance sheet data to end-2024
// PBoC — People's Bank of China Balance Sheet (CNY→USD at contemporary rates)
//
// Totals reflect the latest available data (Q1 2025 where available).
// Composition percentages reflect the most recently published breakdown.
// FRED timelines (Fed/ECB/BOJ) override fallback data when fetched.
// ─────────────────────────────────────────────────────────────────────────────

const BANK_DATA: Record<BankId, BankData> = {
  FED: {
    label: 'FED',
    region: 'US',
    // WALCL 2025-01-01: 6,640,618M USD = $6.6T
    totalUSD: '$6.6T',
    assets: [
      // Source: Fed H.4.1 (Jan 2025): TREAST=$4.23T (64%), WSHOMCB=$2.04T (31%)
      { name: 'US Treasuries', pct: 64, colorKey: 'govBonds' },
      { name: 'MBS',           pct: 31, colorKey: 'mbs'      },
      { name: 'Gold & SDR',    pct:  2, colorKey: 'gold'     },
      { name: 'Other',         pct:  3, colorKey: 'other'    },
    ],
    // Corrected from FRED WALCL (millions USD ÷ 1e6 = $T), annual end-of-period
    // Live data from /api/data/cbassets will override this when available
    fallbackTimeline: [
      { year: 2014, value: 4.50 }, { year: 2015, value: 4.49 },
      { year: 2016, value: 4.45 }, { year: 2017, value: 4.45 },
      { year: 2018, value: 4.08 }, { year: 2019, value: 4.17 },
      { year: 2020, value: 7.36 }, { year: 2021, value: 8.76 },
      { year: 2022, value: 8.55 }, { year: 2023, value: 7.71 },
      { year: 2024, value: 6.89 }, { year: 2025, value: 6.64 },
    ],
    timelineUnit: '$T',
    preCovid: 4.17,
    narrative: 'Balance sheet peaked at $9.0T in April 2022; QT has reduced it ~26% to ~$6.6T by early 2025.',
  },

  ECB: {
    label: 'ECB',
    region: 'EU',
    // ECBASSETSW 2025-01-01: 6,163,751M EUR = €6.2T → ~$6.7T at 1.08 EUR/USD
    totalUSD: '$6.7T',
    totalNative: '€6.2T',
    assets: [
      // Source: ECB Balance Sheet Jan 2025
      { name: 'Government Bonds', pct: 65, colorKey: 'govBonds'  },
      { name: 'Gold & FX',        pct: 16, colorKey: 'gold'      },
      { name: 'Corporate Bonds',  pct:  5, colorKey: 'corporate' },
      { name: 'Other',            pct: 14, colorKey: 'other'     },
    ],
    // ECBASSETSW (millions EUR ÷ 1e6 = €T)
    fallbackTimeline: [
      { year: 2014, value: 2.15 }, { year: 2015, value: 2.77 },
      { year: 2016, value: 3.66 }, { year: 2017, value: 4.47 },
      { year: 2018, value: 4.67 }, { year: 2019, value: 4.69 },
      { year: 2020, value: 7.01 }, { year: 2021, value: 8.57 },
      { year: 2022, value: 7.96 }, { year: 2023, value: 6.94 },
      { year: 2024, value: 6.36 }, { year: 2025, value: 6.16 },
    ],
    timelineUnit: '€T',
    preCovid: 4.69,
    narrative: 'TLTRO repayments and PEPP/APP runoff cut the balance sheet from €8.8T peak to €6.2T — sovereign debt concentrated in German, French, Italian bonds.',
  },

  BOJ: {
    label: 'BOJ',
    region: 'JAPAN',
    // JPNASSETS 2025-01-01: 6,777,762 (100M JPY) = ¥678T → ~$4.5T at 150 JPY/USD
    totalUSD: '$4.5T',
    totalNative: '¥678T',
    assets: [
      // Source: BOJ Accounts Jan 2025 — ETF purchases ended March 2024
      { name: 'JGBs',            pct: 82, colorKey: 'govBonds' },
      { name: 'ETFs / Equities', pct:  4, colorKey: 'equities' },
      { name: 'Foreign Bonds',   pct:  3, colorKey: 'fx'       },
      { name: 'Other',           pct: 11, colorKey: 'other'    },
    ],
    // JPNASSETS (100M JPY ÷ 10,000 = ¥T)
    fallbackTimeline: [
      { year: 2014, value: 300 }, { year: 2015, value: 383 },
      { year: 2016, value: 476 }, { year: 2017, value: 521 },
      { year: 2018, value: 552 }, { year: 2019, value: 573 },
      { year: 2020, value: 703 }, { year: 2021, value: 724 },
      { year: 2022, value: 704 }, { year: 2023, value: 750 },
      { year: 2024, value: 748 }, { year: 2025, value: 678 },
    ],
    timelineUnit: '¥T',
    preCovid: 573,
    narrative: 'Holds ~7% of Japanese equity market via ETF purchases — new ETF buying halted March 2024 as YCC policy normalises.',
  },

  BOE: {
    label: 'BOE',
    region: 'UK',
    // Source: BOE Weekly Report. Peaked at £913B (Oct 2021). Active QT.
    totalUSD: '$0.82T',
    totalNative: '£650B',
    assets: [
      // Source: BOE Balance Sheet Q4 2024
      { name: 'Gilts',           pct: 85, colorKey: 'govBonds'  },
      { name: 'Corporate Bonds', pct:  2, colorKey: 'corporate' },
      { name: 'Gold',            pct:  4, colorKey: 'gold'      },
      { name: 'Other',           pct:  9, colorKey: 'other'     },
    ],
    // Source: BOE Weekly Report annual end-of-year, £T
    // No FRED series available — corrected static data
    fallbackTimeline: [
      { year: 2014, value: 0.38 }, { year: 2015, value: 0.37 },
      { year: 2016, value: 0.46 }, { year: 2017, value: 0.50 },
      { year: 2018, value: 0.52 }, { year: 2019, value: 0.52 },
      { year: 2020, value: 0.74 }, { year: 2021, value: 0.91 },
      { year: 2022, value: 0.85 }, { year: 2023, value: 0.73 },
      { year: 2024, value: 0.65 },
    ],
    timelineUnit: '£T',
    preCovid: 0.52,
    narrative: 'Gilt holdings peaked at £913B (Oct 2021) following pandemic QE; active QT programme has reduced the portfolio to ~£650B.',
  },

  PBoC: {
    label: 'PBoC',
    region: 'CHINA',
    // Source: PBoC Balance Sheet. CNY assets ~CNY 43T → ~$6T at 7.1 CNY/USD
    totalUSD: '$6.0T',
    assets: [
      // Source: PBoC Balance Sheet Q4 2024
      // Gold reserves have grown significantly amid de-dollarisation drive
      { name: 'FX Reserves',     pct: 52, colorKey: 'fx'       },
      { name: 'Gold',            pct:  9, colorKey: 'gold'      },
      { name: 'Gov Bonds',       pct: 20, colorKey: 'govBonds'  },
      { name: 'Other',           pct: 19, colorKey: 'other'     },
    ],
    // Source: PBoC Balance Sheet, USD equivalent at contemporary CNY/USD rates
    // No FRED series available — corrected static data
    fallbackTimeline: [
      { year: 2014, value: 4.8 }, { year: 2015, value: 4.4 },
      { year: 2016, value: 4.3 }, { year: 2017, value: 5.0 },
      { year: 2018, value: 5.2 }, { year: 2019, value: 5.1 },
      { year: 2020, value: 5.5 }, { year: 2021, value: 6.3 },
      { year: 2022, value: 5.8 }, { year: 2023, value: 6.1 },
      { year: 2024, value: 6.0 },
    ],
    timelineUnit: '$T',
    preCovid: 5.1,
    narrative: 'Gold reserves grew 16% between 2022–2024 amid de-dollarisation. FX reserves remain the world\'s largest at ~$3.2T.',
  },
};

const BANK_ORDER: BankId[] = ['FED', 'ECB', 'BOJ', 'BOE', 'PBoC'];

// FRED provides live timeline data for these banks
const FRED_BANKS: BankId[] = ['FED', 'ECB', 'BOJ'];

// ─── Theme tokens ─────────────────────────────────────────────────────────────

function tokens(mode: Mode) {
  if (mode === 'dark') {
    return {
      bg:         '#0a0f0f',
      text:       '#e0f0f0',
      textMuted:  '#6b9a8b',
      border:     '#1a3a3a',
      accent:     '#00d4aa',
      accentGlow: 'rgba(0,212,170,0.18)',
      areaStroke: '#00d4aa',
      refLine:    'rgba(0,212,170,0.35)',
      font:       "'IBM Plex Mono', 'Courier New', monospace",
    };
  }
  return {
    bg:         '#f5f0e8',
    text:       '#2c2416',
    textMuted:  '#8b7355',
    border:     '#c8b89a',
    accent:     '#8b6914',
    accentGlow: 'rgba(139,105,20,0.15)',
    areaStroke: '#8b6914',
    refLine:    'rgba(139,105,20,0.4)',
    font:       "'IBM Plex Mono', 'Courier New', monospace",
  };
}

// ─── Donut centre label ───────────────────────────────────────────────────────

function DonutCentre({ cx, cy, bank, mode }: {
  cx: number; cy: number; bank: BankData; mode: Mode;
}) {
  const t = tokens(mode);
  return (
    <>
      <text x={cx} y={cy - 14} textAnchor="middle"
        fill={t.accent} fontFamily={t.font} fontSize={18} fontWeight={700} letterSpacing={3}>
        {bank.label}
      </text>
      <text x={cx} y={cy + 6} textAnchor="middle"
        fill={t.text} fontFamily={t.font} fontSize={15} fontWeight={700}>
        {bank.totalUSD}
      </text>
      {bank.totalNative && (
        <text x={cx} y={cy + 20} textAnchor="middle"
          fill={t.textMuted} fontFamily={t.font} fontSize={9}>
          {bank.totalNative}
        </text>
      )}
      <text x={cx} y={cy + (bank.totalNative ? 34 : 22)} textAnchor="middle"
        fill={t.textMuted} fontFamily={t.font} fontSize={8} letterSpacing={1.5}>
        TOTAL ASSETS
      </text>
    </>
  );
}

// ─── Custom tooltips ──────────────────────────────────────────────────────────

function AssetTooltip({ active, payload, mode }: {
  active?: boolean;
  payload?: { payload: AssetSlice }[];
  mode: Mode;
}) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload;
  const t = tokens(mode);
  return (
    <div style={{
      background: t.bg, border: `1px solid ${t.border}`, color: t.text,
      padding: '6px 10px', fontFamily: t.font, fontSize: 10, lineHeight: 1.8,
    }}>
      <div style={{ color: t.accent, fontWeight: 700, letterSpacing: 1 }}>{slice.name.toUpperCase()}</div>
      <div style={{ color: t.textMuted }}>{slice.pct}%</div>
    </div>
  );
}

function TimelineTooltip({ active, payload, label, unit, mode }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  unit: string;
  mode: Mode;
}) {
  if (!active || !payload?.length) return null;
  const t = tokens(mode);
  return (
    <div style={{
      background: t.bg, border: `1px solid ${t.border}`, color: t.text,
      padding: '4px 8px', fontFamily: t.font, fontSize: 10,
    }}>
      <span style={{ color: t.textMuted }}>{label}: </span>
      <span style={{ fontWeight: 700 }}>{payload[0].value.toFixed(unit === '¥T' ? 0 : 2)}{unit}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  mode?: Mode;
  defaultBank?: BankId;
}

export default function CentralBankAssetChart({ mode = 'parchment', defaultBank = 'FED' }: Props) {
  const [activeBank, setActiveBank] = useState<BankId>(defaultBank);
  const [displayBank, setDisplayBank] = useState<BankId>(defaultBank);
  const [transitioning, setTransitioning] = useState(false);
  // Live FRED timeline data — overrides fallback for Fed/ECB/BOJ
  const [liveTimelines, setLiveTimelines] = useState<Record<string, { year: number; value: number }[]>>({});
  const [dataSource, setDataSource] = useState<'loading' | 'live' | 'static'>('loading');

  const t = tokens(mode);
  const bank = BANK_DATA[displayBank];

  // Determine which timeline to show
  const timeline = (FRED_BANKS.includes(displayBank) && liveTimelines[displayBank])
    ? liveTimelines[displayBank]
    : bank.fallbackTimeline;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/data/cbassets');
        if (res.ok) {
          const data = await res.json();
          // Only set banks that returned non-empty arrays
          const filtered: typeof liveTimelines = {};
          for (const k of FRED_BANKS) {
            if (Array.isArray(data[k]) && data[k].length > 0) filtered[k] = data[k];
          }
          setLiveTimelines(filtered);
          setDataSource(Object.keys(filtered).length > 0 ? 'live' : 'static');
        } else {
          setDataSource('static');
        }
      } catch {
        setDataSource('static');
      }
    }
    load();
  }, []);

  function switchBank(id: BankId) {
    if (id === activeBank || transitioning) return;
    setTransitioning(true);
    setActiveBank(id);
    setTimeout(() => { setDisplayBank(id); setTransitioning(false); }, 180);
  }

  // preCovid baseline in the live data's units (fallback units are the same)
  const preCovidValue = bank.preCovid;

  return (
    <div style={{
      background: 'transparent', color: t.text, fontFamily: t.font,
      border: 'none', padding: '16px',
      width: '100%', height: '100%', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', gap: 0, minHeight: 480,
    }}>

      {/* Header */}
      <div style={{
        fontSize: 9, letterSpacing: 3, color: t.textMuted,
        marginBottom: 10, borderBottom: `1px solid ${t.border}`, paddingBottom: 8,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>CENTRAL BANK BALANCE SHEETS — ASSET COMPOSITION</span>
        <span style={{ fontSize: 8, letterSpacing: 1, opacity: 0.6 }}>
          {dataSource === 'live' ? 'FRED LIVE' : dataSource === 'static' ? 'STATIC' : '···'}
        </span>
      </div>

      {/* Bank selector */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {BANK_ORDER.map((id) => {
          const isActive = activeBank === id;
          return (
            <button key={id} onClick={() => switchBank(id)} style={{
              flex: 1, padding: '5px 0',
              background: isActive ? t.accentGlow : 'transparent',
              border: `1px solid ${isActive ? t.accent : t.border}`,
              color: isActive ? t.accent : t.textMuted,
              fontFamily: t.font, fontSize: 10,
              fontWeight: isActive ? 700 : 400, letterSpacing: 1.5,
              cursor: 'pointer', transition: 'all 200ms ease',
              boxShadow: isActive ? `0 0 8px ${t.accentGlow}` : 'none',
              outline: 'none',
            }}>
              {id}
            </button>
          );
        })}
      </div>

      {/* Donut + legend */}
      <div style={{
        display: 'flex', gap: 16, alignItems: 'flex-start', flex: '0 0 auto',
        opacity: transitioning ? 0 : 1, transition: 'opacity 180ms ease',
      }}>
        <div style={{ flex: '0 0 220px' }}>
          <PieChart width={220} height={200}>
            <Pie
              data={bank.assets} dataKey="pct" nameKey="name"
              cx={110} cy={100} innerRadius={66} outerRadius={96}
              strokeWidth={1} stroke={t.bg}
              isAnimationActive={!transitioning}
              animationBegin={0} animationDuration={400} animationEasing="ease-out"
            >
              {bank.assets.map((slice) => (
                <Cell key={slice.name} fill={SEGMENT_COLORS[slice.colorKey]} />
              ))}
            </Pie>
            <DonutCentre cx={110} cy={100} bank={bank} mode={mode} />
            <RechartsTooltip
              content={(props) => (
                <AssetTooltip
                  active={props.active}
                  payload={props.payload as unknown as { payload: AssetSlice }[]}
                  mode={mode}
                />
              )}
            />
          </PieChart>
        </div>

        {/* Legend */}
        <div style={{
          flex: 1, paddingTop: 16,
          display: 'flex', flexDirection: 'column', gap: 7,
        }}>
          {bank.assets.map((slice) => {
            const rawTotal = parseFloat(bank.totalUSD.replace(/[$TB]/g, ''));
            const unit = bank.totalUSD.endsWith('T') ? 'T' : 'B';
            const sliceVal = (slice.pct / 100 * rawTotal).toFixed(2);
            return (
              <div key={slice.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 10, height: 10, background: SEGMENT_COLORS[slice.colorKey], flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 9, letterSpacing: 0.8, color: t.textMuted }}>
                  {slice.name.toUpperCase()}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: t.text, minWidth: 34, textAlign: 'right' }}>
                  {slice.pct}%
                </div>
                <div style={{ fontSize: 9, color: t.textMuted, minWidth: 52, textAlign: 'right' }}>
                  ${sliceVal}{unit}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div style={{
        flex: 1, minHeight: 80, marginTop: 12,
        opacity: transitioning ? 0 : 1, transition: 'opacity 180ms ease',
      }}>
        <div style={{ fontSize: 8, letterSpacing: 2, color: t.textMuted, marginBottom: 4 }}>
          TOTAL ASSETS — 10Y ({bank.timelineUnit})
          {FRED_BANKS.includes(displayBank) && dataSource === 'live' && (
            <span style={{ marginLeft: 6, opacity: 0.5 }}>· FRED</span>
          )}
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timeline} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`cbAssetGrad-${mode}-${displayBank}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={t.areaStroke} stopOpacity={0.25} />
                <stop offset="95%" stopColor={t.areaStroke} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <XAxis dataKey="year"
              tick={{ fill: t.textMuted, fontSize: 8, fontFamily: t.font }}
              tickLine={false} axisLine={false} tickMargin={4}
            />
            <ReferenceLine y={preCovidValue} stroke={t.refLine} strokeDasharray="3 3"
              label={{
                value: 'PRE-COVID',
                position: 'insideTopLeft',
                fill: t.textMuted, fontSize: 7, fontFamily: t.font, letterSpacing: 1,
              }}
            />
            <Area type="monotone" dataKey="value"
              stroke={t.areaStroke} strokeWidth={1.5}
              fill={`url(#cbAssetGrad-${mode}-${displayBank})`}
              dot={false}
              isAnimationActive={!transitioning} animationDuration={400}
            />
            <RechartsTooltip
              content={(props) => (
                <TimelineTooltip
                  active={props.active}
                  payload={props.payload as unknown as { value: number }[]}
                  label={props.label as string}
                  unit={bank.timelineUnit}
                  mode={mode}
                />
              )}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Narrative */}
      <div style={{
        fontSize: 9, color: t.textMuted,
        borderTop: `1px solid ${t.border}`, paddingTop: 8, marginTop: 8,
        lineHeight: 1.6, letterSpacing: 0.3,
        opacity: transitioning ? 0 : 1, transition: 'opacity 180ms ease',
      }}>
        {bank.narrative}
      </div>
    </div>
  );
}
