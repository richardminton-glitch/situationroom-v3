import { NextResponse } from 'next/server';
import { fetchBrkSeries, brkOffsetToDate } from '@/lib/data/brk';

export const dynamic = 'force-dynamic';

// BRK (Bitcoin Research Kit) — bitview.space
// Series used:
//   lth_supply  — BTC held by Long-Term Holders (coins unmoved > ~155 days, BRK convention)
//   sth_supply  — BTC held by Short-Term Holders (coins moved within ~155 days)
//   supply      — Total circulating supply in BTC
//
// LTH threshold: The 155-day convention is the Bitcoin analytics industry standard.
// BRK's lth_supply / sth_supply series use this threshold (confirmed by series naming
// consistent with Glassnode / Checkmate definitions).
//
// Data is positionally indexed from genesis (Jan 3 2009 = offset 0).
// Probe first series to discover total length, then back-calculate start offset.

const SERIES = ['lth_supply', 'sth_supply', 'supply'] as const;
const FETCH_DAYS = 365;

export interface LTHSTHPoint {
  date: string;
  lth: number;
  sth: number;
  lthPct: number;
  sthPct: number;
  totalSupply: number;
}

type CacheShape = LTHSTHPoint[];

function processRawData(seriesData: Record<string, number[]>, dates: string[]): CacheShape {
  const lthData    = seriesData['lth_supply'] ?? [];
  const sthData    = seriesData['sth_supply'] ?? [];
  const supplyData = seriesData['supply'] ?? [];
  const numPoints  = Math.max(lthData.length, sthData.length, supplyData.length);

  const result: CacheShape = [];

  for (let i = 0; i < numPoints; i++) {
    const date        = dates[i] ?? brkOffsetToDate(i);
    const lth         = lthData[i] ?? 0;
    const sth         = sthData[i] ?? 0;
    // Fall back to lth+sth if supply series has a null (shouldn't happen, but safe)
    const totalSupply = supplyData[i] ?? (lth + sth);

    const lthPct = totalSupply > 0
      ? Math.round((lth / totalSupply) * 10_000) / 100
      : 0;
    const sthPct = totalSupply > 0
      ? Math.round((sth / totalSupply) * 10_000) / 100
      : 0;

    result.push({ date, lth, sth, lthPct, sthPct, totalSupply });
  }

  console.log(`[lth-sth] Processed ${result.length} days, latest: ${result.at(-1)?.date}`);
  return result;
}

export async function GET() {
  try {
    const raw = await fetchBrkSeries({
      series: [...SERIES],
      probeSeries: SERIES[0],
      days: FETCH_DAYS,
      cacheFile: 'lth-sth-raw-cache.json',
    });

    const data = processRawData(raw.seriesData, raw.dates);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[lth-sth] Fetch failed:', (err as Error).message);
    return NextResponse.json([], { status: 503 });
  }
}
