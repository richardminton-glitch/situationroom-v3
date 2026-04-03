/**
 * POST /api/admin/set-tier
 *
 * Admin-only: change the authenticated user's tier without payment.
 * For testing tier-gated views. Does not affect admin privileges.
 *
 * Body: { tier: 'free' | 'general' | 'members' | 'vip' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { isAdmin, TIER_ORDER } from '@/lib/auth/tier';
import type { Tier } from '@/types';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { tier } = await request.json();
  if (!tier || !TIER_ORDER.includes(tier as Tier)) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { tier },
  });

  return NextResponse.json({ success: true, tier });
}
