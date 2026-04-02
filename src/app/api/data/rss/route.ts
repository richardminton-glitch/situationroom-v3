import { NextResponse } from 'next/server';
import { fetchRSSAll } from '@/lib/data/rss';

export const dynamic = 'force-dynamic';

// Cache now lives in rss.ts — shared with briefing pipeline so threat levels always match.
export async function GET() {
  try {
    const data = await fetchRSSAll();
    return NextResponse.json(data);
  } catch (error) {
    console.error('RSS fetch error:', error);
    return NextResponse.json({ events: [], headlines: [] });
  }
}
