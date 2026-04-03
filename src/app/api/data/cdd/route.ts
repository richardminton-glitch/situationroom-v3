import { NextResponse } from 'next/server';
import { fetchBrkSeries, brkOffsetToDate } from '@/lib/data/brk';

export const dynamic = 'force-dynamic';

// BRK (Bitcoin Research Kit) — bitview.space
// Series used:
//   vocdd_sum_24h — 24-hour rolling sum of VOCDD per day (supports day1 index).
//                   This is the effective "daily VOCDD" value.
//                   Note: the bare `vocdd` series only supports the `height` (per-block)
//                   index; vocdd_sum_24h is the correct daily equivalent.
//
// NOTE on vocdd_average_1m: Although BRK pre-computes this series, it is the rolling
// average of per-block VOCDD values — NOT the 30-day average of daily VOCDD sums.
// The two series operate at different resolutions (~144 blocks/day), making
// vocdd_average_1m ~140× smaller than the daily sum. The 30-day MA is therefore
// calculated server-side from vocdd_sum_24h values, which is also what the original
// spec called for.
//
// We fetch 120 days (90 display + 30 warm-up) so the MA is fully populated from
// day 1 of the returned window.
//
// supplyAdjusted is hardcoded false — BRK does not expose a supply-adjusted CDD variant.

const DISPLAY_DAYS = 90;
const FETCH_DAYS   = DISPLAY_DAYS + 30; // 30d MA warm-up

export interface CDDPoint {
  date: string;
  vocdd: number;
  ma30: number;
}

export interface CDDResponse {
  data: CDDPoint[];
  supplyAdjusted: false;
}

/** 30-day simple moving average. Returns NaN for the first 29 positions. */
function ma30(values: number[]): number[] {
  return values.map((_, i) => {
    if (i < 29) return NaN;
    let sum = 0;
    for (let j = i - 29; j <= i; j++) sum += values[j];
    return sum / 30;
  });
}

function processRawData(seriesData: Record<string, number[]>, dates: string[]): CDDResponse {
  const rawValues = (seriesData['vocdd_sum_24h'] ?? []).map((v) => v ?? 0);
  const maValues  = ma30(rawValues);

  // Only return the last `DISPLAY_DAYS` rows (skip the 30-day warm-up)
  const points: CDDPoint[] = [];
  const startIdx = rawValues.length - DISPLAY_DAYS;

  for (let i = Math.max(0, startIdx); i < rawValues.length; i++) {
    const vocdd = rawValues[i];
    const ma    = maValues[i];
    if (vocdd === 0 && (isNaN(ma) || ma === 0)) continue;
    points.push({
      date:  dates[i] ?? brkOffsetToDate(i),
      vocdd,
      ma30:  isNaN(ma) ? 0 : Math.round(ma),
    });
  }

  console.log(`[cdd] Processed ${points.length} display days, latest: ${points.at(-1)?.date}`);
  return { data: points, supplyAdjusted: false };
}

export async function GET() {
  try {
    const raw = await fetchBrkSeries({
      series: ['vocdd_sum_24h'],
      days: FETCH_DAYS,
      cacheFile: 'cdd-raw-cache.json',
    });

    const payload = processRawData(raw.seriesData, raw.dates);
    return NextResponse.json(payload);
  } catch (err) {
    console.error('[cdd] Fetch failed:', (err as Error).message);
    return NextResponse.json({ data: [], supplyAdjusted: false }, { status: 503 });
  }
}
