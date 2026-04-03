import { NextResponse } from 'next/server';
import { fetchBrkSeries, brkOffsetToDate } from '@/lib/data/brk';

export const dynamic = 'force-dynamic';

// BRK (Bitcoin Research Kit) — bitview.space
// Bulk endpoint: /api/series/bulk?series=s1,s2,...&index=day1&start=YYYYMMDD&limit=N
// Data is positionally indexed from genesis (Jan 3, 2009 = offset 0).
// Values are in BTC (float). Nulls where no data.
// Date reconstruction: Date.UTC(2009,0,3) + offset * 86400_000

// All 21 source series in fixed order — order is preserved in bulk response
const ALL_SERIES = [
  'utxos_under_1h_old_supply',
  'utxos_1h_to_1d_old_supply',
  'utxos_1d_to_1w_old_supply',
  'utxos_1w_to_1m_old_supply',
  'utxos_1m_to_2m_old_supply',
  'utxos_2m_to_3m_old_supply',
  'utxos_3m_to_4m_old_supply',
  'utxos_4m_to_5m_old_supply',
  'utxos_5m_to_6m_old_supply',
  'utxos_6m_to_1y_old_supply',
  'utxos_1y_to_2y_old_supply',
  'utxos_2y_to_3y_old_supply',
  'utxos_3y_to_4y_old_supply',
  'utxos_4y_to_5y_old_supply',
  'utxos_5y_to_6y_old_supply',
  'utxos_6y_to_7y_old_supply',
  'utxos_7y_to_8y_old_supply',
  'utxos_8y_to_10y_old_supply',
  'utxos_10y_to_12y_old_supply',
  'utxos_12y_to_15y_old_supply',
  'utxos_over_15y_old_supply',
];

// 10 display bands — combined from source series above
export interface AgeBand {
  label: string;
  seriesNames: string[]; // series names to sum for this band
}

export const AGE_BANDS: AgeBand[] = [
  { label: '<1d',    seriesNames: ['utxos_under_1h_old_supply', 'utxos_1h_to_1d_old_supply'] },
  { label: '1d–1w',  seriesNames: ['utxos_1d_to_1w_old_supply'] },
  { label: '1w–1m',  seriesNames: ['utxos_1w_to_1m_old_supply'] },
  { label: '1m–3m',  seriesNames: ['utxos_1m_to_2m_old_supply', 'utxos_2m_to_3m_old_supply'] },
  { label: '3m–6m',  seriesNames: ['utxos_3m_to_4m_old_supply', 'utxos_4m_to_5m_old_supply', 'utxos_5m_to_6m_old_supply'] },
  { label: '6m–1yr', seriesNames: ['utxos_6m_to_1y_old_supply'] },
  { label: '1yr–2yr',seriesNames: ['utxos_1y_to_2y_old_supply'] },
  { label: '2yr–3yr',seriesNames: ['utxos_2y_to_3y_old_supply'] },
  { label: '3yr–5yr',seriesNames: ['utxos_3y_to_4y_old_supply', 'utxos_4y_to_5y_old_supply'] },
  { label: '5yr+',   seriesNames: ['utxos_5y_to_6y_old_supply', 'utxos_6y_to_7y_old_supply', 'utxos_7y_to_8y_old_supply', 'utxos_8y_to_10y_old_supply', 'utxos_10y_to_12y_old_supply', 'utxos_12y_to_15y_old_supply', 'utxos_over_15y_old_supply'] },
];

export type DayPoint = {
  date: string; // ISO YYYY-MM-DD
  bands: number[]; // BTC values for each of the 10 AGE_BANDS, in order
};

type CacheShape = DayPoint[];

function processRawData(seriesData: Record<string, number[]>, dates: string[]): CacheShape {
  const numPoints = dates.length;
  const result: CacheShape = [];

  for (let i = 0; i < numPoints; i++) {
    const date = dates[i] ?? brkOffsetToDate(i);

    // For each band, sum the source series values
    const bands = AGE_BANDS.map((band) => {
      let sum = 0;
      for (const name of band.seriesNames) {
        const v = seriesData[name]?.[i];
        if (v != null) sum += v;
      }
      // Round to 2 decimal places (BTC)
      return Math.round(sum * 100) / 100;
    });

    result.push({ date, bands });
  }

  console.log(`[utxo-age] Processed ${result.length} days, latest: ${result.at(-1)?.date}`);
  return result;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(365, Math.max(7, parseInt(searchParams.get('days') ?? '90', 10)));

  try {
    const raw = await fetchBrkSeries({
      series: ALL_SERIES,
      probeSeries: ALL_SERIES[0],
      days,
      cacheFile: 'utxo-age-raw-cache.json',
    });

    const data = processRawData(raw.seriesData, raw.dates);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[utxo-age] Fetch failed:', (err as Error).message);
    return NextResponse.json([], { status: 503 });
  }
}
