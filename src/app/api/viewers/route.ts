import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Live viewer counter — heartbeat-based.
 * Each client POSTs every 30s. Server tracks by IP+UA, expires after 60s.
 * Paid members (general+) are tracked separately for OPS CHAT counter.
 */

interface ViewerEntry {
  lastSeen: number;
  tier: string;
}

const activeViewers = new Map<string, ViewerEntry>(); // key: ip|ua → entry

function cleanExpired() {
  const cutoff = Date.now() - 60_000;
  for (const [key, entry] of activeViewers) {
    if (entry.lastSeen < cutoff) activeViewers.delete(key);
  }
}

function countAll(): number {
  cleanExpired();
  return activeViewers.size;
}

function countMembers(): number {
  cleanExpired();
  let count = 0;
  for (const entry of activeViewers.values()) {
    if (entry.tier !== 'free') count++;
  }
  return count;
}

// POST /api/viewers — register heartbeat, return current counts
export async function POST() {
  const headersList = await headers();
  const ip = headersList.get('x-real-ip')
    ?? headersList.get('x-forwarded-for')?.split(',')[0].trim()
    ?? 'unknown';
  const ua = (headersList.get('user-agent') ?? '').slice(0, 80);
  const key = `${ip}|${ua}`;

  // Check if this is an authenticated paid user
  let tier = 'free';
  try {
    const user = await getCurrentUser();
    if (user?.tier) tier = user.tier as string;
  } catch { /* unauthenticated = free */ }

  activeViewers.set(key, { lastSeen: Date.now(), tier });

  return NextResponse.json({ viewers: countAll(), members: countMembers() });
}

// GET /api/viewers — read-only counts (no heartbeat)
export async function GET() {
  return NextResponse.json({ viewers: countAll(), members: countMembers() });
}
