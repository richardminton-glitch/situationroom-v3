import { NextResponse } from 'next/server';
import { fetchRSSAll, type RSSEvent, type RSSHeadline } from '@/lib/data/rss';

export const dynamic = 'force-dynamic';

let cached: { events: RSSEvent[]; headlines: RSSHeadline[] } | null = null;
let cacheTime = 0;
const CACHE_DURATION = 300_000; // 5 minutes

export async function GET() {
  try {
    if (cached && Date.now() - cacheTime < CACHE_DURATION) {
      return NextResponse.json(cached);
    }

    const data = await fetchRSSAll();
    cached = data;
    cacheTime = Date.now();

    return NextResponse.json(data);
  } catch (error) {
    console.error('RSS fetch error:', error);
    return NextResponse.json(cached || { events: [], headlines: [] });
  }
}
