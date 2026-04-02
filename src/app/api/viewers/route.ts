import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Live viewer counter — heartbeat-based, same mechanism as V2.
 * Each client POSTs every 30s. Server tracks by IP+UA, expires after 60s.
 * Module-level Map persists between requests on a long-lived server (PM2/VPS).
 */

const activeViewers = new Map<string, number>(); // key: ip|ua → lastSeen ms

function cleanExpired() {
  const cutoff = Date.now() - 60_000;
  for (const [key, ts] of activeViewers) {
    if (ts < cutoff) activeViewers.delete(key);
  }
}

function viewerCount(): number {
  cleanExpired();
  return activeViewers.size;
}

// POST /api/viewers — register heartbeat, return current count
export async function POST(req: NextRequest) {
  const headersList = await headers();
  const ip = headersList.get('x-real-ip')
    ?? headersList.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.ip
    ?? 'unknown';
  const ua = (headersList.get('user-agent') ?? '').slice(0, 80);
  const key = `${ip}|${ua}`;

  activeViewers.set(key, Date.now());
  const count = viewerCount();

  return NextResponse.json({ viewers: count });
}

// GET /api/viewers — read-only count (no heartbeat)
export async function GET() {
  return NextResponse.json({ viewers: viewerCount() });
}
